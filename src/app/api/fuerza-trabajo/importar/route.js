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
    
    // En lugar de buscar por ID, tomamos la primera hoja del arreglo de hojas
    const worksheet = workbook.worksheets[0];

    // Validación de seguridad por si suben un excel totalmente dañado
    if (!worksheet) {
      return NextResponse.json({ error: "El archivo Excel no tiene hojas legibles." }, { status: 400 });
    }

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

        const nssRaw = row.getCell(4).value;
        const nss = nssRaw ? nssRaw.toString().replace(/\D/g, '') : '';
        
        const fechaIngreso = parseExcelDate(row.getCell(6).value);
        const fechaAlta = parseExcelDate(row.getCell(7).value);

        if (nss && nss.length !== 11) {
          erroresValidacion.push(`Fila ${rowNumber} (${nombre}): El NSS ingresado no tiene 11 dígitos.`);
        }

        if (!fechaIngreso) {
          erroresValidacion.push(`Fila ${rowNumber} (${nombre}): Falta Fecha de Ingreso a Obra.`);
        } else if (fechaIngreso && fechaAlta) {
          if (fechaAlta > fechaIngreso) {
            erroresValidacion.push(`Fila ${rowNumber} (${nombre}): La fecha de alta IMSS no puede ser mayor a la de Ingreso.`);
          }
        }

        // --- EXTRACCIÓN DE CUADRILLA ---
        const nombreCuadrillaExcel = row.getCell(5).value?.toString().trim() || '';
        let idCuadrilla = null;
        if (nombreCuadrillaExcel) {
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
          nombre_cuadrilla: nombreCuadrillaExcel, // <--- Guardamos el texto original de la celda
          id_subcontratista_ft: idCuadrilla, 
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

    if (erroresValidacion.length > 0) {
      const mensajeError = `Por favor corrige el Excel:\n• ${erroresValidacion.slice(0, 5).join('\n• ')}${erroresValidacion.length > 5 ? '\n... y más errores.' : ''}`;
      return NextResponse.json({ error: mensajeError }, { status: 400 });
    }

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

    let yaExistentes = [];
    if (conditions.length > 0) {
      const [filas] = await pool.query(queryExisten, queryParams);
      yaExistentes = filas;
    }

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

// 2. PUT: Hace el INSERT masivo e incluye la creación dinámica de cuadrillas
export async function PUT(request) {
  try {
    const { trabajadores } = await request.json();

    if (!trabajadores || trabajadores.length === 0) {
      return NextResponse.json({ error: "No hay trabajadores para guardar" }, { status: 400 });
    }

    for (const t of trabajadores) {
      let idCuadrillaFinal = t.id_subcontratista_ft;

      // Si el Excel traía un nombre de cuadrilla, pero NO encontramos su ID (es decir, es nueva)
      if (!idCuadrillaFinal && t.nombre_cuadrilla) {
        
        // Volvemos a buscar en la BD (Por si la creamos en el ciclo anterior para otro trabajador de la misma lista)
        const [existe] = await pool.query(
          `SELECT id_subcontratista_ft FROM Subcontratistas_Fuerza_Trabajo WHERE nombre = ? AND id_subcontratista_principal = ? LIMIT 1`,
          [t.nombre_cuadrilla, t.id_subcontratista_principal]
        );

        if (existe.length > 0) {
          idCuadrillaFinal = existe[0].id_subcontratista_ft;
        } else {
          // La creamos y tomamos su nuevo ID
          const [nuevaCuadrilla] = await pool.query(
            `INSERT INTO Subcontratistas_Fuerza_Trabajo (nombre, id_subcontratista_principal) VALUES (?, ?)`,
            [t.nombre_cuadrilla, t.id_subcontratista_principal]
          );
          idCuadrillaFinal = nuevaCuadrilla.insertId;
        }
      }

      // Insertamos al trabajador ya con su ID de cuadrilla validado/creado
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
        idCuadrillaFinal 
      ]);
    }

    return NextResponse.json({ success: true, mensaje: `${trabajadores.length} trabajadores registrados correctamente.` });

  } catch (error) {
    console.error("Error guardando masivo:", error);
    return NextResponse.json({ error: "Error al guardar en la base de datos" }, { status: 500 });
  }
}