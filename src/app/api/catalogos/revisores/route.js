import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET() {
  try {
    // Solo extraemos el ID y el Nombre de los usuarios activos. Cero datos sensibles.
    const [rows] = await pool.query('SELECT id_personal, nombre, area FROM Personal_Area WHERE activo = 1 AND id_personal != 1 ORDER BY nombre ASC');
    
    return NextResponse.json({ success: true, data: rows });
  } catch (error) {
    console.error("Error obteniendo catálogo de revisores:", error);
    return NextResponse.json({ success: false, error: 'Error al cargar revisores' }, { status: 500 });
  }
}