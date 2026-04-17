import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import ImageModule from 'docxtemplater-image-module-free';
import path from 'path';
import fs from 'fs';
import { registrarAuditoria } from '@/lib/auditoria';

const transparentImgBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

const fetchImageBase64 = async (url) => {
  if (!url || typeof url !== 'string' || url.trim() === '') return transparentImgBase64;
  try {
    const response = await fetch(url);
    if (!response.ok) return transparentImgBase64;
    
    const arrayBuffer = await response.arrayBuffer();
    if (arrayBuffer.byteLength === 0) return transparentImgBase64; 
    
    return Buffer.from(arrayBuffer).toString('base64');
  } catch (error) {
    console.error('Error descargando imagen desde Cloudinary:', error);
    return transparentImgBase64;
  }
};

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id_trabajador = searchParams.get('id_trabajador');
    const id_curso = searchParams.get('id_curso');
    const fechaInicio = searchParams.get('fechaInicio');
    const fechaFin = searchParams.get('fechaFin');

    if (!id_trabajador || !id_curso || !fechaInicio || !fechaFin) {
      return NextResponse.json({ error: "Faltan parámetros obligatorios" }, { status: 400 });
    }

    const queryTrabajador = `
      SELECT 
        f.nombre_trabajador, f.apellido_trabajador, f.curp, f.puesto_categoria,
        s.nombre_fiscal AS empresa_nombre, 
        s.representante_legal, 
        s.representante_trabajadores,
        s.rfc AS empresa_rfc,
        s.firma_representante_legal, 
        s.firma_representante_trabajadores,
        s.logo_empresa -- Asegúrate de que este campo exista en tu tabla Subcontratistas
      FROM Fuerza_Trabajo f
      LEFT JOIN Subcontratistas s ON f.id_subcontratista_principal = s.id_subcontratista
      WHERE f.id_trabajador = ?
    `;
    const [rowsTrabajador] = await pool.query(queryTrabajador, [id_trabajador]);

    if (rowsTrabajador.length === 0) return NextResponse.json({ error: "Trabajador no encontrado" }, { status: 404 });
    const trabajador = rowsTrabajador[0];

    if (!trabajador.curp || trabajador.curp.length !== 18) {
      return NextResponse.json({ error: `El trabajador no cuenta con una CURP válida de 18 caracteres.` }, { status: 400 });
    }
    if (!trabajador.empresa_rfc || trabajador.empresa_rfc.trim() === '') {
      return NextResponse.json({ error: `La empresa contratista no tiene un RFC registrado.` }, { status: 400 });
    }

    const queryCurso = `
      SELECT 
        c.nombre_curso, c.duracion_horas, c.area_tematica,
        a.nombre_agente, a.registro_stps, a.firma_agente,
        a.logo_agente -- Asegúrate de que este campo exista en tu tabla Agentes_Capacitadores
      FROM Cursos_Capacitacion c
      INNER JOIN Agentes_Capacitadores a ON c.id_agente = a.id_agente
      WHERE c.id_curso = ?
    `;
    const [rowsCurso] = await pool.query(queryCurso, [id_curso]);

    if (rowsCurso.length === 0) return NextResponse.json({ error: "Curso no encontrado" }, { status: 404 });
    const curso = rowsCurso[0];

    const [b64Instructor, b64Patron, b64Trabajador, b64LogoAgente, b64LogoEmpresa] = await Promise.all([
      fetchImageBase64(curso.firma_agente),
      fetchImageBase64(trabajador.firma_representante_legal),
      fetchImageBase64(trabajador.firma_representante_trabajadores),
      fetchImageBase64(curso.logo_agente),
      fetchImageBase64(trabajador.logo_empresa)
    ]);

    const templatePath = path.join(process.cwd(), 'public', 'plantillas', 'FORMATO_DC3.docx');
    if (!fs.existsSync(templatePath)) return NextResponse.json({ error: "No se encontró la plantilla FORMATO_DC3.docx" }, { status: 404 });

    const content = fs.readFileSync(templatePath, 'binary');
    const zip = new PizZip(content);

    const imageOptions = {
      centered: false,
      getImage: function (tagValue) {
        return Buffer.from(tagValue, 'base64');
      },
      getSize: function (img, tagValue, tagName) {
        if (img.byteLength < 100) return [1, 1]; 

        if (tagName === 'logo_agente') return [100, 100]; 
        if (tagName === 'logo_empresa') return [120, 80];
        
        return [150, 60]; 
      }
    };

    const imageModule = new ImageModule(imageOptions);

    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      modules: [imageModule]
    });

    const desbaratar = (texto, prefijo, longitud) => {
      const limpio = (texto || '').toString().toUpperCase().replace(/[-\s]/g, '');
      const obj = {};
      for (let i = 0; i < longitud; i++) obj[`${prefijo}${i + 1}`] = limpio[i] || ' ';
      return obj;
    };

    const [iY, iM, iD] = fechaInicio.split('-');
    const [fY, fM, fD] = fechaFin.split('-');
    const nombreCompleto = `${trabajador.apellido_trabajador || ''} ${trabajador.nombre_trabajador}`.trim();

    doc.render({
      nombre_completo: nombreCompleto,
      puesto: trabajador.puesto_categoria,
      empresa: trabajador.empresa_nombre,
      curso: curso.nombre_curso,
      duracion: `${curso.duracion_horas} HRS`,
      area: curso.area_tematica,
      agente: `${curso.nombre_agente}   ${curso.registro_stps}`,
      
      nombre_instructor: curso.nombre_agente,
      nombre_patron: trabajador.representante_legal || 'REPRESENTANTE LEGAL',
      nombre_trabajador: trabajador.representante_trabajadores || 'REPRESENTANTE TRABAJADORES',

      firma_instructor: b64Instructor,
      firma_patron: b64Patron,
      firma_trabajador: b64Trabajador,
      logo_agente: b64LogoAgente,
      logo_empresa: b64LogoEmpresa,

      ...desbaratar(trabajador.curp, 'c', 18),
      ...desbaratar(trabajador.empresa_rfc, 'r', 15),
      ...desbaratar(iY, 'iy', 4), ...desbaratar(iM, 'im', 2), ...desbaratar(iD, 'id', 2),
      ...desbaratar(fY, 'fy', 4), ...desbaratar(fM, 'fm', 2), ...desbaratar(fD, 'fd', 2),
    });

    const buffer = doc.getZip().generate({
      type: 'nodebuffer',
      compression: 'DEFLATE',
    });

    const nombreArchivo = `DC3_${nombreCompleto.replace(/ /g, '_')}_${curso.nombre_curso.substring(0, 15).replace(/ /g, '')}.docx`;

    // AUDITORÍA - Rastreo de descarga (silenciosa)
    const idUsuario = request.headers.get('x-user-id');
    const idEmpresa = request.headers.get('x-empresa-id');
    await registrarAuditoria({
      modulo: 'DC3',
      accion: 'EXPORT',
      id_registro: `${id_trabajador}-${id_curso}`,
      descripcion: `Descarga DC3: ${nombreCompleto} | Curso: ${curso.nombre_curso} | Periodo: ${fechaInicio} a ${fechaFin}`,
      datos_nuevos: { archivo: nombreArchivo, trabajador: nombreCompleto, curso: curso.nombre_curso, fechaInicio, fechaFin },
      id_usuario: idUsuario,
      id_empresa: idEmpresa,
    });

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${nombreArchivo}"`,
      },
    });

  } catch (error) {
    console.error("Error generando DC3 en Word con recursos de Cloudinary:", error);
    return NextResponse.json({ error: "Error interno al generar el documento" }, { status: 500 });
  }
}