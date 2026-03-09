import { NextResponse } from 'next/server';
import pool from '../../../../lib/db'; // Ajusta la ruta a tu db.js si es necesario

export const dynamic = 'force-dynamic'; // Evita que Next.js cachee este número

export async function GET() {
  try {
    // 1. Contar Maquinaria Activa
    const [maquinaria] = await pool.query(
      `SELECT COUNT(*) as total FROM Maquinaria_Equipo WHERE fecha_baja IS NULL`
    );

    // 2. Contar Personal Activo
    const [personal] = await pool.query(
      `SELECT COUNT(*) as total FROM Fuerza_Trabajo WHERE fecha_baja IS NULL`
    );

    return NextResponse.json({
      success: true,
      maquinariaActiva: maquinaria[0].total,
      personalActivo: personal[0].total
    });

  } catch (error) {
    console.error("Error consultando estadísticas del dashboard:", error);
    return NextResponse.json({ success: false, error: "Error al cargar datos" }, { status: 500 });
  }
}