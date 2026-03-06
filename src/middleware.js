import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET);

export async function middleware(request) {
  // 1. Obtenemos la ruta
  const path = request.nextUrl.pathname;

  // 2. Definimos áreas
  const isPublicPath = path === '/login' || path === '/';
  const isDashboardPath = path.startsWith('/dashboard');
  const isApiPath = path.startsWith('/api'); // NUEVO: Identificamos si intenta acceder a la base de datos
  const isApiLogin = path.includes('/login') || path.includes('/auth');

  // 3. Buscamos la cookie
  const token = request.cookies.get('hse_auth_token')?.value;

  // 4. REGLA 1: Sin token -> Redirigir (Dashboard) o Bloquear (API)
  if (!token) {
    if (isDashboardPath) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    if (isApiPath && !isApiLogin) {
      return NextResponse.json({ success: false, error: "Acceso denegado a la API" }, { status: 401 });
    }
  }

  // 5. REGLA 2: Con token -> Verificar y procesar
  if (token) {
    try {
      // Intentamos abrir el token
      const { payload } = await jwtVerify(token, JWT_SECRET);

      // Si va al login estando logeado, lo mandamos al dashboard
      if (isPublicPath) {
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }

      // --- LA MAGIA SUCEDE AQUÍ ---
      // NUEVO: Blindaje contra usuarios que deben cambiar contraseña
      const isCambiarPasswordPath = path === '/cambiar-password';
      
      if (payload.requiere_cambio && !isCambiarPasswordPath && !isApiPath) {
        return NextResponse.redirect(new URL('/cambiar-password', request.url));
      }
      
      // Si NO requiere cambio, pero intenta ir a la pantalla de cambiar contraseña, lo regresamos al dashboard
      if (!payload.requiere_cambio && isCambiarPasswordPath) {
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }

      // Clonamos los headers (cabeceras) de la petición original
      const requestHeaders = new Headers(request.headers);
      
      requestHeaders.set('x-user-id', payload.id_usuario || payload.id);
      requestHeaders.set('x-user-rol', payload.rol); // <-- AGREGAR ESTA LÍNEA

      return NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      });

    } catch (error) {
      // Token expirado o corrupto
      if (isApiPath && !isApiLogin) {
        return NextResponse.json({ success: false, error: "Token expirado o inválido" }, { status: 401 });
      }
      
      const response = NextResponse.redirect(new URL('/login', request.url));
      response.cookies.delete('hse_auth_token');
      return response;
    }
  }

  return NextResponse.next();
}

// 6. Configuración de rutas a proteger
export const config = {
  matcher: [
    '/',
    '/login',
    '/dashboard/:path*',
    '/api/:path*', // NUEVO: Ahora el guardia también protege todas tus consultas a MySQL
    '/cambiar-password' // NUEVO: Protegemos la ruta de cambiar contraseña
  ]
};