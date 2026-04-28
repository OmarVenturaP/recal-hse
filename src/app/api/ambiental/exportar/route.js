import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import archiver from 'archiver';
import { PassThrough } from 'stream';
import ExcelJS from 'exceljs';
import path from 'path';

const MESES = [
  "", "ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO",
  "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"
];

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const idEmpresa = request.headers.get('x-empresa-id');
    const userRol = request.headers.get('x-user-rol');
    const userArea = request.headers.get('x-user-area');

    // Validación de Autorización
    const isAuthorized = userRol === 'Admin' || 
                         userRol === 'Master' || 
                         (userArea && (userArea.toLowerCase().includes('ambiente') || userArea.toLowerCase().includes('ambiental')));

    if (!isAuthorized || !idEmpresa) {
      return NextResponse.json({ error: "No autorizado o empresa no identificada" }, { status: 403 });
    }

    const mes = searchParams.get('mes');
    const anio = searchParams.get('anio');
    const idItem = searchParams.get('id_item');

    // 1. Obtener datos básicos según el modo (Individual o Periodo)
    let query = `
      SELECT 
        c.nombre_reporte,
        i.*,
        e.nombre_comercial as nombre_contratista,
        d.mes as d_mes,
        d.anio as d_anio
      FROM Ambiental_Catalogo_Reportes c
      JOIN Ambiental_Reportes_Items i ON i.id_cat_reporte = c.id_cat_reporte
      JOIN Ambiental_Dossier d ON i.id_dossier = d.id_dossier
      JOIN cat_empresas e ON d.id_empresa = e.id_empresa
      WHERE c.bActivo = 1
    `;
    const params = [];

    if (idItem) {
      query += " AND i.id_item = ? AND d.id_empresa = ?";
      params.push(idItem, idEmpresa);
    } else {
      query += " AND d.id_empresa = ? AND d.mes = ? AND d.anio = ?";
      params.push(idEmpresa, mes, anio);
    }

    const [rows] = await pool.query(query, params);

    if (rows.length === 0) {
      return NextResponse.json({ error: "No se encontraron reportes para exportar." }, { status: 404 });
    }

    // MODO INDIVIDUAL: Retornar un solo XLSX
    if (idItem) {
      const reportData = rows[0];
      const buffer = await generarReporteExcel(reportData);
      return new NextResponse(buffer, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="Reporte_${reportData.nombre_reporte.replace(/\s+/g, '_')}.xlsx"`,
        },
      });
    }

    // MODO PERIODICO: Retornar ZIP
    const stream = new PassThrough();
    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.pipe(stream);

    for (const reportData of rows) {
      if (reportData.is_na) continue;
      const buffer = await generarReporteExcel(reportData);
      const filename = `${reportData.nombre_reporte.replace(/[\/\\?%*:|"<>]/g, '-')}_${MESES[reportData.d_mes]}_${reportData.d_anio}.xlsx`;
      archive.append(buffer, { name: filename });
    }

    await archive.finalize();

    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="Dossier_Ambiental_${MESES[mes]}_${anio}.zip"`,
      },
    });

  } catch (error) {
    console.error("Error en exportación ambiental:", error);
    return NextResponse.json({ error: "Error al generar la exportación" }, { status: 500 });
  }
}

async function generarReporteExcel(reportData) {
  const templatePath = path.join(process.cwd(), 'public', 'plantillas', 'REPORTE_FOTOGRAFICO.xlsx');
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(templatePath);
  const worksheet = workbook.getWorksheet(1);

  const periodoTexto = `${MESES[reportData.d_mes]} ${reportData.d_anio}`;

  // Reemplazo global de placeholders
  worksheet.eachRow((row) => {
    row.eachCell((cell) => {
      if (typeof cell.value === 'string') {
        cell.value = cell.value
          .replace('{titulo_reporte}', reportData.nombre_reporte.toUpperCase())
          .replace('{periodo_reporte}', periodoTexto)
          .replace('{frente}', (reportData.frente_trabajo || 'GENERAL').toUpperCase())
          .replace('{nombre_contratista}', reportData.nombre_contratista.toUpperCase())
          .replace('{nombre_supervisor}', (reportData.observaciones || '').toUpperCase());
      }
    });
  });

  // --- INSERTAR FOTOS ---
  const [fotos] = await pool.query('SELECT * FROM Ambiental_Reportes_Fotos WHERE id_item = ?', [reportData.id_item]);
  
  let currentRow = 5; // Empezamos en A5 / B5
  const PHOTOS_PER_ROW = 2;
  // Basado en 59.83 ancho (aprox 424px) y 234.75 alto (aprox 313px)
  const PHOTO_WIDTH = 420; // ~90% de 424
  const PHOTO_HEIGHT = 295; // ~95% de 313

  for (let i = 0; i < fotos.length; i += PHOTOS_PER_ROW) {
    // Asegurar que la fila de fotos tenga el alto correcto
    worksheet.getRow(currentRow).height = 234.75; 
    
    for (let j = 0; j < PHOTOS_PER_ROW; j++) {
      const fotoIndex = i + j;
      if (fotoIndex >= fotos.length) break;

      const foto = fotos[fotoIndex];
      const colIndex = j === 0 ? 1 : 2; // Col 1 (A) y Col 2 (B)

      try {
        // Optimizar imagen con las dimensiones exactas solicitadas
        const urlOptimizada = foto.url_cloudinary.replace('/upload/', `/upload/c_fill,w_${PHOTO_WIDTH},h_${PHOTO_HEIGHT},q_auto/`);
        const response = await fetch(urlOptimizada);
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const imageId = workbook.addImage({
          buffer: buffer,
          extension: 'jpeg',
        });

        // Centrado: Offset horizontal 0.08 (~8%), Offset vertical 0.025 (~2.5%)
        worksheet.addImage(imageId, {
          tl: { col: colIndex - 1 + 0.55, row: currentRow - 1 + 0.025 },
          ext: { width: PHOTO_WIDTH, height: PHOTO_HEIGHT },
          editAs: 'oneCell'
        });

        // Descripción en la fila de abajo (A6 / B6, etc)
        const descRow = currentRow + 1;
        const cellDesc = worksheet.getCell(descRow, colIndex);
        cellDesc.value = foto.pie_de_foto || '';
        cellDesc.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        cellDesc.font = { bold: true, size: 9 };
      } catch (err) {
        console.error("Error al insertar foto en Excel:", err);
      }
    }
    
    currentRow += 2; // Siguiente par de fotos (5->7->9...)
  }

  return await workbook.xlsx.writeBuffer();
}
