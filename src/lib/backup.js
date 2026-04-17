// src/lib/backup.js
import pool from './db.js';
import archiver from 'archiver';
import { Readable } from 'stream';

/**
 * Generates a SQL dump of the database.
 * @returns {Promise<string>} The SQL content as a string.
 */
async function generateSqlDump() {
  let sql = `-- Backup generated on ${new Date().toISOString()}\n`;
  sql += `SET FOREIGN_KEY_CHECKS = 0;\n\n`;

  // 1. Get all tables
  console.log('Fetching tables...');
  const [tables] = await pool.query('SHOW TABLES');
  const tableKey = Object.keys(tables[0])[0];
  console.log(`Found ${tables.length} tables to backup.`);

  for (const tableRow of tables) {
    const tableName = tableRow[tableKey];
    console.log(`Dumping table: ${tableName}`);
    
    // 2. Get Create Table statement
    const [[createTableResult]] = await pool.query(`SHOW CREATE TABLE \`${tableName}\``);
    sql += `-- Table structure for table \`${tableName}\`\n`;
    sql += `DROP TABLE IF EXISTS \`${tableName}\`;\n`;
    sql += `${createTableResult['Create Table']};\n\n`;

    // 3. Get Data
    const [rows] = await pool.query(`SELECT * FROM \`${tableName}\``);
    if (rows.length > 0) {
      console.log(`Dumping ${rows.length} rows for ${tableName}`);
      sql += `-- Dumping data for table \`${tableName}\`\n`;
      
      // Batch inserts for efficiency
      const columns = Object.keys(rows[0]).map(c => `\`${c}\``).join(', ');
      
      // We'll insert in chunks to avoid massive strings
      const chunkSize = 100;
      for (let i = 0; i < rows.length; i += chunkSize) {
        const chunk = rows.slice(i, i + chunkSize);
        const values = chunk.map(row => {
          const rowValues = Object.values(row).map(val => {
            if (val === null) return 'NULL';
            if (typeof val === 'string') return `'${val.replace(/'/g, "''")}'`;
            if (val instanceof Date) return `'${val.toISOString().slice(0, 19).replace('T', ' ')}'`;
            return val;
          });
          return `(${rowValues.join(', ')})`;
        }).join(',\n');

        sql += `INSERT INTO \`${tableName}\` (${columns}) VALUES\n${values};\n`;
      }
      sql += '\n';
    }
  }

  sql += `SET FOREIGN_KEY_CHECKS = 1;\n`;
  console.log('SQL dump generated successfully.');
  return sql;
}

/**
 * Creates a zip file containing the SQL dump.
 * @returns {Promise<Buffer>} The zipped backup as a Buffer.
 */
export async function createZippedBackup() {
  const sql = await generateSqlDump();
  
  return new Promise((resolve, reject) => {
    const chunks = [];
    const archive = archiver('zip', { zlib: { level: 9 } });

    archive.on('error', (err) => reject(err));
    archive.on('data', (chunk) => chunks.push(chunk));
    archive.on('end', () => resolve(Buffer.concat(chunks)));

    // Create a stream from the SQL string
    const sqlStream = new Readable();
    sqlStream.push(sql);
    sqlStream.push(null);

    // Append the SQL stream to the zip
    const filename = `backup_${new Date().toISOString().split('T')[0]}.sql`;
    archive.append(sqlStream, { name: filename });
    archive.finalize();
  });
}
