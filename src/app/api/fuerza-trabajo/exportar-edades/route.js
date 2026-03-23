import { NextResponse } from 'next/server';
import pool from '../../../../lib/db';
import ExcelJS from 'exceljs';
import path from 'path';
import fs from 'fs';

// --- FUNCIONES AUXILIARES DE CÁLCULO ---

const calcularEdadesNss = (nss, anioExportacion) => {
  if (!nss || nss.length !== 11) return { edadActual: 'N/D', edadAnterior: 'N/D' };
  
  const yy = parseInt(nss.substring(4, 6), 10);
  const anioNacimiento = yy <= 30 ? 2000 + yy : 1900 + yy;
  
  return {
    edadActual: anioExportacion - anioNacimiento,
    edadAnterior: (anioExportacion - 1) - anioNacimiento
  };
};

const calcularEdadCurp = (curp, fechaReferenciaStr) => {
  if (!curp || curp.length !== 18) return '';
  
  const yy = parseInt(curp.substring(4, 6), 10);
  const mm = parseInt(curp.substring(6, 8), 10);
  const dd = parseInt(curp.substring(8, 10), 10);
  
  const penultimo = curp.charAt(16);
  const esSiglo21 = isNaN(parseInt(penultimo, 10)); 
  const anioNacimiento = esSiglo21 ? 2000 + yy : 1900 + yy;
  
  const fechaReferencia = new Date(fechaReferenciaStr);
  let edad = fechaReferencia.getUTCFullYear() - anioNacimiento;
  
  if (fechaReferencia.getUTCMonth() + 1 < mm || (fechaReferencia.getUTCMonth() + 1 === mm && fechaReferencia.getUTCDate() < dd)) {
    edad--;
  }
  
  return edad;
};

const esMesAnterior = (fechaAltaStr, fechaInicioPeriodoStr) => {
  if (!fechaAltaStr) return false;
  const alta = new Date(fechaAltaStr);
  const inicioPeriodo = new Date(fechaInicioPeriodoStr);
  
  const mesAlta = alta.getUTCMonth();
  const anioAlta = alta.getUTCFullYear();
  const mesInicio = inicioPeriodo.getUTCMonth();
  const anioInicio = inicioPeriodo.getUTCFullYear();

  if (anioAlta === anioInicio && mesAlta === mesInicio - 1) return true;
  if (anioAlta === anioInicio - 1 && mesAlta === 11 && mesInicio === 0) return true;
  if (alta < inicioPeriodo) return true; 

  return false;
};

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const fechaInicio = searchParams.get('fechaInicio'); 
    const fechaFin = searchParams.get('fechaFin'); 
    const subcontratista = searchParams.get('subcontratista');

    if (!fechaInicio || !fechaFin) {
      return NextResponse.json({ error: "Las fechas de inicio y fin son requeridas" }, { status: 400 });
    }

    const anioExportacion = new Date(fechaFin).getUTCFullYear();

    let query = `
      SELECT 
        nombre_trabajador, apellido_trabajador, nss, curp, 
        fecha_ingreso_obra, fecha_alta_imss
      FROM Fuerza_Trabajo 
      WHERE DATE(fecha_ingreso_obra) >= ? AND DATE(fecha_ingreso_obra) <= ?
    `;
    const queryParams = [fechaInicio, fechaFin];

    if (subcontratista) {
      query += ` AND id_subcontratista_principal = ?`;
      queryParams.push(subcontratista);
    }

    query += ` ORDER BY apellido_trabajador ASC, nombre_trabajador ASC`;

    const [rows] = await pool.query(query, queryParams);

    // --- VALIDACIÓN PREVIA DE CURP ---
    // Esto se mantiene intacto: solo alerta si es mes anterior y falta CURP
    const trabajadoresFaltantes = [];
    
    for (const r of rows) {
      if (esMesAnterior(r.fecha_alta_imss, fechaInicio)) {
        if (!r.curp || r.curp.length !== 18) {
          const nombreCompleto = `${r.apellido_trabajador || ''} ${r.nombre_trabajador || ''}`.trim();
          trabajadoresFaltantes.push(nombreCompleto);
        }
      }
    }

    if (trabajadoresFaltantes.length > 0) {
      return NextResponse.json({ 
        error: "Falta CURP", 
        faltantes: trabajadoresFaltantes 
      }, { status: 400 });
    }
    // ----------------------------------------

    const templatePath = path.join(process.cwd(), 'public', 'plantillas', 'REPORTE_EDADES.xlsx');
    
    if (!fs.existsSync(templatePath)) {
      return NextResponse.json({ error: "No se encontró la plantilla REPORTE_EDADES.xlsx" }, { status: 404 });
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(templatePath);
    const worksheet = workbook.getWorksheet(1);

    let currentRow = 2; 

    for (const r of rows) {
      const row = worksheet.getRow(currentRow);
      const nombreCompleto = `${r.apellido_trabajador || ''} ${r.nombre_trabajador || ''}`.trim();
      let edadAnioExportacion = '';
      let edadAnioAnterior = '';
      let edadExactaCurp = '';

      // --- AJUSTE DE LÓGICA AQUÍ ---
      // Si es obligatorio tener CURP (mes anterior) O si la tiene de forma opcional (mismo periodo)
      if (esMesAnterior(r.fecha_alta_imss, fechaInicio) || (r.curp && r.curp.length === 18)) {
        edadExactaCurp = calcularEdadCurp(r.curp, fechaFin);
      } else {
        // Solo si es del mismo periodo y el usuario NO ingresó la CURP
        const edades = calcularEdadesNss(r.nss, anioExportacion);
        edadAnioExportacion = edades.edadActual;
        edadAnioAnterior = edades.edadAnterior;
      }

      const fechaIngresoObj = new Date(r.fecha_ingreso_obra);
      const diaIngreso = String(fechaIngresoObj.getUTCDate()).padStart(2, '0');
      const mesIngreso = String(fechaIngresoObj.getUTCMonth() + 1).padStart(2, '0');
      const anioIngreso = fechaIngresoObj.getUTCFullYear();

      row.getCell('A').value = nombreCompleto;
      row.getCell('B').value = edadAnioExportacion;
      row.getCell('C').value = edadAnioAnterior;
      row.getCell('D').value = edadExactaCurp;
      row.getCell('E').value = diaIngreso;
      row.getCell('F').value = mesIngreso;
      row.getCell('G').value = anioIngreso;

      currentRow++;
    }

    const buffer = await workbook.xlsx.writeBuffer();

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="Edades_Ingresos_${anioExportacion}.xlsx"`,
      },
    });

  } catch (error) {
    console.error("Error exportando Edades:", error);
    return NextResponse.json({ error: "Error al generar reporte de edades" }, { status: 500 });
  }
}