import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import ExcelJS from 'exceljs';

// --- FUNCIÓN EXTRACTORA NIVEL DIOS ---
const parseCell = (cell) => {
  if (!cell || cell.value === null || cell.value === undefined) return '';
  
  if (typeof cell.value === 'object') {
    if (cell.value.richText) {
      return cell.value.richText.map(rt => rt.text).join('').trim();
    }
    if (cell.value.result !== undefined) {
      return cell.value.result.toString().trim();
    }
    if (cell.value instanceof Date) {
      return cell.value.toISOString().split('T')[0];
    }
  }
  
  return cell.value.toString().trim();
};

export async function POST(request) {
  try {
    // 1. Identificar al usuario y su área desde el inicio para validar duplicados
    const id_usuario_actual = request.headers.get('x-user-id');
    let areaAsignada = 'seguridad'; // Valor por defecto
    
    if (id_usuario_actual) {
      const [userRows] = await pool.query('SELECT area FROM Personal_Area WHERE id_personal = ?', [id_usuario_actual]);
      if (userRows.length > 0) {
        if (userRows[0].area === 'Medio Ambiente') areaAsignada = 'ambiental';
        else if (userRows[0].area === 'Seguridad') areaAsignada = 'seguridad';
      }
    }

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

    const excelMaquinaria = [];
    const seriesList = [];
    const erroresValidacion = [];

    let haEmpezadoLectura = false;
    let detenerLectura = false; 

    worksheet.eachRow((row, rowNumber) => {
      if (detenerLectura) return; 

      const cell1 = parseCell(row.getCell(1)).toUpperCase();
      const cell2 = parseCell(row.getCell(2)).toUpperCase();

      // 1. Detectar el inicio de la tabla (Cabecera)
      if (!haEmpezadoLectura) {
        if (cell1 === 'NO.' || cell1 === 'NO' || cell2 === 'TIPO') {
          haEmpezadoLectura = true;
          return; // Saltamos la fila de cabecera
        }
        return; // Seguimos buscando
      }

      // 2. Si ya empezamos, validar si debemos detenernos (Merged cells o palabras clave)
      if (row.getCell(2).isMerged || row.getCell(3).isMerged) {
        detenerLectura = true;
        return;
      }

      const tipo = cell2;
      
      if (tipo.includes('ELABORO') || tipo.includes('ELABORÓ') || tipo.includes('REVISO') || tipo.includes('OBSERVACION')) {
        detenerLectura = true;
        return;
      }

      if (!tipo || tipo === '') return; // Fila vacía dentro de la tabla

        const marca = parseCell(row.getCell(3)) || 'S/N';
        const anio = parseCell(row.getCell(4)) || '';
        const modelo = parseCell(row.getCell(5)) || '';
        const color = parseCell(row.getCell(6)) || '';
        const placa = parseCell(row.getCell(8)) || '';
        
        const serieBruta = parseCell(row.getCell(7));
        const serie = serieBruta.toUpperCase().replace(/\s+/g, '');

        if (!serie) {
          erroresValidacion.push(`Fila ${rowNumber} (${tipo} ${marca}): Es obligatorio el Número de Serie.`);
        }

        excelMaquinaria.push({
          tipo, 
          marca, 
          modelo, 
          anio, 
          color, 
          serie, 
          placa,
          id_subcontratista_principal: parseInt(idPrincipal)
        });

        if (serie) seriesList.push(serie);
    });

    if (excelMaquinaria.length === 0) {
      return NextResponse.json({ error: "No se encontró maquinaria válida o el formato es incorrecto." }, { status: 400 });
    }

    if (erroresValidacion.length > 0) {
      const mensajeError = `Por favor corrige el Excel:\n• ${erroresValidacion.slice(0, 5).join('\n• ')}${erroresValidacion.length > 5 ? '\n... y más errores.' : ''}`;
      return NextResponse.json({ error: mensajeError }, { status: 400 });
    }

    let yaExistentes = [];
    if (seriesList.length > 0) {
      // 2. Aquí está la magia: Filtramos asegurándonos de que valide SOLO EN EL ÁREA DEL USUARIO ACTUAL
      const [filas] = await pool.query(
        `SELECT serie FROM Maquinaria_Equipo WHERE fecha_baja IS NULL AND area = ?`, 
        [areaAsignada]
      );
      yaExistentes = filas.map(f => (f.serie || '').toString().toUpperCase().replace(/\s+/g, ''));
    }

    const nuevaMaquinaria = excelMaquinaria.filter(excelRow => {
      return !yaExistentes.includes(excelRow.serie);
    });

    return NextResponse.json({ 
      success: true, 
      totalesExcel: excelMaquinaria.length,
      nuevos: nuevaMaquinaria.length,
      data: nuevaMaquinaria 
    });

  } catch (error) {
    console.error("Error leyendo Excel:", error);
    return NextResponse.json({ error: "Error interno al procesar el archivo" }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const id_usuario_actual = request.headers.get('x-user-id');
    const id_empresa_actual = request.headers.get('x-empresa-id') || 1;
    
    if (!id_usuario_actual) {
      return NextResponse.json({ error: "Usuario no identificado" }, { status: 401 });
    }

    const { maquinarias } = await request.json();

    if (!maquinarias || maquinarias.length === 0) {
      return NextResponse.json({ error: "No hay maquinaria para guardar" }, { status: 400 });
    }

    // Consultar el área del usuario
    const [userRows] = await pool.query('SELECT area FROM Personal_Area WHERE id_personal = ?', [id_usuario_actual]);
    let areaAsignada = 'seguridad'; // Valor por defecto
    
    if (userRows.length > 0) {
      if (userRows[0].area === 'Medio Ambiente') areaAsignada = 'ambiental';
      else if (userRows[0].area === 'Seguridad') areaAsignada = 'seguridad';
    }

    const fechaIngresoActual = new Date().toISOString().split('T')[0]; 

    for (const m of maquinarias) {
      await pool.query(`
        INSERT INTO Maquinaria_Equipo 
        (tipo, marca, modelo, anio, serie, placa, color, fecha_ingreso_obra, id_subcontratista, area, usuario_registro, id_empresa, fecha_creacion, bActivo, tipo_unidad)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), 1, 'maquinaria')
      `, [
        m.tipo, 
        m.marca, 
        m.modelo, 
        m.anio, 
        m.serie, 
        m.placa, 
        m.color, 
        fechaIngresoActual, 
        m.id_subcontratista_principal,
        areaAsignada,
        id_usuario_actual,
        id_empresa_actual
      ]);
    }

    return NextResponse.json({ success: true, mensaje: `${maquinarias.length} equipos registrados correctamente.` });

  } catch (error) {
    console.error("Error guardando masivo:", error);
    return NextResponse.json({ error: "Error al guardar en la base de datos" }, { status: 500 });
  }
}