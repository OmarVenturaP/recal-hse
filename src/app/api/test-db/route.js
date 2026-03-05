import { NextResponse } from 'next/server';
import pool from '../../../lib/db'; 

export async function GET() {
  try {
    // Cambio clave: Usar comillas simples para el texto del mensaje
    const [rows] = await pool.query("SELECT NOW() AS hora_actual, '¡Conexión exitosa a la base de datos de RECAL!' AS mensaje");
    
    return NextResponse.json({
      success: true,
      data: rows[0]
    });

  } catch (error) {
    console.error("Error de conexión a MySQL:", error);
    
    return NextResponse.json({
      success: false,
      mensaje: "Fallo al conectar con MySQL",
      detalles: error.message
    }, { status: 500 });
  }
}