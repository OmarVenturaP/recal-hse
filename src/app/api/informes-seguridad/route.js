import { NextResponse } from 'next/server';
import pool from '@/lib/db';

// =====================================================================
// GET: Listar informes por mes (filtro obligatorio)
// Query params: ?mes=YYYY-MM   |  ?hh_anterior=1&mes=YYYY-MM&id_subcontratista=X&num_reporte=N
// =====================================================================
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);

    const idEmpresa = request.headers.get('x-empresa-id');
    const userRole = request.headers.get('x-user-rol');

    // Sub-endpoint: calcular hh_semana_anterior para un reporte nuevo
    if (searchParams.get('hh_anterior') === '1') {
      const mes = searchParams.get('mes');
      const idSub = searchParams.get('id_subcontratista');
      const numReporte = parseInt(searchParams.get('num_reporte') || '1');

      if (numReporte <= 1) {
        return NextResponse.json({ success: true, hh_semana_anterior: 0 });
      }

      let query = `SELECT hh_semana_actual FROM informes_seguridad WHERE mes_anio = ? AND id_subcontratista = ? AND num_reporte = ?`;
      const params = [mes, idSub, numReporte - 1];

      if (userRole !== 'Master' && idEmpresa) {
        query += ` AND id_empresa = ?`;
        params.push(idEmpresa);
      }

      const [prev] = await pool.query(query + " LIMIT 1", params);

      const hh = prev.length > 0 ? parseFloat(prev[0].hh_semana_actual) : 0;
      return NextResponse.json({ success: true, hh_semana_anterior: hh });
    }

    // Listado principal por mes
    const mes = searchParams.get('mes');
    if (!mes) {
      return NextResponse.json({ error: "Parámetro 'mes' requerido (YYYY-MM)" }, { status: 400 });
    }

    let whereClause = "WHERE i.mes_anio = ?";
    const queryParams = [mes];

    if (userRole !== 'Master' && idEmpresa) {
      whereClause += " AND i.id_empresa = ?";
      queryParams.push(idEmpresa);
    }

    const [rows] = await pool.query(
      `SELECT i.*,
        (SELECT COALESCE(SUM(ft.total_hh_semana), 0) 
         FROM informes_seguridad_ft ft WHERE ft.id_informe = i.id_informe) as hh_total,
        (SELECT GROUP_CONCAT(u.pk_referencia SEPARATOR ', ')
         FROM informes_ubicaciones u WHERE u.id_informe = i.id_informe) as ubicaciones
       FROM informes_seguridad i
       ${whereClause}
       ORDER BY i.subcontratista ASC, i.num_reporte ASC`,
      queryParams
    );

    return NextResponse.json({ success: true, data: rows });
  } catch (error) {
    console.error("Error GET informes-seguridad:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

// =====================================================================
// POST: Crear informe nuevo (general + ubicaciones + FT)
// Body: { num_reporte, id_subcontratista, subcontratista, mes_anio,
//         periodo_inicio, periodo_fin, ubicaciones: [...], ft_rows: [...] }
// =====================================================================
export async function POST(request) {
  try {
    const body = await request.json();
    const {
      num_reporte, id_subcontratista, subcontratista, mes_anio,
      periodo_inicio, periodo_fin, ubicaciones, ft_rows, fotos, desviaciones
    } = body;

    const creado_por = request.headers.get('x-user-id') || null;
    const id_empresa = request.headers.get('x-empresa-id') || 1;

    // 1. Regla de negocio: Calcular hh_semana_anterior
    let hh_semana_anterior = 0;
    if (parseInt(num_reporte) > 1) {
      const [prev] = await pool.query(
        `SELECT hh_semana_actual FROM informes_seguridad 
         WHERE mes_anio = ? AND id_subcontratista = ? AND num_reporte = ? AND id_empresa = ?
         LIMIT 1`,
        [mes_anio, id_subcontratista, parseInt(num_reporte) - 1, id_empresa]
      );
      if (prev.length > 0) {
        hh_semana_anterior = parseFloat(prev[0].hh_semana_actual);
      }
    }

    // 2. Calcular hh_semana_actual desde las filas FT
    let hh_semana_actual = 0;
    if (ft_rows && ft_rows.length > 0) {
      for (const row of ft_rows) {
        const total = calcularTotalHH(row);
        hh_semana_actual += total;
      }
    }

    // 3. INSERT informe principal
    const [result] = await pool.query(
      `INSERT INTO informes_seguridad 
        (num_reporte, id_subcontratista, subcontratista, mes_anio, periodo_inicio, periodo_fin, hh_semana_anterior, hh_semana_actual, creado_por, id_empresa)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [num_reporte, id_subcontratista, subcontratista, mes_anio, periodo_inicio, periodo_fin, hh_semana_anterior, hh_semana_actual, creado_por, id_empresa]
    );

    const id_informe = result.insertId;

    // 4. INSERT ubicaciones
    if (ubicaciones && ubicaciones.length > 0) {
      for (const ub of ubicaciones) {
        if (ub.pk_referencia && ub.pk_referencia.trim()) {
          await pool.query(
            `INSERT INTO informes_ubicaciones (id_informe, pk_referencia) VALUES (?, ?)`,
            [id_informe, ub.pk_referencia.trim()]
          );
        }
      }
    }

    // 5. INSERT filas de fuerza de trabajo
    if (ft_rows && ft_rows.length > 0) {
      for (const row of ft_rows) {
        const total = calcularTotalHH(row);
        await pool.query(
          `INSERT INTO informes_seguridad_ft 
            (id_informe, frente, hr_lunes, per_lunes, hr_martes, per_martes, 
             hr_miercoles, per_miercoles, hr_jueves, per_jueves, 
             hr_viernes, per_viernes, hr_sabado, per_sabado, 
             hr_domingo, per_domingo, total_hh_semana)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            id_informe, row.frente || '',
            row.hr_lunes || 0, row.per_lunes || 0,
            row.hr_martes || 0, row.per_martes || 0,
            row.hr_miercoles || 0, row.per_miercoles || 0,
            row.hr_jueves || 0, row.per_jueves || 0,
            row.hr_viernes || 0, row.per_viernes || 0,
            row.hr_sabado || 0, row.per_sabado || 0,
            row.hr_domingo || 0, row.per_domingo || 0,
            total
          ]
        );
      }
    }

    // 6. INSERT fotos del reporte fotográfico
    if (fotos && fotos.length > 0) {
      for (let i = 0; i < fotos.length; i++) {
        if (fotos[i].ruta_imagen) {
          await pool.query(
            `INSERT INTO informes_fotos (id_informe, ruta_imagen, descripcion, orden) VALUES (?, ?, ?, ?)`,
            [id_informe, fotos[i].ruta_imagen, fotos[i].descripcion || '', i]
          );
        }
      }
    }

    // 7. INSERT desviaciones
    if (desviaciones && desviaciones.length > 0) {
      for (const desv of desviaciones) {
        if (desv.tipo_desviacion && desv.generada_por) {
          await pool.query(
            `INSERT INTO informes_desviaciones 
              (id_informe, tipo_desviacion, generada_por, descripcion, accion_inmediata, fecha_plazo, dia_semana)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
              id_informe,
              desv.tipo_desviacion,
              desv.generada_por,
              desv.descripcion || '',
              desv.accion_inmediata || '',
              desv.fecha_plazo || null,
              desv.dia_semana || 'lunes'
            ]
          );
        }
      }
    }

    return NextResponse.json({ success: true, id_informe, message: "Informe creado correctamente" });
  } catch (error) {
    console.error("Error POST informes-seguridad:", error);
    return NextResponse.json({ error: "Error al crear informe" }, { status: 500 });
  }
}

// Función auxiliar: calcula total HH de una fila de FT
function calcularTotalHH(row) {
  const dias = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];
  let total = 0;
  for (const dia of dias) {
    const hr = parseFloat(row[`hr_${dia}`]) || 0;
    const per = parseInt(row[`per_${dia}`]) || 0;
    total += hr * per;
  }
  return total;
}
