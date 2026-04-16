import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { jwtVerify } from 'jose';
const pdf = require('pdf-parse');

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET);

export async function POST(request) {
  try {
    const contentType = request.headers.get('content-type') || '';
    
    if (!contentType.includes('multipart/form-data')) {
      return NextResponse.json({ 
        error: "Cabecera inválida", 
        details: `Se esperaba multipart/form-data pero se recibió: ${contentType}. Asegúrate de que el archivo no sea demasiado pesado.` 
      }, { status: 400 });
    }

    // Intentamos obtener el formData con un catch detallado
    let formData;
    try {
      formData = await request.formData();
    } catch (formError) {
      console.error("Error al parsear FormData:", formError);
      return NextResponse.json({ 
        error: "Fallo al procesar el cuerpo de la petición (FormData)", 
        details: formError.message,
        hint: "Es posible que el archivo sea demasiado grande para el servidor o que la conexión se haya interrumpido."
      }, { status: 400 });
    }

    const file = formData.get('file');

    if (!file) {
      return NextResponse.json({ error: "No se envió ningún archivo" }, { status: 400 });
    }

    // --- VERIFICACIÓN MANUAL DE IDENTIDAD (Bypass de Middleware para Multipart) ---
    const token = request.cookies.get('hse_auth_token')?.value;
    if (!token) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    
    const { payload } = await jwtVerify(token, JWT_SECRET);
    const idEmpresa = payload.id_empresa;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const data = await pdf(buffer);
    const text = data.text;

    // --- MOTOR DE EXTRACCIÓN POR ANCLAJE (ANCHOR-BASED) ---
    const nssRegexGlobal = /(\d{2}-\d{2}-\d{2}-\d{4}-\d{1})|(\d{11})/g;
    const nssMatches = [...text.matchAll(nssRegexGlobal)];
    const curpRegex = /[A-Z]{4}\d{6}[HM][A-Z]{5}[A-Z\d]{2}/;
    
    // Blacklist extendida de cabeceras
    const blacklist = [
        "REGISTRO PATRONAL", "RFC", "FOLIO", "DÍAS", "DIAS", "SALARIO", "CUOTA",
        "TAPACHULA", "CHIAPAS", "UBICACIÓN", "UBICACION", "CLAVE", "UNIDAD", 
        "FISCAL", "PÁGINA", "PAGINA", "AUTODETERMINACION", "INSTITUTO", "MEXICANO",
        "SEGURO", "SOCIAL", "SISTEMA", "SUA", "CÉDULA", "DETERMINACIÓN", "MENSUAL",
        "MES", "AÑO", "REGISTRO", "PATRÓN", "DOMICILIO", "ACTIVIDAD", "BAJA", "ALTA", "MODIF",
        "ENFERMEDADES", "MATERNIDAD", "SUMAS", "TOTAL", "CUOTAS", "PROCESO", "PERÍODO"
    ];

    const extractos = [];
    for (let i = 0; i < nssMatches.length; i++) {
        const match = nssMatches[i];
        const startIndex = match.index;
        const nssVal = match[0].replace(/-/g, '');
        
        const nextNssIndex = nssMatches[i+1] ? nssMatches[i+1].index : text.length;
        // Ventana limitada para evitar saltar al siguiente trabajador
        const rowWindow = text.substring(startIndex, Math.min(nextNssIndex, startIndex + 500));

        const curpInRow = rowWindow.match(curpRegex);
        if (curpInRow) {
            const curpVal = curpInRow[0];
            
            // Aislar nombre limpiando NSS y CURP del bloque
            let nameArea = rowWindow
                .replace(match[0], ' ')
                .replace(curpVal, ' ')
                .replace(/\n/g, ' ')
                .replace(/[0-9\-\/\\.,:|%=+*]/g, ' ');

            // Limpieza de blacklist
            blacklist.forEach(term => {
                const regexTerm = new RegExp(`\\b${term}\\b`, 'gi');
                nameArea = nameArea.replace(regexTerm, ' ');
            });

            // Capturar la secuencia de mayúsculas más probable
            const nameMatch = nameArea.match(/[A-ZÑÁÉÍÓÚ]{3,}(?:\s+[A-ZÑÁÉÍÓÚ]{2,})+/);
            let nombre = nameMatch ? nameMatch[0].trim() : nameArea.replace(/\s+/g, ' ').trim();

            if (nombre.length > 5 && !blacklist.some(b => nombre.toUpperCase().includes(b))) {
                extractos.push({ nss: nssVal, curp: curpVal, nombre });
            }
        }
    }

    if (extractos.length === 0) {
      return NextResponse.json({ success: false, message: "No se encontraron datos de trabajadores legibles." });
    }

    // Resultados finales
    const nuevos = [];
    const actualizaciones = [];
    
    for (const item of extractos) {
      const [rows] = await pool.query(
        `SELECT id_trabajador, numero_empleado, nombre_trabajador, apellido_trabajador, curp as curp_actual 
         FROM Fuerza_Trabajo 
         WHERE nss = ? AND id_empresa = ? AND fecha_baja IS NULL`,
        [item.nss, idEmpresa]
      );

      if (rows.length > 0) {
        const trabajador = rows[0];
        // Solo sugerir si no tiene CURP o si la del PDF es diferente
        if (!trabajador.curp_actual || trabajador.curp_actual !== item.curp) {
          actualizaciones.push({
            id_trabajador: trabajador.id_trabajador,
            numero_empleado: trabajador.numero_empleado,
            nombre_db: `${trabajador.nombre_trabajador} ${trabajador.apellido_trabajador || ''}`.trim(),
            nombre_sua: item.nombre,
            nss: item.nss,
            curp_db: trabajador.curp_actual || 'SIN REGISTRO',
            curp_sua: item.curp
          });
        }
      } else {
        // ES NUEVO
        nuevos.push({
            nombre: item.nombre,
            nss: item.nss,
            curp: item.curp
        });
      }
    }

    return NextResponse.json({ 
      success: true, 
      nuevosCount: nuevos.length,
      actCount: actualizaciones.length,
      data: { nuevos, actualizaciones }
    });

  } catch (error) {
    console.error("Error procesando PDF SUA:", error);
    return NextResponse.json({ 
      error: "Error al leer el archivo PDF" 
    }, { status: 500 });
  }
}

// Endpoint para aplicar los cambios seleccionados
export async function PUT(request) {
  try {
    const { nuevos, actualizaciones, id_subcontratista_principal } = await request.json();
    
    // --- VERIFICACIÓN MANUAL DE IDENTIDAD (Bypass Middleware) ---
    const token = request.cookies.get('hse_auth_token')?.value;
    if (!token) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    
    const { payload } = await jwtVerify(token, JWT_SECRET);
    const idEmpresa = payload.id_empresa;
    const id_usuario_actual = payload.id_usuario || payload.id;

    if (!id_usuario_actual || !idEmpresa) {
        return NextResponse.json({ error: "Token corrupto: faltan datos de identidad" }, { status: 401 });
    }

    // 1. Procesar Actualizaciones (Solo CURP)
    if (actualizaciones && actualizaciones.length > 0) {
      for (const t of actualizaciones) {
        await pool.query(
          "UPDATE Fuerza_Trabajo SET curp = ?, usuario_actualizacion = ? WHERE id_trabajador = ? AND id_empresa = ?",
          [t.curp_sua, id_usuario_actual, t.id_trabajador, idEmpresa]
        );
      }
    }

    // 2. Procesar Nuevos (Insertar con datos pendientes)
    if (nuevos && nuevos.length > 0) {
        for (const n of nuevos) {
            const query = `
                INSERT INTO Fuerza_Trabajo 
                (numero_empleado, nombre_trabajador, apellido_trabajador, puesto_categoria, nss, curp, fecha_ingreso_obra, fecha_alta_imss, origen, usuario_registro, id_empresa, id_subcontratista_principal) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;
            // Fecha por defecto: 2 días antes de hoy
            const d = new Date();
            d.setDate(d.getDate() - 2);
            const fechaDefault = d.toISOString().split('T')[0];
            
            await pool.query(query, [
                '', 
                '', 
                n.nombre, 
                'POR DEFINIR', 
                n.nss, 
                n.curp, 
                fechaDefault, 
                fechaDefault, 
                'Local', 
                id_usuario_actual, 
                idEmpresa,
                id_subcontratista_principal
            ]);
        }
    }

    return NextResponse.json({ 
        success: true, 
        message: `Importación finalizada: ${nuevos?.length || 0} nuevos registrados, ${actualizaciones?.length || 0} actualizados.` 
    });

  } catch (error) {
    console.error("Error al procesar importación SUA:", error);
    return NextResponse.json({ error: "Error al guardar los cambios" }, { status: 500 });
  }
}

