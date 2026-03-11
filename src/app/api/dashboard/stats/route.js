import { NextResponse } from 'next/server';
import pool from '../../../../lib/db'; 

export const dynamic = 'force-dynamic'; 

export async function GET(request) {
  try {
    // Obtenemos al usuario logueado desde los headers
    const id_usuario_actual = request.headers.get('x-user-id');
    
    if (!id_usuario_actual) {
      return NextResponse.json({ error: "Usuario no identificado" }, { status: 401 });
    }

    // 1. Averiguamos a qué área pertenece el usuario
    const [userRows] = await pool.query('SELECT area FROM Personal_Area WHERE id_personal = ?', [id_usuario_actual]);
    const areaUsuario = userRows.length > 0 ? userRows[0].area : 'Ambas';

    // 2. Armamos el filtro dinámico para la maquinaria
    let filtroArea = "";
    if (areaUsuario === 'Seguridad') {
      filtroArea = " AND area = 'seguridad'";
    } else if (areaUsuario === 'Medio Ambiente') {
      filtroArea = " AND area = 'ambiental'";
    }
    // Si es 'Ambas', el filtroArea se queda vacío y cuenta todo.

    // 3. Contar Maquinaria Activa respetando su área
    const [maquinaria] = await pool.query(
      `SELECT COUNT(*) as total FROM Maquinaria_Equipo WHERE fecha_baja IS NULL${filtroArea}`
    );

    // 4. Contar Personal Activo (Esto se mantiene global o se puede filtrar después si lo requieres)
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