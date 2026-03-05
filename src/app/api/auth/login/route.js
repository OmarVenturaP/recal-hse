import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { SignJWT } from 'jose';
import pool from '../../../../lib/db'; // Ajuste de la ruta hacia db.js

// Convertimos el secreto del .env a un formato que 'jose' pueda usar
const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET);

export async function POST(request) {
  try {
    // 1. Recibimos los datos del formulario (Frontend)
    const { correo, password } = await request.json();

    if (!correo || !password) {
      return NextResponse.json({ error: "Por favor, ingresa correo y contraseña." }, { status: 400 });
    }

    // 2. Buscamos al usuario en la base de datos
    const [users] = await pool.query('SELECT * FROM Personal_Area WHERE correo = ? AND activo = TRUE', [correo]);
    
    if (users.length === 0) {
      return NextResponse.json({ error: "Credenciales incorrectas o usuario inactivo." }, { status: 401 });
    }

    const user = users[0];

    // 3. Comparamos la contraseña ingresada con el hash guardado en MySQL
    const passwordValida = await bcrypt.compare(password, user.password);
    
    if (!passwordValida) {
      return NextResponse.json({ error: "Credenciales incorrectas." }, { status: 401 });
    }

    // 4. Actualizamos el registro de "último acceso" (opcional pero muy útil para auditoría)
    await pool.query('UPDATE Personal_Area SET ultimo_acceso = NOW() WHERE id_personal = ?', [user.id_personal]);

    // 5. Preparamos los datos que irán dentro del JWT (Nunca poner la contraseña aquí)
    const payload = {
      id: user.id_personal,
      nombre: user.nombre,
      rol: user.rol,
      area: user.area
    };

    // 6. Firmamos el JWT y le damos un tiempo de vida (ej. 8 horas de jornada laboral)
    const token = await new SignJWT(payload)
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('8h')
      .sign(JWT_SECRET);

    // 7. Preparamos la respuesta exitosa
    const response = NextResponse.json({ 
      success: true, 
      mensaje: "Inicio de sesión exitoso",
      redirectUrl: "/dashboard" 
    });

    // 8. Guardamos el JWT en una Cookie HTTP-Only por máxima seguridad
    response.cookies.set({
      name: 'hse_auth_token',
      value: token,
      httpOnly: true, // Evita que JavaScript malicioso robe el token (XSS)
      secure: process.env.NODE_ENV === 'production', // Solo HTTPS en producción
      sameSite: 'strict',
      maxAge: 60 * 60 * 8, // 8 horas en segundos
      path: '/',
    });

    return response;

  } catch (error) {
    console.error("Error en el proceso de Login:", error);
    return NextResponse.json({ error: "Error interno del servidor." }, { status: 500 });
  }
}