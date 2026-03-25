import { NextResponse } from 'next/server';
import pool from '../../../../lib/db';
import ExcelJS from 'exceljs';

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
    
    const worksheet = workbook.worksheets[0];

    if (!worksheet) {
      return NextResponse.json({ error: "El archivo Excel no tiene hojas legibles." }, { status: 400 });
    }

    const excelTrabajadores = [];
    const nssList = [];
    const nombresList = [];
    const erroresValidacion = [];

    const [cuadrillasDb] = await pool.query(
      `SELECT id_subcontratista_ft, nombre FROM Subcontratistas_Fuerza_Trabajo WHERE id_subcontratista_principal = ?`,
      [parseInt(idPrincipal)]
    );

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
          nombre_trabajador: '', // CAMBIO AQUÍ: Lo dejamos vacío
          apellido_trabajador: nombre, // CAMBIO AQUÍ: Asignamos el nombre extraído a apellido_trabajador
          puesto_categoria: row.getCell(3).value?.toString().trim() || 'N/A',
          nss: nss,
          nombre_cuadrilla: nombreCuadrillaExcel, 
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

    let queryExisten = `
      SELECT nss, nombre_trabajador, apellido_trabajador, id_subcontratista_principal, fecha_baja 
      FROM Fuerza_Trabajo WHERE (
    `;
    const conditions = [];
    const queryParams = [];

    if (nssList.length > 0) {
      conditions.push(`nss IN (?)`);
      queryParams.push(nssList);
    }
    if (nombresList.length > 0) {
      conditions.push(`TRIM(CONCAT(IFNULL(apellido_trabajador, ''), ' ', IFNULL(nombre_trabajador, ''))) IN (?)`);
      queryParams.push(nombresList);
    }

    queryExisten += conditions.join(' OR ') + `)`;

    let yaExistentes = [];
    if (conditions.length > 0) {
      const [filas] = await pool.query(queryExisten, queryParams);
      yaExistentes = filas;
    }

    const nuevosTrabajadores = excelTrabajadores.filter(excelRow => {
      const existeBloqueante = yaExistentes.some(db => {
        const matchNss = excelRow.nss && db.nss === excelRow.nss;
        
        const nombreCompletoDb = `${db.apellido_trabajador || ''} ${db.nombre_trabajador || ''}`.trim().toLowerCase();
        // CAMBIO AQUÍ: Comparamos contra apellido_trabajador en lugar de nombre_trabajador
        const matchNombre = nombreCompletoDb === excelRow.apellido_trabajador.toLowerCase();

        if (matchNss || matchNombre) {
          if (db.fecha_baja === null) return true;
          if (db.id_subcontratista_principal === excelRow.id_subcontratista_principal) return true;
          return false;
        }
        return false;
      });

      return !existeBloqueante; 
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

export async function PUT(request) {
  try {
    const { trabajadores } = await request.json();
    
    const id_usuario_actual = request.headers.get('x-user-id');

    if (!id_usuario_actual) {
      return NextResponse.json({ error: "Usuario no identificado" }, { status: 401 });
    }

    if (!trabajadores || trabajadores.length === 0) {
      return NextResponse.json({ error: "No hay trabajadores para guardar" }, { status: 400 });
    }

    for (const t of trabajadores) {
      let idCuadrillaFinal = t.id_subcontratista_ft;

      if (!idCuadrillaFinal && t.nombre_cuadrilla) {
        
        const [existe] = await pool.query(
          `SELECT id_subcontratista_ft FROM Subcontratistas_Fuerza_Trabajo WHERE nombre = ? AND id_subcontratista_principal = ? LIMIT 1`,
          [t.nombre_cuadrilla, t.id_subcontratista_principal]
        );

        if (existe.length > 0) {
          idCuadrillaFinal = existe[0].id_subcontratista_ft;
        } else {
          const [nuevaCuadrilla] = await pool.query(
            `INSERT INTO Subcontratistas_Fuerza_Trabajo (nombre, id_subcontratista_principal) VALUES (?, ?)`,
            [t.nombre_cuadrilla, t.id_subcontratista_principal]
          );
          idCuadrillaFinal = nuevaCuadrilla.insertId;
        }
      }

      await pool.query(`
        INSERT INTO Fuerza_Trabajo 
        (nombre_trabajador, apellido_trabajador, puesto_categoria, nss, fecha_ingreso_obra, fecha_alta_imss, origen, id_subcontratista_principal, id_subcontratista_ft, usuario_registro)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        t.nombre_trabajador || '', 
        t.apellido_trabajador,     
        t.puesto_categoria, 
        t.nss || null, 
        t.fecha_ingreso_obra, 
        t.fecha_alta_imss || null, 
        t.origen, 
        t.id_subcontratista_principal, 
        idCuadrillaFinal,
        id_usuario_actual 
      ]);
    }

    return NextResponse.json({ success: true, mensaje: `${trabajadores.length} trabajadores registrados correctamente.` });

  } catch (error) {
    console.error("Error guardando masivo:", error);
    return NextResponse.json({ error: "Error al guardar en la base de datos" }, { status: 500 });
  }
}