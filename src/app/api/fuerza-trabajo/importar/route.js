import { NextResponse } from 'next/server';
import pool from '../../../../lib/db';
import ExcelJS from 'exceljs';

// Función auxiliar para leer fechas de Excel de forma segura
const parseExcelDate = (cellValue) => {
  if (!cellValue) return null;
  if (cellValue instanceof Date) {
    return cellValue.toISOString().split('T')[0];
  }
  if (typeof cellValue === 'string') {
    const parts = cellValue.split('/');
    if (parts.length === 3) {
      return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }
  }
  return null;
};

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const idPrincipal = formData.get('id_subcontratista_principal');

    if (!file || !idPrincipal) {
      return NextResponse.json({ error: "Falta el archivo o la contratista" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    const worksheet = workbook.getWorksheet(1);

    const excelTrabajadores = [];
    const nssList = [];
    const nombresList = [];
    const erroresValidacion = [];

    // 1. Cargamos TODAS las cuadrillas de esta contratista principal para cruzarlas al vuelo
    const [cuadrillasDb] = await pool.query(
      `SELECT id_subcontratista_ft, nombre FROM Subcontratistas_Fuerza_Trabajo WHERE id_subcontratista_principal = ?`,
      [parseInt(idPrincipal)]
    );

    // 2. Extraemos y Validamos los datos de la Fila 5 en adelante
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber >= 5) {
        const nombre = row.getCell(2).value?.toString().trim();
        if (!nombre) return; 

        // Limpieza de NSS (Quita espacios o guiones por si el usuario los puso)
        const nssRaw = row.getCell(4).value;
        const nss = nssRaw ? nssRaw.toString().replace(/\D/g, '') : '';
        
        const fechaIngreso = parseExcelDate(row.getCell(6).value);
        const fechaAlta = parseExcelDate(row.getCell(7).value);

        // --- VALIDACIÓN 1: NSS DE 11 DÍGITOS ---
        if (nss && nss.length !== 11) {
          erroresValidacion.push(`Fila ${rowNumber} (${nombre}): El NSS ingresado no tiene 11 dígitos.`);
        }

        // --- VALIDACIÓN 2: FECHAS LÓGICAS ---
        if (!fechaIngreso) {
          erroresValidacion.push(`Fila ${rowNumber} (${nombre}): Falta Fecha de Ingreso a Obra.`);
        } else if (fechaIngreso && fechaAlta) {
          // Si el Alta del IMSS es de una fecha posterior al ingreso a la obra
          if (fechaAlta > fechaIngreso) {
            erroresValidacion.push(`Fila ${rowNumber} (${nombre}): La fecha de alta IMSS no puede ser mayor a la de Ingreso.`);
          }
        }

        // --- CRUCE DE CUADRILLAS ---
        const nombreCuadrillaExcel = row.getCell(5).value?.toString().trim() || '';
        let idCuadrilla = null;
        if (nombreCuadrillaExcel) {
          // Buscamos si el texto del excel coincide con alguna cuadrilla de la BD (Sin importar mayúsculas)
          const match = cuadrillasDb.find(c => c.nombre.toLowerCase() === nombreCuadrillaExcel.toLowerCase());
          if (match) idCuadrilla = match.id_subcontratista_ft;
        }

        const origenLocal = row.getCell(9).value?.toString().toUpperCase() === 'X';
        const origenForaneo = row.getCell(10).value?.toString().toUpperCase() === 'X';
        const origen = origenLocal ? 'Local' : (origenForaneo ? 'Foráneo' : 'Local');

        excelTrabajadores.push({
          nombre_trabajador: nombre,
          puesto_categoria: row.getCell(3).value?.toString().trim() || 'N/A',
          nss: nss,
          id_subcontratista_ft: idCuadrilla, // Ya va el ID listo para la BD
          fecha_ingreso_obra: fechaIngreso,
          fecha_alta_imss: fechaAlta,
          origen: origen,
          id_subcontratista_principal: parseInt(idPrincipal)
        });

        if (nss) nssList.push(nss);
        nombresList.push(nombre); 
      }
    });

    if (excelTrabajadores.length === 0) {
      return NextResponse.json({ error: "No se encontraron trabajadores en el archivo." }, { status: 400 });
    }

    // Si hay errores, frenamos en seco y se los mostramos al usuario
    if (erroresValidacion.length > 0) {
      // Tomamos hasta los primeros 5 errores para no saturar la alerta visual
      const mensajeError = `Por favor corrige el Excel:\n• ${erroresValidacion.slice(0, 5).join('\n• ')}${erroresValidacion.length > 5 ? '\n... y más errores.' : ''}`;
      return NextResponse.json({ error: mensajeError }, { status: 400 });
    }

    // --- CRUCE INTELIGENTE CON LA BASE DE DATOS ---
    // Regla de Oro: Solo buscamos a los que estén "ACTIVOS" (fecha_baja IS NULL).
    // Si un trabajador existía pero lo dieron de baja, la consulta no lo encontrará y se registrará como un "Nuevo Ingreso".
    let queryExisten = `SELECT nss, nombre_trabajador FROM Fuerza_Trabajo WHERE fecha_baja IS NULL AND (`;
    const conditions = [];
    const queryParams = [];

    if (nssList.length > 0) {
      conditions.push(`nss IN (?)`);
      queryParams.push(nssList);
    }
    if (nombresList.length > 0) {
      conditions.push(`nombre_trabajador IN (?)`);
      queryParams.push(nombresList);
    }

    queryExisten += conditions.join(' OR ') + `)`;

    // Si el array de NSS y nombres no está vacío, hacemos el query
    let yaExistentes = [];
    if (conditions.length > 0) {
      const [filas] = await pool.query(queryExisten, queryParams);
      yaExistentes = filas;
    }

    // Filtramos para dejar solo a los "Nuevos"
    const nuevosTrabajadores = excelTrabajadores.filter(excelRow => {
      const existePorNss = excelRow.nss && yaExistentes.some(db => db.nss === excelRow.nss);
      const existePorNombre = yaExistentes.some(db => db.nombre_trabajador.toLowerCase() === excelRow.nombre_trabajador.toLowerCase());
      return !existePorNss && !existePorNombre;
    });

    return NextResponse.json({ 
      success: true, 
      totalesExcel: excelTrabajadores.length,
      nuevos: nuevosTrabajadores.length,
      data: nuevosTrabajadores 
    });

  } catch (error) {
    console.error("Error leyendo Excel:", error);
    return NextResponse.json({ error: "Error interno al procesar el archivo" }, { status: 500 });
  }
}

// 2. PUT: Hace el INSERT masivo de los registros validados
export async function PUT(request) {
  try {
    const { trabajadores } = await request.json();

    if (!trabajadores || trabajadores.length === 0) {
      return NextResponse.json({ error: "No hay trabajadores para guardar" }, { status: 400 });
    }

    // Insertamos uno por uno. Como el POST ya nos resolvió el id_subcontratista_ft, lo inyectamos directo
    for (const t of trabajadores) {
      await pool.query(`
        INSERT INTO Fuerza_Trabajo 
        (nombre_trabajador, puesto_categoria, nss, fecha_ingreso_obra, fecha_alta_imss, origen, id_subcontratista_principal, id_subcontratista_ft)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        t.nombre_trabajador, 
        t.puesto_categoria, 
        t.nss || null, 
        t.fecha_ingreso_obra, 
        t.fecha_alta_imss || null, 
        t.origen, 
        t.id_subcontratista_principal, 
        t.id_subcontratista_ft // <-- Aquí va el ID que encontramos durante la Fase 1
      ]);
    }

    return NextResponse.json({ success: true, mensaje: `${trabajadores.length} trabajadores registrados correctamente.` });

  } catch (error) {
    console.error("Error guardando masivo:", error);
    return NextResponse.json({ error: "Error al guardar en la base de datos" }, { status: 500 });
  }
}