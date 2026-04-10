import { NextResponse } from 'next/server';
import pool from '@/lib/db';

// =====================================================================
// GET: Obtener detalle completo de un informe (general + ubicaciones + FT)
// =====================================================================
export async function GET(request, { params }) {
  try {
    const { id } = await params;

    const [informes] = await pool.query(
      `SELECT * FROM informes_seguridad WHERE id_informe = ?`, [id]
    );

    if (informes.length === 0) {
      return NextResponse.json({ error: "Informe no encontrado" }, { status: 404 });
    }

    const idEmpresa = request.headers.get('x-empresa-id');
    const userRole = request.headers.get('x-user-rol');

    if (userRole !== 'Master' && idEmpresa && informes[0].id_empresa && informes[0].id_empresa.toString() !== idEmpresa.toString()) {
      return NextResponse.json({ error: "No autorizado para ver este informe" }, { status: 403 });
    }

    const [ubicaciones] = await pool.query(
      `SELECT * FROM informes_ubicaciones WHERE id_informe = ? ORDER BY id_ubicacion`, [id]
    );

    const [ft_rows] = await pool.query(
      `SELECT * FROM informes_seguridad_ft WHERE id_informe = ? ORDER BY id_informe_seguridad_ft`, [id]
    );

    const [fotos] = await pool.query(
      `SELECT * FROM informes_fotos WHERE id_informe = ? ORDER BY orden`, [id]
    );

    const [desviaciones] = await pool.query(
      `SELECT * FROM informes_desviaciones WHERE id_informe = ? ORDER BY id_desviacion`, [id]
    );

    return NextResponse.json({
      success: true,
      data: {
        ...informes[0],
        ubicaciones,
        ft_rows,
        fotos,
        desviaciones
      }
    });
  } catch (error) {
    console.error("Error GET informe detalle:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

// =====================================================================
// PUT: Actualizar informe completo (general + ubicaciones + FT)
// =====================================================================
export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const {
      num_reporte, id_subcontratista, subcontratista, mes_anio,
      periodo_inicio, periodo_fin, ubicaciones, ft_rows, fotos, desviaciones
    } = body;

    const idEmpresa = request.headers.get('x-empresa-id');
    const userRole = request.headers.get('x-user-rol');

    // 0. Validar propiedad del informe
    const [verif] = await pool.query(`SELECT id_empresa FROM informes_seguridad WHERE id_informe = ?`, [id]);
    if (verif.length === 0) return NextResponse.json({ error: "Informe no encontrado" }, { status: 404 });
    if (userRole !== 'Master' && idEmpresa && verif[0].id_empresa && verif[0].id_empresa.toString() !== idEmpresa.toString()) {
      return NextResponse.json({ error: "No autorizado para modificar este informe" }, { status: 403 });
    }

    // 1. Recalcular hh_semana_anterior
    let hh_semana_anterior = 0;
    if (parseInt(num_reporte) > 1) {
      const [prev] = await pool.query(
        `SELECT hh_semana_actual FROM informes_seguridad 
         WHERE mes_anio = ? AND id_subcontratista = ? AND num_reporte = ? AND id_informe != ?
         LIMIT 1`,
        [mes_anio, id_subcontratista, parseInt(num_reporte) - 1, id]
      );
      if (prev.length > 0) {
        hh_semana_anterior = parseFloat(prev[0].hh_semana_actual);
      }
    }

    // 2. Recalcular hh_semana_actual
    let hh_semana_actual = 0;
    const dias = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];
    if (ft_rows && ft_rows.length > 0) {
      for (const row of ft_rows) {
        for (const dia of dias) {
          const hr = parseFloat(row[`hr_${dia}`]) || 0;
          const per = parseInt(row[`per_${dia}`]) || 0;
          const extHr = parseFloat(row[`ext_hr_${dia}`]) || 0;
          const extPer = parseInt(row[`ext_per_${dia}`]) || 0;
          hh_semana_actual += (hr * per) + (extHr * extPer);
        }
      }
    }

    // 3. UPDATE informe principal
    await pool.query(
      `UPDATE informes_seguridad SET
        num_reporte = ?, id_subcontratista = ?, subcontratista = ?, mes_anio = ?,
        periodo_inicio = ?, periodo_fin = ?, hh_semana_anterior = ?, hh_semana_actual = ?
       WHERE id_informe = ?`,
      [num_reporte, id_subcontratista, subcontratista, mes_anio, periodo_inicio, periodo_fin, hh_semana_anterior, hh_semana_actual, id]
    );

    // 4. DELETE + re-INSERT ubicaciones
    await pool.query(`DELETE FROM informes_ubicaciones WHERE id_informe = ?`, [id]);
    if (ubicaciones && ubicaciones.length > 0) {
      for (const ub of ubicaciones) {
        if (ub.pk_referencia && ub.pk_referencia.trim()) {
          await pool.query(
            `INSERT INTO informes_ubicaciones (id_informe, pk_referencia) VALUES (?, ?)`,
            [id, ub.pk_referencia.trim()]
          );
        }
      }
    }

    // 5. DELETE + re-INSERT FT
    await pool.query(`DELETE FROM informes_seguridad_ft WHERE id_informe = ?`, [id]);
    if (ft_rows && ft_rows.length > 0) {
      for (const row of ft_rows) {
        let total = 0;
        for (const dia of dias) {
          const hr = parseFloat(row[`hr_${dia}`]) || 0;
          const per = parseInt(row[`per_${dia}`]) || 0;
          const extHr = parseFloat(row[`ext_hr_${dia}`]) || 0;
          const extPer = parseInt(row[`ext_per_${dia}`]) || 0;
          total += (hr * per) + (extHr * extPer);
        }
        await pool.query(
          `INSERT INTO informes_seguridad_ft 
            (id_informe, frente, hr_lunes, per_lunes, ext_hr_lunes, ext_per_lunes,
             hr_martes, per_martes, ext_hr_martes, ext_per_martes,
             hr_miercoles, per_miercoles, ext_hr_miercoles, ext_per_miercoles,
             hr_jueves, per_jueves, ext_hr_jueves, ext_per_jueves,
             hr_viernes, per_viernes, ext_hr_viernes, ext_per_viernes,
             hr_sabado, per_sabado, ext_hr_sabado, ext_per_sabado,
             hr_domingo, per_domingo, ext_hr_domingo, ext_per_domingo,
             total_hh_semana)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            id, row.frente || '',
            row.hr_lunes || 0, row.per_lunes || 0, row.ext_hr_lunes || 0, row.ext_per_lunes || 0,
            row.hr_martes || 0, row.per_martes || 0, row.ext_hr_martes || 0, row.ext_per_martes || 0,
            row.hr_miercoles || 0, row.per_miercoles || 0, row.ext_hr_miercoles || 0, row.ext_per_miercoles || 0,
            row.hr_jueves || 0, row.per_jueves || 0, row.ext_hr_jueves || 0, row.ext_per_jueves || 0,
            row.hr_viernes || 0, row.per_viernes || 0, row.ext_hr_viernes || 0, row.ext_per_viernes || 0,
            row.hr_sabado || 0, row.per_sabado || 0, row.ext_hr_sabado || 0, row.ext_per_sabado || 0,
            row.hr_domingo || 0, row.per_domingo || 0, row.ext_hr_domingo || 0, row.ext_per_domingo || 0,
            total
          ]
        );
      }
    }

    // 6. DELETE + re-INSERT fotos
    await pool.query(`DELETE FROM informes_fotos WHERE id_informe = ?`, [id]);
    if (fotos && fotos.length > 0) {
      for (let i = 0; i < fotos.length; i++) {
        if (fotos[i].ruta_imagen) {
          await pool.query(
            `INSERT INTO informes_fotos (id_informe, ruta_imagen, descripcion, orden) VALUES (?, ?, ?, ?)`,
            [id, fotos[i].ruta_imagen, fotos[i].descripcion || '', i]
          );
        }
      }
    }

    // 7. DELETE + re-INSERT desviaciones
    await pool.query(`DELETE FROM informes_desviaciones WHERE id_informe = ?`, [id]);
    if (desviaciones && desviaciones.length > 0) {
      for (const desv of desviaciones) {
        if (desv.tipo_desviacion && desv.generada_por) {
          await pool.query(
            `INSERT INTO informes_desviaciones 
              (id_informe, tipo_desviacion, generada_por, descripcion, accion_inmediata, fecha_plazo, dia_semana)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
              id,
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

    return NextResponse.json({ success: true, message: "Informe actualizado correctamente" });
  } catch (error) {
    console.error("Error PUT informe:", error);
    return NextResponse.json({ error: "Error al actualizar informe" }, { status: 500 });
  }
}
