import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import ExcelJS from 'exceljs';
import archiver from 'archiver';
import { PassThrough } from 'stream';
import path from 'path';

const generarTextoPeriodo = (mes, anio) => {
  const meses = {
    1: 'ENERO', 2: 'FEBRERO', 3: 'MARZO', 4: 'ABRIL', 5: 'MAYO', 6: 'JUNIO',
    7: 'JULIO', 8: 'AGOSTO', 9: 'SEPTIEMBRE', 10: 'OCTUBRE', 11: 'NOVIEMBRE', 12: 'DICIEMBRE'
  };
  
  if (mes && anio) {
    return `PERIODO: ${meses[parseInt(mes)]} DE ${anio}`;
  }
  return 'PERIODO NO ESPECIFICADO';
}

export async function GET(request) {
  try {
    const userRol = request.headers.get('x-user-rol');
    const idEmpresa = request.headers.get('x-empresa-id');

    let query = `
      SELECT * FROM Maquinaria_Equipo 
      WHERE area = 'ambiental' AND fecha_baja IS NULL
    `;
    const params = [];

    if (userRol !== 'Master' && idEmpresa) {
      query += ` AND id_empresa = ?`;
      params.push(idEmpresa);
    }

    const [equipos] = await pool.query(query, params);

    if (equipos.length === 0) {
      return NextResponse.json({ success: false, error: 'No hay maquinaria activa para exportar.' }, { status: 404 });
    }

    const stream = new PassThrough();
    const archive = archiver('zip', { zlib: { level: 9 } });
    
    archive.pipe(stream);

    const { searchParams } = new URL(request.url);
    const mes = searchParams.get('mes');
    const anio = searchParams.get('anio');
    const templatePath = path.join(process.cwd(), 'public', 'plantillas', '22_INSPECCION_SEMANAL.xlsx');
    
    const periodoTexto = generarTextoPeriodo(mes, anio);

    for (const equipo of equipos) {
      const tiposVehiculos = ['CAMIONETA', 'VEHICULO', 'PICK UP'];
      
      const esVehiculo = equipo.tipo && tiposVehiculos.some(t => equipo.tipo.toUpperCase().includes(t));

      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(templatePath);

      const sheetToKeep = esVehiculo ? 'VEHÍCULOS' : 'MAQUINARIA';
      const sheetToDelete = esVehiculo ? 'MAQUINARIA' : 'VEHÍCULOS';

      const wsToDelete = workbook.getWorksheet(sheetToDelete);
      if (wsToDelete) workbook.removeWorksheet(wsToDelete.id);

      const ws = workbook.getWorksheet(sheetToKeep);

      ws.getCell('F3').value = periodoTexto;
      ws.getCell('A13').value = `Tipo: \n ${equipo.tipo}`;
      ws.getCell('C13').value = `Marca/Modelo: \n ${equipo.marca || ''} / ${equipo.modelo || ''}`;

      if (esVehiculo) {
          ws.getCell('E13').value = `Placa: \n ${equipo.placa || 'S/N'}`;
      } else {
          ws.getCell('E13').value = `Serie: \n ${equipo.serie || equipo.num_economico || 'S/N'}`;
      }
      ws.getCell('G13').value = `Año: \n ${equipo.anio || ''}`;

      const excelBuffer = await workbook.xlsx.writeBuffer();

      const identificador = esVehiculo ? (equipo.placa || equipo.num_economico) : (equipo.num_economico || equipo.serie);
      const fileName = `Inspeccion_${equipo.tipo}_${identificador || 'S-N'}.xlsx`.replace(/[^a-zA-Z0-9_.-]/g, '_');

      archive.append(Buffer.from(excelBuffer), { name: fileName });
    }

    await archive.finalize();

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