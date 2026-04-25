import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import ExcelJS from 'exceljs';
import archiver from 'archiver';
import fs from 'fs';
import path from 'path';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const mes = searchParams.get('mes');
    const anio = searchParams.get('anio');
    const tipo_unidad = searchParams.get('tipo_unidad');
    const area_usuario = searchParams.get('area_usuario');
    const userRol = request.headers.get('x-user-rol');
    const idEmpresa = request.headers.get('x-empresa-id');

    if (!mes || !anio || !tipo_unidad) {
      return NextResponse.json({ error: "Faltan parámetros de filtrado (mes, anio, tipo_unidad)" }, { status: 400 });
    }

    // 1. Consultar todos los mantenimientos del periodo y tipo de unidad
    let query = `
      SELECT h.*, m.num_economico, m.tipo, m.marca, m.modelo, m.serie, m.anio as anio_maquina, m.placa, m.color, m.horometro as horometro_actual_maquina,
             m.fecha_proximo_mantenimiento, m.fecha_ingreso_obra, m.tipo_unidad,
             s.razon_social as nombre_subcontratista, s.binario_bitacora, s.nombre_archivo_bitacora
      FROM Historial_Mantenimiento h
      JOIN Maquinaria_Equipo m ON h.id_maquinaria = m.id_maquinaria
      LEFT JOIN Subcontratistas s ON m.id_subcontratista = s.id_subcontratista
      WHERE MONTH(h.fecha_mantenimiento) = ? AND YEAR(h.fecha_mantenimiento) = ?
    `;
    const params = [mes, anio];

    // Aislamiento Multi-Tenant
    if (userRol !== 'Master' && idEmpresa) {
      query += ` AND m.id_empresa = ?`;
      params.push(idEmpresa);
    }

    if (tipo_unidad !== 'todos') {
      query += ` AND m.tipo_unidad = ?`;
      params.push(tipo_unidad);
    }

    if (area_usuario && area_usuario !== 'Ambas') {
      const areaFiltro = area_usuario === 'Medio Ambiente' ? 'ambiental' : 'seguridad';
      query += ` AND m.area = ?`;
      params.push(areaFiltro);
    }

    const [rows] = await pool.query(query, params);
    console.log(`[ZIP Bitacoras] Encontrados ${rows.length} registros para procesar.`);

    if (rows.length === 0) {
      return NextResponse.json({ error: "No se encontraron mantenimientos para los filtros seleccionados." }, { status: 404 });
    }

    // 2. Preparar el ZIP usando Web Streams para evitar deadlocks
    const archive = archiver('zip', { zlib: { level: 5 } });

    const webStream = new ReadableStream({
      async start(controller) {
        // Pipe archiver to the web stream controller
        archive.on('data', (chunk) => controller.enqueue(new Uint8Array(chunk)));
        archive.on('end', () => controller.close());
        archive.on('error', (err) => controller.error(err));

        try {
          const defaultTemplatePath = path.join(process.cwd(), 'public', 'plantillas', '12_BITACORA_MTTO_DEFAULT.xlsx');
          const defaultTemplateBuffer = fs.readFileSync(defaultTemplatePath);

          const formatFecha = (d) => {
            if (!d) return '';
            const date = new Date(d);
            return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
          };

          for (const row of rows) {
            let templateBuffer = row.binario_bitacora || defaultTemplateBuffer;
            let templateFileName = row.nombre_archivo_bitacora || '12_BITACORA_MTTO_DEFAULT.xlsx';
            const isExcel = templateFileName.endsWith('.xlsx');

            const data = {
              num_economico: row.num_economico || '',
              tipo: row.tipo || '',
              marca: row.marca || '',
              modelo: row.modelo || '',
              serie: row.serie || '',
              anio: row.anio_maquina || '',
              placa: row.placa || '',
              color: row.color || '',
              horometro_actual: row.horometro_actual_maquina || '0',
              contratista: row.nombre_subcontratista || '',
              proximo_mantenimiento: formatFecha(row.fecha_proximo_mantenimiento),
              fecha_ingreso: formatFecha(row.fecha_ingreso_obra),
              fecha_mantenimiento: formatFecha(row.fecha_mantenimiento),
              tipo_mantenimiento: row.tipo_mantenimiento || '',
              horometro_mantenimiento: (() => {
                if (row.horometro_mantenimiento === null) return row.tipo_unidad === 'equipo' ? 'N/A' : '';
                const h = row.horometro_mantenimiento;
                if (row.tipo_unidad === 'equipo') return 'N/A';
                if (row.tipo_unidad === 'maquinaria') return `${Number(h).toFixed(2)} HRS`;
                if (row.tipo_unidad === 'vehiculo') return `${Math.round(h)} KM`;
                return h;
              })(),
              observaciones_mantenimiento: row.observaciones || '',
              realizado_por: row.realizado_por || '',
              folio_mtto: String(row.folio_mtto || '').padStart(5, '0')
            };

            console.log(`>>> [DEBUG] DATOS BITÁCORA (MASIVA) - ${data.num_economico}:`, data);

            let docBuffer;
            if (isExcel) {
              const workbook = new ExcelJS.Workbook();
              await workbook.xlsx.load(templateBuffer);
              workbook.eachSheet((worksheet) => {
                worksheet.eachRow((rowCells) => {
                  rowCells.eachCell((cell) => {
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
                      // Caso 2: Rich Text
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
              docBuffer = await workbook.xlsx.writeBuffer();
            } else {
              const zip = new PizZip(templateBuffer);
              const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });
              doc.render(data);
              docBuffer = doc.getZip().generate({ type: 'nodebuffer' });
            }

            const fileName = `Bitacora_${row.num_economico || 'equipo'}_Folio_${data.folio_mtto}${isExcel ? '.xlsx' : '.docx'}`.replace(/[^a-zA-Z0-9_.-]/g, '_');
            archive.append(Buffer.from(docBuffer), { name: fileName });
            console.log(`[ZIP Bitacoras] Añadido: ${fileName}`);
          }

          console.log("[ZIP Bitacoras] Finalizando archivo...");
          await archive.finalize();
        } catch (innerError) {
          console.error("[ZIP Bitacoras] Error en el proceso de generación:", innerError);
          controller.error(innerError);
        }
      }
    });

    return new NextResponse(webStream, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="Bitacoras_Masivas_${mes}_${anio}_${Date.now()}.zip"`,
      },
    });

  } catch (error) {
    console.error("Error en exportación masiva:", error);
    return NextResponse.json({ error: "Error interno al generar bitácoras masivas" }, { status: 500 });
  }
}
