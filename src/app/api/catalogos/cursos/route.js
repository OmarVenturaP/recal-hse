import { NextResponse } from 'next/server';
import pool from '../../../../lib/db';

export async function GET(request) {
  try {
    const query = `
      SELECT 
        c.id_curso, 
        c.nombre_curso, 
        c.duracion_horas, 
        c.area_tematica,
        a.id_agente,
        a.nombre_agente 
      FROM Cursos_Capacitacion c
      INNER JOIN Agentes_Capacitadores a ON c.id_agente = a.id_agente
      WHERE c.bActivo = 1 AND a.bActivo = 1
      ORDER BY c.nombre_curso ASC
    `;

    const [rows] = await pool.query(query);

    return NextResponse.json({ 
      success: true, 
      data: rows 
    });

  } catch (error) {
    console.error("Error al obtener el catálogo de cursos:", error);
    return NextResponse.json(
      { success: false, error: "Error interno al consultar los cursos" }, 
      { status: 500 }
    );
  }
}