import { NextResponse } from 'next/server';
import pool from '../../../../lib/db';

export async function GET() {
  try {
    const [principales] = await pool.query('SELECT id_subcontratista, razon_social FROM Subcontratistas ORDER BY razon_social ASC');
    
    // Agregamos el id_subcontratista_principal a la consulta para poder hacer el filtro en cascada
    const [cuadrillas] = await pool.query(`
      SELECT ft.id_subcontratista_ft, ft.nombre, ft.id_subcontratista_principal, p.razon_social as principal_nombre 
      FROM Subcontratistas_Fuerza_Trabajo ft
      LEFT JOIN Subcontratistas p ON ft.id_subcontratista_principal = p.id_subcontratista
      ORDER BY ft.nombre ASC
    `);

    return NextResponse.json({ success: true, principales, cuadrillas });
  } catch (error) {
    console.error("Error al cargar catálogos:", error);
    return NextResponse.json({ success: false, error: "Error de BD" }, { status: 500 });
  }
}