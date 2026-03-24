import { NextResponse } from 'next/server';
import pool from '../../../../lib/db';
import ExcelJS from 'exceljs';
import path from 'path';

const getLunesDeSemana = (semanaStr) => {
  if (!semanaStr) return new Date();
  const [year, week] = semanaStr.split('-W');
  const d = new Date(year, 0, 1);
  const dayNum = d.getDay() || 7;
  d.setDate(d.getDate() + (4 - dayNum) + (week - 1) * 7);
  d.setDate(d.getDate() - 3); 
  return d;
};

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const semanaFiltro = searchParams.get('semana');

  if (!id) return NextResponse.json({ success: false, error: 'ID requerido' }, { status: 400 });

  try {
    const [rows] = await pool.query('SELECT * FROM Maquinaria_Equipo WHERE id_maquinaria = ?', [id]);
    if (rows.length === 0) return NextResponse.json({ success: false, error: 'Equipo no encontrado' }, { status: 404 });
    
    const equipo = rows[0];

    const tiposVehiculos = ['CAMIONETA', 'VEHICULO', 'PICK UP', 'SEDAN', 'SUV', 'CAMION', 'TRACTOCAMION', 'UNIDAD'];
      
      const esVehiculo = equipo.tipo && tiposVehiculos.some(t => equipo.tipo.toUpperCase().includes(t));

    const templatePath = path.join(process.cwd(), 'public', 'plantillas', '22_INSPECCION_SEMANAL.xlsx');
    
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(templatePath);

    const sheetToKeep = esVehiculo ? 'VEHÍCULOS' : 'MAQUINARIA';
    const sheetToDelete = esVehiculo ? 'MAQUINARIA' : 'VEHÍCULOS';

    const wsToDelete = workbook.getWorksheet(sheetToDelete);
    if (wsToDelete) {
        workbook.removeWorksheet(wsToDelete.id);
    }

    const ws = workbook.getWorksheet(sheetToKeep);

    const fechaReporte = getLunesDeSemana(semanaFiltro);
    const fechaString = `${fechaReporte.getDate().toString().padStart(2, '0')}/${(fechaReporte.getMonth()+1).toString().padStart(2, '0')}/${fechaReporte.getFullYear()}`;

      ws.getCell('F3').value = `FECHA: ${fechaString}`;

      ws.getCell('A13').value = `Tipo: \n ${equipo.tipo}`;
      ws.getCell('C13').value = `Marca/Modelo: \n ${equipo.marca || ''} / ${equipo.modelo || ''}`;

      if (esVehiculo) {
          ws.getCell('E13').value = `Placa: \n ${equipo.placa || 'S/N'}`;
      } else {
          ws.getCell('E13').value = `Serie: \n ${equipo.serie || equipo.num_economico || 'S/N'}`;
      }
      ws.getCell('G13').value = `Año: \n ${equipo.anio || ''}`;

    const buffer = await workbook.xlsx.writeBuffer();

    const identificador = esVehiculo ? (equipo.placa || equipo.num_economico) : (equipo.num_economico || equipo.serie);
    const safeName = `Inspeccion_${equipo.tipo}_${identificador}.xlsx`.replace(/[^a-zA-Z0-9_.-]/g, '_');

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Disposition': `attachment; filename="${safeName}"`,
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      },
    });

  } catch (error) {
    console.error("Error generando Excel:", error);
    return NextResponse.json({ success: false, error: 'Error interno al generar inspección' }, { status: 500 });
  }
}