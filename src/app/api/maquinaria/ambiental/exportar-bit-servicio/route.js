import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import ExcelJS from 'exceljs';
import path from 'path';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const mes = searchParams.get('mes');
    const anio = searchParams.get('anio');
    const idEmpresa = request.headers.get('x-empresa-id');

    if (!mes || !anio || !idEmpresa) {
      return NextResponse.json({ error: "Faltan parámetros requeridos" }, { status: 400 });
    }

    // 1. Obtener la empresa para el encabezado
    const [empresaRows] = await pool.query('SELECT nombre_comercial FROM cat_empresas WHERE id_empresa = ?', [idEmpresa]);
    const nombreEmpresa = empresaRows.length > 0 ? empresaRows[0].nombre_comercial : 'RECAL ESTRUCTURAS';

    // 2. Obtener mantenimientos del área ambiental para el periodo
    const [rows] = await pool.query(`
      SELECT 
        m.tipo,
        m.marca,
        m.modelo,
        m.serie,
        m.num_economico,
        m.placa,
        h.tipo_mantenimiento,
        h.fecha_mantenimiento,
        h.folio_mtto
      FROM Historial_Mantenimiento h
      JOIN Maquinaria_Equipo m ON h.id_maquinaria = m.id_maquinaria
      WHERE m.id_empresa = ? 
        AND m.area = 'ambiental'
        AND MONTH(h.fecha_mantenimiento) = ?
        AND YEAR(h.fecha_mantenimiento) = ?
      ORDER BY h.fecha_mantenimiento ASC
    `, [idEmpresa, mes, anio]);

    if (rows.length === 0) {
      return NextResponse.json({ success: false, error: "No hay mantenimientos registrados en este periodo." });
    }

    // 3. Cargar plantilla
    const templatePath = path.join(process.cwd(), 'public/plantillas/20_BIT_SERVICIO_MAQUINARIA_VEHiCULOS.xlsx');
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(templatePath);
    const worksheet = workbook.getWorksheet(1);

    // 4. Llenar encabezados
    worksheet.getCell('E3').value = `CONTRATISTA: ${nombreEmpresa.toUpperCase()}`;
    
    const mesesNombres = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    const periodoTexto = `${mesesNombres[parseInt(mes) - 1]} ${anio}`;
    worksheet.getCell('E2').value = `FECHA: ${periodoTexto.toUpperCase()}`;

    // 5. Llenar datos
    let currentRow = 6;
    rows.forEach((row, index) => {
      // Insertar fila si es necesario (para mantener estilos si hay muchos registros)
      if (index > 0) {
        worksheet.spliceRows(currentRow, 0, []);
        const previousRow = worksheet.getRow(currentRow - 1);
        const newRow = worksheet.getRow(currentRow);
        newRow.height = previousRow.height;
        
        previousRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
          const newCell = newRow.getCell(colNumber);
          newCell.style = cell.style;
          newCell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
        });
      }

      const excelRow = worksheet.getRow(currentRow);
      excelRow.getCell('A').value = index + 1;
      excelRow.getCell('B').value = (row.tipo || '').toUpperCase();
      excelRow.getCell('C').value = `${row.marca || ''} ${row.modelo || ''}`.trim().toUpperCase();
      excelRow.getCell('D').value = (row.serie || '').toUpperCase();
      excelRow.getCell('E').value = (row.placa || row.num_economico || 'N/A').toUpperCase();
      
      const tipo = (row.tipo_mantenimiento || '').toLowerCase();
      if (tipo.includes('preventivo')) {
        excelRow.getCell('F').value = 'X';
      } else if (tipo.includes('correctivo')) {
        excelRow.getCell('G').value = 'X';
      }

      if (row.fecha_mantenimiento) {
        const d = new Date(row.fecha_mantenimiento);
        const fechaStr = `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}/${d.getUTCFullYear()}`;
        excelRow.getCell('H').value = fechaStr;
      }

      excelRow.getCell('I').value = row.folio_mtto || 'N/A';

      currentRow++;
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return new NextResponse(buffer, {
      headers: {
        'Content-Disposition': `attachment; filename="20_BIT_SERVICIO_AMBIENTAL_${mes}_${anio}.xlsx"`,
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      }
    });

  } catch (error) {
    console.error("Error al exportar Bitácora de Servicio Ambiental:", error);
    return NextResponse.json({ error: "Error interno al generar el Excel." }, { status: 500 });
  }
}
