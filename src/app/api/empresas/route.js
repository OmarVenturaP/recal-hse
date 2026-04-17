import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(request) {
  try {
    const userRol = request.headers.get('x-user-rol');
    
    // Solo Master tiene acceso a interactuar con los Tenants base
    if (userRol !== 'Master') {
      return NextResponse.json({ error: 'Acceso denegado. Solo nivel Master.' }, { status: 403 });
    }

    // --- MIGRACIÓN SILENCIOSA ---
    try {
      await pool.query(`ALTER TABLE cat_empresas ADD COLUMN fecha_inicio_plan DATE DEFAULT NULL AFTER estado`);
    } catch(e) {}

    const query = `
      SELECT id_empresa, nombre_comercial, rfc, plan_suscripcion, estado, fecha_registro, fecha_inicio_plan
      FROM cat_empresas 
      WHERE estado = 'activo'
      ORDER BY nombre_comercial ASC
    `;
    const [rows] = await pool.query(query);
    
    return NextResponse.json({ success: true, data: rows });
  } catch (error) {
    console.error("Error cargando empresas:", error);
    return NextResponse.json({ error: "Error de BD" }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const userRol = request.headers.get('x-user-rol');
    if (userRol !== 'Master') return NextResponse.json({ error: 'Acceso denegado.' }, { status: 403 });

    const body = await request.json();
    const { nombre_comercial, rfc, plan_suscripcion, fecha_inicio_plan } = body;

    if (!nombre_comercial || !plan_suscripcion) {
      return NextResponse.json({ error: 'El nombre comercial y el plan son obligatorios.' }, { status: 400 });
    }

    const query = `INSERT INTO cat_empresas (nombre_comercial, rfc, plan_suscripcion, fecha_inicio_plan) VALUES (?, ?, ?, ?)`;
    const [result] = await pool.query(query, [nombre_comercial, rfc || null, plan_suscripcion, fecha_inicio_plan || null]);

    return NextResponse.json({ success: true, id_empresa: result.insertId });
  } catch (error) {
    console.error("Error guardando empresa:", error);
    return NextResponse.json({ error: "Error al guardar la empresa" }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const userRol = request.headers.get('x-user-rol');
    if (userRol !== 'Master') return NextResponse.json({ error: 'Acceso denegado.' }, { status: 403 });

    const body = await request.json();
    const { id_empresa, nombre_comercial, rfc, plan_suscripcion, fecha_inicio_plan } = body;

    if (!id_empresa || !nombre_comercial || !plan_suscripcion) {
      return NextResponse.json({ error: 'Datos incompletos.' }, { status: 400 });
    }

    const query = `UPDATE cat_empresas SET nombre_comercial = ?, rfc = ?, plan_suscripcion = ?, fecha_inicio_plan = ? WHERE id_empresa = ?`;
    await pool.query(query, [nombre_comercial, rfc || null, plan_suscripcion, fecha_inicio_plan || null, id_empresa]);

    return NextResponse.json({ success: true, mensaje: "Actualizado correctamente" });
  } catch (error) {
    console.error("Error actualizando empresa:", error);
    return NextResponse.json({ error: "Error al actualizar la empresa" }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    // Para desactivar lógicamente (DELETE)
    const userRol = request.headers.get('x-user-rol');
    if (userRol !== 'Master') return NextResponse.json({ error: 'Acceso denegado.' }, { status: 403 });

    const body = await request.json();
    const { id_empresa, estado } = body;

    if (!id_empresa) return NextResponse.json({ error: 'ID requerido.' }, { status: 400 });

    const query = `UPDATE cat_empresas SET estado = ? WHERE id_empresa = ?`;
    await pool.query(query, [estado || 'inactivo', id_empresa]);

    return NextResponse.json({ success: true, mensaje: "Estado actualizado" });
  } catch (error) {
    console.error("Error en PATCH empresa:", error);
    return NextResponse.json({ error: "Error de servidor." }, { status: 500 });
  }
}
