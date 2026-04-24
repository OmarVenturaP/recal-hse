import { NextResponse } from 'next/server';
import pool from '@/lib/db';

async function validarPermisos(request) {
  const userId = request.headers.get('x-user-id');
  if (!userId) return null;

  const [rows] = await pool.query(
    'SELECT permisos_ft FROM Personal_Area WHERE id_personal = ?',
    [userId]
  );
  
  if (rows.length > 0 && rows[0].permisos_ft === 1) {
    return rows[0];
  }
  return null;
}

export async function GET(request) {
  try {
    const user = await validarPermisos(request);
    if (!user) {
      return NextResponse.json({ success: false, error: 'No tienes permisos para ver este catálogo' }, { status: 403 });
    }

    const [rows] = await pool.query(
      'SELECT id_puesto, nombre_puesto, activo FROM cat_puestos_fuerza_trabajo WHERE activo = 1 ORDER BY nombre_puesto ASC'
    );
    
    return NextResponse.json({ 
      success: true, 
      puestos: rows.map(r => ({ id: r.id_puesto, nombre: r.nombre_puesto }))
    });
  } catch (error) {
    console.error('Error al obtener puestos:', error);
    return NextResponse.json({ success: false, error: 'Error al cargar puestos' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const user = await validarPermisos(request);
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });

    const { nombre } = await request.json();
    if (!nombre) return NextResponse.json({ error: 'Nombre requerido' }, { status: 400 });

    const [result] = await pool.query(
      'INSERT INTO cat_puestos_fuerza_trabajo (nombre_puesto, activo) VALUES (?, 1)',
      [nombre.trim().toUpperCase()]
    );

    return NextResponse.json({ success: true, id: result.insertId });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const user = await validarPermisos(request);
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });

    const { id, nombre } = await request.json();
    if (!id || !nombre) return NextResponse.json({ error: 'Faltan datos' }, { status: 400 });

    await pool.query(
      'UPDATE cat_puestos_fuerza_trabajo SET nombre_puesto = ? WHERE id_puesto = ?',
      [nombre.trim().toUpperCase(), id]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const user = await validarPermisos(request);
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 });

    await pool.query(
      'UPDATE cat_puestos_fuerza_trabajo SET activo = 0 WHERE id_puesto = ?',
      [id]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}