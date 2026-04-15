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

    const [desviaciones] = await pool.query(
      `SELECT * FROM informes_desviaciones WHERE id_informe = ? ORDER BY id_desviacion`, [id]
    );

    // 2. Seleccionar plantilla según el año del informe
    const anioInforme = parseInt((informe.mes_anio || '').split('-')[0]) || new Date().getFullYear();
    const templateFile = anioInforme >= 2026 ? '2026_INFORME_SEGURIDAD.xlsx' : 'INFORME_SEGURIDAD.xlsx';
    const templatePath = path.join(process.cwd(), 'public', 'plantillas', templateFile);
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
    ws1.getCell('C8').value = informe.num_reporte; 
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

    const esCoordinador = (p) =>
      catUpper(p).includes('COORDINADOR') || catUpper(p).includes('COORD.');

    const esSupervisor = (p) =>
      catUpper(p).includes('SUPERVISOR') || catUpper(p).includes('TECNICO SUPERVISOR');

    // Categorizamos de forma excluyente para no duplicar personal en las listas
    const residentes = personalAll.filter(p =>
      !esSupervisor(p) && !esCoordinador(p) &&
      (catUpper(p).includes('RESIDENTE') || catUpper(p).includes('SUPERINTENDENTE') || catUpper(p).includes('GERENTE'))
    );
    const coordinadores = personalAll.filter(p => esCoordinador(p));
    const supervisores = personalAll.filter(p => esSupervisor(p) && !esCoordinador(p));

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

      // Positición de filas específicas de la plantilla
      const filasOrdinario = [7, 9, 11, 13, 15, 17, 19, 21];
      const filasExtra = [27, 29, 31, 33, 35, 37];

      // 1. Mapear Turnos Ordinarios
      ft_rows.forEach((row, idx) => {
        if (idx >= filasOrdinario.length) return; 
        const fila = filasOrdinario[idx];
        
        ws2.getCell('B' + fila).value = row.frente;
        let totalOrdFila = 0;
        diasFT.forEach((dia, dIdx) => {
          const col = colsFT[dIdx];
          const hr = parseInt(row[`hr_${dia}`]) || 0;
          const per = parseInt(row[`per_${dia}`]) || 0;
          totalOrdFila += (hr * per);
          ws2.getCell(col + fila).value = hr;
          ws2.getCell(col + (fila + 1)).value = per;
        });
        
        // El sub-total HH de este frente SOLO para turno ordinario
        ws2.getCell('L' + fila).value = totalOrdFila;
      });

      // 2. Mapear Tiempos Extra (en su sección dedicada si existen datos)
      ft_rows.forEach((row, idx) => {
        if (idx >= filasExtra.length) return; 
        const fila = filasExtra[idx];
        
        // Verificamos si este frente tiene algún tiempo extra en la semana
        const tieneExtra = diasFT.some(d => (parseInt(row[`ext_hr_${d}`]) > 0 && parseInt(row[`ext_per_${d}`]) > 0));
        
        if (tieneExtra) {
          ws2.getCell('B' + fila).value = row.frente + " (T. EXTRA)";
          let totalExtFila = 0;
          diasFT.forEach((dia, dIdx) => {
            const col = colsFT[dIdx];
            const hr = parseInt(row[`ext_hr_${dia}`]) || 0;
            const per = parseInt(row[`ext_per_${dia}`]) || 0;
            totalExtFila += (hr * per);
            ws2.getCell(col + fila).value = hr;
            ws2.getCell(col + (fila + 1)).value = per;
          });
          // Inyectamos el sub-total HH de este frente SOLO para tiempo extra
          ws2.getCell('L' + fila).value = totalExtFila;
        }
      });

      // Cálculo Inteligente de FTE (Promedio de Fuerza de Trabajo incluyendo Ord + Ext)
      let sumT = 0; let countD = 0;
      diasFT.forEach((dia) => {
        const totalCol = ft_rows.reduce((sum, r) => {
          return sum + (parseInt(r[`per_${dia}`]) || 0) + (parseInt(r[`ext_per_${dia}`]) || 0);
        }, 0);
        if (totalCol > 0) { sumT += totalCol; countD++; }
      });
      ws2.getCell('G39').value = { formula: 'IFERROR(AVERAGEIF(E23:K23, ">0"), 0)', result: countD > 0 ? parseFloat((sumT / countD).toFixed(2)) : 0 };
    }


    // --- HOJA 3: INDICADORES, DESVIACIONES e IMÁGENES ---
    if (ws3) {
      ws3.getCell('E46').value = parseFloat(informe.hh_semana_anterior) || 0;
      ws3.getCell('J46').value = parseFloat(informe.hh_semana_actual) || 0;
      ws3.getCell('E48').value = supervisores.length;

      // ---- SECCIÓN 4: MARCADO DE DÍAS ACTIVOS (Col E, Filas 35-41) ----
      // Si en la Hoja 2 hubo personal registrado ese día, se marca con 1 en la col E de la Sección 4.
      const diasActividad = [
        { dia: 'lunes',     fila: 35 },
        { dia: 'martes',    fila: 36 },
        { dia: 'miercoles', fila: 37 },
        { dia: 'jueves',    fila: 38 },
        { dia: 'viernes',   fila: 39 },
        { dia: 'sabado',    fila: 40 },
        { dia: 'domingo',   fila: 41 },
      ];
      diasActividad.forEach(({ dia, fila }) => {
        const totalPersonas = ft_rows.reduce((sum, r) => {
          return sum + (parseInt(r[`per_${dia}`]) || 0) + (parseInt(r[`ext_per_${dia}`]) || 0);
        }, 0);
        ws3.getCell(`E${fila}`).value = totalPersonas > 0 ? 1 : 0;
      });

      // ---- SECCIÓN 2: ÍNDICE SEMANAL DE DESVIACIONES (Fila 4 cabecera, datos filas 7-13) ----
      // Columnas: C=Cond.Insegura, D=ActoInseguro, E=Acuerdo, F=Paros, G=Guía, H=AtMed, I=AccSMO, J=AccIMSS
      const TIPOS_COL = [
        { key: 'Condición Insegura / R. Preventivo',            col: 'C' },
        { key: 'Acto Inseguro / R. Violación al Reglamento',    col: 'D' },
        { key: 'Acuerdo y Seguimiento',                          col: 'E' },
        { key: 'Paros de Actividad',                             col: 'F' },
        { key: 'Guía de Inspección',                             col: 'G' },
        { key: 'Atención Médica',                                col: 'H' },
        { key: 'Accidente SMO',                                  col: 'I' },
        { key: 'Accidente IMSS',                                 col: 'J' },
      ];
      const DIAS_ROW = { domingo: 7, lunes: 8, martes: 9, miercoles: 10, jueves: 11, viernes: 12, sabado: 13 };

      if (desviaciones && desviaciones.length > 0) {
        desviaciones.forEach(desv => {
          const fila = DIAS_ROW[desv.dia_semana];
          const tipoInfo = TIPOS_COL.find(t => t.key === desv.tipo_desviacion);
          if (fila && tipoInfo) {
            const cell = ws3.getCell(`${tipoInfo.col}${fila}`);
            cell.value = (cell.value || 0) + 1;
          }
        });

        // Fila 15: Total de Desviaciones (suma de columna C fila 7-13)
        let totalDesv = 0;
        TIPOS_COL.forEach(t => {
          let colTotal = 0;
          Object.values(DIAS_ROW).forEach(r => {
            colTotal += (parseFloat(ws3.getCell(`${t.col}${r}`).value) || 0);
          });
          totalDesv += colTotal;
        });
        ws3.getCell('C15').value = totalDesv;
      }

      // ---- SECCIÓN 3: DESGLOSE DE DESVIACIONES (Fila 17 cabecera, datos desde fila 19) ----
      // Se escribe directo en las filas existentes sin usar spliceRows, para evitar corrupción
      // de fórmulas compartidas en ws3. Se copia estilo de la fila plantilla (fila 19).
      if (desviaciones && desviaciones.length > 0) {
        const desvBaseRow = 19;
        const desvCols = ['B', 'C', 'F', 'I', 'J'];
        desviaciones.forEach((desv, idx) => {
          const r = desvBaseRow + idx;
          // Copiar altura y estilo de la fila plantilla en filas adicionales
          if (idx > 0) {
            ws3.getRow(r).height = ws3.getRow(desvBaseRow).height || 15;
            applyStyleFromTemplate(ws3, desvBaseRow, r, desvCols);
          }
          ws3.getCell(`B${r}`).value = desv.tipo_desviacion || '';
          ws3.getCell(`C${r}`).value = desv.generada_por || '';
          ws3.getCell(`F${r}`).value = desv.descripcion || '';
          ws3.getCell(`I${r}`).value = desv.accion_inmediata || '';
          ws3.getCell(`J${r}`).value = desv.fecha_plazo || '';
          desvCols.forEach(col => {
            ws3.getCell(`${col}${r}`).alignment = { vertical: 'middle', wrapText: true };
            ws3.getCell(`${col}${r}`).font = { name: 'Arial', size: 9 };
          });
        });
      }

      let extraRowsToInsert = 0;
      const rowsPerGroup = 18; // 15 filas de foto + 1 de texto + 2 margen
      if (fotos.length > 0) {
        const totalGroups = Math.ceil(fotos.length / 3);
        const requiredRows = totalGroups * rowsPerGroup;
        const baseCapacity = 38; // Espacio nativo desde Fila 56 hasta 94
        if (requiredRows > baseCapacity) {
           extraRowsToInsert = requiredRows - baseCapacity;
           // Insertamos celdas en blanco justo arriba del bloque de firmas (Fila 95 nativa)
           ws3.spliceRows(95, 0, ...Array(extraRowsToInsert).fill([]));
        }
      }

      // 2. Colocar las firmas en su lugar oficial desplazado (nativamente en fila 96 y 97)
      const targetSigRow = 96 + extraRowsToInsert;
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
        
        let imgRow = 57;
        if (fotos.length === 4) {
          // --- Layout especial: 2 fotos por fila (cols C-E y G-I) ---
          for (let i = 0; i < fotos.length; i += 2) {
            const descRow = imgRow + 15;

            // Foto Izquierda (Col: 2 → C,D,E)
            if (i < fotos.length) {
              const f1 = fotos[i];
              try {
                const b1 = await fetchImgBuffer(f1.ruta_imagen);
                const id1 = workbook.addImage({ buffer: b1, extension: (f1.ruta_imagen.toLowerCase().endsWith('.png')?'png':'jpeg') });
                ws3.addImage(id1, { tl: { col: 2, row: imgRow - 1 }, ext: { width: imgW, height: imgH } });
                try { ws3.mergeCells(`C${descRow}:E${descRow}`); } catch(e){}
                const c1 = ws3.getCell(`C${descRow}`);
                c1.value = f1.descripcion || '';
                c1.font = { name: 'Arial', size: 10, bold: true };
                c1.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
              } catch(e) { console.error('Error insertando foto izq (4-layout):', e); }
            }

            // Foto Derecha (Col: 6 → G,H,I)
            if (i + 1 < fotos.length) {
              const f2 = fotos[i + 1];
              try {
                const b2 = await fetchImgBuffer(f2.ruta_imagen);
                const id2 = workbook.addImage({ buffer: b2, extension: (f2.ruta_imagen.toLowerCase().endsWith('.png')?'png':'jpeg') });
                ws3.addImage(id2, { tl: { col: 6, row: imgRow - 1 }, ext: { width: imgW, height: imgH } });
                try { ws3.mergeCells(`G${descRow}:I${descRow}`); } catch(e){}
                const c2 = ws3.getCell(`G${descRow}`);
                c2.value = f2.descripcion || '';
                c2.font = { name: 'Arial', size: 10, bold: true };
                c2.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
              } catch(e) { console.error('Error insertando foto der (4-layout):', e); }
            }

            imgRow += rowsPerGroup;
          }
        } else {
          // --- Layout normal: 3 fotos por fila ---
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
          } // end for (3-per-row)
        } // end else
      } // end if (fotos.length > 0)
    } // end if (ws3)

    // Forzamos que el Excel se abra en la primera pestaña (Hoja 1)
    workbook.views = [{
        x: 0, y: 0, width: 10000, height: 20000,
        firstSheet: 0, activeTab: 0, visibility: 'visible'
    }];

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
