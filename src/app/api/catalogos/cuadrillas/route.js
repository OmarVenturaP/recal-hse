import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id_subcontratista = searchParams.get('id_subcontratista');

    if (!id_subcontratista) {
      return NextResponse.json({ error: "Falta el ID del subcontratista principal" }, { status: 400 });
    }
    const idEmpresa = request.headers.get('x-empresa-id');

    // Consulta las cuadrillas que pertenecen a este subcontratista
    const query = `
      SELECT id_subcontratista_ft, nombre 
      FROM Subcontratistas_Fuerza_Trabajo 
      WHERE id_subcontratista_principal = ?
      AND bActivo = 1
      AND id_empresa = ?
      ORDER BY nombre ASC
    `;
    
    const [rows] = await pool.query(query, [id_subcontratista, idEmpresa]);

    return NextResponse.json(rows);
  } catch (error) {
    console.error("Error al cargar cuadrillas:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}