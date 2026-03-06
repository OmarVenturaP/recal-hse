import { NextResponse } from 'next/server';
import pool from '../../../../lib/db'; 
import bcrypt from 'bcryptjs';
import { SignJWT } from 'jose';

// Necesitamos el secreto para firmar la nueva credencial
const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET);

export async function POST(request) {
  try {
    const { nueva_password } = await request.json();
    const id_usuario_actual = request.headers.get('x-user-id'); 

    if (!id_usuario_actual) {
      return NextResponse.json({ error: "Sesión no válida o expirada." }, { status: 401 });
    }

    if (!nueva_password || nueva_password.length < 8) {
      return NextResponse.json({ error: "La contraseña debe tener al menos 8 caracteres." }, { status: 400 });
    }

    // 1. Encriptamos la nueva contraseña
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(nueva_password, salt);

    // 2. Actualizamos la BD y "apagamos" la bandera
    const query = `
      UPDATE Personal_Area 
      SET password = ?, debe_cambiar_password = 0 
      WHERE id_personal = ?
    `;
    await pool.query(query, [hashedPassword, id_usuario_actual]);

    // --- NUEVO: CREAR UN NUEVO TOKEN ACTUALIZADO ---
    
    // Obtenemos los datos del usuario para el nuevo payload
    const [users] = await pool.query('SELECT * FROM Personal_Area WHERE id_personal = ?', [id_usuario_actual]);
    const user = users[0];

    // Armamos el payload con requiere_cambio en FALSE
    const payload = {
      id: user.id_personal,
      nombre: user.nombre,
      rol: user.rol,
      area: user.area,
      requiere_cambio: false 
    };

    // Firmamos el nuevo token
    const token = await new SignJWT(payload)
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('8h')
      .sign(JWT_SECRET);

    const response = NextResponse.json({ success: true, mensaje: "Contraseña actualizada exitosamente." });

    // Sobreescribimos la cookie vieja con la nueva
    response.cookies.set({
      name: 'hse_auth_token',
      value: token,
      httpOnly: true, 
      secure: process.env.NODE_ENV === 'production', 
      sameSite: 'strict',
      maxAge: 60 * 60 * 8, 
      path: '/',
    });

    return response;

  } catch (error) {
    console.error("Error al cambiar contraseña:", error);
    return NextResponse.json({ success: false, error: "Error interno del servidor" }, { status: 500 });
  }
}