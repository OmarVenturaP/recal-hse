import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import ExcelJS from 'exceljs';
import path from 'path';

const generarTextoPeriodo = (mes, anio) => {
  const meses = {
    1: 'ENERO', 2: 'FEBRERO', 3: 'MARZO', 4: 'ABRIL', 5: 'MAYO', 6: 'JUNIO',
    7: 'JULIO', 8: 'AGOSTO', 9: 'SEPTIEMBRE', 10: 'OCTUBRE', 11: 'NOVIEMBRE', 12: 'DICIEMBRE'
  };
  
  if (mes && anio) {
    return `FECHA: ${meses[parseInt(mes)]} DE ${anio}`;
  }
  return 'PERIODO NO ESPECIFICADO';
}

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const mes = searchParams.get('mes');
    const anio = searchParams.get('anio');
    const periodoTexto = generarTextoPeriodo(mes, anio);
    const id = searchParams.get('id');
    const userRol = request.headers.get('x-user-rol');
    const idEmpresa = request.headers.get('x-empresa-id');

    if (!id) return NextResponse.json({ success: false, error: 'ID requerido' }, { status: 400 });

    try {
      let queryMaq = 'SELECT * FROM Maquinaria_Equipo WHERE id_maquinaria = ?';
      const paramsMaq = [id];

      if (userRol !== 'Master' && idEmpresa) {
        queryMaq += ' AND id_empresa = ?';
        paramsMaq.push(idEmpresa);
      }

      const [rows] = await pool.query(queryMaq, paramsMaq);
      if (rows.length === 0) return NextResponse.json({ success: false, error: 'Equipo no encontrado o no pertenece a su empresa' }, { status: 404 });
    
    const equipo = rows[0];

    const tiposVehiculos = ['CAMIONETA', 'VEHICULO', 'PICK UP'];
      
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

      ws.getCell('F3').value = periodoTexto;

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