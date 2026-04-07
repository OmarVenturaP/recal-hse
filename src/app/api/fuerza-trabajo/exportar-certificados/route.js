import { NextResponse } from 'next/server';
import pool from '@/lib/db'; 
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import fs from 'fs';
import path from 'path';

// --- FUNCIONES AUXILIARES ---

const calcularEdadesNss = (nss, anioExportacion) => {
  if (!nss || nss.length !== 11) return { edadActual: 'N/D', edadAnterior: 'N/D' };
  const yy = parseInt(nss.substring(4, 6), 10);
  const anioNacimiento = yy <= 30 ? 2000 + yy : 1900 + yy;
  return { edadActual: anioExportacion - anioNacimiento, edadAnterior: (anioExportacion - 1) - anioNacimiento };
};

const calcularEdadCurp = (curp, fechaReferencia) => {
  if (!curp || curp.length !== 18) return '';
  const yy = parseInt(curp.substring(4, 6), 10);
  const mm = parseInt(curp.substring(6, 8), 10);
  const dd = parseInt(curp.substring(8, 10), 10);
  const penultimo = curp.charAt(16);
  const esSiglo21 = isNaN(parseInt(penultimo, 10)); 
  const anioNacimiento = esSiglo21 ? 2000 + yy : 1900 + yy;
  
  let edad = fechaReferencia.getFullYear() - anioNacimiento;
  if (fechaReferencia.getMonth() + 1 < mm || (fechaReferencia.getMonth() + 1 === mm && fechaReferencia.getDate() < dd)) edad--;
  return edad.toString();
};

const esMesAnterior = (fechaAltaStr, fechaInicioPeriodoStr) => {
  if (!fechaAltaStr) return false;
  const alta = new Date(fechaAltaStr);
  const inicioPeriodo = new Date(fechaInicioPeriodoStr);
  
  const mesAlta = alta.getUTCMonth();
  const anioAlta = alta.getUTCFullYear();
  const mesInicio = inicioPeriodo.getUTCMonth();
  const anioInicio = inicioPeriodo.getUTCFullYear();

  if (anioAlta === anioInicio && mesAlta === mesInicio - 1) return true;
  if (anioAlta === anioInicio - 1 && mesAlta === 11 && mesInicio === 0) return true;
  if (alta < inicioPeriodo) return true; 

  return false;
};

const formatearFechaTexto = (date) => {
  const meses = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];
  const dia = date.getDate().toString().padStart(2, '0');
  const mes = meses[date.getMonth()];
  const anio = date.getFullYear();
  return `A LOS ${dia} DIAS DE ${mes} DEL ${anio}`;
};

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const fechaInicio = searchParams.get('fechaInicio');
    const fechaFin = searchParams.get('fechaFin');
    const subcontratista = searchParams.get('subcontratista');
    const id_trabajador = searchParams.get('id_trabajador'); 
    const validar = searchParams.get('validar') === 'true';
    const omitirFaltantes = searchParams.get('omitirFaltantes') === 'true';

    // 1. Consultar médicos (solo si no es ruta de validación)
    let medicos = [];
    if (!validar) {
        const [rowsMedicos] = await pool.query('SELECT * FROM Medicos_Empresa');
        if (rowsMedicos.length === 0) return NextResponse.json({ success: false, error: 'Falta registrar médicos en la base de datos.' }, { status: 400 });
        medicos = rowsMedicos;
    }

    let query = '';
    const params = [];

    if (id_trabajador) {
      query = `SELECT * FROM Fuerza_Trabajo WHERE id_trabajador = ?`;
      params.push(id_trabajador);
    } else {
      query = `SELECT * FROM Fuerza_Trabajo WHERE fecha_baja IS NULL AND DATE(fecha_ingreso_obra) >= ? AND DATE(fecha_ingreso_obra) <= ?`;
      params.push(fechaInicio, fechaFin);
      if (subcontratista) {
        query += ` AND id_subcontratista_principal = ?`;
        params.push(subcontratista);
      }
    }

    const [trabajadores] = await pool.query(query, params);

    if (trabajadores.length === 0) {
      return NextResponse.json({ success: false, error: 'No se encontraron trabajadores.' }, { status: 404 });
    }

    // 2. Validación de CURP
    const faltantes = [];
    const validos = [];
    const categoriasCriticas = ["SUPERVISOR DE SEGURIDAD", "OPERADOR DE MAQUINARIA", "SOLDADOR", "PINTOR", "ANDAMIERO", "ANDAMIERO A", "SANDBLASTERO", "SANDBLASTERO A", "MANIOBRISTA"];

    for (const t of trabajadores) {
        const mesAnterior = esMesAnterior(t.fecha_alta_imss, fechaInicio);
        const tieneCurp = t.curp && t.curp.length === 18;
        const esCritico = t.puesto_categoria && categoriasCriticas.some(cat => t.puesto_categoria.toUpperCase().includes(cat));
        
        // Se requiere CURP si: es categoría crítica O es de mes anterior
        const requiereCurp = esCritico || mesAnterior;

        if (requiereCurp && !tieneCurp) {
            faltantes.push(`${t.nombre_trabajador || ''} ${t.apellido_trabajador || ''}`.trim());
        } else {
            validos.push(t);
        }
    }

    if (validar) {
        return NextResponse.json({ success: true, faltantes });
    }

    const trabajadoresAProcesar = omitirFaltantes ? validos : trabajadores;

    if (trabajadoresAProcesar.length === 0) {
         return NextResponse.json({ success: false, error: 'Todos los trabajadores fueron omitidos por falta de CURP.' }, { status: 400 });
    }

    // 3. Cargar plantilla Word
    const templatePath = path.join(process.cwd(), 'public', 'plantillas', 'CERTIFICADO_MEDICO.docx');
    if (!fs.existsSync(templatePath)) return NextResponse.json({ success: false, error: 'Falta plantilla CERTIFICADO_MEDICO.docx' }, { status: 404 });

    const content = fs.readFileSync(templatePath, 'binary');
    const zip = new PizZip(content);
    const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });

    const inicioFiltroDate = new Date(fechaInicio);
    const finFiltroDate = new Date(fechaFin);

    // 4. Mapear datos
    const datosProcesados = trabajadoresAProcesar.map(t => {
      const medico = medicos[Math.floor(Math.random() * medicos.length)];
      const ingresoDate = new Date(t.fecha_ingreso_obra);
      const isNuevoIngreso = ingresoDate >= inicioFiltroDate && ingresoDate <= finFiltroDate;
      
      const fechaCertificado = new Date();
      if (isNuevoIngreso) {
        fechaCertificado.setTime(ingresoDate.getTime() - (5 * 24 * 60 * 60 * 1000));
      } else {
        fechaCertificado.setTime(inicioFiltroDate.getTime() - (7 * 24 * 60 * 60 * 1000));
      }

      let edadFinal = '';
      if (t.curp && t.curp.length === 18) {
        edadFinal = calcularEdadCurp(t.curp, fechaCertificado);
      } else if (t.nss && t.nss.length === 11) {
        const edades = calcularEdadesNss(t.nss, fechaCertificado.getFullYear());
        edadFinal = Math.random() < 0.5 ? edades.edadActual.toString() : edades.edadAnterior.toString();
      } else {
        edadFinal = 'S/D';
      }

      return {
        ciudad: medico.ciudad ? medico.ciudad.toUpperCase() : 'TONALA',
        nombre_medico: medico.nombre.toUpperCase(),
        cedula_medico: medico.cedula,
        nombre_trabajador: `${t.nombre_trabajador || ''} ${t.apellido_trabajador || ''}`.trim().toUpperCase(),
        edad_trabajador: edadFinal,
        fecha_texto: formatearFechaTexto(fechaCertificado)
      };
    });

    doc.render({ trabajadores: datosProcesados });
    const buffer = doc.getZip().generate({ type: 'nodebuffer' });

    const fileName = id_trabajador 
      ? `Certificado_${trabajadoresAProcesar[0].nombre_trabajador.replace(/ /g, '_')}.docx`
      : `Certificados_Masivos_Periodo.docx`;

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    });

  } catch (error) {
    console.error("Error exportando certificados:", error);
    return NextResponse.json({ success: false, error: 'Ocurrió un error al generar el documento.' }, { status: 500 });
  }
}