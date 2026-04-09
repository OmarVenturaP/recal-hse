import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import ExcelJS from 'exceljs';
import path from 'path';
import { readFile, access } from 'fs/promises';
import { constants } from 'fs';

// =====================================================================
// GET: Exportar informe individual a Excel (ESTRUCTURA DE 3 HOJAS - VERSIÓN MANUAL)
// Query: ?id=X
// =====================================================================
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ error: "Parámetro 'id' requerido" }, { status: 400 });

    // 1. Obtener datos
    const [informes] = await pool.query(`SELECT * FROM informes_seguridad WHERE id_informe = ?`, [id]);
    if (informes.length === 0) return NextResponse.json({ error: "Informe no encontrado" }, { status: 404 });
    const informe = informes[0];

    const [ft_rows] = await pool.query(
      `SELECT * FROM informes_seguridad_ft WHERE id_informe = ? ORDER BY id_informe_seguridad_ft`, [id]
    );

    const [personalAll] = await pool.query(
      `SELECT CONCAT(IFNULL(apellido_trabajador,''), ' ', IFNULL(nombre_trabajador,'')) AS nombre, UPPER(puesto_categoria) AS categoria
       FROM Fuerza_Trabajo WHERE id_subcontratista_principal = ? AND bActivo = 1`,
      [informe.id_subcontratista]
    );

    const [fotos] = await pool.query(`SELECT * FROM informes_fotos WHERE id_informe = ? ORDER BY orden`, [id]);

    // 2. Cargar plantilla
    const templatePath = path.join(process.cwd(), 'public', 'plantillas', 'INFORME_SEGURIDAD.xlsx');
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(templatePath);

    const ws1 = workbook.worksheets[0]; 
    const ws2 = workbook.worksheets[1]; 
    const ws3 = workbook.worksheets[2]; 

    if (!ws1) throw new Error("Plantilla inválida");

    // --- FUNCIONES DE ESTETICA ---
    const applyStyleFromTemplate = (ws, sourceRowIdx, targetRowIdx, cols) => {
      const sourceRow = ws.getRow(sourceRowIdx);
      const targetRow = ws.getRow(targetRowIdx);
      cols.forEach(col => {
        const sourceCell = sourceRow.getCell(col);
        const targetCell = targetRow.getCell(col);
        targetCell.font = sourceCell.font;
        targetCell.border = sourceCell.border;
        targetCell.alignment = sourceCell.alignment;
        targetCell.fill = sourceCell.fill;
      });
    };

    // --- HOJA 1: PORTADA ---
    ws1.getCell('C7').value = informe.num_reporte; 
    ws1.getCell('D9').value = "Línea K"; 

    const frentesUnicos = [...new Set(ft_rows.map(r => r.frente).filter(f => f && f.trim()))];
    ws1.getCell('D10').value = frentesUnicos.join(', ');
    ws1.getCell('D11').value = informe.subcontratista;

    const MESES = ["ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO", "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"];
    const fmtPeriodo = (inicio, fin) => {
      const d1 = new Date(inicio);
      const d2 = new Date(fin);
      const m1 = MESES[d1.getUTCMonth()];
      const m2 = MESES[d2.getUTCMonth()];
      return `${String(d1.getUTCDate()).padStart(2, '0')} DE ${m1} AL ${String(d2.getUTCDate()).padStart(2, '0')} DE ${m2} DEL ${d2.getUTCFullYear()}`;
    };
    ws1.getCell('D12').value = fmtPeriodo(informe.periodo_inicio, informe.periodo_fin);

    const personalCols = ['B', 'D', 'E'];

    // Convertimos nombre para que la primera letra de cada palabra sea mayuscula y las demás minusculas
    const nombreCompleto = (nombre) => {
      return nombre.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
    };

    // Convertimos categoria para que la primera letra de cada palabra sea mayuscula y las demás minusculas
    const categoriaCompleta = (categoria) => {
      return categoria.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
    };

    const catUpper = (p) => (p.categoria || '').toUpperCase();
    
    // Categorizamos de forma excluyente para no duplicar personal en las listas
    const residentes = personalAll.filter(p => 
      !catUpper(p).includes('SUPERVISOR') && !catUpper(p).includes('COORDINADOR') && 
      (catUpper(p).includes('RESIDENTE') || catUpper(p).includes('SUPERINTENDENTE') || catUpper(p).includes('GERENTE'))
    );
    const coordinadores = personalAll.filter(p => catUpper(p).includes('COORDINADOR'));
    const supervisores = personalAll.filter(p => catUpper(p).includes('SUPERVISOR'));

    // Según instrucciones del usuario, Residentes van a partir de C20 y Supervisor en C26
    const resBaseRow = 20;
    const supBaseRow = 26;
    let offset = 0;

    // Helper para duplicar filas de forma ultra-segura
    const safeInsertRows = (ws, baseRow, totalPeople) => {
        if (totalPeople <= 1) return 0;
        const count = totalPeople - 1;
        ws.spliceRows(baseRow + 1, 0, ...Array(count).fill([]));
        for(let i = 1; i <= count; i++) {
           const rowIdx = baseRow + i;
           ws.getRow(rowIdx).height = ws.getRow(baseRow).height;
           applyStyleFromTemplate(ws, baseRow, rowIdx, ['B', 'C', 'E']);
        }
        return count;
    };

    // 1. Inserción de Residentes
    if (residentes.length > 0) {
       offset += safeInsertRows(ws1, resBaseRow, residentes.length);
       residentes.forEach((p, idx) => {
          const r = resBaseRow + idx;
          ws1.getCell(`B${r}`).value = idx + 1;
          ws1.getCell(`C${r}`).value = nombreCompleto(p.nombre).trim();
          ws1.getCell(`E${r}`).value = categoriaCompleta(p.categoria).trim();
       });
    }

    // 2. Inserción de Supervisores
    if (supervisores.length > 0) {
       const sRow = supBaseRow + offset;
       safeInsertRows(ws1, sRow, supervisores.length); 
       supervisores.forEach((p, idx) => {
          const r = sRow + idx;
          ws1.getCell(`B${r}`).value = idx + 1;
          ws1.getCell(`C${r}`).value = nombreCompleto(p.nombre).trim();
          ws1.getCell(`E${r}`).value = categoriaCompleta(p.categoria).trim();
       });
    }

    // --- REPARADOR DE MERGES DE PRODUCCIÓN "NUKE & REBUILD" ---
    // Destruimos la basura de merges corruptos dejada por spliceRows y reconstruimos
    for (let r = 13; r <= 50; r++) {
       // Primero, aniquilar TODOS los merges que toquen esta fila para evitar colisiones internas en ExcelJS
       const mergesParaEliminar = Object.values(ws1.model.merges || {}).filter(m => {
           // m por ejemplo es "B19:E19"
           const match = m.match(/\d+/g);
           return match && match.includes(r.toString());
       });
       mergesParaEliminar.forEach(m => {
           try { ws1.unMergeCells(m); } catch(e) {}
       });

       // Luego reconstruir celdas basadas en lectura de valores
       const cellB = ws1.getCell(`B${r}`);
       let valB = cellB.value;
       if (!valB) {
           valB = '';
       } else if (typeof valB === 'object') {
           valB = valB.richText ? valB.richText.map(rt=>rt.text).join('') : (valB.result || valB.formula || '');
       }
       const textB = valB.toString().trim().toUpperCase();

       if (textB.includes('RESPONSABLES DE OBRA') || textB.includes('PERSONAL AREA DE SEGURIDAD')) {
           try { ws1.mergeCells(`B${r}:E${r}`); } catch(e) {}
           cellB.alignment = { horizontal: 'center', vertical: 'middle' };
       } else if (textB === 'N°' || (!isNaN(parseInt(textB)) && textB !== '')) {
           try { ws1.mergeCells(`C${r}:D${r}`); } catch(e) {}
       }
    }


    // --- HOJA 2: FUERZA DE TRABAJO ---
    if (ws2) {
      const diasFT = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];
      const colsFT = ['E', 'F', 'G', 'H', 'I', 'J', 'K'];

      // Positición de filas: 8 para ordinarios, 6 para tiempo extra -> Máximo 14 frentes mapeables
      const filasDisponibles = [7, 9, 11, 13, 15, 17, 19, 21, 27, 29, 31, 33, 35, 37];

      ft_rows.forEach((row, idx) => {
        if (idx >= filasDisponibles.length) return; 
        const fila = filasDisponibles[idx];
        
        ws2.getCell('B' + fila).value = row.frente;
        diasFT.forEach((dia, dIdx) => {
          const col = colsFT[dIdx];
          ws2.getCell(col + fila).value = parseFloat(row[`hr_${dia}`]) || 0;
          ws2.getCell(col + (fila + 1)).value = parseInt(row[`per_${dia}`]) || 0;
        });
        
        // Sobrescribimos el cálculo de Excel con el de nuestra aplicación para asegurar integridad
        ws2.getCell('L' + fila).value = parseFloat(row.total_hh_semana) || 0;
      });

      // Cálculo Inteligente de FTE (Promedio de Fuerza de Trabajo excluyendo días sin personal)
      let sumT = 0; let countD = 0;
      diasFT.forEach((dia) => {
        const totalCol = ft_rows.reduce((sum, r) => sum + (parseInt(r[`per_${dia}`]) || 0), 0);
        if (totalCol > 0) { sumT += totalCol; countD++; }
      });
      // Inyectamos como valor estático en G39 al igual que se hacía en versiones anteriores, o mediante fórmula Excel robusta
      ws2.getCell('G39').value = { formula: 'IFERROR(AVERAGEIF(E23:K23, ">0"), 0)', result: countD > 0 ? parseFloat((sumT / countD).toFixed(2)) : 0 };
    }


    // --- HOJA 3: INDICADORES e IMÁGENES ---
    if (ws3) {
      ws3.getCell('E46').value = parseFloat(informe.hh_semana_anterior) || 0;
      ws3.getCell('J46').value = parseFloat(informe.hh_semana_actual) || 0;
      ws3.getCell('E48').value = supervisores.length;

      // 1. Dinamismo de Paginas: Calcular cuantas filas requeriemos para no pisar las firmas ni partir fotos
      let extraRowsToInsert = 0;
      const rowsPerGroup = 18; // 15 filas de foto + 1 de texto + 2 margen
      if (fotos.length > 0) {
        const totalGroups = Math.ceil(fotos.length / 3);
        const requiredRows = totalGroups * rowsPerGroup;
        const baseCapacity = 38; // Espacio nativo desde Fila 55 hasta 93
        if (requiredRows > baseCapacity) {
           extraRowsToInsert = requiredRows - baseCapacity;
           // Insertamos celdas en blanco justo arriba del bloque de firmas (Fila 94 nativa)
           ws3.spliceRows(94, 0, ...Array(extraRowsToInsert).fill([]));
        }
      }

      // 2. Colocar las firmas en su lugar oficial desplazado (nativamente en fila 95 y 96)
      const targetSigRow = 95 + extraRowsToInsert;
      if (supervisores.length > 0) ws3.getCell(`B${targetSigRow}`).value = supervisores[0].nombre;
      if (residentes.length > 0) ws3.getCell(`C${targetSigRow}`).value = (residentes.find(p=>p.categoria.toUpperCase().includes('RESIDENTE')) || residentes[0]).nombre;

      // 3. Imprimir Fotos en Lineas de 3 equtitativas sin huecos gigantes
      if (fotos.length > 0) {
        // Des-combinar celdas defectuosas antiguas de la plantilla
        try { ws3.unMergeCells('B71:H71'); } catch(e){}

        const imgW = 378; // 10 cm exactos definidos por el usuario
        const imgH = 265; // 7  cm exactos

        const fetchImgBuffer = async (ruta) => {
            if (ruta.startsWith('http')) {
                const res = await fetch(ruta);
                if (!res.ok) throw new Error('Bad fetch');
                return Buffer.from(await res.arrayBuffer());
            } else {
                const p = path.join(process.cwd(), 'public', ruta);
                await access(p, constants.R_OK);
                return await readFile(p);
            }
        };
        
        let imgRow = 56;
        for (let i = 0; i < fotos.length; i += 3) {
          const descRow = imgRow + 15; 
          
          // ---- Foto Izquierda (Col: 1 -> B,C,D) ----
          if (i < fotos.length) {
            const f1 = fotos[i];
            try {
              const b1 = await fetchImgBuffer(f1.ruta_imagen);
              const id1 = workbook.addImage({ buffer: b1, extension: (f1.ruta_imagen.toLowerCase().endsWith('.png')?'png':'jpeg') });
              ws3.addImage(id1, { tl: { col: 1, row: imgRow - 1 }, ext: { width: imgW, height: imgH } });
              try { ws3.mergeCells(`B${descRow}:D${descRow}`); } catch(e){}
              const c1 = ws3.getCell(`B${descRow}`);
              c1.value = f1.descripcion || ''; 
              c1.font = { name: 'Arial', size: 10, bold: true };
              c1.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
            } catch (e) { console.error('Error insertando foto 1:', e) }
          }

          // ---- Foto Centro (Col: 4 -> E,F,G) ----
          if (i+1 < fotos.length) {
            const f2 = fotos[i+1];
            try {
              const b2 = await fetchImgBuffer(f2.ruta_imagen);
              const id2 = workbook.addImage({ buffer: b2, extension: (f2.ruta_imagen.toLowerCase().endsWith('.png')?'png':'jpeg') });
              ws3.addImage(id2, { tl: { col: 4, row: imgRow - 1 }, ext: { width: imgW, height: imgH } });
              try { ws3.mergeCells(`E${descRow}:G${descRow}`); } catch(e){}
              const c2 = ws3.getCell(`E${descRow}`);
              c2.value = f2.descripcion || ''; 
              c2.font = { name: 'Arial', size: 10, bold: true };
              c2.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
            } catch (e) { console.error('Error insertando foto 2:', e) }
          }

          // ---- Foto Derecha (Col: 7 -> H,I,J) ----
          if (i+2 < fotos.length) {
            const f3 = fotos[i+2];
            try {
              const b3 = await fetchImgBuffer(f3.ruta_imagen);
              const id3 = workbook.addImage({ buffer: b3, extension: (f3.ruta_imagen.toLowerCase().endsWith('.png')?'png':'jpeg') });
              ws3.addImage(id3, { tl: { col: 7, row: imgRow - 1 }, ext: { width: imgW, height: imgH } });
              try { ws3.mergeCells(`H${descRow}:J${descRow}`); } catch(e){}
              const c3 = ws3.getCell(`H${descRow}`);
              c3.value = f3.descripcion || ''; 
              c3.font = { name: 'Arial', size: 10, bold: true };
              c3.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
            } catch (e) { console.error('Error insertando foto 3:', e) }
          }
          
          // Incrementamos bloque
          imgRow += rowsPerGroup;
        }
      }
    }

    const buffer = await workbook.xlsx.writeBuffer();
    const fileName = `INFORME_SEG_${informe.subcontratista.replace(/\s+/g, '_')}_R${informe.num_reporte}_${informe.mes_anio}.xlsx`;

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json({ error: "Error al generar Excel" }, { status: 500 });
  }
}
