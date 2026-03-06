import { NextResponse } from 'next/server';
import pool from '../../../lib/db';
import bcrypt from 'bcryptjs';

// GET: Obtener todos los usuarios (Solo para Master/Admin)
export async function GET(request) {
  try {

    const rolUsuarioActual = request.headers.get('x-user-rol');
    
    if (rolUsuarioActual !== 'Master') {
      return NextResponse.json({ success: false, error: "Acceso denegado. Solo nivel Master." }, { status: 403 });
    }
    // Por seguridad, no devolvemos el campo de password al frontend
    const query = `
      SELECT id_personal, nombre, cargo, correo, ultimo_acceso, area, rol, activo, debe_cambiar_password 
      FROM Personal_Area 
      ORDER BY id_personal DESC
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

    const { nombre, cargo, correo, area, rol } = await request.json();

    // Encriptamos la contraseña genérica "RecalHSE"
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash("RecalHSE", salt);

    const query = `
      INSERT INTO Personal_Area (nombre, cargo, correo, password, area, rol, activo, debe_cambiar_password) 
      VALUES (?, ?, ?, ?, ?, ?, 1, 1)
    `;
    const [result] = await pool.query(query, [nombre, cargo, correo, hashedPassword, area, rol]);

    return NextResponse.json({ success: true, mensaje: "Usuario creado exitosamente" });
  } catch (error) {
    // Manejo del error si el correo ya existe (UNIQUE KEY)
    if (error.code === 'ER_DUP_ENTRY') {
      return NextResponse.json({ success: false, error: "El correo ya está registrado" }, { status: 400 });
    }
    console.error("Error creando usuario:", error);
    return NextResponse.json({ success: false, error: "Error al crear usuario" }, { status: 500 });
  }
}

// PUT: Actualizar rol, área o estatus (Activo/Inactivo)
export async function PUT(request) {
  try {

    const rolUsuarioActual = request.headers.get('x-user-rol');
    
    if (rolUsuarioActual !== 'Master') {
      return NextResponse.json({ success: false, error: "Acceso denegado. Solo nivel Master." }, { status: 403 });
    }

    const { id_personal, nombre, cargo, correo, area, rol, activo } = await request.json();

    const query = `
      UPDATE Personal_Area 
      SET nombre = ?, cargo = ?, correo = ?, area = ?, rol = ?, activo = ?
      WHERE id_personal = ?
    `;
    await pool.query(query, [nombre, cargo, correo, area, rol, activo, id_personal]);

    return NextResponse.json({ success: true, mensaje: "Usuario actualizado" });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return NextResponse.json({ success: false, error: "El correo ya está registrado en otro usuario" }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: "Error al actualizar" }, { status: 500 });
  }
}

// PATCH: Restaurar contraseña a "RecalHSE"
export async function PATCH(request) {
  try {
    const { id_personal } = await request.json();

    // Volvemos a generar el hash de la contraseña genérica
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash("RecalHSE", salt);

    // Actualizamos la BD y encendemos la bandera para que el sistema lo obligue a cambiarla de nuevo
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