import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import ExcelJS from 'exceljs';

const checkDateValidity = (dateStr) => {
  if (!dateStr) return true;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return false;
  return d.toISOString().slice(0, 10) === dateStr;
};

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
    const partsHyphen = cellValue.split('-');
    if (partsHyphen.length === 3) {
       // Si viene como YYYY-MM-DD
       if (partsHyphen[0].length === 4) return cellValue;
       // Si viene como DD-MM-YYYY
       return `${partsHyphen[2]}-${partsHyphen[1].padStart(2, '0')}-${partsHyphen[0].padStart(2, '0')}`;
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

    const nssEnExcel = new Set(); // Para evitar duplicados dentro del mismo archivo

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber >= 5) {
        const nombre = row.getCell(2).value?.toString().trim();
        if (!nombre) return; 

        const nssRaw = row.getCell(4).value;
        const nss = nssRaw ? nssRaw.toString().replace(/\D/g, '') : '';

        // --- FILTRO DE DUPLICADOS DENTRO DEL EXCEL ---
        if (nss && nssEnExcel.has(nss)) {
          return; // Saltamos esta fila porque el NSS ya fue procesado en este archivo
        }
        if (nss) nssEnExcel.add(nss);
        
        const fechaIngresoRaw = row.getCell(6).value;
        const fechaIngreso = parseExcelDate(fechaIngresoRaw);
        const fechaAltaRaw = row.getCell(7).value;
        const fechaAlta = parseExcelDate(fechaAltaRaw);

        // --- VALIDACIÓN ESTRICTA DE PUESTO ---
        const puesto = row.getCell(3).value?.toString().trim();
        if (!puesto) {
          erroresValidacion.push(`Fila ${rowNumber} (${nombre}): Falta Puesto / Categoría.`);
        }

        // --- VALIDACIÓN ESTRICTA DE NSS ---
        if (!nss) {
          erroresValidacion.push(`Fila ${rowNumber} (${nombre}): Falta NSS.`);
        } else if (nss.length !== 11) {
          erroresValidacion.push(`Fila ${rowNumber} (${nombre}): El NSS debe tener 11 dígitos.`);
        }

        // --- VALIDACIÓN ESTRICTA DE FECHAS ---
        if (!fechaIngresoRaw) {
          erroresValidacion.push(`Fila ${rowNumber} (${nombre}): Falta Fecha de Ingreso a Obra.`);
        } else if (!fechaIngreso) {
          erroresValidacion.push(`Fila ${rowNumber} (${nombre}): Formato de Fecha de Ingreso inválido o ilegible.`);
        } else if (!checkDateValidity(fechaIngreso)) {
          erroresValidacion.push(`Fila ${rowNumber} (${nombre}): La Fecha de Ingreso (${fechaIngreso}) no existe en el calendario.`);
        }

        if (fechaAltaRaw) {
          if (!fechaAlta) {
            erroresValidacion.push(`Fila ${rowNumber} (${nombre}): Formato de Fecha Alta IMSS inválido.`);
          } else if (!checkDateValidity(fechaAlta)) {
            erroresValidacion.push(`Fila ${rowNumber} (${nombre}): La Fecha de Alta IMSS (${fechaAlta}) no existe.`);
          }
        }

        if (fechaIngreso && fechaAlta && checkDateValidity(fechaIngreso) && checkDateValidity(fechaAlta)) {
          if (fechaAlta > fechaIngreso) {
            erroresValidacion.push(`Fila ${rowNumber} (${nombre}): La fecha de Alta IMSS no puede ser mayor a la de Ingreso.`);
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
          nombre_trabajador: '', 
          apellido_trabajador: nombre, 
          puesto_categoria: puesto,
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

    const idEmpresa = request.headers.get('x-empresa-id');

    let queryExisten = `
      SELECT nss, nombre_trabajador, apellido_trabajador, id_subcontratista_principal, fecha_baja, fecha_ingreso_obra 
      FROM Fuerza_Trabajo WHERE id_empresa = ? AND (
    `;
    const conditions = [];
    const queryParams = [idEmpresa];

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
          // Si el trabajador tiene un registro con fecha POSTERIOR a la del Excel, es un conflicto que el usuario debe resolver manual
          if (new Date(db.fecha_ingreso_obra) > new Date(excelRow.fecha_ingreso_obra)) return true;

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
  const connection = await pool.getConnection();
  try {
    const { trabajadores } = await request.json();
    
    const id_usuario_actual = request.headers.get('x-user-id');
    const idEmpresa = request.headers.get('x-empresa-id') || 1;

    if (!id_usuario_actual) {
      return NextResponse.json({ error: "Usuario no identificado" }, { status: 401 });
    }

    if (!trabajadores || trabajadores.length === 0) {
      return NextResponse.json({ error: "No hay trabajadores para guardar" }, { status: 400 });
    }

    await connection.beginTransaction();

    for (const t of trabajadores) {
      try {
        // Verificamos si el NSS ya existe y está ACTIVO (fecha_baja IS NULL)
        if (t.nss) {
          const [existeActivo] = await connection.query(
            `SELECT id_trabajador, apellido_trabajador, fecha_ingreso_obra FROM Fuerza_Trabajo WHERE nss = ? AND id_empresa = ?`,
            [t.nss, idEmpresa]
          );
          
          for (const row of existeActivo) {
            // 1. Verificar si está activo
            if (row.fecha_baja === null) {
              throw new Error(`El trabajador con NSS ${t.nss} ya se encuentra ACTIVO en el sistema (${row.apellido_trabajador}). No se pueden duplicar registros activos.`);
            }
            // 2. Verificar si hay fechas posteriores (Regla específica del usuario)
            if (new Date(row.fecha_ingreso_obra) > new Date(t.fecha_ingreso_obra)) {
              const fPost = new Date(row.fecha_ingreso_obra).toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' });
              throw new Error(`El trabajador con NSS ${t.nss} ya cuenta con un registro con fecha POSTERIOR (${fPost}). Por favor, ingresa este nuevo registro manualmente.`);
            }
          }
        }

        let idCuadrillaFinal = t.id_subcontratista_ft;

        if (!idCuadrillaFinal && t.nombre_cuadrilla) {
          const [existe] = await connection.query(
            `SELECT id_subcontratista_ft FROM Subcontratistas_Fuerza_Trabajo WHERE nombre = ? AND id_subcontratista_principal = ? LIMIT 1`,
            [t.nombre_cuadrilla, t.id_subcontratista_principal]
          );

          if (existe.length > 0) {
            idCuadrillaFinal = existe[0].id_subcontratista_ft;
          } else {
            const [nuevaCuadrilla] = await connection.query(
              `INSERT INTO Subcontratistas_Fuerza_Trabajo (nombre, id_subcontratista_principal, id_empresa) VALUES (?, ?, ?)`,
              [t.nombre_cuadrilla, t.id_subcontratista_principal, idEmpresa]
            );
            idCuadrillaFinal = nuevaCuadrilla.insertId;
          }
        }

        await connection.query(`
          INSERT INTO Fuerza_Trabajo 
          (nombre_trabajador, apellido_trabajador, puesto_categoria, nss, fecha_ingreso_obra, fecha_alta_imss, origen, id_subcontratista_principal, id_subcontratista_ft, usuario_registro, id_empresa)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
          id_usuario_actual,
          idEmpresa
        ]);
      } catch (workerError) {
        console.error(`Error guardando trabajador ${t.apellido_trabajador}:`, workerError);
        let detail = workerError.sqlMessage || workerError.message;
        if (workerError.code === 'ER_TRUNCATED_WRONG_VALUE') {
          detail = `Valor de fecha inválido detectado en el registro.`;
        }
        // Lanzamos el error para que active el rollback general
        throw new Error(`Error en trabajador ${t.apellido_trabajador}: ${detail}`);
      }
    }

    await connection.commit();
    return NextResponse.json({ success: true, mensaje: `${trabajadores.length} trabajadores registrados correctamente.` });

  } catch (error) {
    await connection.rollback();
    console.error("Error guardando masivo:", error);
    return NextResponse.json({ 
      error: error.message || "Error al guardar en la base de datos",
      details: error.stack 
    }, { status: 500 });
  } finally {
    connection.release();
  }
}