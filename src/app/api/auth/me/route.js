import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET);

export async function GET(request) {
  const token = request.cookies.get('hse_auth_token')?.value;
  if (!token) return NextResponse.json({ success: false });

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    // Le devolvemos al frontend los datos limpios del usuario actual
    return NextResponse.json({ success: true, user: payload });
  } catch (error) {
    return NextResponse.json({ success: false });
  }
}