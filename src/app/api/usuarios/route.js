import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import bcrypt from 'bcryptjs';

// GET: Obtener todos los usuarios (Solo para Master)
export async function GET(request) {
  try {
    const rolUsuarioActual = request.headers.get('x-user-rol');
    
    if (rolUsuarioActual !== 'Master') {
      return NextResponse.json({ success: false, error: "Acceso denegado. Solo nivel Master." }, { status: 403 });
    }

    // --- MIGRACIÓN SILENCIOSA ---
    try {
      await pool.query('ALTER TABLE Personal_Area ADD COLUMN permisos_citas TINYINT DEFAULT 0 AFTER permisos_informe');
    } catch (e) { /* Columna ya existe u otro error insignificante */ }

    const query = `
      SELECT 
        p.id_personal, p.nombre, p.cargo, p.correo, p.ultimo_acceso, p.area, p.rol, p.activo, p.debe_cambiar_password, p.id_empresa, 
        p.permisos_ft, p.permisos_certificados, p.permisos_maquinaria, p.permisos_dc3, p.permisos_informe, p.permisos_citas,
        e.nombre_comercial as empresa_nombre 
      FROM Personal_Area p
      LEFT JOIN cat_empresas e ON p.id_empresa = e.id_empresa
      ORDER BY p.id_personal DESC
    `;
    const [rows] = await pool.query(query);
    return NextResponse.json({ success: true, data: rows });
  } catch (error) {
    console.error("Error obteniendo usuarios:", error);
    return NextResponse.json({ success: false, error: "Error interno" }, { status: 500 });
  }
}

// POST: Crear nuevo usuario
export async function POST(request) {
  try {
    const rolUsuarioActual = request.headers.get('x-user-rol');
    
    if (rolUsuarioActual !== 'Master') {
      return NextResponse.json({ success: false, error: "Acceso denegado. Solo nivel Master." }, { status: 403 });
    }

    const body = await request.json();
    const { 
      nombre, cargo, correo, area, rol, id_empresa,
      permisos_ft, permisos_certificados, permisos_maquinaria, permisos_dc3, permisos_informe, permisos_citas 
    } = body;

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash("RecalHSE", salt);

    const query = `
      INSERT INTO Personal_Area (
        nombre, cargo, correo, password, area, rol, activo, debe_cambiar_password, id_empresa,
        permisos_ft, permisos_certificados, permisos_maquinaria, permisos_dc3, permisos_informe, permisos_citas
      ) 
      VALUES (?, ?, ?, ?, ?, ?, 1, 1, ?, ?, ?, ?, ?, ?, ?)
    `;
    await pool.query(query, [
      nombre, cargo, correo, hashedPassword, area, rol, id_empresa || 1,
      permisos_ft || 0, permisos_certificados || 0, permisos_maquinaria || 0, permisos_dc3 || 0, permisos_informe || 0, permisos_citas || 0
    ]);

    return NextResponse.json({ success: true, mensaje: "Usuario creado exitosamente" });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return NextResponse.json({ success: false, error: "El correo ya está registrado" }, { status: 400 });
    }
    console.error("Error creando usuario:", error);
    return NextResponse.json({ success: false, error: "Error al crear usuario" }, { status: 500 });
  }
}

// PUT: Actualizar usuario completo
export async function PUT(request) {
  try {
    const rolUsuarioActual = request.headers.get('x-user-rol');
    
    if (rolUsuarioActual !== 'Master') {
      return NextResponse.json({ success: false, error: "Acceso denegado. Solo nivel Master." }, { status: 403 });
    }

    const body = await request.json();
    const { 
      id_personal, nombre, cargo, correo, area, rol, activo, id_empresa,
      permisos_ft, permisos_certificados, permisos_maquinaria, permisos_dc3, permisos_informe, permisos_citas
    } = body;

    const query = `
      UPDATE Personal_Area 
      SET nombre = ?, cargo = ?, correo = ?, area = ?, rol = ?, activo = ?, id_empresa = ?,
          permisos_ft = ?, permisos_certificados = ?, permisos_maquinaria = ?, permisos_dc3 = ?, permisos_informe = ?, permisos_citas = ?
      WHERE id_personal = ?
    `;
    await pool.query(query, [
      nombre, cargo, correo, area, rol, activo, id_empresa || 1,
      permisos_ft || 0, permisos_certificados || 0, permisos_maquinaria || 0, permisos_dc3 || 0, permisos_informe || 0, permisos_citas || 0,
      id_personal
    ]);

    return NextResponse.json({ success: true, mensaje: "Usuario actualizado" });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return NextResponse.json({ success: false, error: "El correo ya está registrado en otro usuario" }, { status: 400 });
    }
    console.error("Error actualizando usuario:", error);
    return NextResponse.json({ success: false, error: "Error al actualizar" }, { status: 500 });
  }
}

// PATCH: Restaurar contraseña
export async function PATCH(request) {
  try {
    const { id_personal } = await request.json();
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash("RecalHSE", salt);

    const query = `
      UPDATE Personal_Area 
      SET password = ?, debe_cambiar_password = 1 
      WHERE id_personal = ?
    `;
    await pool.query(query, [hashedPassword, id_personal]);

    return NextResponse.json({ success: true, mensaje: "Contraseña restaurada a RecalHSE" });
  } catch (error) {
    console.error("Error restaurando password:", error);
    return NextResponse.json({ success: false, error: "Error interno en BD" }, { status: 500 });
  }
}