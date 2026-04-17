import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(request) {
  try {
    const userRol = request.headers.get('x-user-rol');
    if (userRol !== 'Master') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const query = `
      SELECT s.id_subcontratista, s.razon_social, s.fecha_corte, e.nombre_comercial as empresa_nombre
      FROM Subcontratistas s
      LEFT JOIN cat_empresas e ON s.id_empresa = e.id_empresa
      WHERE s.bActivo = 1
      ORDER BY e.nombre_comercial ASC, s.razon_social ASC
    `;
    const [rows] = await pool.query(query);
    return NextResponse.json({ success: true, data: rows });
  } catch (error) {
    console.error("Error en admin contratistas:", error);
    return NextResponse.json({ error: "Error de servidor" }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const userRol = request.headers.get('x-user-rol');
    if (userRol !== 'Master') return NextResponse.json({ error: 'No autorizado' }, { status: 403 });

    const { id_subcontratista, fecha_corte } = await request.json();

    if (!id_subcontratista) return NextResponse.json({ error: 'ID requerido' }, { status: 400 });

    await pool.query('UPDATE Subcontratistas SET fecha_corte = ? WHERE id_subcontratista = ?', [fecha_corte || null, id_subcontratista]);

    return NextResponse.json({ success: true, mensaje: "Fecha de corte actualizada" });
  } catch (error) {
    console.error("Error actualizando fecha corte:", error);
    return NextResponse.json({ error: "Error al actualizar" }, { status: 500 });
  }
}
