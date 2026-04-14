import { NextResponse } from 'next/server';
//import pool from '@/lib/db';
import pool from '@/lib/db';
import ExcelJS from 'exceljs';
import path from 'path';
import fs from 'fs';

const generarTextoPeriodo = (inicioStr, finStr) => {
  const meses = {
    1: 'ENERO', 2: 'FEBRERO', 3: 'MARZO', 4: 'ABRIL', 5: 'MAYO', 6: 'JUNIO',
    7: 'JULIO', 8: 'AGOSTO', 9: 'SEPTIEMBRE', 10: 'OCTUBRE', 11: 'NOVIEMBRE', 12: 'DICIEMBRE'
  };

  const [y1, m1, d1] = inicioStr.split('-').map(Number);
  const [y2, m2, d2] = finStr.split('-').map(Number);

  if (y1 === y2) {
    if (m1 === m2) {
      return `${String(d1).padStart(2, '0')} AL ${String(d2).padStart(2, '0')} DE ${meses[m1]} ${y1}`;
    } else {
      return `${String(d1).padStart(2, '0')} DE ${meses[m1]} AL ${String(d2).padStart(2, '0')} DE ${meses[m2]} ${y1}`;
    }
  } else {
    return `${String(d1).padStart(2, '0')} DE ${meses[m1]} ${y1} AL ${String(d2).padStart(2, '0')} DE ${meses[m2]} ${y2}`;
  }
};

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const fechaInicio = searchParams.get('fechaInicio'); 
    const fechaFin = searchParams.get('fechaFin'); 
    const idPrincipal = searchParams.get('subcontratista');
    const esValidacion = searchParams.get('validar') === 'true'; // <- NUEVO PARÁMETRO

    if (!fechaInicio || !fechaFin) {
      return NextResponse.json({ error: "Las fechas de inicio y fin son requeridas" }, { status: 400 });
    }

    const periodoTexto = generarTextoPeriodo(fechaInicio, fechaFin);

    let query = `
      SELECT 
        f.nombre_trabajador, f.apellido_trabajador, f.puesto_categoria, f.nss, 
        f.fecha_ingreso_obra, f.fecha_alta_imss, f.origen,
        p.razon_social AS empresa_principal,
        s.nombre AS nombre_cuadrilla,
        (DATE(f.fecha_ingreso_obra) >= ?) AS es_nuevo
      FROM Fuerza_Trabajo f
      LEFT JOIN Subcontratistas p ON f.id_subcontratista_principal = p.id_subcontratista
      LEFT JOIN Subcontratistas_Fuerza_Trabajo s ON f.id_subcontratista_ft = s.id_subcontratista_ft
      WHERE DATE(f.fecha_ingreso_obra) <= ? 
      AND (f.fecha_baja IS NULL OR DATE(f.fecha_baja) >= ?)
      AND f.bActivo != 0
    `;

    const queryParams = [fechaInicio, fechaFin, fechaInicio];

    if (idPrincipal) {
      query += ` AND f.id_subcontratista_principal = ?`;
      queryParams.push(idPrincipal);
    }

    query += ` ORDER BY es_nuevo ASC, f.apellido_trabajador ASC, f.nombre_trabajador ASC`;

    const [rows] = await pool.query(query, queryParams);

    // --- NUEVO: SI ES MODO VALIDACIÓN, RETORNAMOS LOS FALTANTES ---
    if (esValidacion) {
      const sinCuadrilla = rows
        .filter(r => !r.nombre_cuadrilla)
        .map(r => `${r.apellido_trabajador || ''} ${r.nombre_trabajador || ''}`.trim());
      
      const sinCategoria = rows
        .filter(r => r.puesto_categoria === 'POR DEFINIR')
        .map(r => `${r.apellido_trabajador || ''} ${r.nombre_trabajador || ''}`.trim());
      
      return NextResponse.json({ 
        faltantes: sinCuadrilla, // Mantenemos compatible por si acaso
        sinCuadrilla,
        sinCategoria
      });
    }

    // --- FLUJO NORMAL DE EXPORTACIÓN EXCEL ---
    const templatePath = path.join(process.cwd(), 'public', 'plantillas', '09_FUERZA_TRABAJO.xlsx');
    
    if (!fs.existsSync(templatePath)) {
      return NextResponse.json({ error: "No se encontró la plantilla 09_FUERZA_TRABAJO.xlsx" }, { status: 404 });
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(templatePath);
    const worksheet = workbook.getWorksheet(1);

    const nombreContratista = rows.length > 0 ? rows[0].empresa_principal : (idPrincipal ? 'CONTRATISTA SELECCIONADA' : 'MÚLTIPLES CONTRATISTAS');
    
    worksheet.getCell('D3').value = `CONTRATISTA: ${nombreContratista}`;
    worksheet.getCell('H3').value = periodoTexto;

    let currentRow = 5; 
    let index = 1;

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];

      if (i > 0) {
        worksheet.spliceRows(currentRow, 0, []); 
      }

      const row = worksheet.getRow(currentRow);
      row.height = 20; 

      const formatoFecha = (fechaStr) => {
        if (!fechaStr) return '';
        const fecha = new Date(fechaStr);
        const dia = String(fecha.getUTCDate()).padStart(2, '0');
        const mes = String(fecha.getUTCMonth() + 1).padStart(2, '0'); 
        const anio = fecha.getUTCFullYear();
        return `${dia}/${mes}/${anio}`;
      };

      row.getCell('A').value = index;
      
      const nombreCompleto = `${r.apellido_trabajador || ''} ${r.nombre_trabajador || ''}`.trim();
      row.getCell('B').value = nombreCompleto;
      
      row.getCell('C').value = r.puesto_categoria;
      row.getCell('D').value = r.nss ? String(r.nss) : '';
      row.getCell('E').value = r.nombre_cuadrilla || 'N/A';
      row.getCell('F').value = formatoFecha(r.fecha_ingreso_obra);
      row.getCell('G').value = formatoFecha(r.fecha_alta_imss);
      row.getCell('H').value = 'LINEA K';
      row.getCell('I').value = r.origen === 'Local' ? 'X' : '';
      row.getCell('J').value = r.origen === 'Foráneo' ? 'X' : '';

      if (i > 0) {
        const filaBase = worksheet.getRow(5);
        filaBase.eachCell({ includeEmpty: true }, (baseCell, colNumber) => {
          row.getCell(colNumber).style = baseCell.style;
        });
      } else {
        ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'].forEach(col => {
          row.getCell(col).alignment = { vertical: 'middle', horizontal: 'center' };
        });
      }

      currentRow++;
      index++;
    }

    const buffer = await workbook.xlsx.writeBuffer();
    const nombreArchivoSeguro = periodoTexto.replace(/ /g, '_');

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="FT_${nombreContratista}_${nombreArchivoSeguro}.xlsx"`,
      },
    });

  } catch (error) {
    console.error("Error exportando Excel:", error);
    return NextResponse.json({ error: "Error al generar reporte" }, { status: 500 });
  }
}