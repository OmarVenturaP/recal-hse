import { NextResponse } from 'next/server';
import pool from '@/lib/db'; 
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import fs from 'fs';
import path from 'path';

const formatearFechaCabecera = (fechaStr) => {
  if (!fechaStr) return '';
  const date = new Date(fechaStr);
  const dia = date.getUTCDate();
  const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const mes = meses[date.getUTCMonth()];
  const anio = date.getUTCFullYear();
  return `${dia} de ${mes} de ${anio}`; 
};

const obtenerMesMayusculas = (fechaStr) => {
  if (!fechaStr) return '';
  const date = new Date(fechaStr);
  const meses = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];
  return meses[date.getUTCMonth()];
};

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id_trabajador = searchParams.get('id_trabajador'); 

    if (!id_trabajador) {
      return NextResponse.json({ success: false, error: 'Falta el ID del trabajador' }, { status: 400 });
    }

    const query = `
      SELECT 
        f.nombre_trabajador, 
        f.apellido_trabajador, 
        f.fecha_ingreso_obra,
        f.puesto_categoria, 
        c.razon_social AS nombre_subcontratista
      FROM Fuerza_Trabajo f
      LEFT JOIN Subcontratistas c ON f.id_subcontratista_principal = c.id_subcontratista
      WHERE f.id_trabajador = ?
    `;
    const [trabajadores] = await pool.query(query, [id_trabajador]);

    if (trabajadores.length === 0) {
      return NextResponse.json({ success: false, error: 'No se encontró al trabajador.' }, { status: 404 });
    }

    const t = trabajadores[0];

    const fechaIngresoDate = new Date(t.fecha_ingreso_obra);
    
    const valorContratista = t.nombre_subcontratista || 'RECAL ESTRUCTURAS';
    const contratistaLimpio = String(valorContratista).trim().toUpperCase();
    
    const datosPlantilla = {
      FECHA_EMISION: formatearFechaCabecera(t.fecha_ingreso_obra),
      NOMBRE_SUPERVISOR: `${t.apellido_trabajador || ''} ${t.nombre_trabajador || ''}`.trim().toUpperCase(),
      CONTRATISTA: contratistaLimpio,
      PUESTO: t.puesto_categoria.toUpperCase(),
      MES_VIGENCIA: obtenerMesMayusculas(t.fecha_ingreso_obra),
      ANIO_INICIO: fechaIngresoDate.getUTCFullYear(),
      ANIO_FIN: fechaIngresoDate.getUTCFullYear() + 1
    };

    const templatePath = path.join(process.cwd(), 'public', 'plantillas', 'CARTA_ASIGNACION.docx');
    if (!fs.existsSync(templatePath)) {
      return NextResponse.json({ success: false, error: 'Falta plantilla CARTA_ASIGNACION.docx' }, { status: 404 });
    }

    const content = fs.readFileSync(templatePath, 'binary');
    const zip = new PizZip(content);
    const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });

    // 4. Inyectar datos en el documento
    doc.render(datosPlantilla);
    const buffer = doc.getZip().generate({ type: 'nodebuffer' });

    const nombreLimpio = (t.nombre_trabajador || '').trim().replace(/ /g, '_');
    const apellidoLimpio = (t.apellido_trabajador || '').trim().replace(/ /g, '_');

    const nombreCompletoArchivo = [nombreLimpio, apellidoLimpio].filter(Boolean).join('_') || 'Sin_Nombre';

    const fileName = `Carta_Asignacion_${nombreCompletoArchivo}.docx`;

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    });

  } catch (error) {
    console.error("Error exportando carta de asignación:", error);
    return NextResponse.json({ success: false, error: 'Ocurrió un error al generar el documento.' }, { status: 500 });
  }
}