import { NextResponse } from 'next/server';
import pool from '../../../../lib/db';
import ExcelJS from 'exceljs';

// --- FUNCIÓN EXTRACTORA NIVEL DIOS ---
// Destruye los [object Object] de Excel cuando las celdas tienen negritas o colores mezclados
const parseCell = (cell) => {
  if (!cell || cell.value === null || cell.value === undefined) return '';
  
  // Si es un objeto (Rich Text o Fórmula)
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
  
  // Si es texto normal o número
  return cell.value.toString().trim();
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

    const excelMaquinaria = [];
    const seriesList = [];
    const erroresValidacion = [];

    let detenerLectura = false; 

    // Recorremos desde la Fila 7 en adelante
    worksheet.eachRow((row, rowNumber) => {
      if (detenerLectura) return; 

      if (rowNumber >= 7) {
        // --- 1. SENSOR DE PARO AUTOMÁTICO ---
        // Si la celda B o C están combinadas (típico de las firmas de ELABORÓ/REVISÓ), paramos.
        if (row.getCell(2).isMerged || row.getCell(3).isMerged) {
          detenerLectura = true;
          return;
        }

        const tipo = parseCell(row.getCell(2)).toUpperCase();
        
        // Sensor de respaldo por palabras clave (por si no combinaron las celdas)
        if (tipo.includes('ELABORO') || tipo.includes('ELABORÓ') || tipo.includes('REVISO') || tipo.includes('OBSERVACION')) {
          detenerLectura = true;
          return;
        }

        if (!tipo) return; // Saltamos filas totalmente vacías en medio de la tabla

        // --- 2. EXTRACCIÓN DE DATOS ---
        const marca = parseCell(row.getCell(3)) || 'S/N';
        const anio = parseCell(row.getCell(4)) || '';
        const modelo = parseCell(row.getCell(5)) || '';
        const color = parseCell(row.getCell(6)) || '';
        const placa = parseCell(row.getCell(8)) || '';
        
        // Limpieza EXTREMA del número de serie (Quitamos espacios invisibles y forzamos mayúsculas)
        const serieBruta = parseCell(row.getCell(7));
        const serie = serieBruta.toUpperCase().replace(/\s+/g, '');

        if (!serie) {
          erroresValidacion.push(`Fila ${rowNumber} (${tipo} ${marca}): Es obligatorio el Número de Serie.`);
        }

        excelMaquinaria.push({
          tipo, 
          marca, 
          anio, 
          modelo, 
          color, 
          serie, 
          placa,
          id_subcontratista_principal: parseInt(idPrincipal)
        });

        if (serie) seriesList.push(serie);
      }
    });

    if (excelMaquinaria.length === 0) {
      return NextResponse.json({ error: "No se encontró maquinaria válida o el formato es incorrecto." }, { status: 400 });
    }

    if (erroresValidacion.length > 0) {
      const mensajeError = `Por favor corrige el Excel:\n• ${erroresValidacion.slice(0, 5).join('\n• ')}${erroresValidacion.length > 5 ? '\n... y más errores.' : ''}`;
      return NextResponse.json({ error: mensajeError }, { status: 400 });
    }

    // --- 3. CRUCE ANTI-DUPLICADOS BLINDADO ---
    let yaExistentes = [];
    if (seriesList.length > 0) {
      // Traemos todas las series activas de la BD
      const [filas] = await pool.query(`SELECT serie FROM Maquinaria_Equipo WHERE fecha_baja IS NULL`);
      // Las limpiamos de igual manera (sin espacios, mayúsculas puras) para comparar manzanas con manzanas
      yaExistentes = filas.map(f => (f.serie || '').toString().toUpperCase().replace(/\s+/g, ''));
    }

    // Filtramos para dejar solo la maquinaria que de verdad es "Nueva"
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
    const { maquinarias } = await request.json();

    if (!maquinarias || maquinarias.length === 0) {
      return NextResponse.json({ error: "No hay maquinaria para guardar" }, { status: 400 });
    }

    const fechaIngresoActual = new Date().toISOString().split('T')[0]; 

    for (const m of maquinarias) {
      await pool.query(`
        INSERT INTO Maquinaria_Equipo 
        (tipo, marca, modelo, anio, serie, placa, color, fecha_ingreso_obra, id_subcontratista)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        m.tipo, 
        m.marca, 
        m.modelo, 
        m.anio, 
        m.serie, 
        m.placa, 
        m.color, 
        fechaIngresoActual, 
        m.id_subcontratista_principal
      ]);
    }

    return NextResponse.json({ success: true, mensaje: `${maquinarias.length} equipos registrados correctamente.` });

  } catch (error) {
    console.error("Error guardando masivo:", error);
    return NextResponse.json({ error: "Error al guardar en la base de datos" }, { status: 500 });
  }
}