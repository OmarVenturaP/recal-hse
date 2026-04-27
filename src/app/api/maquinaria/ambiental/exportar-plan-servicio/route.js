import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import ExcelJS from 'exceljs';
import path from 'path';

const generarTextoPeriodo = (mes, anio) => {
  const meses = {
    1: 'ENERO', 2: 'FEBRERO', 3: 'MARZO', 4: 'ABRIL', 5: 'MAYO', 6: 'JUNIO',
    7: 'JULIO', 8: 'AGOSTO', 9: 'SEPTIEMBRE', 10: 'OCTUBRE', 11: 'NOVIEMBRE', 12: 'DICIEMBRE'
  };
  
  if (mes && anio) {
    return `PERIODO: ${meses[parseInt(mes)]} ${anio}`;
  }
  return 'PERIODO NO ESPECIFICADO';
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const mes = searchParams.get('mes');
    const anio = searchParams.get('anio');
    const userRol = request.headers.get('x-user-rol');
    const idEmpresa = request.headers.get('x-empresa-id');

    const periodoTexto = generarTextoPeriodo(mes, anio);

    const templatePath = path.join(process.cwd(), 'public', 'plantillas', '12_PLAN_SERVICIO.xlsx');
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(templatePath);
    const worksheet = workbook.getWorksheet(1); 

    let whereClause = "WHERE m.fecha_baja IS NULL"; 
    const queryParams = [];

    if (mes && anio) {
      const lastDay = new Date(anio, mes, 0).getDate();
      const startDate = `${anio}-${mes}-01`;
      const endDate = `${anio}-${mes}-${lastDay}`;
      whereClause = `WHERE DATE(m.fecha_ingreso_obra) <= ? AND (m.fecha_baja IS NULL OR DATE(m.fecha_baja) > ?)`;
      queryParams.push(endDate, startDate);
    }

    // Aislamiento Multi-Tenant
    if (userRol !== 'Master' && idEmpresa) {
      whereClause += ` AND m.id_empresa = ?`;
      queryParams.push(idEmpresa);
    }

    const [rows] = await pool.query(`
      SELECT 
        m.*,
        (SELECT tipo_mantenimiento FROM Historial_Mantenimiento WHERE id_maquinaria = m.id_maquinaria ORDER BY fecha_mantenimiento DESC, id_mantenimiento DESC LIMIT 1) AS ultimo_tipo_mantenimiento,
        (SELECT fecha_mantenimiento FROM Historial_Mantenimiento WHERE id_maquinaria = m.id_maquinaria ORDER BY fecha_mantenimiento DESC, id_mantenimiento DESC LIMIT 1) AS ultima_fecha_mantenimiento
      FROM Maquinaria_Equipo m
      ${whereClause}
      ORDER BY m.fecha_ingreso_obra DESC
    `, queryParams);

    // En la plantilla original de Ambiental, el periodo suele ir en H3 o G3 dependiendo de la versión.
    // Usaremos H3 como estaba en el HEAD.
    worksheet.getCell('H3').value = periodoTexto;

    let currentRow = 7; 
    let index = 1;

    for (let i = 0; i < rows.length; i++) {
      const maquina = rows[i];
      if (i > 0) {
        worksheet.spliceRows(currentRow, 0, []); 
      }

      const row = worksheet.getRow(currentRow);
      row.height = 100; 

      const toUpper = (val) => val ? String(val).toUpperCase() : 'N/A';

      row.getCell('A').value = index;
      row.getCell('B').value = toUpper(maquina.tipo);
      row.getCell('C').value = toUpper(maquina.marca);
      row.getCell('D').value = toUpper(maquina.anio);
      row.getCell('E').value = toUpper(maquina.modelo);
      row.getCell('F').value = toUpper(maquina.color);
      row.getCell('G').value = toUpper(maquina.serie);
      row.getCell('H').value = maquina.placa || 'N/A';
      row.getCell('I').value = maquina.horometro ? `TOTAL DE H: ${maquina.horometro}` : 'N/A';
      row.getCell('J').value = toUpper(maquina.ultimo_tipo_mantenimiento);

      if (maquina.ultima_fecha_mantenimiento && maquina.ultima_fecha_mantenimiento > maquina.fecha_ingreso_obra && maquina.ultima_fecha_mantenimiento != maquina.fecha_ingreso_obra) {
        const date = new Date(maquina.ultima_fecha_mantenimiento);
        const dia = String(date.getUTCDate()).padStart(2, '0');
        const mes = String(date.getUTCMonth() + 1).padStart(2, '0');
        const anio = date.getUTCFullYear();
        row.getCell('K').value = `${dia}/${mes}/${anio}`;
      } else {
        row.getCell('K').value = 'N/A';
      }

      if (maquina.fecha_baja) {
        row.getCell('L').value = 'N/A POR BAJA';
      } else if (maquina.fecha_proximo_mantenimiento) {
        const date = new Date(maquina.fecha_proximo_mantenimiento);
        const dia = String(date.getUTCDate()).padStart(2, '0');
        const mesStr = String(date.getUTCMonth() + 1).padStart(2, '0');
        const anioStr = date.getUTCFullYear();
        row.getCell('L').value = `MANTENIMIENTO: ${dia}/${mesStr}/${anioStr}`;
      } else if (maquina.intervalo_mantenimiento) {
        row.getCell('L').value = `CADA ${maquina.intervalo_mantenimiento} HORAS DE TRABAJO`;
      } else {
        row.getCell('L').value = 'CADA QUE SE REQUIERA';
      } 

      if (i > 0) {
        const filaBase = worksheet.getRow(7);
        let detenerCopia = false; 
        
        filaBase.eachCell({ includeEmpty: true }, (baseCell, colNumber) => {
          if (detenerCopia) return;
          let val = baseCell.value;
          if (val && typeof val === 'object' && val.richText) val = val.richText.map(rt => rt.text).join('');
          if (val && typeof val === 'object' && val.result) val = val.result;
          
          if (val && (String(val).toUpperCase().includes('OBSERVACION') || String(val).toUpperCase().includes('OBRSERVACION'))) {
            detenerCopia = true;
            return; 
          }

          row.getCell(colNumber).style = JSON.parse(JSON.stringify(baseCell.style));
          row.getCell(colNumber).alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
        });
      } else {
        let detenerCopia = false;
        row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
          if (detenerCopia) return;
          
          let val = cell.value;
          if (val && typeof val === 'object' && val.richText) val = val.richText.map(rt => rt.text).join('');
          if (val && typeof val === 'object' && val.result) val = val.result;

          if (val && (String(val).toUpperCase().includes('OBSERVACION') || String(val).toUpperCase().includes('OBRSERVACION'))) {
            detenerCopia = true;
            return;
          }

          cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
        });
      }

      currentRow++;
      index++;
    }

    const buffer = await workbook.xlsx.writeBuffer();
    const nombreArchivo = `12. PROGRAMA DE MANTENIMIENTO DE MAQUINARIA Y EQUIPO MENOR - AMBIENTAL - ${periodoTexto}.xlsx`;

    return new NextResponse(buffer, {
      headers: {
        'Content-Disposition': `attachment; filename="${nombreArchivo}"`,
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      }
    });

  } catch (error) {
    console.error("Error al exportar Plan de Servicio Ambiental:", error);
    return NextResponse.json({ success: false, error: "Error interno al generar el Excel." }, { status: 500 });
  }
}
