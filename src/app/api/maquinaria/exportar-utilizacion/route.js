import { NextResponse } from 'next/server';
import pool from '../../../../lib/db';
import ExcelJS from 'exceljs';
import path from 'path';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const mes = searchParams.get('mes');
    const anio = searchParams.get('anio');

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

    const [rows] = await pool.query(`
      SELECT m.*, s.razon_social 
      FROM Maquinaria_Equipo m
      LEFT JOIN Subcontratistas s ON m.id_subcontratista = s.id_subcontratista
      ${whereClause}
      ORDER BY m.fecha_ingreso_obra DESC
    `, queryParams);

    let currentRow = 5; 
    let index = 1;

    for (let i = 0; i < rows.length; i++) {
      const maquina = rows[i];

      if (i > 0) {
        worksheet.spliceRows(currentRow, 0, []); 
      }

      const row = worksheet.getRow(currentRow);
      row.height = 180; 

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
        const anioStr = date.getUTCFullYear();
        row.getCell('F').value = `${dia}/${mesStr}/${anioStr}`;
      } else {
        row.getCell('F').value = '-';
      }

      if (maquina.imagen_url) {
        try {
          const urlOptimizada = maquina.imagen_url.replace('/upload/', '/upload/c_fill,w_200,h_200,q_auto/');
          const imageResponse = await fetch(urlOptimizada);
          const arrayBuffer = await imageResponse.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          
          const imageId = workbook.addImage({ buffer: buffer, extension: 'jpeg' });
          worksheet.addImage(imageId, {
            tl: { col: 6.35, row: currentRow - 0.9 }, 
            ext: { width: 200, height: 200 }, 
            editAs: 'oneCell' 
          });
        } catch (imgError) {
          row.getCell('G').value = 'Error al cargar imagen';
        }
      } else {
        row.getCell('G').value = 'Sin evidencia';
      }

      if (i > 0) {
        const filaBase = worksheet.getRow(5);
        filaBase.eachCell({ includeEmpty: true }, (baseCell, colNumber) => {
          row.getCell(colNumber).style = baseCell.style;
        });
      } else {
        row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
          if(colNumber !== 7) cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
        });
      }

      currentRow++;
      index++;
    }

    const buffer = await workbook.xlsx.writeBuffer();
    return new NextResponse(buffer, {
      headers: {
        'Content-Disposition': 'attachment; filename="11_Programa_Utilizacion_Maquinaria.xlsx"',
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      }
    });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, error: "Error" }, { status: 500 });
  }
}