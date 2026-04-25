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
    return `PERIODO: ${meses[parseInt(mes)]} DE ${anio}`;
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

    const templatePath = path.join(process.cwd(), 'public', 'plantillas', '11_PROG_UTILIZACION.xlsx');
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(templatePath);
    const worksheet = workbook.getWorksheet(1); 

    // Lógica estricta de filtros de fecha
    let whereClause = "WHERE m.fecha_baja IS NULL"; 
    const queryParams = [];

    if (mes && anio) {
      const lastDay = new Date(anio, mes, 0).getDate();
      const startDate = `${anio}-${mes}-01`;
      const endDate = `${anio}-${mes}-${lastDay}`;
      
      whereClause = `WHERE DATE(m.fecha_ingreso_obra) <= ? AND (m.fecha_baja IS NULL OR DATE(m.fecha_baja) >= ?)`;
      queryParams.push(endDate, startDate);
    }

    // Aislamiento Multi-Tenant
    if (userRol !== 'Master' && idEmpresa) {
      whereClause += ` AND m.id_empresa = ?`;
      queryParams.push(idEmpresa);
    }

    const [rows] = await pool.query(`
      SELECT m.*, s.razon_social 
      FROM Maquinaria_Equipo m
      LEFT JOIN Subcontratistas s ON m.id_subcontratista = s.id_subcontratista
      ${whereClause}
      ORDER BY m.fecha_ingreso_obra DESC
    `, queryParams);

    worksheet.getCell('E2').value = periodoTexto;

    let currentRow = 5; 
    let index = 1;

    for (let i = 0; i < rows.length; i++) {
      const maquina = rows[i];

      if (i > 0) {
        worksheet.spliceRows(currentRow, 0, []); 
      }

      const row = worksheet.getRow(currentRow);
      // Nuevo alto de fila ajustado a 157
      row.height = 157; 

      const toUpper = (val) => val ? String(val).toUpperCase() : 'N/A';

      row.getCell('A').value = index;
      row.getCell('B').value = toUpper(maquina.tipo);
      const marcaModelo = `${maquina.marca || ''} / ${maquina.modelo || ''}`.trim();
      row.getCell('C').value = toUpper(marcaModelo);
      row.getCell('D').value = toUpper(maquina.color);
      row.getCell('E').value = toUpper(maquina.num_economico);

      if (maquina.fecha_ingreso_obra) {
        const date = new Date(maquina.fecha_ingreso_obra);
        const dia = String(date.getUTCDate()).padStart(2, '0');
        const mesStr = String(date.getUTCMonth() + 1).padStart(2, '0');
        const meses = {
            1: 'ENERO', 2: 'FEBRERO', 3: 'MARZO', 4: 'ABRIL', 5: 'MAYO', 6: 'JUNIO',
            7: 'JULIO', 8: 'AGOSTO', 9: 'SEPTIEMBRE', 10: 'OCTUBRE', 11: 'NOVIEMBRE', 12: 'DICIEMBRE'
          };
        const anioStr = date.getUTCFullYear();
        row.getCell('F').value = `${meses[parseInt(mesStr)]} / ${anioStr}`;
      } else {
        row.getCell('F').value = '-';
      }

      if (maquina.fecha_baja) {
        const date = new Date(maquina.fecha_baja);
        const dia = String(date.getUTCDate()).padStart(2, '0');
        const mesStr = String(date.getUTCMonth() + 1).padStart(2, '0');
        const meses = {
            1: 'ENERO', 2: 'FEBRERO', 3: 'MARZO', 4: 'ABRIL', 5: 'MAYO', 6: 'JUNIO',
            7: 'JULIO', 8: 'AGOSTO', 9: 'SEPTIEMBRE', 10: 'OCTUBRE', 11: 'NOVIEMBRE', 12: 'DICIEMBRE'
          };
        const anioStr = date.getUTCFullYear();
        row.getCell('G').value = `${meses[parseInt(mesStr)]} / ${anioStr}`;
      } else {
        row.getCell('G').value = 'N/A';
      }

      if (maquina.imagen_url) {
        try {
          // Ajustamos la imagen a 190x190px para que encaje con un pequeño margen dentro de los 157pt de alto
          const urlOptimizada = maquina.imagen_url.replace('/upload/', '/upload/c_fill,w_190,h_190,q_auto/');
          const imageResponse = await fetch(urlOptimizada);
          const arrayBuffer = await imageResponse.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          
          const imageId = workbook.addImage({ buffer: buffer, extension: 'jpeg' });
          worksheet.addImage(imageId, {
            tl: { col: 7.1, row: currentRow - 0.95 }, 
            ext: { width: 190, height: 190 }, 
            editAs: 'oneCell' 
          });
        } catch (imgError) {
          row.getCell('H').value = 'Error al cargar imagen';
        }
      } else {
        row.getCell('H').value = 'Sin evidencia';
      }

      if (i > 0) {
        const filaBase = worksheet.getRow(5);
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
          row.getCell(colNumber).alignment = { vertical: 'bottom', horizontal: 'center', wrapText: true };
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

          cell.alignment = { vertical: 'bottom', horizontal: 'center', wrapText: true };
        });
      }

      currentRow++;
      index++;
    }

    const buffer = await workbook.xlsx.writeBuffer();
    const nombreArchivo = `11. PROGRAMA DE UTILIZACION DE MAQUINARIA Y EQUIPO - AMBIENTAL - ${periodoTexto}.xlsx`;

    return new NextResponse(buffer, {
      headers: {
        'Content-Disposition': `attachment; filename="${nombreArchivo}"`,
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      }
    });

  } catch (error) {
    console.error("Error al exportar Utilización Ambiental:", error);
    return NextResponse.json({ success: false, error: "Error" }, { status: 500 });
  }
}
