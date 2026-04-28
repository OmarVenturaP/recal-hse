import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const idEmpresa = request.headers.get('x-empresa-id');
    const userRol = request.headers.get('x-user-rol');
    const userArea = request.headers.get('x-user-area');

    // Validación de Autorización
    const isAuthorized = userRol === 'Admin' || 
                         userRol === 'Master' || 
                         (userArea && userArea.toLowerCase().includes('ambiente'));

    if (!isAuthorized || !idEmpresa) {
      return NextResponse.json({ error: "No autorizado o empresa no identificada" }, { status: 403 });
    }

    const mes = searchParams.get('mes');
    const anio = searchParams.get('anio');
    
    let query;
    let params = [idEmpresa];

    if (mes && anio) {
      // Consulta mejorada para obtener estados dinámicos
      query = `
        SELECT 
          c.*,
          idx.id_item,
          idx.is_na,
          idx.frente_trabajo,
          idx.total_fotos,
          CASE 
            WHEN idx.is_na = 1 THEN 'NA'
            WHEN idx.id_item IS NULL THEN 'PENDIENTE'
            WHEN idx.frente_trabajo IS NOT NULL 
                 AND idx.frente_trabajo != '' 
                 AND idx.total_fotos >= 6 
                 AND idx.fotos_sin_pie = 0 
                 AND idx.observaciones IS NOT NULL 
                 AND idx.observaciones != '' THEN 'LLENADO'
            ELSE 'INCOMPLETO'
          END as status
        FROM Ambiental_Catalogo_Reportes c
        LEFT JOIN (
          SELECT 
            i.id_cat_reporte, 
            i.id_item, 
            i.is_na, 
            i.frente_trabajo,
            i.observaciones,
            (SELECT COUNT(*) FROM Ambiental_Reportes_Fotos f WHERE f.id_item = i.id_item) as total_fotos,
            (SELECT COUNT(*) FROM Ambiental_Reportes_Fotos f WHERE f.id_item = i.id_item AND (f.pie_de_foto IS NULL OR f.pie_de_foto = '')) as fotos_sin_pie
          FROM Ambiental_Reportes_Items i
          JOIN Ambiental_Dossier d ON i.id_dossier = d.id_dossier
          WHERE d.id_empresa = ? AND d.mes = ? AND d.anio = ?
        ) idx ON c.id_cat_reporte = idx.id_cat_reporte
        WHERE c.bActivo = 1 
        AND (c.id_empresa_especifica IS NULL OR c.id_empresa_especifica = ?)
        ORDER BY c.nombre_reporte ASC
      `;
      params = [idEmpresa, mes, anio, idEmpresa];
    } else {
      query = `
        SELECT *, 0 as completado FROM Ambiental_Catalogo_Reportes 
        WHERE bActivo = 1 
        AND (id_empresa_especifica IS NULL OR id_empresa_especifica = ?)
        ORDER BY nombre_reporte ASC
      `;
    }
    
    const [rows] = await pool.query(query, params);

    return NextResponse.json({ success: true, data: rows });
  } catch (error) {
    console.error("Error cargando catálogo ambiental:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
