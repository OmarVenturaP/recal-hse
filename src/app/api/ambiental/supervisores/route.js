import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(request) {
  try {
    const idEmpresa = request.headers.get('x-empresa-id');
    const userRol = request.headers.get('x-user-rol');
    const userArea = request.headers.get('x-user-area');

    // Validación de Autorización
    const isAuthorized = userRol === 'Admin' || 
                         userRol === 'Master' || 
                         (userArea && (userArea.toLowerCase().includes('ambiente') || userArea.toLowerCase().includes('ambiental')));

    if (!isAuthorized || !idEmpresa) {
      return NextResponse.json({ success: false, error: "No autorizado o empresa no identificada" }, { status: 403 });
    }

    // El usuario especifica: tabla Fuerza_Trabajo y columna CATEGORIA (puesto_categoria)
    const [rows] = await pool.query(`
      SELECT 
        CONCAT(nombre_trabajador, ' ', IFNULL(apellido_trabajador, '')) as nombre,
        puesto_categoria as rol
      FROM Fuerza_Trabajo 
      WHERE id_empresa = ? 
        AND fecha_baja IS NULL
        AND bActivo = 1
        AND (
          puesto_categoria LIKE '%Supervisor%' 
          OR puesto_categoria LIKE '%Seguridad%' 
          OR puesto_categoria LIKE '%Técnico%' 
          OR puesto_categoria LIKE '%Tecnico%'
          OR puesto_categoria LIKE '%Ambiental%'
        )
      ORDER BY nombre_trabajador ASC
    `, [idEmpresa]);

    return NextResponse.json({ success: true, data: rows });
  } catch (error) {
    console.error("Error al obtener supervisores de Fuerza_Trabajo:", error);
    return NextResponse.json({ success: false, error: "Error al obtener la lista de supervisores" }, { status: 500 });
  }
}
