import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import ExcelJS from 'exceljs';
import fs from 'fs';
import path from 'path';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const idMaquinaria = searchParams.get('id_maquinaria');
    const idMantenimiento = searchParams.get('id_mantenimiento');
    const userRol = request.headers.get('x-user-rol');
    const idEmpresa = request.headers.get('x-empresa-id');

    if (!idMaquinaria) {
      return NextResponse.json({ error: "Falta ID de maquinaria" }, { status: 400 });
    }

    // 1. Obtener datos de la maquinaria con aislamiento
    let queryMaq = `
      SELECT m.*, s.razon_social as nombre_subcontratista, s.binario_bitacora, s.nombre_archivo_bitacora
      FROM Maquinaria_Equipo m
      LEFT JOIN Subcontratistas s ON m.id_subcontratista = s.id_subcontratista
      WHERE m.id_maquinaria = ?
    `;
    const paramsMaq = [idMaquinaria];

    if (userRol !== 'Master' && idEmpresa) {
      queryMaq += ` AND m.id_empresa = ?`;
      paramsMaq.push(idEmpresa);
    }

    const [rowsMaq] = await pool.query(queryMaq, paramsMaq);
    if (rowsMaq.length === 0) return NextResponse.json({ error: "Maquinaria no encontrada o no pertenece a su empresa" }, { status: 404 });
    
    const maquina = rowsMaq[0];

    // 2. Obtener datos del mantenimiento si se proporcionó id
    let mantenimiento = null;
    if (idMantenimiento) {
      const [rowsMtto] = await pool.query('SELECT * FROM Historial_Mantenimiento WHERE id_mantenimiento = ?', [idMantenimiento]);
      if (rowsMtto.length > 0) mantenimiento = rowsMtto[0];
    }

    let templateBuffer = maquina.binario_bitacora;
    let fileName = maquina.nombre_archivo_bitacora || 'bitacora.docx';

    if (!templateBuffer) {
      // Fallback a la plantilla por defecto
      const defaultPath = path.join(process.cwd(), 'public', 'plantillas', '12_BITACORA_MTTO_DEFAULT.xlsx');
      try {
        templateBuffer = fs.readFileSync(defaultPath);
        fileName = '12_BITACORA_MTTO_DEFAULT.xlsx';
      } catch (err) {
        console.error("Error al leer plantilla por defecto:", err);
        return NextResponse.json({ error: "No se encontró la plantilla por defecto." }, { status: 500 });
      }
    }

    const isExcel = fileName.endsWith('.xlsx');

    const formatFecha = (d) => {
      if (!d) return '';
      const date = new Date(d);
      return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
    };

    const data = {
      num_economico: maquina.num_economico || '',
      tipo: maquina.tipo.toUpperCase() || 'N/A',
      marca: maquina.marca || '',
      modelo: maquina.modelo || '',
      serie: maquina.serie || '',
      anio: maquina.anio || '',
      placa: maquina.placa || '',
      color: maquina.color || '',
      tipo_unidad: maquina.tipo_unidad.toUpperCase() || '',
      horometro_actual: maquina.horometro || '0',
      contratista: maquina.nombre_subcontratista || '',
      proximo_mantenimiento: formatFecha(maquina.fecha_proximo_mantenimiento),
      fecha_ingreso: formatFecha(maquina.fecha_ingreso_obra),
      // Datos del servicio
      fecha_mantenimiento: mantenimiento ? formatFecha(mantenimiento.fecha_mantenimiento) : '',
      tipo_mantenimiento: mantenimiento ? mantenimiento.tipo_mantenimiento : '',
      horometro_mantenimiento: (() => {
        if (!mantenimiento || mantenimiento.horometro_mantenimiento === null) {
          return maquina.tipo_unidad === 'equipo' ? 'N/A' : '';
        }
        const h = mantenimiento.horometro_mantenimiento;
        if (maquina.tipo_unidad === 'equipo') return 'N/A';
        if (maquina.tipo_unidad === 'maquinaria') return `${Number(h).toFixed(2)} HRS`;
        if (maquina.tipo_unidad === 'vehiculo') return `${Math.round(h)} KM`;
        return h;
      })(),
      observaciones_mantenimiento: mantenimiento ? mantenimiento.observaciones : '',
      realizado_por: mantenimiento ? (mantenimiento.realizado_por || '') : '',
      folio_mtto: mantenimiento ? String(mantenimiento.folio_mtto || '').padStart(5, '0') : ''
    };

    let outputBuffer;

    if (isExcel) {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(templateBuffer);

      workbook.eachSheet((worksheet) => {
        worksheet.eachRow((row) => {
          row.eachCell((cell) => {
            if (cell.value) {
              // Caso 1: Texto plano
              if (typeof cell.value === 'string') {
                let text = cell.value;
                Object.keys(data).forEach(key => {
                  const tag = `{${key}}`;
                  if (text.includes(tag)) {
                    text = text.split(tag).join(data[key]);
                  }
                });
                cell.value = text;
              } 
              // Caso 2: Rich Text (Texto con formato)
              else if (cell.value.richText) {
                cell.value.richText.forEach(rt => {
                  if (rt.text) {
                    Object.keys(data).forEach(key => {
                      const tag = `{${key}}`;
                      if (rt.text.includes(tag)) {
                        rt.text = rt.text.split(tag).join(data[key]);
                      }
                    });
                  }
                });
                cell.value = { richText: cell.value.richText };
              }
            }
          });
        });
      });

      outputBuffer = await workbook.xlsx.writeBuffer();
    } else {
      // Word
      const zip = new PizZip(templateBuffer);
      const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
      });

      doc.render(data);
      outputBuffer = doc.getZip().generate({ type: 'nodebuffer' });
    }

    const contentType = isExcel 
      ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

    return new Response(outputBuffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="Bitacora_${maquina.num_economico || 'equipo'}_${Date.now()}${isExcel ? '.xlsx' : '.docx'}"`,
      },
    });

  } catch (error) {
    console.error("Error exportando bitácora:", error);
    return NextResponse.json({ error: "Error interno al generar documento" }, { status: 500 });
  }
}
