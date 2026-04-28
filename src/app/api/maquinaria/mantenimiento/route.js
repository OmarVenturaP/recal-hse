import { NextResponse } from 'next/server';
import pool from '@/lib/db';

// --- GET: Obtener el historial completo de una máquina ---
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id_maquinaria = searchParams.get('id_maquinaria');

    if (!id_maquinaria) {
      return NextResponse.json({ error: "Falta el ID de la maquinaria." }, { status: 400 });
    }

    // MIGRACIÓN SILENCIOSA
    try {
      await pool.query(`ALTER TABLE Historial_Mantenimiento ADD COLUMN realizado_por VARCHAR(255)`);
    } catch(e) {}
    try {
      await pool.query(`ALTER TABLE Historial_Mantenimiento ADD COLUMN folio_mtto INT`);
    } catch(e) {}

    // Buscamos todos los servicios y los ordenamos por fecha (del más reciente al más antiguo)
    const [rows] = await pool.query(
      `SELECT id_mantenimiento, id_maquinaria, fecha_mantenimiento, tipo_mantenimiento, horometro_mantenimiento, observaciones, realizado_por, folio_mtto 
       FROM Historial_Mantenimiento 
       WHERE id_maquinaria = ? 
       ORDER BY fecha_mantenimiento DESC, id_mantenimiento DESC`,
      [id_maquinaria]
    );

    return NextResponse.json({ success: true, data: rows });

  } catch (error) {
    console.error("Error al obtener historial:", error);
    return NextResponse.json({ success: false, error: "Error en la base de datos al consultar el historial." }, { status: 500 });
  }
}

// --- POST: Registrar un nuevo mantenimiento ---
export async function POST(request) {
  try {
    const body = await request.json();
    const { id_maquinaria, fecha_mantenimiento, tipo_mantenimiento, horometro_mantenimiento, observaciones, realizado_por } = body;

    // Validación de seguridad (Ya NO exigimos el horometro_mantenimiento)
    if (!id_maquinaria || !fecha_mantenimiento || !tipo_mantenimiento) {
      return NextResponse.json({ error: "Faltan campos obligatorios para registrar el servicio." }, { status: 400 });
    }

    // --- GENERACIÓN DE FOLIO CONSECUTIVO POR EMPRESA ---
    let folioFinal = null;
    try {
      // 1. Obtener el id_subcontratista de la maquinaria
      const [maqRows] = await pool.query('SELECT id_subcontratista FROM Maquinaria_Equipo WHERE id_maquinaria = ?', [id_maquinaria]);
      if (maqRows.length > 0) {
        const id_sub = maqRows[0].id_subcontratista;
        
        // 2. Buscar el máximo folio para esa empresa
        const [folioRows] = await pool.query(`
          SELECT MAX(h.folio_mtto) as max_folio 
          FROM Historial_Mantenimiento h
          JOIN Maquinaria_Equipo m ON h.id_maquinaria = m.id_maquinaria
          WHERE m.id_subcontratista = ?
        `, [id_sub]);

        const maxFolio = folioRows[0].max_folio;
        // Comenzar arriba del 00100 (101) si no hay folios
        folioFinal = maxFolio ? maxFolio + 1 : 101;
        if (folioFinal <= 100) folioFinal = 101;
      }
    } catch (folioErr) {
      console.error("Error al generar folio:", folioErr);
    }

    const query = `
      INSERT INTO Historial_Mantenimiento 
      (id_maquinaria, fecha_mantenimiento, tipo_mantenimiento, horometro_mantenimiento, observaciones, realizado_por, folio_mtto) 
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    
    // Si viene vacío o indefinido, enviamos null a MySQL
    const horometroFinal = horometro_mantenimiento ? parseFloat(horometro_mantenimiento) : null;

    const [result] = await pool.query(query, [
      id_maquinaria, 
      fecha_mantenimiento, 
      tipo_mantenimiento, 
      horometroFinal, 
      observaciones || null,
      realizado_por || null,
      folioFinal
    ]);

    // --- CÁLCULO AUTOMÁTICO DE PRÓXIMO MANTENIMIENTO ---
    try {
      // 1. Obtener el tipo de unidad y el area
      const [maquinaRows] = await pool.query('SELECT tipo_unidad, area FROM Maquinaria_Equipo WHERE id_maquinaria = ?', [id_maquinaria]);
      
      if (maquinaRows.length > 0) {
        const { tipo_unidad, area } = maquinaRows[0];
        let fechaProxima = null;
        const baseDate = new Date(fecha_mantenimiento);

        if (tipo_unidad === 'maquinaria') {
          // Maquinaria: +36 días naturales
          fechaProxima = new Date(baseDate);
          fechaProxima.setDate(fechaProxima.getDate() + 36);
        } else if (tipo_unidad === 'equipo' || (tipo_unidad === 'vehiculo' && area !== 'ambiental')) {
          // Equipo Menor y Vehículos de Seguridad: +3 meses
          fechaProxima = new Date(baseDate);
          fechaProxima.setMonth(fechaProxima.getMonth() + 3);
        }

        if (fechaProxima) {
          // Formatear a YYYY-MM-DD para MySQL
          const yyyy = fechaProxima.getUTCFullYear();
          const mm = String(fechaProxima.getUTCMonth() + 1).padStart(2, '0');
          const dd = String(fechaProxima.getUTCDate()).padStart(2, '0');
          const fechaSQL = `${yyyy}-${mm}-${dd}`;

          await pool.query(
            `UPDATE Maquinaria_Equipo SET fecha_proximo_mantenimiento = ? WHERE id_maquinaria = ?`,
            [fechaSQL, id_maquinaria]
          );
        }
      }
    } catch (calcError) {
      console.error("Error calculando próxima fecha:", calcError);
      // No bloqueamos el flujo principal si falla el cálculo automático
    }

    // NOTA: Se eliminó la actualización automática del horómetro principal de la máquina
    // para mantener la independencia entre el registro de servicio y la ficha técnica.

    return NextResponse.json({ 
      success: true, 
      mensaje: "Mantenimiento registrado correctamente",
      id: result.insertId 
    });

  } catch (error) {
    console.error("Error al guardar mantenimiento:", error);
    return NextResponse.json({ success: false, error: "Error al guardar en la base de datos." }, { status: 500 });
  }
}

// --- PUT: Actualizar un registro de mantenimiento existente ---
export async function PUT(request) {
  try {
    const body = await request.json();
    const { id_mantenimiento, fecha_mantenimiento, tipo_mantenimiento, horometro_mantenimiento, observaciones, realizado_por } = body;

    if (!id_mantenimiento || !fecha_mantenimiento || !tipo_mantenimiento) {
      return NextResponse.json({ error: "Faltan campos obligatorios para actualizar el servicio." }, { status: 400 });
    }

    const horometroFinal = horometro_mantenimiento ? parseFloat(horometro_mantenimiento) : null;

    const query = `
      UPDATE Historial_Mantenimiento 
      SET fecha_mantenimiento = ?, 
          tipo_mantenimiento = ?, 
          horometro_mantenimiento = ?, 
          observaciones = ?, 
          realizado_por = ? 
      WHERE id_mantenimiento = ?
    `;

    await pool.query(query, [
      fecha_mantenimiento,
      tipo_mantenimiento,
      horometroFinal,
      observaciones || null,
      realizado_por || null,
      id_mantenimiento
    ]);

    return NextResponse.json({ success: true, mensaje: "Mantenimiento actualizado correctamente" });

  } catch (error) {
    console.error("Error al actualizar mantenimiento:", error);
    return NextResponse.json({ success: false, error: "Error al actualizar en la base de datos." }, { status: 500 });
  }
}

// --- DELETE: Eliminar un registro de mantenimiento ---
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: "Falta el ID del mantenimiento a eliminar." }, { status: 400 });
    }

    await pool.query("DELETE FROM Historial_Mantenimiento WHERE id_mantenimiento = ?", [id]);

    return NextResponse.json({ success: true, mensaje: "Registro eliminado correctamente" });

  } catch (error) {
    console.error("Error al eliminar mantenimiento:", error);
    return NextResponse.json({ success: false, error: "Error al eliminar de la base de datos." }, { status: 500 });
  }
}