import { NextResponse } from 'next/server';
import pool from '../../../../lib/db'; // Aseguramos que la ruta hacia db.js sea correcta (4 niveles arriba)

// --- GET: Obtener el historial completo de una máquina ---
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id_maquinaria = searchParams.get('id_maquinaria');

    if (!id_maquinaria) {
      return NextResponse.json({ error: "Falta el ID de la maquinaria." }, { status: 400 });
    }

    // Buscamos todos los servicios y los ordenamos por fecha (del más reciente al más antiguo)
    const [rows] = await pool.query(
      `SELECT id_mantenimiento, id_maquinaria, fecha_mantenimiento, tipo_mantenimiento, horometro_mantenimiento, observaciones 
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
    const { id_maquinaria, fecha_mantenimiento, tipo_mantenimiento, horometro_mantenimiento, observaciones } = body;

    // Validación de seguridad
    if (!id_maquinaria || !fecha_mantenimiento || !tipo_mantenimiento || !horometro_mantenimiento) {
      return NextResponse.json({ error: "Faltan campos obligatorios para registrar el servicio." }, { status: 400 });
    }

    const query = `
      INSERT INTO Historial_Mantenimiento 
      (id_maquinaria, fecha_mantenimiento, tipo_mantenimiento, horometro_mantenimiento, observaciones) 
      VALUES (?, ?, ?, ?, ?)
    `;
    
    const [result] = await pool.query(query, [
      id_maquinaria, 
      fecha_mantenimiento, 
      tipo_mantenimiento, 
      horometro_mantenimiento, 
      observaciones || null // Si no hay observaciones, mandamos nulo para que MySQL no marque error
    ]);

    // Opcional pero recomendado: Actualizar también el horómetro actual de la máquina principal
    // para que siempre esté sincronizada con su último servicio.
    await pool.query(
      `UPDATE Maquinaria_Equipo SET horometro = ? WHERE id_maquinaria = ?`,
      [horometro_mantenimiento, id_maquinaria]
    );

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