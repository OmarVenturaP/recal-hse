import { NextResponse } from 'next/server';
import ExcelJS from 'exceljs';
import pool from '@/lib/db';

export async function POST(request) {
  try {
    const data = await request.formData();
    const file = data.get('file');

    if (!file) {
      return NextResponse.json({ error: "No se proporcionó ningún archivo" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Inicializamos ExcelJS
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);

    const registrosAInsertar = [];

    // 1. Recorrer TODAS las hojas del archivo
    workbook.eachSheet((worksheet) => {
      const sheetName = worksheet.name;
      
      // Intentar extraer la fecha del nombre de la hoja (ej. "REP 02-01-24" o "02-01-24")
      const dateMatch = sheetName.match(/(\d{2})[-/](\d{2})[-/](\d{2,4})/);
      let fecha = null;
      
      if (dateMatch) {
        let day = dateMatch[1];
        let month = dateMatch[2];
        let year = dateMatch[3];
        if (year.length === 2) year = `20${year}`; // Convertir '24' a '2024'
        fecha = `${year}-${month}-${day}`;
      } else {
        // Si la hoja no tiene fecha en el nombre, usamos la fecha de hoy para no perderla
        fecha = new Date().toISOString().split('T')[0];
      }

      let colContratista = -1;
      let colPK = -1;
      let colMaquinaria = -1;
      let colTotal = -1;
      let headerRowNumber = -1;

      // 2. Escanear dinámicamente para encontrar dónde empiezan los encabezados en esta hoja
      worksheet.eachRow((row, rowNumber) => {
        if (headerRowNumber !== -1) return; // Ya encontramos los títulos

        row.eachCell((cell, colNumber) => {
          const val = cell.text ? cell.text.trim().toUpperCase() : '';
          if (val === 'CONTRATISTA') colContratista = colNumber;
          if (val === 'PK') colPK = colNumber;
          if (val === 'MAQUINARIA') colMaquinaria = colNumber;
          if (val === 'TOTAL') colTotal = colNumber;
        });

        if (colContratista !== -1) {
          headerRowNumber = rowNumber;
        }
      });

      // 3. A veces "TOTAL" está en la fila de abajo por las celdas combinadas. Lo buscamos ahí si nos falta.
      if (headerRowNumber !== -1 && colTotal === -1) {
        const nextRow = worksheet.getRow(headerRowNumber + 1);
        nextRow.eachCell((cell, colNumber) => {
          const val = cell.text ? cell.text.trim().toUpperCase() : '';
          if (val === 'TOTAL') colTotal = colNumber;
        });
      }

      // 4. Si encontramos la estructura, extraemos los datos fila por fila
      if (colContratista !== -1) {
        worksheet.eachRow((row, rowNumber) => {
          // Saltamos las filas de encabezados
          if (rowNumber <= headerRowNumber + 1) return;

          const contratista = row.getCell(colContratista).text?.trim();
          const pk = colPK !== -1 ? row.getCell(colPK).text?.trim() : '';
          const maquinaria = colMaquinaria !== -1 ? row.getCell(colMaquinaria).text?.trim() : '';
          
          // Extraemos el total asegurándonos de que sea un número (ExcelJS a veces trae objetos en fórmulas)
          let totalStr = colTotal !== -1 ? row.getCell(colTotal).value : 0;
          if (totalStr && typeof totalStr === 'object' && totalStr.result !== undefined) {
             totalStr = totalStr.result;
          }
          const total = parseInt(totalStr) || 0;

          // Filtramos celdas vacías, filas de sumatorias o títulos colados
          if (
            contratista && 
            contratista.toUpperCase() !== 'TOTAL FT:' && 
            !contratista.toUpperCase().includes('SIN ACTIVIDADES') &&
            !contratista.toUpperCase().includes('CONTRATISTA')
          ) {
            registrosAInsertar.push({
              fecha,
              contratista,
              pk,
              maquinaria,
              total_trabajadores: total
            });
          }
        });
      }
    });

    // 5. Inserción en MySQL
    const connection = await pool.getConnection();
    let insertados = 0;

    for (const reg of registrosAInsertar) {
      const query = `
        INSERT IGNORE INTO actividades_diarias (fecha, contratista, pk, maquinaria, total_trabajadores) 
        VALUES (?, ?, ?, ?, ?)
      `;
      const [result] = await connection.execute(query, [
        reg.fecha, 
        reg.contratista, 
        reg.pk, 
        reg.maquinaria, 
        reg.total_trabajadores
      ]);
      
      if (result.affectedRows > 0) insertados++;
    }

    connection.release();

    return NextResponse.json({ 
      message: `Importación exitosa. ${insertados} registros nuevos agregados de un total de ${registrosAInsertar.length} encontrados en el Excel.` 
    });

  } catch (error) {
    console.error("Error importando Excel con exceljs:", error);
    return NextResponse.json({ error: "Error interno al procesar el archivo", detalle: error.message }, { status: 500 });
  }
}