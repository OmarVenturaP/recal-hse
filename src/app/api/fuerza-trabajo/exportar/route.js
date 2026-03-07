import { NextResponse } from 'next/server';
import pool from '../../../../lib/db';
import ExcelJS from 'exceljs';
import path from 'path';
import fs from 'fs';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const mes = searchParams.get('mes'); 
    const anio = searchParams.get('anio'); 
    const idPrincipal = searchParams.get('subcontratista');

    if (!mes || !anio) {
      return NextResponse.json({ error: "Mes y Año son requeridos" }, { status: 400 });
    }

    const year = parseInt(anio);
    const month = parseInt(mes);
    
    const ultimoDia = new Date(year, month, 0).getDate();
    const primerDiaMesStr = `${year}-${String(month).padStart(2, '0')}-01`;
    const ultimoDiaMesStr = `${year}-${String(month).padStart(2, '0')}-${String(ultimoDia).padStart(2, '0')}`;

    const nombresMeses = {
      1: 'ENERO', 2: 'FEBRERO', 3: 'MARZO', 4: 'ABRIL', 5: 'MAYO', 6: 'JUNIO',
      7: 'JULIO', 8: 'AGOSTO', 9: 'SEPTIEMBRE', 10: 'OCTUBRE', 11: 'NOVIEMBRE', 12: 'DICIEMBRE'
    };
    const periodoTexto = `${nombresMeses[month]} ${year}`;

    let query = `
      SELECT 
        f.nombre_trabajador, f.puesto_categoria, f.nss, 
        f.fecha_ingreso_obra, f.fecha_alta_imss, f.origen,
        p.razon_social AS empresa_principal,
        s.nombre AS nombre_cuadrilla
      FROM Fuerza_Trabajo f
      LEFT JOIN Subcontratistas p ON f.id_subcontratista_principal = p.id_subcontratista
      LEFT JOIN Subcontratistas_Fuerza_Trabajo s ON f.id_subcontratista_ft = s.id_subcontratista_ft
      WHERE f.fecha_ingreso_obra <= ? 
      AND (f.fecha_baja IS NULL OR f.fecha_baja >= ?)
    `;
    const queryParams = [ultimoDiaMesStr, primerDiaMesStr];

    if (idPrincipal) {
      query += ` AND f.id_subcontratista_principal = ?`;
      queryParams.push(idPrincipal);
    }

    query += ` ORDER BY f.nombre_trabajador ASC`;

    const [rows] = await pool.query(query, queryParams);

    const templatePath = path.join(process.cwd(), 'public', 'plantillas', '09_FUERZA_TRABAJO.xlsx');
    
    if (!fs.existsSync(templatePath)) {
      return NextResponse.json({ error: "No se encontró la plantilla 09_FUERZA_TRABAJO.xlsx" }, { status: 404 });
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(templatePath);
    const worksheet = workbook.getWorksheet(1);

    const nombreContratista = rows.length > 0 ? rows[0].empresa_principal : (idPrincipal ? 'CONTRATISTA SELECCIONADA' : 'MÚLTIPLES CONTRATISTAS');
    
    // Inyectamos encabezados generales
    worksheet.getCell('D3').value = `CONTRATISTA: ${nombreContratista}`;
    worksheet.getCell('H3').value = periodoTexto;

    let currentRow = 5; 
    let index = 1;

    // --- CICLO MODIFICADO USANDO LA TÉCNICA DE SPLICEROWS ---
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];

      // A partir del segundo trabajador, insertamos una fila vacía para empujar las firmas hacia abajo
      if (i > 0) {
        worksheet.spliceRows(currentRow, 0, []); 
      }

      const row = worksheet.getRow(currentRow);
      row.height = 20; // Altura solicitada de 20 para todas las filas de datos

      const formatoFecha = (fechaStr) => {
        if (!fechaStr) return '';
        const fecha = new Date(fechaStr);
        const dia = String(fecha.getUTCDate()).padStart(2, '0');
        const mes = String(fecha.getUTCMonth() + 1).padStart(2, '0'); // Los meses van de 0 a 11
        const anio = fecha.getUTCFullYear();
        
        return `${dia}/${mes}/${anio}`;
      };

      // Llenado de celdas utilizando la nomenclatura por letras
      row.getCell('A').value = index;
      row.getCell('B').value = r.nombre_trabajador;
      row.getCell('C').value = r.puesto_categoria;
      row.getCell('D').value = r.nss ? String(r.nss) : '';
      row.getCell('E').value = r.nombre_cuadrilla || 'N/A';
      row.getCell('F').value = formatoFecha(r.fecha_ingreso_obra);
      row.getCell('G').value = formatoFecha(r.fecha_alta_imss);
      row.getCell('H').value = 'LINEA K';
      row.getCell('I').value = r.origen === 'Local' ? 'X' : '';
      row.getCell('J').value = r.origen === 'Foráneo' ? 'X' : '';

      // Copiar el formato (bordes, fuentes) de la primera fila de datos (Fila 5 original) a las nuevas filas
      if (i > 0) {
        const filaBase = worksheet.getRow(5);
        filaBase.eachCell({ includeEmpty: true }, (baseCell, colNumber) => {
          row.getCell(colNumber).style = baseCell.style;
        });
      } else {
        // Para la fila 5, aseguramos la alineación básica
        row.getCell('A').alignment = { vertical: 'middle', horizontal: 'center' };
        row.getCell('B').alignment = { vertical: 'middle', horizontal: 'center' };
        row.getCell('C').alignment = { vertical: 'middle', horizontal: 'center' };
        row.getCell('D').alignment = { vertical: 'middle', horizontal: 'center' };
        row.getCell('E').alignment = { vertical: 'middle', horizontal: 'center' };
        row.getCell('F').alignment = { vertical: 'middle', horizontal: 'center' };
        row.getCell('G').alignment = { vertical: 'middle', horizontal: 'center' };
        row.getCell('H').alignment = { vertical: 'middle', horizontal: 'center' };
        row.getCell('I').alignment = { vertical: 'middle', horizontal: 'center' };
        row.getCell('J').alignment = { vertical: 'middle', horizontal: 'center' };
      }

      currentRow++;
      index++;
    }

    const buffer = await workbook.xlsx.writeBuffer();

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename=Fuerza_Trabajo_${periodoTexto.replace(' ', '_')}.xlsx`,
      },
    });

  } catch (error) {
    console.error("Error exportando Excel:", error);
    return NextResponse.json({ error: "Error al generar reporte" }, { status: 500 });
  }
}