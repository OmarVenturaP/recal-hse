import { NextResponse } from 'next/server';
import pool from '@/lib/db';

// Migración silenciosa de la tabla de inspecciones
async function ensureTable() {
  try {
    // Primero creamos la tabla si no existe
    await pool.query(`
      CREATE TABLE IF NOT EXISTS Inspecciones_Herramienta (
        id_inspeccion INT AUTO_INCREMENT PRIMARY KEY,
        id_maquinaria INT NOT NULL,
        mes TINYINT NOT NULL,
        anio YEAR NOT NULL,
        color_mes VARCHAR(20) NOT NULL,
        resultado ENUM('Aprobado', 'Rechazado', 'Pendiente') DEFAULT 'Pendiente',
        observaciones TEXT,
        id_personal INT,
        fecha_registro DATETIME DEFAULT NOW(),
        UNIQUE KEY uq_inspeccion (id_maquinaria, mes, anio),
        FOREIGN KEY (id_maquinaria) REFERENCES Maquinaria_Equipo(id_maquinaria)
      )
    `);

    // Agregamos las nuevas columnas si no existen
    try {
      await pool.query(`ALTER TABLE Inspecciones_Herramienta ADD COLUMN fecha_inspeccion DATE`);
    } catch (e) {}
    try {
      await pool.query(`ALTER TABLE Inspecciones_Herramienta ADD COLUMN realizado_por VARCHAR(255)`);
    } catch (e) {}

  } catch(e) {
    console.error("Error al asegurar tabla de inspecciones:", e);
  }
}

// GET: Obtener inspecciones del mes para herramientas
export async function GET(request) {
  await ensureTable();
  const { searchParams } = new URL(request.url);
  const mes = parseInt(searchParams.get('mes') || '0');
  const anio = parseInt(searchParams.get('anio') || '0');
  const id_maquinaria = searchParams.get('id_maquinaria');

  try {
    // Historial completo de una herramienta
    if (id_maquinaria && mes === 0) {
      const [rows] = await pool.query(
        `SELECT id_inspeccion, id_maquinaria, mes, anio, color_mes, resultado, observaciones, realizado_por, fecha_inspeccion, fecha_registro 
         FROM Inspecciones_Herramienta WHERE id_maquinaria = ? ORDER BY anio DESC, mes DESC`,
        [id_maquinaria]
      );
      return NextResponse.json({ success: true, data: rows });
    }

    // Inspección específica de una herramienta para un periodo
    if (id_maquinaria && mes > 0) {
      const [rows] = await pool.query(
        `SELECT id_inspeccion, id_maquinaria, mes, anio, color_mes, resultado, observaciones, realizado_por, fecha_inspeccion, fecha_registro 
         FROM Inspecciones_Herramienta WHERE id_maquinaria = ? AND mes = ? AND anio = ?`,
        [id_maquinaria, mes, anio]
      );
      return NextResponse.json({ success: true, data: rows[0] || null });
    }

    // Todas las herramientas activas con su estado de inspección del periodo
    const [rows] = await pool.query(`
      SELECT 
        m.id_maquinaria,
        m.tipo,
        m.marca,
        m.serie,
        m.num_economico,
        ih.id_inspeccion,
        ih.resultado,
        ih.color_mes,
        ih.observaciones,
        ih.realizado_por,
        ih.fecha_inspeccion,
        ih.fecha_registro
      FROM Maquinaria_Equipo m
      LEFT JOIN Inspecciones_Herramienta ih 
        ON ih.id_maquinaria = m.id_maquinaria AND ih.mes = ? AND ih.anio = ?
      WHERE m.tipo_unidad = 'herramienta' AND m.fecha_baja IS NULL
      ORDER BY m.tipo ASC
    `, [mes, anio]);

    return NextResponse.json({ success: true, data: rows });
  } catch (error) {
    console.error('Error en inspecciones herramienta:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST: Registrar o actualizar la inspección de una herramienta
export async function POST(request) {
  await ensureTable();
  try {
    const body = await request.json();
    const { id_maquinaria, mes, anio, color_mes, resultado, observaciones, fecha_inspeccion, realizado_por } = body;

    if (!id_maquinaria || !mes || !anio || !color_mes || !resultado) {
      return NextResponse.json({ error: 'Faltan campos obligatorios.' }, { status: 400 });
    }

    await pool.query(`
      INSERT INTO Inspecciones_Herramienta 
        (id_maquinaria, mes, anio, color_mes, resultado, observaciones, fecha_inspeccion, realizado_por)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE 
        resultado = VALUES(resultado),
        observaciones = VALUES(observaciones),
        color_mes = VALUES(color_mes),
        fecha_inspeccion = VALUES(fecha_inspeccion),
        realizado_por = VALUES(realizado_por),
        fecha_registro = NOW()
    `, [
      id_maquinaria, 
      mes, 
      anio, 
      color_mes, 
      resultado, 
      observaciones || null, 
      fecha_inspeccion || null, 
      realizado_por || null
    ]);
    
    // ACTUALIZACIÓN AUTOMÁTICA DE PRÓXIMO MANTENIMIENTO (+1 MES)
    if (fecha_inspeccion) {
      await pool.query(
        `UPDATE Maquinaria_Equipo SET fecha_proximo_mantenimiento = DATE_ADD(?, INTERVAL 1 MONTH) WHERE id_maquinaria = ?`,
        [fecha_inspeccion, id_maquinaria]
      );
    }

    return NextResponse.json({ success: true, mensaje: 'Inspección registrada correctamente.' });
  } catch (error) {
    console.error('Error al guardar inspección:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
