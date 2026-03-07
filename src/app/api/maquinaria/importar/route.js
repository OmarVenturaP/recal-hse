import { NextResponse } from 'next/server';
import pool from '../../../../lib/db';
import ExcelJS from 'exceljs';

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

    // Recorremos desde la Fila 7 en adelante (Formato 12_PLAN_SERVICIO)
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber >= 7) {
        const tipo = row.getCell(2).value?.toString().trim();
        if (!tipo) return; // Si la columna B (Tipo) está vacía, saltamos la fila

        const marca = row.getCell(3).value?.toString().trim() || 'S/M';
        const anio = row.getCell(4).value?.toString().trim() || '';
        const modelo = row.getCell(5).value?.toString().trim() || '';
        const color = row.getCell(6).value?.toString().trim() || '';
        const placa = row.getCell(8).value?.toString().trim() || '';
        
        // Limpieza del número de serie
        const serieRaw = row.getCell(7).value;
        const serie = serieRaw ? serieRaw.toString().trim().toUpperCase() : '';

        // --- VALIDACIÓN ESTRICTA ---
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
      return NextResponse.json({ error: "No se encontró maquinaria en el archivo (Fila 7 en adelante)." }, { status: 400 });
    }

    // Frenamos si hay errores y avisamos al usuario
    if (erroresValidacion.length > 0) {
      const mensajeError = `Por favor corrige el Excel:\n• ${erroresValidacion.slice(0, 5).join('\n• ')}${erroresValidacion.length > 5 ? '\n... y más errores.' : ''}`;
      return NextResponse.json({ error: mensajeError }, { status: 400 });
    }

    // --- CRUCE INTELIGENTE CON LA BASE DE DATOS ---
    // Solo cruzamos con los equipos que están "ACTIVOS" (fecha_baja IS NULL)
    let yaExistentes = [];
    if (seriesList.length > 0) {
      const [filas] = await pool.query(
        `SELECT serie FROM Maquinaria_Equipo WHERE fecha_baja IS NULL AND serie IN (?)`,
        [seriesList]
      );
      yaExistentes = filas;
    }

    // Filtramos para dejar solo la maquinaria "Nueva" (o que reingresa tras una baja previa)
    const nuevaMaquinaria = excelMaquinaria.filter(excelRow => {
      return !yaExistentes.some(db => db.serie === excelRow.serie);
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

    // Como el Excel de Mantenimiento no trae "Fecha de Ingreso a Obra", usamos la fecha actual (hoy) por defecto
    const fechaIngresoActual = new Date().toISOString().split('T')[0]; 

    for (const m of maquinarias) {
      await pool.query(`
        INSERT INTO Maquinaria_Equipo 
        (tipo, marca, modelo, anio, serie, placa, color, fecha_ingreso_obra, id_subcontratista_principal)
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