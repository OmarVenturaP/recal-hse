import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const idEmpresa = request.headers.get('x-empresa-id');
    const userRol   = request.headers.get('x-user-rol');

    const modulo      = searchParams.get('modulo');      // filtro opcional
    const accion      = searchParams.get('accion');      // filtro opcional
    const fechaInicio = searchParams.get('fechaInicio'); // YYYY-MM-DD
    const fechaFin    = searchParams.get('fechaFin');    // YYYY-MM-DD
    const limit       = Math.min(parseInt(searchParams.get('limit') || '200'), 500);

    // Asegurar que la tabla exista antes de consultarla
    await pool.query(`
      CREATE TABLE IF NOT EXISTS Historial_Auditoria (
        id_auditoria     INT NOT NULL AUTO_INCREMENT,
        id_empresa       INT DEFAULT NULL,
        modulo           VARCHAR(50) NOT NULL,
        accion           VARCHAR(20) NOT NULL,
        id_registro      VARCHAR(100) DEFAULT NULL,
        descripcion      TEXT,
        datos_anteriores JSON DEFAULT NULL,
        datos_nuevos     JSON DEFAULT NULL,
        id_usuario       INT DEFAULT NULL,
        fecha_cambio     DATETIME NOT NULL,
        PRIMARY KEY (id_auditoria),
        KEY idx_auditoria_empresa (id_empresa),
        KEY idx_auditoria_modulo  (modulo),
        KEY idx_auditoria_usuario (id_usuario),
        KEY idx_auditoria_fecha   (fecha_cambio)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
    `);

    let where  = 'WHERE 1=1';
    const params = [];

    // Multi-tenant: usuarios normales solo ven su empresa
    if (userRol !== 'Master' && idEmpresa) {
      where += ' AND h.id_empresa = ?';
      params.push(idEmpresa);
    }

    if (modulo) { where += ' AND h.modulo = ?'; params.push(modulo); }
    if (accion) { where += ' AND h.accion = ?'; params.push(accion); }
    
    // Filtro por ID de registro específico
    const idRegistro = searchParams.get('id_registro');
    if (idRegistro) {
      where += ' AND h.id_registro = ?';
      params.push(idRegistro);
    }

    if (fechaInicio) {
      where += ' AND h.fecha_cambio >= ?';
      params.push(`${fechaInicio} 00:00:00`);
    }
    if (fechaFin) {
      where += ' AND h.fecha_cambio <= ?';
      params.push(`${fechaFin} 23:59:59`);
    }

    const [rows] = await pool.query(
      `SELECT
        h.id_auditoria,
        h.modulo,
        h.accion,
        h.id_registro,
        h.descripcion,
        h.datos_anteriores,
        h.datos_nuevos,
        h.fecha_cambio,
        p.nombre AS nombre_usuario,
        p.correo AS correo_usuario,
        p.rol    AS rol_usuario
       FROM Historial_Auditoria h
       LEFT JOIN Personal_Area p ON h.id_usuario = p.id_personal
       ${where}
       ORDER BY h.fecha_cambio DESC
       LIMIT ?`,
      [...params, limit]
    );

    return NextResponse.json({ success: true, data: rows });
  } catch (error) {
    console.error('Error GET /api/trazabilidad:', error);
    return NextResponse.json({ success: false, error: 'Error al obtener historial' }, { status: 500 });
  }
}
