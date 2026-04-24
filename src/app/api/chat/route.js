import { streamText, tool } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { z } from 'zod';
import { jwtVerify } from 'jose';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60 segundos de timeout para procesos largos como maquinaria

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET);

export async function POST(req) {
  try {
    // 1. AUTENTICACIÓN Y AUTORIZACIÓN
    const token = req.cookies.get('hse_auth_token')?.value;
    if (!token) return new Response('No autorizado', { status: 401 });

    const { payload } = await jwtVerify(token, JWT_SECRET);
    const idUsuario = payload.id;
    const idEmpresa = payload.id_empresa;
    const userArea = payload.area || 'Seguridad';

    // Verificar permisos IA en DB para mayor seguridad
    const [userRows] = await pool.query('SELECT permisos_ia, nombre FROM Personal_Area WHERE id_personal = ?', [idUsuario]);
    
    if (userRows.length === 0 || userRows[0].permisos_ia !== 1) {
      return new Response('No tienes permiso para interactuar con RECALITO', { status: 403 });
    }

    const userName = userRows[0].nombre;

    // 2. EXTRACCIÓN DE MENSAJES
    const { messages } = await req.json();

    // 3. DETECCIÓN PROACTIVA DE CONTEXTO (Pre-fetching)
    // En lugar de herramientas que pueden romper el stream, inyectamos datos si se detectan palabras clave
    let contextData = "";
    const userLower = messages[messages.length-1].content.toLowerCase();
    
    if (userLower.includes("maquinaria") || userLower.includes("mantenimiento") || userLower.includes("vencido")) {
       console.log("Pre-fetching maquinaria para contexto...");
       const [rows] = await pool.query(
         `SELECT num_economico, tipo, marca, fecha_proximo_mantenimiento 
          FROM Maquinaria_Equipo 
          WHERE fecha_proximo_mantenimiento < CURDATE() AND bActivo = 1 AND id_empresa = ? LIMIT 5`,
         [idEmpresa]
       );
       if (rows.length > 0) {
         contextData += `\nCONOCIMIENTO ACTUAL (MAQUINARIA): Se detectaron equipos con mantenimiento vencido: ${JSON.stringify(rows)}.`;
       } else {
         contextData += `\nCONOCIMIENTO ACTUAL (MAQUINARIA): Toda la maquinaria reporta sus mantenimientos al día.`;
       }
    }

    if (userLower.includes("reporte") || userLower.includes("personal") || 
        userLower.includes("fuerza") || userLower.includes("contratista") || 
        userLower.includes("export") || userLower.includes("descargar") || 
        userLower.includes("bajar") || userLower.includes("archivo") || 
        userLower.includes("xls") || userLower.includes("ft")) {
       
       console.log("Activando validación estricta de catálogo con bActivo=1...");
       const [subs] = await pool.query(
         'SELECT id_subcontratista as id, razon_social as nombre FROM Subcontratistas WHERE id_empresa = ? AND bActivo = 1',
         [idEmpresa]
       );
       
       contextData += `\nCATÁLOGO OFICIAL DE SUBCONTRATISTAS registrados en RECAL-HSE: ${JSON.stringify(subs)}.`;
    }

    const systemPrompt = `
      CATÁLOGO INTERNO: ${contextData || "SIN DATOS"}
      
      Eres SSPA-RTACO. Lee el historial y actúa:
      
      --- REGLA DE MEMORIA ---
      - NUNCA preguntes algo que ya se mencionó.
      - Si el usuario dio varias categorías, PROCESA TODAS de forma individual.
      
      --- CASO A: FT ---
      1. IDENTIDAD: Valida ID numérico.
      2. PERIODO: Pregunta siempre "¿Mes o semana?".
      * URL: AUTO_OPEN_URL|/api/fuerza-trabajo/exportar?fechaInicio=YYYY-MM-DD&fechaFin=YYYY-MM-DD&subcontratista=ID|FIN
      
      --- CASO B: MAQUINARIA ---
      1. TIPO: ¿Utilización o Mantenimiento?.
      2. CATEGORÍA: [maquinaria, herramienta, equipo, vehiculo].
      3. REGLA MULTI-LINK: Si hay varias categorías, escribe UN COMANDO POR CADA UNA (No uses comas).
      
      * SI ES UTILIZACIÓN: AUTO_OPEN_URL|/api/maquinaria/exportar-utilizacion?mes=MM&anio=YYYY&area_usuario=${userArea}&tipo_unidad=CATEGORIA|FIN
      * SI ES MANTENIMIENTO: AUTO_OPEN_URL|/api/maquinaria/exportar-plan-servicio?mes=MM&anio=YYYY&area_usuario=${userArea}&tipo_unidad=CATEGORIA|FIN
      
      REGLAS CRÍTICAS: 
      - IDs invisibles. No uses "todos". 
      - No inventes nombres de rutas, usa solo las de arriba.
      Usuario: ${userName}
    `;

    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;

    const google = createGoogleGenerativeAI({
      apiKey: apiKey,
    });

    const result = streamText({
      model: google('gemma-3-27b-it'), // Usamos Gemma 3 para evitar los límites de cuota de Gemini Flash
      system: systemPrompt,
      messages,
    });

    // REGRESAMOS A TEXTO PURO: Es el único 100% compatible con el entorno del usuario
    return result.toTextStreamResponse();

  } catch (error) {
    console.error("AI Route Error:", error);
    return new Response('Error interno AI', { status: 500 });
  }
}
