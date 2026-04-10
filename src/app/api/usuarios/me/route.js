import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(request) {
  try {
    const usuarioActual = request.headers.get('x-user-id');

    // Validación extra por si el header viene vacío
    if (!usuarioActual) {
      return NextResponse.json({ success: false, error: "Usuario no identificado" }, { status: 401 });
    }

    const query = `
      SELECT id_personal, nombre, cargo, ultimo_acceso, area, permisos_ft, permisos_certificados, permisos_maquinaria, permisos_dc3, permisos_informe, permisos_citas, rol, activo, debe_cambiar_password 
      FROM Personal_Area 
      WHERE id_personal = ?
      ORDER BY id_personal DESC
    `;
    
    // Pasamos la variable como parámetro en el arreglo
    const [rows] = await pool.query(query, [usuarioActual]);
    
    return NextResponse.json({ success: true, data: rows });
  } catch (error) {
    console.error("Error obteniendo usuarios:", error);
    return NextResponse.json({ success: false, error: "Error interno" }, { status: 500 });
  }
}