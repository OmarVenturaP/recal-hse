import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(request) {
  try {
    const idEmpresa = request.headers.get('x-empresa-id');
    const userRol = request.headers.get('x-user-rol');

    let whereClause = "";
    const queryParams = [];

    if (userRol !== 'Master' && idEmpresa) {
      whereClause = "WHERE id_empresa = ?";
      queryParams.push(idEmpresa);
    }

    const [principales] = await pool.query(`SELECT id_subcontratista, razon_social FROM Subcontratistas ${whereClause} ORDER BY razon_social ASC`, queryParams);
    
    // Agregamos el id_subcontratista_principal a la consulta para poder hacer el filtro en cascada
    let whereCuadrillas = "";
    if (userRol !== 'Master' && idEmpresa) {
      whereCuadrillas = "WHERE ft.id_empresa = ?";
    }

    const [cuadrillas] = await pool.query(`
      SELECT ft.id_subcontratista_ft, ft.nombre, ft.id_subcontratista_principal, p.razon_social as principal_nombre 
      FROM Subcontratistas_Fuerza_Trabajo ft
      LEFT JOIN Subcontratistas p ON ft.id_subcontratista_principal = p.id_subcontratista
      ${whereCuadrillas}
      ORDER BY ft.nombre ASC
    `, queryParams);

    return NextResponse.json({ success: true, principales, cuadrillas });
  } catch (error) {
    console.error("Error al cargar catálogos:", error);
    return NextResponse.json({ success: false, error: "Error de BD" }, { status: 500 });
  }
}