import { NextResponse } from 'next/server';
import pool from '../../../../lib/db';
import ExcelJS from 'exceljs';
import archiver from 'archiver';
import { PassThrough } from 'stream';
import path from 'path';

const getLunesDeSemana = (semanaStr) => {
  if (!semanaStr) return new Date(); // Si no hay filtro, usa hoy
  const [year, week] = semanaStr.split('-W');
  const d = new Date(year, 0, 1);
  const dayNum = d.getDay() || 7;
  d.setDate(d.getDate() + (4 - dayNum) + (week - 1) * 7); // Jueves de esa semana
  d.setDate(d.getDate() - 3); // Retrocede al Lunes
  return d;
};

export async function GET(request) {
  try {
    // 1. Obtener toda la maquinaria activa que pertenece al área de Medio Ambiente
    const [equipos] = await pool.query(`
      SELECT * FROM Maquinaria_Equipo 
      WHERE area = 'ambiental' AND fecha_baja IS NULL
    `);

    if (equipos.length === 0) {
      return NextResponse.json({ success: false, error: 'No hay maquinaria activa para exportar.' }, { status: 404 });
    }

    // 2. Preparar el streaming del archivo ZIP
    const stream = new PassThrough();
    const archive = archiver('zip', { zlib: { level: 9 } }); // Nivel máximo de compresión
    
    // Conectar el archiver al stream de respuesta
    archive.pipe(stream);

    const { searchParams } = new URL(request.url);
    const semanaFiltro = searchParams.get('semana');
    const templatePath = path.join(process.cwd(), 'public', 'plantillas', '22_INSPECCION_SEMANAL.xlsx');
    
    const fechaReporte = getLunesDeSemana(semanaFiltro);
    const fechaString = `${fechaReporte.getDate().toString().padStart(2, '0')}/${(fechaReporte.getMonth()+1).toString().padStart(2, '0')}/${fechaReporte.getFullYear()}`;

    // 3. Iterar sobre cada equipo y armar su Excel
    for (const equipo of equipos) {
      const tiposVehiculos = ['CAMIONETA', 'VEHICULO', 'PICK UP', 'SEDAN', 'SUV', 'CAMION', 'TRACTOCAMION', 'UNIDAD'];
      
      // Ajuste clave: Validar únicamente si el tipo incluye alguna de las palabras del arreglo
      const esVehiculo = equipo.tipo && tiposVehiculos.some(t => equipo.tipo.toUpperCase().includes(t));

      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(templatePath);

      const sheetToKeep = esVehiculo ? 'VEHÍCULOS' : 'MAQUINARIA';
      const sheetToDelete = esVehiculo ? 'MAQUINARIA' : 'VEHÍCULOS';

      const wsToDelete = workbook.getWorksheet(sheetToDelete);
      if (wsToDelete) workbook.removeWorksheet(wsToDelete.id);

      const ws = workbook.getWorksheet(sheetToKeep);

      // Inyectar datos
      ws.getCell('F3').value = `FECHA: ${fechaString}`;
      ws.getCell('A13').value = `Tipo: \n ${equipo.tipo}`;
      ws.getCell('C13').value = `Marca/Modelo: \n ${equipo.marca || ''} / ${equipo.modelo || ''}`;

      if (esVehiculo) {
          ws.getCell('E13').value = `Placa: \n ${equipo.placa || 'S/N'}`;
      } else {
          ws.getCell('E13').value = `Serie: \n ${equipo.serie || equipo.num_economico || 'S/N'}`;
      }
      ws.getCell('G13').value = `Año: \n ${equipo.anio || ''}`;

      // Escribir el libro temporal en un buffer en memoria
      const excelBuffer = await workbook.xlsx.writeBuffer();

      // Crear nombre de archivo limpio para dentro del ZIP
      const identificador = esVehiculo ? (equipo.placa || equipo.num_economico) : (equipo.num_economico || equipo.serie);
      const fileName = `Inspeccion_${equipo.tipo}_${identificador || 'S-N'}.xlsx`.replace(/[^a-zA-Z0-9_.-]/g, '_');

      // 4. Agregar el archivo de Excel recién creado al ZIP
      archive.append(Buffer.from(excelBuffer), { name: fileName });
    }

    // 5. Finalizar y cerrar el ZIP
    await archive.finalize();

    // 6. Retornar el Stream como respuesta HTTP para que el navegador lo descargue
    return new NextResponse(stream, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="Inspecciones_Ambientales_${Date.now()}.zip"`,
      },
    });

  } catch (error) {
    console.error("Error generando ZIP masivo:", error);
    return NextResponse.json({ success: false, error: 'Error interno al generar el paquete ZIP' }, { status: 500 });
  }
}