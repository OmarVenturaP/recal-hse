import { NextResponse } from 'next/server';
import pool from '../../../../lib/db';
import ExcelJS from 'exceljs';
import path from 'path';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const mes = searchParams.get('mes');
    const anio = searchParams.get('anio');

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
      whereClause = `WHERE DATE(m.fecha_ingreso_obra) <= ? AND (m.fecha_baja IS NULL OR DATE(m.fecha_baja) >= ?)`;
      queryParams.push(endDate, startDate);
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

    let currentRow = 7; 
    let index = 1;

    // AQUI COMIENZA EL CICLO MODIFICADO
    for (let i = 0; i < rows.length; i++) {
      const maquina = rows[i];

      // A partir de la segunda máquina, insertamos una fila vacía.
      // Esto EMPUJA todas las firmas (que originalmente estaban en la fila 6, 7, etc.) hacia abajo.
      if (i > 0) {
        worksheet.spliceRows(currentRow, 0, []); 
      }

      const row = worksheet.getRow(currentRow);
      row.height = 100; // El alto de tu formato 12

      const toUpper = (val) => val ? String(val).toUpperCase() : 'N/A';

      // Llenado de celdas
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

      if (maquina.ultima_fecha_mantenimiento && maquina.ultima_fecha_mantenimiento > maquina.fecha_ingreso_obra) {
        const date = new Date(maquina.ultima_fecha_mantenimiento);
        const dia = String(date.getUTCDate()).padStart(2, '0');
        const mes = String(date.getUTCMonth() + 1).padStart(2, '0');
        const anio = date.getUTCFullYear();
        row.getCell('K').value = `${dia}/${mes}/${anio}`;
      } else {
        row.getCell('K').value = 'N/A';
      }

      if (maquina.intervalo_mantenimiento) {
        row.getCell('L').value = `CADA ${maquina.intervalo_mantenimiento} HORAS DE TRABAJO`;
      } else {
        row.getCell('L').value = 'CADA QUE SE REQUIERA';
      }

      // Copiar el formato (bordes, fuentes, centrado) de la fila 5 a las nuevas filas
      if (i > 0) {
        const filaBase = worksheet.getRow(7);
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
        'Content-Disposition': 'attachment; filename="12_Plan_de_Servicio_Maquinaria.xlsx"',
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      }
    });

  } catch (error) {
    console.error("Error al exportar Plan de Servicio:", error);
    return NextResponse.json({ success: false, error: "Error interno al generar el Excel." }, { status: 500 });
  }
}