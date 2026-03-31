import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET() {
  try {
    const [rows] = await pool.query(
      'SELECT nombre_puesto FROM cat_puestos_fuerza_trabajo WHERE activo = 1 ORDER BY nombre_puesto ASC'
    );
    
    return NextResponse.json({ 
      success: true, 
      puestos: rows.map(r => r.nombre_puesto) 
    });
  } catch (error) {
    console.error('Error al obtener puestos:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Error al cargar el catálogo de puestos' 
    }, { status: 500 });
  }
}