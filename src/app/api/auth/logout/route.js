import { NextResponse } from 'next/server';

export async function POST() {
  // Preparamos la respuesta y le decimos a dónde redirigir
  const response = NextResponse.json({ success: true, redirectUrl: '/login' });
  
  // Destruimos el "gafete" virtual
  response.cookies.delete('hse_auth_token');
  
  return response;
}