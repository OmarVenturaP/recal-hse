import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

// Necesitamos convertir el secreto al formato que usa 'jose'
const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET);

export async function middleware(request) {
  // 1. Obtenemos la ruta a la que el usuario intenta entrar
  const path = request.nextUrl.pathname;

  // 2. Definimos qué áreas son públicas y cuáles protegidas
  const isPublicPath = path === '/login' || path === '/';
  const isDashboardPath = path.startsWith('/dashboard');

  // 3. Buscamos la cookie que guardamos en el login
  const token = request.cookies.get('hse_auth_token')?.value;

  // 4. REGLA 1: Si intenta ir al Dashboard pero NO tiene token, lo regresamos al Login
  if (!token && isDashboardPath) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // 5. REGLA 2: Si SÍ tiene token, lo verificamos criptográficamente
  if (token) {
    try {
      // Intentamos abrir el token con nuestra llave maestra
      await jwtVerify(token, JWT_SECRET);

      // Si el token es válido y el usuario intenta ir al login o a la landing, 
      // lo redirigimos directamente a su área de trabajo (Dashboard)
      if (isPublicPath) {
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }

    } catch (error) {
      // Si el token expiró (pasaron las 8 horas) o alguien lo alteró manualmente:
      // Lo mandamos al login y le borramos la cookie corrupta/vencida
      const response = NextResponse.redirect(new URL('/login', request.url));
      response.cookies.delete('hse_auth_token');
      return response;
    }
  }

  // Si todo está en orden, dejamos que la petición continúe su camino normal
  return NextResponse.next();
}

// 6. Configuración: Le decimos a Next.js en qué rutas exactas debe ejecutar este guardia
export const config = {
  matcher: [
    '/',
    '/login',
    '/dashboard/:path*', // El asterisco protege todas las sub-rutas (ej. /dashboard/maquinaria)
  ]
};