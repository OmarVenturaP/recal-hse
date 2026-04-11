import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { SignJWT } from 'jose';
import pool from '@/lib/db'; 

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET);

export async function POST(request) {
  try {
    const { correo, password } = await request.json();

    if (!correo || !password) {
      return NextResponse.json({ error: "Por favor, ingresa correo y contraseña." }, { status: 400 });
    }

    const [users] = await pool.query(
      `SELECT p.*, e.nombre_comercial as empresa_nombre, e.plan_suscripcion 
       FROM Personal_Area p
       LEFT JOIN cat_empresas e ON p.id_empresa = e.id_empresa
       WHERE p.correo = ? AND p.activo = TRUE`, 
      [correo]
    );
    
    if (users.length === 0) {
      return NextResponse.json({ error: "Credenciales incorrectas o usuario inactivo." }, { status: 401 });
    }

    const user = users[0];

    const passwordValida = await bcrypt.compare(password, user.password);
    
    if (!passwordValida) {
      return NextResponse.json({ error: "Credenciales incorrectas." }, { status: 401 });
    }

    await pool.query('UPDATE Personal_Area SET ultimo_acceso = NOW() WHERE id_personal = ?', [user.id_personal]);

    // --- NUEVO: VERIFICAR SI DEBE CAMBIAR CONTRASEÑA ---
    const requiereCambio = user.debe_cambiar_password === 1;
    // Si requiere cambio, lo mandamos a la pantalla especial; si no, entra normal al dashboard
    const destinoUrl = requiereCambio ? "/cambiar-password" : "/dashboard";
    // ---------------------------------------------------

    // Agregamos "requiere_cambio" y "id_empresa" al payload para que el Middleware lo sepa
    const payload = {
      id: user.id_personal,
      nombre: user.nombre,
      rol: user.rol,
      area: user.area,
      id_empresa: user.id_empresa, // <-- NUEVO: Agregado para soporte Multi-Tenant
      empresa_nombre: user.empresa_nombre, // <-- NUEVO: Nombre dinámico para la UI
      plan_suscripcion: user.plan_suscripcion || 'Free',
      requiere_cambio: requiereCambio,
      permisos_citas: user.permisos_citas
    };

    const token = await new SignJWT(payload)
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('8h')
      .sign(JWT_SECRET);

    const response = NextResponse.json({ 
      success: true, 
      mensaje: requiereCambio ? "Requiere cambio de contraseña" : "Inicio de sesión exitoso",
      redirectUrl: destinoUrl 
    });

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
    console.error("Error en el proceso de Login:", error);
    return NextResponse.json({ error: "Error interno del servidor." }, { status: 500 });
  }
}