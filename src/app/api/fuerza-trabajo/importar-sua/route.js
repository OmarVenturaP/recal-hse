import { NextResponse } from 'next/server';
import pool from '@/lib/db';
const pdf = require('pdf-parse');

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file) {
      return NextResponse.json({ error: "No se envió ningún archivo" }, { status: 400 });
    }

    // Leer el archivo como buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Extraer texto del PDF
    const data = await pdf(buffer);
    const text = data.text;

    // Segmentar el texto por líneas para asociar NSS con CURP
    const lines = text.split('\n');
    const extractos = [];
    
    // RegEx para NSS (Soporta guiones ej: 00-00-00-0000-0)
    const nssRegex = /\d{2}-\d{2}-\d{2}-\d{4}-\d{1}/g;
    const nssRegexSimple = /\d{11}/g;
    const curpRegex = /[A-Z]{4}\d{6}[H,M][A-Z]{5}[A-Z0-9]{2}/g;

    // Escaneo profundo por líneas
    for (let line of lines) {
      // Buscamos todos los posibles NSS y CURPs en la misma línea
      const nssMatches = line.match(/\d{2}-\d{2}-\d{2}-\d{4}-\d{1}/) || line.match(/\d{11}/);
      const curpMatch = line.match(/[A-Z]{4}\d{6}[H,M][A-Z]{5}[A-Z0-9]{2}/);

      if (nssMatches && curpMatch) {
        // Normalizar NSS (quitar guiones para búsqueda en BD)
        const nssLimpio = nssMatches[0].replace(/-/g, '');
        extractos.push({
          nss: nssLimpio,
          curp: curpMatch[0]
        });
      }
    }

    if (extractos.length === 0) {
      return NextResponse.json({ 
        success: false, 
        message: "No se encontraron pares válidos de NSS y CURP en el documento. Asegúrate de que es un PDF original del SUA." 
      });
    }

    // Cruce con Base de Datos
    const sugerencias = [];
    
    for (const item of extractos) {
      const [rows] = await pool.query(
        `SELECT id_trabajador, numero_empleado, nombre_trabajador, apellido_trabajador, curp as curp_actual 
         FROM Fuerza_Trabajo 
         WHERE nss = ? AND bActivo = 1`,
        [item.nss]
      );

      if (rows.length > 0) {
        const trabajador = rows[0];
        // Solo sugerir si no tiene CURP o si la del PDF es diferente
        if (!trabajador.curp_actual || trabajador.curp_actual !== item.curp) {
          sugerencias.push({
            id_trabajador: trabajador.id_trabajador,
            numero_empleado: trabajador.numero_empleado,
            nombre: `${trabajador.nombre_trabajador} ${trabajador.apellido_trabajador || ''}`,
            nss: item.nss,
            curp_actual: trabajador.curp_actual || 'SIN REGISTRO',
            curp_nuevo: item.curp
          });
        }
      }
    }

    return NextResponse.json({ 
      success: true, 
      count: sugerencias.length, 
      data: sugerencias 
    });

  } catch (error) {
    console.error("Error procesando PDF SUA:", error);
    return NextResponse.json({ error: "Error al leer el archivo PDF" }, { status: 500 });
  }
}

// Endpoint para aplicar los cambios seleccionados
export async function PUT(request) {
  try {
    const { trabajadores } = await request.json();
    const id_usuario_actual = request.headers.get('x-user-id');

    if (!trabajadores || !Array.isArray(trabajadores)) {
      return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
    }

    console.log(`Iniciando actualización masiva de ${trabajadores.length} CURPs...`);

    for (const t of trabajadores) {
      await pool.query(
        "UPDATE Fuerza_Trabajo SET curp = ?, usuario_actualizacion = ? WHERE id_trabajador = ?",
        [t.curp_nuevo, id_usuario_actual, t.id_trabajador]
      );
    }

    return NextResponse.json({ success: true, message: `${trabajadores.length} CURPs actualizados correctamente.` });

  } catch (error) {
    console.error("Error al actualizar CURPs masivamente:", error);
    return NextResponse.json({ error: "Error al guardar los cambios" }, { status: 500 });
  }
}
