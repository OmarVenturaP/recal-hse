import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import ExcelJS from 'exceljs';
import path from 'path';

const MESES = {
  1: 'ENERO', 2: 'FEBRERO', 3: 'MARZO', 4: 'ABRIL', 5: 'MAYO', 6: 'JUNIO',
  7: 'JULIO', 8: 'AGOSTO', 9: 'SEPTIEMBRE', 10: 'OCTUBRE', 11: 'NOVIEMBRE', 12: 'DICIEMBRE'
};

const COLOR_INSPECCION_POR_MES = {
  '01': 'AZUL', '02': 'AMARILLO', '03': 'BLANCO', '04': 'VERDE',
  '05': 'AZUL', '06': 'AMARILLO', '07': 'BLANCO', '08': 'VERDE',
  '09': 'AZUL', '10': 'AMARILLO', '11': 'BLANCO', '12': 'VERDE',
};

const generarTextoPeriodo = (mes, anio) => {
  if (mes && anio) return `PERIODO: ${MESES[parseInt(mes)]} ${anio}`;
  return 'PERIODO NO ESPECIFICADO';
};

const formatFecha = (dateString) => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  const dia = String(date.getUTCDate()).padStart(2, '0');
  const mes = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${dia}/${mes}/${date.getUTCFullYear()}`;
};

const toUpper = (val) => val ? String(val).toUpperCase() : 'N/A';

// ─── Escritores de filas por tipo ────────────────────────────────────────────

function escribirFilaMaquinaria(row, maquina, index) {
  // A=NO | B=TIPO | C=MARCA | D=AÑO | E=MODELO | F=N° ECONÓMICO | G=SERIE
  // H=HOROMETRO INICIAL | I=HOROMETRO MTTO ANT | J=HOROMETRO MTTO ACTUAL 
  // K=RESTANTE | L=TIPO MTTO | M=REALIZÓ | N=FECHA ÚLTIMO MTTO | O=PRÓXIMO MTTO
  row.getCell('A').value = index;
  row.getCell('B').value = toUpper(maquina.tipo);
  row.getCell('C').value = toUpper(maquina.marca);
  row.getCell('D').value = toUpper(maquina.anio);
  row.getCell('E').value = toUpper(maquina.modelo);
  row.getCell('F').value = toUpper(maquina.num_economico);
  row.getCell('G').value = toUpper(maquina.serie);
  
  // H = Horómetro Inicial
  row.getCell('H').value = maquina.horometro_inicial != null ? `${Number(maquina.horometro_inicial).toFixed(2)} HRS` : 'N/A';
  
  // I = Horómetro del mtto ANTERIOR al último dentro del periodo
  row.getCell('I').value = maquina.horometro_mtto_anterior != null ? `${Number(maquina.horometro_mtto_anterior).toFixed(2)} HRS` : 'N/A';
  
  // J = Horómetro del ÚLTIMO mtto dentro del periodo (o el actual si no hay servicios)
  const horometroUltimoMtto = maquina.horometro_ultimo_mtto != null ? maquina.horometro_ultimo_mtto : maquina.horometro;
  row.getCell('J').value = horometroUltimoMtto != null ? `${Number(horometroUltimoMtto).toFixed(2)} HRS` : 'N/A';
  
  // K = RESTANTE
  let valRestante = 'N/A';
  if (maquina.intervalo_mantenimiento && maquina.horometro != null) {
      const base = maquina.horometro_ultimo_mtto || maquina.horometro_inicial || 0;
      const proximo = Number(base) + Number(maquina.intervalo_mantenimiento);
      const restante = proximo - Number(maquina.horometro);
      valRestante = `${Number(restante).toFixed(2)} HRS`;
  }
  row.getCell('K').value = valRestante;

  row.getCell('L').value = toUpper(maquina.ultimo_tipo_mantenimiento);
  row.getCell('M').value = toUpper(maquina.realizo);

  const fechaUltimo = maquina.ultima_fecha_mantenimiento &&
    maquina.ultima_fecha_mantenimiento !== maquina.fecha_ingreso_obra;
  row.getCell('N').value = fechaUltimo ? formatFecha(maquina.ultima_fecha_mantenimiento) : 'N/A';

  // O = PRÓXIMO MANTENIMIENTO: Priorizar fecha_proximo_mantenimiento de la BD
  if (maquina.fecha_baja) {
    row.getCell('O').value = 'N/A POR BAJA';
  } else if (maquina.fecha_proximo_mantenimiento) {
    row.getCell('O').value = formatFecha(maquina.fecha_proximo_mantenimiento);
  } else if (maquina.intervalo_mantenimiento) {
    row.getCell('O').value = `CADA ${maquina.intervalo_mantenimiento} HORAS DE TRABAJO`;
  } else {
    row.getCell('O').value = 'CADA QUE SE REQUIERA';
  }
}

function escribirFilaVehiculo(row, maquina, index) {
  // A=NO | B=TIPO | C=MARCA | D=AÑO | E=MODELO | F=SERIE | G=PLACA
  // H=KM INICIAL | I=KM ÚLTIMO MTTO | J=KM ACTUAL
  // K=TIPO MTTO | L=REALIZÓ | M=FECHA ÚLTIMO MTTO | N=PRÓXIMO MTTO | O=RESTANTE
  row.getCell('A').value = index;
  row.getCell('B').value = toUpper(maquina.tipo);
  row.getCell('C').value = toUpper(maquina.marca);
  row.getCell('D').value = toUpper(maquina.anio);
  row.getCell('E').value = toUpper(maquina.modelo);
  row.getCell('F').value = toUpper(maquina.serie);
  row.getCell('G').value = maquina.placa ? toUpper(maquina.placa) : 'N/A';
  
  row.getCell('H').value = maquina.horometro_inicial != null ? `${Number(maquina.horometro_inicial).toFixed(2)} KM` : 'N/A';
  row.getCell('I').value = maquina.horometro_ultimo_mtto != null ? `${Number(maquina.horometro_ultimo_mtto).toFixed(2)} KM` : 'N/A';
  
  const horometroActual = maquina.horometro != null ? maquina.horometro : 'N/A';
  row.getCell('J').value = horometroActual !== 'N/A' ? `${Number(horometroActual).toFixed(2)} KM` : 'N/A';
  
  row.getCell('K').value = toUpper(maquina.ultimo_tipo_mantenimiento);
  row.getCell('L').value = toUpper(maquina.realizo);

  const fechaUltimo = maquina.ultima_fecha_mantenimiento &&
    maquina.ultima_fecha_mantenimiento !== maquina.fecha_ingreso_obra;
  row.getCell('M').value = fechaUltimo ? formatFecha(maquina.ultima_fecha_mantenimiento) : 'N/A';

  // PRÓXIMO MANTENIMIENTO: Priorizar fecha_proximo_mantenimiento
  if (maquina.fecha_baja) {
    row.getCell('N').value = 'N/A POR BAJA';
  } else if (maquina.fecha_proximo_mantenimiento) {
    row.getCell('N').value = formatFecha(maquina.fecha_proximo_mantenimiento);
  } else if (maquina.intervalo_mantenimiento) {
    row.getCell('N').value = `CADA ${maquina.intervalo_mantenimiento} KM`;
  } else {
    row.getCell('N').value = 'CADA QUE SE REQUIERA';
  }

  // O = RESTANTE
  if (maquina.intervalo_mantenimiento && maquina.horometro != null) {
      const base = maquina.horometro_ultimo_mtto || maquina.horometro_inicial || 0;
      const proximo = Number(base) + Number(maquina.intervalo_mantenimiento);
      const restante = proximo - Number(maquina.horometro);
      row.getCell('O').value = `${Number(restante).toFixed(2)} KM`;
  } else {
      row.getCell('O').value = 'N/A';
  }
}

function escribirFilaEquipo(row, maquina, index) {
  // A=NO | B=TIPO | C=MARCA | D=AÑO | E=MODELO | F=SERIE
  // G=PERIODICIDAD | H=TIPO MTTO | I=FECHA ÚLTIMO MTTO | J=REALIZÓ | K=PRÓXIMO MTTO
  row.getCell('A').value = index;
  row.getCell('B').value = toUpper(maquina.tipo);
  row.getCell('C').value = toUpper(maquina.marca);
  row.getCell('D').value = toUpper(maquina.anio);
  row.getCell('E').value = toUpper(maquina.modelo);
  row.getCell('F').value = toUpper(maquina.serie);
  
  // G = Periodicidad (Preferir intervalo_mantenimiento si existe, sino TRIMESTRAL por defecto)
  row.getCell('G').value = maquina.intervalo_mantenimiento ? `CADA ${maquina.intervalo_mantenimiento} DÍAS` : 'TRIMESTRAL';
  
  row.getCell('H').value = toUpper(maquina.ultimo_tipo_mantenimiento);

  const ultimaFecha = maquina.ultima_fecha_mantenimiento;
  if (ultimaFecha && ultimaFecha !== maquina.fecha_ingreso_obra) {
    row.getCell('I').value = formatFecha(ultimaFecha);
    row.getCell('J').value = toUpper(maquina.realizo);
  } else {
    row.getCell('I').value = 'N/A';
    row.getCell('J').value = toUpper(maquina.realizo);
  }

  // K = PRÓXIMO MANTENIMIENTO: Priorizar lo que está en el sistema (fecha_proximo_mantenimiento)
  if (maquina.fecha_proximo_mantenimiento) {
    row.getCell('K').value = formatFecha(maquina.fecha_proximo_mantenimiento);
  } else if (ultimaFecha && ultimaFecha !== maquina.fecha_ingreso_obra) {
    // Fallback: +3 meses si no hay fecha programada manual
    const proxima = new Date(ultimaFecha);
    proxima.setMonth(proxima.getMonth() + 3);
    row.getCell('K').value = formatFecha(proxima);
  } else {
    row.getCell('K').value = 'CADA QUE SE REQUIERA';
  }
}

function escribirFilaHerramienta(row, maquina, index, colorMes) {
  // A=NO | B=TIPO | C=MARCA | D=AÑO | E=MODELO | F=SERIE
  // G=CÓDIGO COLOR INSPECCIÓN | H=PERIODICIDAD | I=TIPO INSPECCIÓN | J=REALIZÓ
  // K=FECHA ÚLTIMA INSPECCIÓN | L=FECHA PRÓXIMA INSPECCIÓN
  row.getCell('A').value = index;
  row.getCell('B').value = toUpper(maquina.tipo);
  row.getCell('C').value = toUpper(maquina.marca);
  row.getCell('D').value = toUpper(maquina.anio);
  row.getCell('E').value = toUpper(maquina.modelo);
  row.getCell('F').value = toUpper(maquina.serie);
  row.getCell('G').value = colorMes || 'N/A'; // Color de inspección del mes
  row.getCell('H').value = 'MENSUAL';
  row.getCell('I').value = 'VISUAL';
  
  // Col J: Realizó (Priorizamos el de la inspección, sino el de mantenimiento)
  row.getCell('J').value = toUpper(maquina.realizado_por_inspeccion || maquina.realizo);

  // Col K y L: Fechas de inspección
  if (maquina.fecha_inspeccion_actual) {
    const ultima = new Date(maquina.fecha_inspeccion_actual);
    row.getCell('K').value = formatFecha(ultima);

    // Próxima: +1 mes
    const proxima = new Date(ultima);
    proxima.setMonth(proxima.getMonth() + 1);
    row.getCell('L').value = formatFecha(proxima);
  } else {
    row.getCell('K').value = 'PENDIENTE';
    row.getCell('L').value = 'PENDIENTE';
  }
}

// ─── Mapeo de configuración por tipo ─────────────────────────────────────────

const CONFIG_POR_TIPO = {
  maquinaria: {
    plantilla: '12_PLAN_SERVICIO_MAQUINARIA.xlsx',
    titulo: 'MAQUINARIA PESADA',
    filaInicio: 7,
    filaBase: 7,
    cellPeriodo: 'H3',
    escribirFila: escribirFilaMaquinaria,
  },
  vehiculo: {
    plantilla: '12_PLAN_SERVICIO_VEHICULOS.xlsx',
    titulo: 'VEHÍCULOS',
    filaInicio: 7,
    filaBase: 7,
    cellPeriodo: 'H3',
    escribirFila: escribirFilaVehiculo,
  },
  equipo: {
    plantilla: '12_PLAN_SERVICIO_EQUIPO.xlsx',
    titulo: 'EQUIPO MENOR',
    filaInicio: 7,
    filaBase: 7,
    cellPeriodo: 'G3',
    escribirFila: escribirFilaEquipo,
  },
  herramienta: {
    plantilla: '12_PLAN_SERVICIO_HERRAMIENTAS.xlsx',
    titulo: 'HERRAMIENTAS',
    filaInicio: 7,
    filaBase: 7,
    cellPeriodo: 'G3',
    escribirFila: escribirFilaHerramienta,
  },
  todos: {
    plantilla: '12_PLAN_SERVICIO.xlsx',
    titulo: 'MAQUINARIA Y EQUIPO',
    filaInicio: 7,
    filaBase: 7,
    cellPeriodo: 'G3',
    escribirFila: escribirFilaMaquinaria, // fallback genérico
  },
};

// ─── Handler principal ────────────────────────────────────────────────────────

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const mes = searchParams.get('mes');
    const anio = searchParams.get('anio');
    const tipoUnidad = searchParams.get('tipo_unidad') || 'todos';

    const config = CONFIG_POR_TIPO[tipoUnidad] || CONFIG_POR_TIPO.todos;
    const periodoTexto = generarTextoPeriodo(mes, anio);

    // ─── Construir query ─────────────────────────────────────────────────────
    let whereClause = 'WHERE m.fecha_baja IS NULL';
    const queryParams = [];
    let endDate = null;

    if (mes && anio) {
      const lastDay = new Date(anio, mes, 0).getDate();
      endDate = `${anio}-${String(mes).padStart(2,'0')}-${lastDay}`;
      const startDate = `${anio}-${String(mes).padStart(2,'0')}-01`;
      whereClause = `WHERE DATE(m.fecha_ingreso_obra) <= ? AND (m.fecha_baja IS NULL OR DATE(m.fecha_baja) > ?)`;
      queryParams.push(endDate, startDate);
    }

    if (tipoUnidad !== 'todos') {
      whereClause += ` AND m.tipo_unidad = ?`;
      queryParams.push(tipoUnidad);
    }

    // Para las subqueries period-aware necesitamos pasar endDate como parámetro adicional.
    // Lo pasamos al final del queryParams array y referenciamos con ? en las subqueries.
    // Usamos una variable separada para no alterar el WHERE.
    const dateFilter = endDate ? `AND DATE(hm.fecha_mantenimiento) <= '${endDate}'` : '';

    const mesInt = parseInt(mes || 0);
    const anioInt = parseInt(anio || 0);

    const [rows] = await pool.query(`
      SELECT 
        m.*,
        (SELECT hm.tipo_mantenimiento 
         FROM Historial_Mantenimiento hm 
         WHERE hm.id_maquinaria = m.id_maquinaria ${dateFilter}
         ORDER BY hm.fecha_mantenimiento DESC, hm.id_mantenimiento DESC LIMIT 1
        ) AS ultimo_tipo_mantenimiento,
        (SELECT hm.fecha_mantenimiento 
         FROM Historial_Mantenimiento hm 
         WHERE hm.id_maquinaria = m.id_maquinaria ${dateFilter}
         ORDER BY hm.fecha_mantenimiento DESC, hm.id_mantenimiento DESC LIMIT 1
        ) AS ultima_fecha_mantenimiento,
        (SELECT hm.realizado_por
         FROM Historial_Mantenimiento hm 
         WHERE hm.id_maquinaria = m.id_maquinaria ${dateFilter}
         ORDER BY hm.fecha_mantenimiento DESC, hm.id_mantenimiento DESC LIMIT 1
        ) AS realizo,
        (SELECT hm.horometro_mantenimiento
         FROM Historial_Mantenimiento hm 
         WHERE hm.id_maquinaria = m.id_maquinaria ${dateFilter}
         ORDER BY hm.fecha_mantenimiento DESC, hm.id_mantenimiento DESC LIMIT 1
        ) AS horometro_ultimo_mtto,
        (SELECT hm.horometro_mantenimiento
         FROM Historial_Mantenimiento hm 
         WHERE hm.id_maquinaria = m.id_maquinaria ${dateFilter}
         ORDER BY hm.fecha_mantenimiento DESC, hm.id_mantenimiento DESC LIMIT 1 OFFSET 1
        ) AS horometro_mtto_anterior,
        -- Campos específicos para inspecciones de herramientas en el periodo filtrado
        (SELECT ih.fecha_inspeccion 
         FROM Inspecciones_Herramienta ih 
         WHERE ih.id_maquinaria = m.id_maquinaria AND ih.mes = ? AND ih.anio = ? LIMIT 1
        ) AS fecha_inspeccion_actual,
        (SELECT ih.realizado_por 
         FROM Inspecciones_Herramienta ih 
         WHERE ih.id_maquinaria = m.id_maquinaria AND ih.mes = ? AND ih.anio = ? LIMIT 1
        ) AS realizado_por_inspeccion
      FROM Maquinaria_Equipo m
      ${whereClause}
      ORDER BY m.fecha_ingreso_obra DESC
    `, [mesInt, anioInt, mesInt, anioInt, ...queryParams]);

    // ─── Cargar plantilla ────────────────────────────────────────────────────
    const templatePath = path.join(process.cwd(), 'public', 'plantillas', config.plantilla);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(templatePath);
    const worksheet = workbook.getWorksheet(1);

    // Escribir periodo en la celda correspondiente de la plantilla
    worksheet.getCell(config.cellPeriodo).value = periodoTexto;

    // Calcular color de inspección mensual (aplica a herramientas)
    const mesKey = mes ? String(mes).padStart(2, '0') : null;
    const colorMes = mesKey ? COLOR_INSPECCION_POR_MES[mesKey] : null;

    // ─── Llenar filas ────────────────────────────────────────────────────────
    let currentRow = config.filaInicio;
    let index = 1;

    for (let i = 0; i < rows.length; i++) {
      const maquina = rows[i];

      if (i > 0) {
        worksheet.spliceRows(currentRow, 0, []);
      }

      const row = worksheet.getRow(currentRow);
      row.height = 100;

      // Escribir datos según tipo (colorMes aplica solo a herramientas)
      config.escribirFila(row, maquina, index, colorMes);

      // Copiar estilos de la fila base para las filas posteriores
      if (i > 0) {
        const filaBase = worksheet.getRow(config.filaBase);
        filaBase.eachCell({ includeEmpty: true }, (baseCell, colNumber) => {
          let val = baseCell.value;
          if (val && typeof val === 'object' && val.richText) val = val.richText.map(rt => rt.text).join('');
          if (val && typeof val === 'object' && val.result) val = val.result;
          if (val && String(val).toUpperCase().includes('OBSERVACION')) return;
          row.getCell(colNumber).style = JSON.parse(JSON.stringify(baseCell.style));
        });
      } else {
        row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
          let val = cell.value;
          if (val && typeof val === 'object' && val.richText) val = val.richText.map(rt => rt.text).join('');
          if (val && typeof val === 'object' && val.result) val = val.result;
          if (val && String(val).toUpperCase().includes('OBSERVACION')) return;
          cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
        });
      }

      currentRow++;
      index++;
    }

    // ─── Generar respuesta ────────────────────────────────────────────────────
    const buffer = await workbook.xlsx.writeBuffer();
    const nombreArchivo = `12. PROGRAMA DE MANTENIMIENTO - ${config.titulo} - ${periodoTexto}.xlsx`;

    return new NextResponse(buffer, {
      headers: {
        'Content-Disposition': `attachment; filename="${nombreArchivo}"`,
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      }
    });

  } catch (error) {
    console.error('Error al exportar Plan de Servicio:', error);
    return NextResponse.json({ success: false, error: 'Error interno al generar el Excel.' }, { status: 500 });
  }
}