"use client";

import React, { useEffect, useState, createContext, useContext, useCallback } from 'react';
import { 
  X, Sparkles, RefreshCw, LogOut, ShieldCheck, 
  Trash2, Info, CheckCircle2, AlertTriangle, FileText,
  Rocket, ChevronRight
} from 'lucide-react';
import Swal from 'sweetalert2';

const SEED_DATA = {
  'fuerza-trabajo': [
    { id_trabajador: 1001, nombre_trabajador: 'JUAN ALBERTO', apellido_trabajador: 'DEMO PRUEBA', puesto_categoria: 'SOLDADOR ESPECIALISTA', nss: '12345678901', curp: 'DEMO800101HDFRND01', fecha_ingreso_obra: '2026-04-01', fecha_alta_imss: '2026-04-01', bActivo: 1, nombre_subcontratista: 'CONSTRUCCIONES SHADOW S.A.', id_subcontratista_principal: 1 },
    { id_trabajador: 1002, nombre_trabajador: 'MARIA', apellido_trabajador: 'VIRTUAL RUIZ', puesto_categoria: 'AUXILIAR HSE', nss: '98765432101', curp: 'VIRT850505MDFRND02', fecha_ingreso_obra: '2026-04-10', fecha_alta_imss: '2026-04-10', bActivo: 1, nombre_subcontratista: 'LOGÍSTICA VIRTUAL S.A.', id_subcontratista_principal: 2 },
    { id_trabajador: 1003, nombre_trabajador: 'CARLOS', apellido_trabajador: 'SANDBOX HERNÁNDEZ', puesto_categoria: 'AYUDANTE GENERAL', nss: '55566677701', curp: '', fecha_ingreso_obra: '2026-04-12', fecha_alta_imss: '2026-04-12', bActivo: 1, nombre_subcontratista: 'CONSTRUCCIONES SHADOW S.A.', id_subcontratista_principal: 1 },
    { id_trabajador: 1004, nombre_trabajador: 'RODRIGO', apellido_trabajador: 'VÁZQUEZ J.', puesto_categoria: 'MANIOBRISTA', nss: '22233344401', curp: 'VAZR900101HDFXYZ01', fecha_ingreso_obra: '2026-04-05', fecha_alta_imss: '2026-04-05', bActivo: 1, nombre_subcontratista: 'CONSTRUCCIONES SHADOW S.A.', id_subcontratista_principal: 1 },
    { id_trabajador: 1005, nombre_trabajador: 'ELENA', apellido_trabajador: 'GÓMEZ MONTIEL', puesto_categoria: 'SUPERVISOR HSE (DEMO)', nss: '88877766601', curp: 'GOMA820505MDFABC01', fecha_ingreso_obra: '2026-04-08', fecha_alta_imss: '2026-04-08', bActivo: 1, nombre_subcontratista: 'LOGÍSTICA VIRTUAL S.A.', id_subcontratista_principal: 2 },
    { id_trabajador: 1006, nombre_trabajador: 'FERNANDO', apellido_trabajador: 'LÓPEZ DÍAZ', puesto_categoria: 'CABO DE OFICIOS', nss: '77711122201', curp: '', fecha_ingreso_obra: '2026-04-11', fecha_alta_imss: '2026-04-11', bActivo: 1, nombre_subcontratista: 'CONSTRUCCIONES SHADOW S.A.', id_subcontratista_principal: 1 },
    { id_trabajador: 1007, nombre_trabajador: 'PATRICIA', apellido_trabajador: 'SÁNCHEZ LUNA', puesto_categoria: 'MANIOBRISTA', nss: '99900011101', curp: 'SANP880202MDFLMN01', fecha_ingreso_obra: '2026-04-03', fecha_alta_imss: '2026-04-03', bActivo: 1, nombre_subcontratista: 'LOGÍSTICA VIRTUAL S.A.', id_subcontratista_principal: 2 },
    { id_trabajador: 1008, nombre_trabajador: 'JORGE', apellido_trabajador: 'RAMÍREZ SOSA', puesto_categoria: 'AYUDANTE GENERAL', nss: '66655544401', curp: 'RAMJ750909HDFRST01', fecha_ingreso_obra: '2026-04-13', fecha_alta_imss: '2026-04-13', bActivo: 1, nombre_subcontratista: 'CONSTRUCCIONES SHADOW S.A.', id_subcontratista_principal: 1 }
  ],
  'maquinaria': [
    { id_maquinaria: 2001, economico: 'GT-01-DEMO', descripcion: 'GRÚA TORRE G-SHADOW', serie: 'SHAD-9922', bActivo: 1, id_subcontratista_principal: 1, nombre_subcontratista: 'CONSTRUCCIONES SHADOW S.A.', marca: 'G-SHADOW', modelo: 'X1', fecha_ingreso_obra: '2026-03-15' },
    { id_maquinaria: 2002, economico: 'EX-02-V', descripcion: 'EXCAVADORA V-TRACK', serie: 'VIRT-8811', bActivo: 1, id_subcontratista_principal: 2, nombre_subcontratista: 'LOGÍSTICA VIRTUAL S.A.', marca: 'V-TRACK', modelo: 'V200', fecha_ingreso_obra: '2026-04-05' }
  ],
  'certificados': [
    { id_certificado: 3001, trabajador: 'JUAN ALBERTO CO-DEMO 01', f_emision: '2026-04-12', resultado: 'APTO', vigencia: '2027-04-12' }
  ],
  'dc3': [
    { id_dc3: 4001, trabajador: 'MARIA VIRTUAL RUIZ', curso: 'SEGURIDAD EN TRABAJOS EN ALTURA', fecha: '2026-04-10', instructor: 'ING. FERNANDO RODRIGUEZ (DEMO)' }
  ],
  'cat-subcontratistas': [
    { id_subcontratista: 1, nombre_comercial: 'CONSTRUCCIONES SHADOW S.A.', razon_social: 'CONSTRUCCIONES SHADOW S.A. DE C.V.', rfc: 'SHAD900101XYZ' },
    { id_subcontratista: 2, nombre_comercial: 'LOGÍSTICA VIRTUAL S.A.', razon_social: 'LOGÍSTICA VIRTUAL S.A. DE C.V.', rfc: 'VIRT800505ABC' }
  ],
  'cat-puestos': [
    'SOLDADOR ESPECIALISTA',
    'AYUDANTE GENERAL',
    'SUPERVISOR HSE (DEMO)',
    'MANIOBRISTA',
    'CABO DE OFICIOS'
  ],
  'cat-cursos': [
    { id_curso: 1, nombre_curso: 'TRABAJO EN ALTURAS', duracion_horas: 8, area_tematica: '6000 Seguridad', id_agente: 1, nombre_agente: 'ING. FERNANDO RODRIGUEZ (DEMO)' },
    { id_curso: 2, nombre_curso: 'ESPACIOS CONFINADOS', duracion_horas: 4, area_tematica: '6000 Seguridad', id_agente: 1, nombre_agente: 'ING. FERNANDO RODRIGUEZ (DEMO)' }
  ],
  'cat-agentes': [
    { id_agente: 1, nombre_agente: 'ING. FERNANDO RODRIGUEZ (DEMO)' }
  ],
  'mantenimientos': [
    { id_mantenimiento: 1, id_maquinaria: 2001, fecha_mantenimiento: '2026-04-01', tipo_mantenimiento: 'Preventivo', horometro_mantenimiento: 520, observaciones: 'Cambio de aceite y filtros (Demo Record)' }
  ],
  'informes-seguridad': [
    {
      id_informe: 5001,
      num_reporte: 1,
      id_subcontratista: 1,
      subcontratista: 'CONSTRUCCIONES SHADOW S.A.',
      mes_anio: '2026-04',
      periodo_inicio: '2026-04-01',
      periodo_fin: '2026-04-07',
      hh_semana_anterior: 0,
      hh_total: 440,
      ubicaciones: [
        { pk_referencia: 'FRENTE 1' },
        { pk_referencia: 'ÁREA C' }
      ],
      ft_rows: [
        { frente: 'FRENTE 1', hr_lunes: 8, per_lunes: 10, hr_martes: 8, per_martes: 10, hr_miercoles: 8, per_miercoles: 10, hr_jueves: 8, per_jueves: 10, hr_viernes: 8, per_viernes: 10, hr_sabado: 4, per_sabado: 10, hr_domingo: 0, per_domingo: 0, ext_hr_lunes: 0, ext_per_lunes: 0, ext_hr_martes: 0, ext_per_martes: 0, ext_hr_miercoles: 0, ext_per_miercoles: 0, ext_hr_jueves: 0, ext_per_jueves: 0, ext_hr_viernes: 0, ext_per_viernes: 0, ext_hr_sabado: 0, ext_per_sabado: 0, ext_hr_domingo: 0, ext_per_domingo: 0 }
      ],
      desviaciones: [
        { tipo_desviacion: 'Acto Inseguro / R. Violación al Reglamento', generada_por: 'Superintendencia', descripcion: 'Personal sin EPP', accion_inmediata: 'Retiro del área', fecha_plazo: 'Inmediato', dia_semana: 'martes' }
      ],
      fotos: [
        { ruta_imagen: 'https://images.unsplash.com/photo-1541888081696-6e3e1cbbf1ba?auto=format&fit=crop&q=80&w=800&h=600', descripcion: 'FRENTE 1: ÁREA DE EXCAVACIÓN' }
      ]
    }
  ]
};

const DemoContext = createContext(null);
export const useDemoMode = () => useContext(DemoContext);

/**
 * Senior Frontend Implementation: DemoSystem
 * This component acts as a Virtual Shadow Layer over the real API.
 * It intercept all network traffic for 'Demo' users, providing a seamless
 * but entirely local experience (zero database interference).
 */
export default function DemoSystem({ children, userEmail, onUpgradeClick }) {
  const isDemo = userEmail === 'demo@obrasos.com';
  const [virtualDB, setVirtualDB] = useState(SEED_DATA);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewConfig, setPreviewConfig] = useState(null);
  const [showDocModal, setShowDocModal] = useState(false);
  const [docData, setDocData] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);


  const syncToStorage = useCallback((newDB) => {
    localStorage.setItem('hse_demo_virtual_storage', JSON.stringify(newDB));
    setVirtualDB(newDB);
  }, []);

  useEffect(() => {
    if (!isDemo) return;

    // Inicializar VDB - Mezcla Inteligente para evitar datos obsoletos (Draft v2.0 Sync)
    const stored = localStorage.getItem('hse_demo_virtual_storage');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        // Mezclamos SEED_DATA para asegurar que nuevas estructuras de catálogo prevalezcan
        // pero mantenemos los datos de negocio que el usuario haya creado
          const merged = {
            ...parsed,
            'cat-subcontratistas': SEED_DATA['cat-subcontratistas'],
            'cat-puestos': SEED_DATA['cat-puestos'],
            'cat-cursos': SEED_DATA['cat-cursos'],
            'cat-agentes': SEED_DATA['cat-agentes'],
            'maquinaria': parsed.maquinaria || SEED_DATA.maquinaria,
            'fuerza-trabajo': parsed['fuerza-trabajo'] || SEED_DATA['fuerza-trabajo'],
            'dc3': parsed.dc3 || SEED_DATA.dc3,
            'mantenimientos': parsed.mantenimientos || SEED_DATA.mantenimientos,
            'informes-seguridad': parsed['informes-seguridad'] || SEED_DATA['informes-seguridad']
          };
          syncToStorage(merged);
      } catch (e) {
        syncToStorage(SEED_DATA);
      }
    } else {
      syncToStorage(SEED_DATA);
    }
    // 2. Network Interceptor (Monkey Patching)
    const originalFetch = window.fetch;
    const originalWindowOpen = window.open;

    // 2a. Interceptar window.open (usado para descargar Excel directamente)
    window.open = (url, ...rest) => {
      const urlStr = (url || '').toString();
      if (urlStr.includes('/exportar') || urlStr.includes('/imprimir') || urlStr.includes('/generar')) {
        console.log('%c[DEMO] Bloqueando window.open de exportación: ' + urlStr, 'color: #ef4444; font-weight: bold;');
        handleExportRequest(urlStr);
        return null; // No abrir nada
      }
      return originalWindowOpen.call(window, url, ...rest);
    };

    // 2b. Interceptar fetch
    window.fetch = async (...args) => {
      const [url, options] = args;
      const urlStr = (typeof url === 'string' ? url : url?.url) || '';
      const method = options?.method?.toUpperCase() || 'GET';

      // EXCEPCIÓN: No interceptar Login/Logout, pero SÍ interceptar /auth/me para permisos demo
      const isLoginLogout = urlStr.includes('/api/auth/login') || urlStr.includes('/api/auth/logout');
      
      if (urlStr.includes('/api/auth/me') && method === 'GET') {
        return new Response(JSON.stringify({
          success: true,
          user: { 
            nombre: 'Ingeniero Demo',
            rol: 'Master', 
            plan_suscripcion: 'Total', 
            correo: 'demo@obrasos.com',
            id_empresa: 0 
          }
        }), { status: 200 });
      }
      
      if (urlStr.includes('/api/') && !isLoginLogout) {
        
        // A) INTERCEPCIÓN DE EXPORTACIONES Y GENERACIÓN DE DOCUMENTOS
        if (urlStr.includes('/exportar') || urlStr.includes('/imprimir') || urlStr.includes('/generar')) {
          console.log('%c[DEMO] Interceptando Exportación/Generación: ' + urlStr, 'color: #3b82f6; font-weight: bold;');
          handleExportRequest(urlStr);
          
          // Devolvemos JSON con demoBlocked: true para que el frontend sepa que no hay descarga
          return new Response(JSON.stringify({ 
            success: true, 
            demoBlocked: true,
            sinCuadrilla: [], 
            sinCategoria: [],
            faltantes: [],
            message: "Demo Mode: Preview triggered" 
          }), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }

        // B) INTERCEPCIÓN DE ESCRITURA (Shadow Writes)
        if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
          console.log(`%c[DEMO] Interceptando ${method}: ${urlStr}`, 'color: #f59e0b; font-weight: bold;');
          let body = {};
          try {
            if (options?.body) {
              if (typeof options.body === 'string') {
                body = JSON.parse(options.body);
              } else if (typeof FormData !== 'undefined' && options.body instanceof FormData) {
                options.body.forEach((val, key) => { body[key] = val; });
              }
            }
          } catch(e) { body = {}; }
          return simulateWrite(urlStr, method, body);
        }

        // C) INTERCEPCIÓN DE LECTURA (Shadow Reads - INSTANT ISOLATION)
        if (method === 'GET') {
          const sensitiveEndpoints = [
            '/fuerza-trabajo', '/maquinaria', '/certificados', '/informes', 
            '/catalogos', '/api/empresas', '/usuarios/me'
          ];
          const isSensitive = sensitiveEndpoints.some(e => urlStr.includes(e));

          if (isSensitive) {
            console.log(`%c[DEMO] Instant Shadow Read: ${urlStr}`, 'color: #10b981; font-weight: bold;');
            return simulateRead(urlStr);
          }
        }
      }

      return originalFetch(...args);
    };

    // IMPORTANTE: Marcar como inicializado DESPUÉS de instalar el interceptor
    setIsInitialized(true);

    return () => {
      window.fetch = originalFetch;
      window.open = originalWindowOpen;
    };
  }, [isDemo, syncToStorage]);

  // ═══════════════════════════════════════════════════════════════
  // HELPERS: Lectura/Escritura fresca desde localStorage (evita closures stale)
  // ═══════════════════════════════════════════════════════════════
  const getDB = () => {
    try {
      const stored = localStorage.getItem('hse_demo_virtual_storage');
      return stored ? JSON.parse(stored) : SEED_DATA;
    } catch { return SEED_DATA; }
  };

  const saveDB = (db) => {
    localStorage.setItem('hse_demo_virtual_storage', JSON.stringify(db));
    setVirtualDB(db);
  };

  const lookupSubName = (db, id) => {
    const sub = (db['cat-subcontratistas'] || []).find(s => s.id_subcontratista == id);
    return sub ? sub.nombre_comercial : 'DEMO S.A.';
  };

  // ═══════════════════════════════════════════════════════════════
  // ESCRITURA: CRUD Local Completo (POST / PUT / DELETE)
  // ═══════════════════════════════════════════════════════════════
  const simulateWrite = (url, method, body) => {
    const db = getDB();

    // ── FUERZA DE TRABAJO ─────────────────────────────────────
    if (url.includes('/fuerza-trabajo')) {
      const col = 'fuerza-trabajo';
      if (method === 'POST') {
        const newRecord = {
          ...body,
          id_trabajador: Date.now(),
          bActivo: 1,
          nombre_subcontratista: lookupSubName(db, body.id_subcontratista_principal),
        };
        db[col] = [...(db[col] || []), newRecord];
      } else if (method === 'PUT') {
        const idx = (db[col] || []).findIndex(r => r.id_trabajador == body.id_trabajador);
        if (idx !== -1) {
          db[col][idx] = { ...db[col][idx], ...body, nombre_subcontratista: lookupSubName(db, body.id_subcontratista_principal || db[col][idx].id_subcontratista_principal) };
        }
      } else if (method === 'DELETE' || method === 'PATCH') {
        const id = body.id_trabajador || body.id;
        if (id) db[col] = (db[col] || []).filter(r => r.id_trabajador != id);
      }
      saveDB(db);
    }

    // ── MAQUINARIA ────────────────────────────────────────────
    else if (url.includes('/maquinaria') && !url.includes('mantenimiento')) {
      const col = 'maquinaria';
      // Asegurar que la colección exista en el virtual storage antes de escribir
      if (!db[col]) db[col] = [...(SEED_DATA[col] || [])];
      
      if (method === 'POST') {
        const newRecord = {
          ...body,
          id_maquinaria: Date.now(),
          bActivo: 1,
          nombre_subcontratista: lookupSubName(db, body.id_subcontratista_principal),
        };
        db[col] = [...db[col], newRecord];
      } else if (method === 'PUT') {
        const idx = db[col].findIndex(r => r.id_maquinaria == body.id_maquinaria);
        if (idx !== -1) {
          db[col][idx] = { ...db[col][idx], ...body };
          console.log(`%c[DEMO] Maquinaria ${body.id_maquinaria} actualizada`, 'color: #10b981; font-weight: bold;');
        }
      } else if (method === 'DELETE') {
        const id = body.id_maquinaria || body.id;
        if (id) db[col] = db[col].filter(r => r.id_maquinaria != id);
      }
      saveDB(db);
    }

    // ── MANTENIMIENTOS (ESPECÍFICO) ───────────────────────────
    else if (url.includes('/maquinaria/mantenimiento')) {
      const col = 'mantenimientos';
      if (method === 'POST') {
        const newRecord = {
          ...body,
          id_mantenimiento: Date.now(),
        };
        db[col] = [...(db[col] || []), newRecord];
      }
      saveDB(db);
    }

    // ── INFORMES DE SEGURIDAD ───────────────────────────────
    else if (url.includes('/upload-foto')) {
      return new Response(JSON.stringify({ 
        success: true, 
        ruta: 'https://images.unsplash.com/photo-1541888081696-6e3e1cbbf1ba?auto=format&fit=crop&q=80&w=800&h=600'
      }), { status: 200 });
    }

    else if (url.includes('/informes-seguridad')) {
      const col = 'informes-seguridad';
      if (!db[col]) db[col] = [...(SEED_DATA[col] || [])];
      
      const calculateHH = (rows) => {
        return (rows || []).reduce((acc, row) => {
          let rowTotal = 0;
          ['lunes','martes','miercoles','jueves','viernes','sabado','domingo'].forEach(d => {
             rowTotal += (parseFloat(row[`hr_${d}`])||0) * (parseInt(row[`per_${d}`])||0);
             rowTotal += (parseFloat(row[`ext_hr_${d}`])||0) * (parseInt(row[`ext_per_${d}`])||0);
          });
          return acc + rowTotal;
        }, 0);
      };

      const idMatch = url.match(/\/informes-seguridad\/(\d+)/);
      const hh_calculated = calculateHH(body.ft_rows);

      if (method === 'POST') {
        db[col] = [...db[col], { 
          ...body, 
          id_informe: Date.now(), 
          hh_total: hh_calculated,
          subcontratista: lookupSubName(db, body.id_subcontratista)
        }];
      } else if (method === 'PUT') {
        const id = idMatch ? idMatch[1] : (body.id_informe || body.id);
        const idx = db[col].findIndex(r => r.id_informe == id);
        if (idx !== -1) {
          db[col][idx] = { 
            ...db[col][idx], 
            ...body, 
            hh_total: hh_calculated,
            subcontratista: lookupSubName(db, body.id_subcontratista) 
          };
        }
      } else if (method === 'DELETE') {
        const id = idMatch ? idMatch[1] : (body.id_informe || body.id);
        if (id) db[col] = db[col].filter(r => r.id_informe != id);
      }
      saveDB(db);
    }
    // ── CERTIFICADOS ──────────────────────────────────────────
    else if (url.includes('/certificados')) {
      const col = 'certificados';
      if (method === 'POST') {
        db[col] = [...(db[col] || []), { ...body, id_certificado: Date.now() }];
      }
      saveDB(db);
    }

    // ── CUALQUIER OTRO ENDPOINT ───────────────────────────────
    // (usuarios, catalogos, etc.) — no persistimos pero devolvemos éxito
    console.log(`%c[DEMO] Shadow Write OK: ${method} ${url}`, 'color: #8b5cf6; font-weight: bold;');

    return new Response(JSON.stringify({ 
      success: true, 
      mensaje: "Guardado en sesión local (Modo Demo)",
      data: body 
    }), { status: 200 });
  };

  // ═══════════════════════════════════════════════════════════════
  // LECTURA: Siempre desde localStorage fresco (sin closures stale)
  // ═══════════════════════════════════════════════════════════════
  const simulateRead = (url) => {
    const db = getDB();

    // ORDEN CRÍTICO: Rutas específicas primero, genéricas al final.

    if (url.includes('/catalogos/contratistas')) {
      return new Response(JSON.stringify(db['cat-subcontratistas'] || SEED_DATA['cat-subcontratistas']), { status: 200 });
    }

    if (url.includes('/fuerza-trabajo/puestos') || url.includes('/catalogos/puestos')) {
      return new Response(JSON.stringify({ 
        success: true, 
        puestos: db['cat-puestos'] || SEED_DATA['cat-puestos']
      }), { status: 200 });
    }

    if (url.includes('/catalogos/subcontratistas') || (url.includes('/subcontratistas') && !url.includes('/fuerza-trabajo'))) {
      return new Response(JSON.stringify({ 
        success: true, 
        principales: db['cat-subcontratistas'] || SEED_DATA['cat-subcontratistas'],
        cuadrillas: [
          { id_subcontratista_ft: 101, nombre: 'CUADRILLA SHADOW A-1', id_subcontratista_principal: 1 },
          { id_subcontratista_ft: 102, nombre: 'CUADRILLA SHADOW B-2', id_subcontratista_principal: 1 }
        ]
      }), { status: 200 });
    }

    if (url.includes('/catalogos/cursos')) {
      return new Response(JSON.stringify(db['cat-cursos'] || SEED_DATA['cat-cursos']), { status: 200 });
    }

    if (url.includes('/catalogos/agentes')) {
      return new Response(JSON.stringify(db['cat-agentes'] || SEED_DATA['cat-agentes']), { status: 200 });
    }

    if (url.includes('/catalogos/medicos')) {
      return new Response(JSON.stringify([]), { status: 200 });
    }


    // ── IDENTIDAD Y PERMISOS ──────────────────────────────────
    if (url.includes('/api/usuarios/me')) {
      return new Response(JSON.stringify({
        success: true,
        data: [{
          id_personal: 0, nombre: 'Demo User', rol: 'Master',
          permisos_ft: 1, permisos_maquinaria: 1, permisos_certificados: 1,
          permisos_dc3: 1, permisos_informe: 1, permisos_citas: 0, id_empresa: 0
        }]
      }), { status: 200 });
    }

    if (url.includes('/api/empresas') && !url.includes('/maquinaria')) {
      return new Response(JSON.stringify({
        success: true,
        data: [{ id_empresa: 0, nombre_comercial: 'CONSTRUCCIONES SHADOW S.A.', rfc: 'SHAD900101XYZ', plan_suscripcion: 'Total' }]
      }), { status: 200 });
    }

    // ── ENTIDADES DE NEGOCIO (rutas genéricas, al final) ──────
    if (url.includes('/fuerza-trabajo')) {
      return new Response(JSON.stringify({ 
        success: true, 
        data: db['fuerza-trabajo'] || SEED_DATA['fuerza-trabajo']
      }), { status: 200 });
    }

    if (url.includes('/maquinaria/mantenimiento')) {
      const urlObj = new URL(url, 'http://localhost');
      const idMaq = urlObj.searchParams.get('id_maquinaria');
      let filtered = db['mantenimientos'] || [];
      if (idMaq) {
        filtered = filtered.filter(m => m.id_maquinaria == idMaq);
      }
      return new Response(JSON.stringify({
        success: true,
        data: filtered
      }), { status: 200 });
    }

    if (url.includes('/maquinaria')) {
      return new Response(JSON.stringify({
        success: true,
        data: db['maquinaria'] || SEED_DATA['maquinaria']
      }), { status: 200 });
    }

    if (url.includes('/certificados')) {
      return new Response(JSON.stringify({
        success: true,
        data: db['certificados'] || SEED_DATA['certificados']
      }), { status: 200 });
    }

    if (url.includes('hh_anterior=1')) {
       const urlObj = new URL(url, 'http://localhost');
       const numReporte = parseInt(urlObj.searchParams.get('num_reporte') || '1');
       const idSub = urlObj.searchParams.get('id_subcontratista');
       const mes = urlObj.searchParams.get('mes');
       
       if (numReporte <= 1) {
         return new Response(JSON.stringify({ success: true, hh_semana_anterior: 0 }), { status: 200 });
       }
       
       const previousReports = (db['informes-seguridad'] || []).filter(i => 
         i.id_subcontratista == idSub && 
         i.num_reporte < numReporte && 
         i.mes_anio == mes
       );

       const totalAnterior = previousReports.reduce((acc, curr) => acc + (curr.hh_total || 0), 0);
       
       return new Response(JSON.stringify({ 
         success: true, 
         hh_semana_anterior: totalAnterior
       }), { status: 200 });
    }

    if (url.includes('/informes-seguridad') && !url.includes('/exportar')) {
      const col = 'informes-seguridad';
      const idMatch = url.match(/\/informes-seguridad\/(\d+)/);
      if (idMatch) {
         const item = (db[col]||[]).find(i => i.id_informe == idMatch[1]);
         return new Response(JSON.stringify({ success: !!item, data: item }), { status: 200 });
      } else {
         const listData = (db[col] || SEED_DATA[col] || []).map(inf => ({
           ...inf,
           ubicaciones: Array.isArray(inf.ubicaciones) 
             ? inf.ubicaciones.map(u => u.pk_referencia).join(', ') 
             : inf.ubicaciones
         }));
         return new Response(JSON.stringify({ success: true, data: listData }), { status: 200 });
      }
    }

    // Fallback
    return new Response(JSON.stringify({ success: true, data: [] }), { status: 200 });
  };

  const handleExportRequest = (url) => {
    const db = getDB();
    let config = { title: 'Reporte del Sistema', icon: '📊', columns: [], rows: [] };
    
    // 1. PRIORIDAD: Documentos Específicos (Evitar solapamientos de URL)
    if (url.includes('carta')) {
      setDocData({
        type: 'CARTA_SIMPLE',
        message: 'CARTA DE ASIGNACION DE SUPERVISOR ALINEADO A REQUERIMIENTOS DEL DOSSIER DE SEGURIDAD'
      });
      setShowDocModal(true);
      return;
    }

    // 3. MAQUINARIA ESPECÍFICA (Vistas Premium)
    if (url.includes('exportar-inspeccion') && !url.includes('masivas')) {
      setShowDocModal(true);
      setDocData({ type: 'INSPECCION_SEMANAL', maquina: db['maquinaria'][0] || SEED_DATA['maquinaria'][0] });
      return;
    }
    if (url.includes('exportar-utilizacion')) {
      setShowDocModal(true);
      setDocData({ type: 'UTILIZACION', maquinas: db['maquinaria'] || SEED_DATA['maquinaria'] });
      return;
    }
    if (url.includes('exportar-plan-servicio')) {
      setShowDocModal(true);
      setDocData({ type: 'PLAN_MANTENIMIENTO', maquinas: db['maquinaria'] || SEED_DATA['maquinaria'] });
      return;
    }
    if (url.includes('exportar-inspecciones-masivas')) {
      setShowDocModal(true);
      setDocData({ 
        type: 'CARTA_SIMPLE',
        icon: '📦',
        title: 'EXPORTACIÓN MASIVA (ZIP)',
        message: 'Se exportará las inspecciones de toda la maquinaria aplicable al periodo.',
        disclaimer: 'El archivo descargado será un archivo comprimido .ZIP que contiene los reportes individuales en formato Excel.'
      });
      return;
    }
    if (url.includes('informes-seguridad/exportar')) {
      setShowDocModal(true);
      setDocData({
        type: 'CARTA_SIMPLE',
        icon: '📑',
        title: 'EXPORTACIÓN DE INFORME SEMANAL',
        disclaimer: 'Se generará el reporte semanal de seguridad con los gráficos, matriz H.H., hallazgos fotográficos y personal autorizado.',
      });
      return;
    }

    // 2. Reportes Estilo Excel (Catch-all)
    if (url.includes('fuerza-trabajo') && !url.includes('certificado')) {
      const workers = db['fuerza-trabajo'] || SEED_DATA['fuerza-trabajo'];
      config = { 
        title: 'Personal Activo en Obra', 
        icon: '👥', 
        columns: ['#', 'Nombre Completo', 'Puesto', 'NSS', 'Subcontratista', 'Fecha Ingreso'],
        rows: workers.map((w, i) => [
          i + 1,
          `${w.nombre_trabajador} ${w.apellido_trabajador}`,
          w.puesto_categoria || 'POR DEFINIR',
          w.nss || '—',
          w.nombre_subcontratista || 'DEMO S.A.',
          w.fecha_ingreso_obra || '—'
        ])
      };
    } else if (url.includes('certificado')) {
      setDocData({
        type: 'CARTA_SIMPLE',
        icon: '🩺',
        title: 'EXPORTACIÓN DE CERTIFICADOS',
        message: 'Se exportarán los certificados médicos de todo el personal que figuren como alta en el periodo correspondiente.',
        disclaimer: 'Dichos documentos deben estar avalados por un médico acreditado para expedir certificados médicos oficiales.'
      });
      setShowDocModal(true);
      return;
    } else if (url.includes('maquinaria')) {
      const machines = db['maquinaria'] || SEED_DATA['maquinaria'];
      config = { 
        title: 'Inventario de Maquinaria en Obra', 
        icon: '🚜', 
        columns: ['#', 'Económico', 'Descripción', 'Marca', 'Modelo', 'Serie', 'Subcontratista'],
        rows: machines.map((m, i) => [
          i + 1,
          m.economico,
          m.descripcion,
          m.marca || '—',
          m.modelo || '—',
          m.serie,
          m.nombre_subcontratista || 'DEMO S.A.'
        ])
      };
    } else if (url.includes('dc3')) {
      setDocData({
        type: 'CARTA_SIMPLE',
        icon: '📜',
        title: 'EXPORTACIÓN DE CONSTANCIAS DC-3',
        message: 'Se exportarán las Constancias de Competencias (DC-3) del personal que haya acreditado sus cursos en el periodo correspondiente.',
        disclaimer: 'Dichos documentos deben estar avalados por un Agente Capacitador Externo con registro vigente ante la STPS.'
      });
      setShowDocModal(true);
      return;
    }

    // LÓGICA ESPECIAL PARA DOCUMENTOS (DC3 / CERTIFICADOS)
    if (url.includes('generar-dc3') || url.includes('exportar-certificados')) {
      const urlObj = new URL(url, 'http://localhost');
      const idTrabajador = urlObj.searchParams.get('id_trabajador');
      const idCurso = urlObj.searchParams.get('id_curso');
      
      const workers = db['fuerza-trabajo'] || SEED_DATA['fuerza-trabajo'];
      const worker = workers.find(w => w.id_trabajador == idTrabajador) || workers[0];
      
      if (url.includes('generar-dc3')) {
        const courses = db['cat-cursos'] || SEED_DATA['cat-cursos'];
        const course = courses.find(c => c.id_curso == idCurso) || courses[0];
        
        setDocData({
          type: 'DC3',
          worker: worker,
          course: course,
          company: SEED_DATA['cat-subcontratistas'].find(s => s.id_subcontratista == worker.id_subcontratista_principal) || SEED_DATA['cat-subcontratistas'][0]
        });
        setShowDocModal(true);
        return;
      } else if (url.includes('id_trabajador=')) {
        // Individual certificate
        setDocData({
          type: 'CERT',
          worker: worker,
          company: SEED_DATA['cat-subcontratistas'].find(s => s.id_subcontratista == worker.id_subcontratista_principal) || SEED_DATA['cat-subcontratistas'][0]
        });
        setShowDocModal(true);
        return;
      }
    }

    setPreviewConfig(config);
    setShowPreviewModal(true);
  };

  if (!isDemo) return children;

  // COMPUERTA: No renderizar hijos hasta que el interceptor esté activo.
  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="text-center space-y-4">
          <Sparkles className="w-10 h-10 text-amber-400 animate-pulse mx-auto" />
          <p className="text-sm font-black text-slate-400 uppercase tracking-widest">Preparando entorno demo...</p>
        </div>
      </div>
    );
  }

  return (
    <DemoContext.Provider value={{ virtualDB, setShowPreviewModal }}>
      {/* BANNER FLOTANTE PREMIUM REDISEÑADO */}
      <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[99999] pointer-events-none px-6 w-full max-w-4xl">
        <div className="bg-slate-900/95 backdrop-blur-2xl border border-white/20 p-2 rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex flex-col md:flex-row items-center gap-4 transition-all hover:scale-[1.01] pointer-events-auto relative overflow-hidden group">
          
          {/* Luz de fondo animada */}
          <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500/20 via-purple-500/20 to-blue-500/20 blur-xl opacity-50 group-hover:opacity-100 transition-opacity duration-700"></div>

          <div className="flex items-center gap-4 px-4 flex-1 relative z-10">
            <div className="relative shrink-0">
              <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/40">
                <Sparkles className="w-6 h-6 text-amber-300 animate-pulse" />
              </div>
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-amber-400 rounded-full border-2 border-slate-900 flex items-center justify-center">
                 <div className="w-1.5 h-1.5 bg-slate-900 rounded-full animate-ping"></div>
              </div>
            </div>
            
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-sm font-black uppercase tracking-[0.25em] text-white leading-none">Modo Demo</span>
              </div>
              <span className="text-[11px] font-bold text-slate-400 uppercase leading-none mt-1 items-center flex gap-2">
                <ShieldCheck className="w-3 h-3 text-emerald-500" /> Entorno Virtual Aislado
              </span>
              <span className="text-[11px] font-bold text-slate-400 uppercase leading-none mt-1 items-center flex gap-2">
                Los cambios no afectan a la base de datos real
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 relative z-10 px-2 w-full md:w-auto">
            <button 
              onClick={() => { localStorage.removeItem('hse_demo_virtual_storage'); window.location.reload(); }}
              className="group/btn flex items-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white transition-all border border-white/5"
              title="Reiniciar base de datos virtual"
            >
              <RefreshCw className="w-3.5 h-3.5 group-hover/btn:rotate-180 transition-transform duration-500" /> 
              <span className="hidden lg:inline">Reiniciar</span>
            </button>

            <button 
              onClick={onUpgradeClick}
              className="flex-1 md:flex-none flex items-center justify-center gap-3 px-8 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white rounded-2xl text-[11px] font-black uppercase tracking-[0.15em] shadow-xl shadow-indigo-500/30 transition-all hover:scale-105 active:scale-95 group/cta"
            >
              <Rocket className="w-4 h-4 group-hover/cta:translate-x-1 group-hover/cta:-translate-y-1 transition-transform" /> 
              Contratar Versión Completa
              <ChevronRight className="w-4 h-4 opacity-50" />
            </button>
          </div>
        </div>
      </div>

      {children}

      {/* MODAL DE VISTA PREVIA CON DATOS REALES */}
      {showPreviewModal && (
        <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 md:p-12">
          <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm" onClick={() => setShowPreviewModal(false)}></div>
          
          <div className="relative bg-white dark:bg-slate-900 w-full max-w-6xl h-full max-h-[90vh] rounded-[2rem] shadow-2xl border border-gray-200 dark:border-white/10 overflow-hidden flex flex-col">
            {/* Header */}
            <div className="px-8 py-5 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                  <span className="text-xl">{previewConfig?.icon}</span>
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight leading-none">{previewConfig?.title}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                    <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Vista Previa — DEMO</span>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setShowPreviewModal(false)}
                className="group p-2.5 bg-gray-100 dark:bg-slate-800 hover:bg-red-500 rounded-xl transition-all"
              >
                <X className="w-5 h-5 text-slate-500 group-hover:text-white transition-colors" />
              </button>
            </div>

            {/* Tabla con datos reales */}
            <div className="flex-1 overflow-auto p-6 bg-[#f8fafc] dark:bg-slate-950/50">
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-lg overflow-hidden relative">
                
                {/* Watermark */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03] rotate-[-12deg] select-none">
                  <span className="text-[10rem] font-black text-slate-900">DEMO</span>
                </div>

                {/* Excel-style toolbar */}
                <div className="px-4 py-3 bg-green-700 flex items-center gap-3">
                  <FileText className="w-4 h-4 text-white" />
                  <span className="text-[11px] font-black text-white uppercase tracking-wider">{previewConfig?.title}.xlsx</span>
                  <div className="ml-auto flex gap-1.5">
                    {['Archivo', 'Edición', 'Vista'].map(t => (
                      <span key={t} className="text-[10px] text-green-200/60 font-medium px-2">{t}</span>
                    ))}
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left min-w-[700px]">
                    <thead>
                      <tr className="bg-slate-100 dark:bg-slate-800/80">
                        {previewConfig?.columns.map(col => (
                          <th key={col} className="px-4 py-3 text-[10px] font-black uppercase tracking-[0.1em] text-slate-600 dark:text-slate-300 border-b border-r border-gray-200 dark:border-slate-700 whitespace-nowrap">{col}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(previewConfig?.rows || []).map((row, i) => (
                        <tr key={i} className="hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-colors">
                          {row.map((cell, j) => (
                            <td key={j} className="px-4 py-3 text-[11px] text-slate-700 dark:text-slate-300 font-medium border-b border-r border-gray-100 dark:border-slate-800/50 whitespace-nowrap">{cell}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* CTA Card */}
              <div className="mt-8 p-8 bg-gradient-to-br from-indigo-600 to-blue-800 rounded-2xl text-white shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
                  <div className="flex-1 text-center md:text-left">
                    <h4 className="text-2xl font-black mb-3 tracking-tight">Exportación Automática</h4>
                    <p className="text-indigo-100/70 text-sm mb-6 font-medium">
                      En la versión completa, este reporte se genera como archivo Excel con formatos oficiales, listo para imprimir en el periodo elegido.
                    </p>
                    <div className="flex flex-wrap gap-3 justify-center md:justify-start">
                      <div className="px-3 py-1.5 bg-white/10 rounded-lg border border-white/10 flex items-center gap-2">
                        <ShieldCheck className="w-3 h-3 text-emerald-400" />
                        <span className="text-[9px] font-black uppercase tracking-widest">Formato Oficial</span>
                      </div>
                      <div className="px-3 py-1.5 bg-white/10 rounded-lg border border-white/10 flex items-center gap-2">
                        <FileText className="w-3 h-3 text-blue-300" />
                        <span className="text-[9px] font-black uppercase tracking-widest">Excel .XLSX</span>
                      </div>
                    </div>
                  </div>
                  <button 
                    onClick={() => setShowPreviewModal(false)}
                    className="px-8 py-4 bg-white text-blue-800 font-black uppercase tracking-wider rounded-xl hover:scale-105 transition-transform shadow-xl flex items-center gap-2 text-sm"
                  >
                    Cerrar <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-8 py-4 bg-slate-50 dark:bg-slate-900 border-t border-gray-100 dark:border-slate-800 flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-amber-500 animate-ping"></div>
              <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                Función limitada en Demo — El archivo real incluye fórmulas, celdas combinadas y formatos oficiales.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE VISTA PREVIA DE DOCUMENTOS (DC3 / CERTIFICADO) */}
      {showDocModal && docData && (
        <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 md:p-8">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" onClick={() => setShowDocModal(false)}></div>
          
          <div className="relative bg-white dark:bg-slate-900 w-full max-w-5xl h-full max-h-[95vh] rounded-[2.5rem] shadow-2xl border border-white/10 overflow-hidden flex flex-col">
            {/* Header Moderno con ObrasOS Branding */}
            <div className="px-8 py-4 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900">
               <div className="flex items-center gap-4">
                  <div className="bg-emerald-500 p-2.5 rounded-xl shadow-lg shadow-emerald-500/20">
                    <FileText className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">Vista Previa de Documento Oficial</h4>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Generado automáticamente por Motor ObrasOS</p>
                  </div>
               </div>
               <button onClick={() => setShowDocModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                 <X className="w-6 h-6 text-slate-400" />
               </button>
            </div>

            {/* Document Viewer Area */}
            <div className="flex-1 overflow-auto p-8 bg-slate-100 dark:bg-slate-950/40 flex flex-col items-center">
              
              {/* Document Paper Representation */}
              <div className={`bg-white text-black w-full ${(docData.type === 'PLAN_MANTENIMIENTO' || docData.type === 'UTILIZACION' || docData.type === 'INSPECCION_SEMANAL') ? 'max-w-[1150px]' : 'max-w-[800px]'} min-h-[800px] shadow-[0_20px_50px_rgba(0,0,0,0.1)] p-12 relative font-serif mb-12`}>
                
                {/* ObrasOS Watermark Inline */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03] rotate-[-25deg] select-none z-0">
                  <span className="text-[12rem] font-black italic">ObrasOS</span>
                </div>

                {/* HELPERS DE RENDERIZADO OFICIAL */}
                {(() => {
                  const renderBoxedString = (str = '', length = 18) => {
                    const chars = str.padEnd(length, ' ').split('');
                    return (
                      <div className="flex gap-0.5">
                        {chars.map((c, i) => (
                          <div key={i} className="w-5 h-6 border border-black flex items-center justify-center text-[11px] font-mono font-bold bg-white">{c}</div>
                        ))}
                      </div>
                    );
                  };

                  const renderDateField = (dateStr, label) => {
                    const date = dateStr ? new Date(dateStr) : new Date();
                    const day = date.getDate().toString().padStart(2, '0');
                    const month = (date.getMonth() + 1).toString().padStart(2, '0');
                    const year = date.getFullYear().toString();
                    return (
                      <div className="flex flex-col items-center">
                        <span className="text-[7px] font-sans mb-0.5">{label}</span>
                        <div className="flex gap-0.5">
                          {renderBoxedString(year, 4)}
                          {renderBoxedString(month, 2)}
                          {renderBoxedString(day, 2)}
                        </div>
                      </div>
                    );
                  };

                  if (docData.type === 'DC3') {
                    return (
                      <div className="relative z-10 space-y-4 text-xs">
                        {/* Header Logos */}
                        <div className="flex justify-between items-start mb-6">
                          <div className="w-32 h-16 border border-dashed border-gray-300 flex items-center justify-center text-[8px] text-gray-400 font-sans italic">"{'%logo_empresa'}"</div>
                          <div className="w-32 h-16 border border-dashed border-gray-300 flex items-center justify-center text-[8px] text-gray-400 font-sans italic">"{'%logo_agente'}"</div>
                        </div>

                        {/* Title Header */}
                        <div className="text-center space-y-1 mb-8">
                          <h1 className="text-sm font-black tracking-tight uppercase">FORMATO DC-3</h1>
                          <h2 className="text-sm font-black uppercase">CONSTANCIA DE COMPETENCIAS O DE HABILIDADES LABORALES</h2>
                        </div>

                        {/* Section 1: Worker */}
                        <div className="border border-black">
                          <div className="bg-gray-100 p-1 text-center font-black border-b border-black uppercase text-[10px]">DATOS DEL TRABAJADOR</div>
                          <div className="p-2 space-y-3">
                            <div className="space-y-1">
                              <label className="text-[8px] block font-sans">Nombre (Anotar apellido paterno, apellido materno y nombre (s))</label>
                              <div className="text-[11px] font-bold uppercase py-1 border-b border-gray-200">{docData.worker.apellido_trabajador}, {docData.worker.nombre_trabajador}</div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-1">
                                <label className="text-[8px] block font-sans">Clave Única de Registro de Población</label>
                                {renderBoxedString(docData.worker.curp, 18)}
                              </div>
                              <div className="space-y-1">
                                <label className="text-[8px] block font-sans">Ocupación específica (Catálogo Nacional de Ocupaciones)*</label>
                                <div className="text-[10px] font-bold uppercase py-1 border-b border-gray-200">3.0 CONSTRUCCION</div>
                              </div>
                            </div>
                            <div className="space-y-1">
                              <label className="text-[8px] block font-sans">Puesto*</label>
                              <div className="text-[11px] font-bold uppercase py-1 border-b border-gray-200 italic">{docData.worker.puesto_categoria}</div>
                            </div>
                          </div>
                        </div>

                        {/* Section 2: Company */}
                        <div className="border border-black">
                          <div className="bg-gray-100 p-1 text-center font-black border-b border-black uppercase text-[10px]">DATOS DE LA EMPRESA</div>
                          <div className="p-2 space-y-3">
                            <div className="space-y-1">
                              <label className="text-[8px] block font-sans">Nombre o razón social (En caso de persona física, anotar apellido paterno, apellido materno y nombre(s))</label>
                              <div className="text-[11px] font-bold uppercase py-1 border-b border-gray-200">{docData.company.razon_social}</div>
                            </div>
                            <div className="space-y-1">
                              <label className="text-[8px] block font-sans">Registro Federal de Contribuyentes con homoclave (SHCP)</label>
                              {renderBoxedString(docData.company.rfc, 13)}
                            </div>
                          </div>
                        </div>

                        {/* Section 3: Training */}
                        <div className="border border-black">
                          <div className="bg-gray-100 p-1 text-center font-black border-b border-black uppercase text-[10px]">DATOS DEL PROGRAMA DE CAPACITACIÓN, ADIESTRAMIENTO Y PRODUCTIVIDAD</div>
                          <div className="p-2 space-y-3">
                            <div className="space-y-1">
                              <label className="text-[8px] block font-sans">Nombre del curso</label>
                              <div className="text-[11px] font-bold uppercase py-1 border-b border-gray-200 tracking-tighter">{docData.course.nombre_curso}</div>
                            </div>
                            <div className="grid grid-cols-4 items-end">
                              <div className="space-y-1">
                                <label className="text-[8px] block font-sans">Duración en horas</label>
                                <div className="font-bold underline">{docData.course.duracion_horas}</div>
                              </div>
                              <div className="col-span-3 flex items-center gap-4">
                                <span className="text-[8px] font-sans">Periodo de ejecución:</span>
                                <div className="flex items-center gap-2">
                                  <span className="text-[8px]">De:</span>
                                  <div className="flex gap-2">
                                    {renderDateField('2026-04-01', 'Año / Mes / Día')}
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-[8px]">a:</span>
                                  <div className="flex gap-2">
                                    {renderDateField('2026-04-10', 'Año / Mes / Día')}
                                  </div>
                                </div>
                              </div>
                            </div>
                            <div className="space-y-1">
                              <label className="text-[8px] block font-sans">Área temática del curso*</label>
                              <div className="text-[10px] font-bold uppercase py-1 border-b border-gray-200">6000 SEGURIDAD</div>
                            </div>
                            <div className="space-y-1">
                              <label className="text-[8px] block font-sans">Nombre del agente capacitador o STPS*</label>
                              <div className="text-[10px] font-bold uppercase py-1 border-b border-gray-200">{docData.course.nombre_agente}</div>
                            </div>
                          </div>
                        </div>

                        {/* Signatures */}
                        <div className="pt-8 text-center space-y-4">
                          <p className="text-[8px] font-bold leading-tight px-12">
                            Los datos se asientan en esta constancia bajo protesta de decir verdad, apercibidos de la responsabilidad en que incurre todo aquel que no se conduce con verdad.
                          </p>
                          <div className="grid grid-cols-3 gap-8 text-[8px] font-sans pt-4">
                            <div className="space-y-2">
                              <div className="h-8 flex items-center justify-center italic text-gray-400">"{'%firma_instructor'}"</div>
                              <div className="border-t border-black pt-1">
                                <p className="font-black">Instructor o tutor</p>
                                <p className="text-[7px]">Nombre y firma</p>
                              </div>
                            </div>
                            <div className="space-y-2">
                              <div className="h-8 flex items-center justify-center italic text-gray-400">"{'%firma_patron'}"</div>
                              <div className="border-t border-black pt-1">
                                <p className="font-black">Patrón o representante legal</p>
                                <p className="text-[7px]">Nombre y firma</p>
                              </div>
                            </div>
                            <div className="space-y-2">
                              <div className="h-8 flex items-center justify-center italic text-gray-400">"{'%firma_trabajador'}"</div>
                              <div className="border-t border-black pt-1">
                                <p className="font-black">Representante de los trabajadores</p>
                                <p className="text-[7px]">Nombre y firma</p>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Footer Instructions */}
                        <div className="pt-8 text-[7px] font-sans">
                          <p className="font-bold">INSTRUCCIONES:</p>
                          <p>- Llenar a máquina o con letra de molde.</p>
                        </div>
                      </div>
                    );
                  }

                  if (docData.type === 'INSPECCION_SEMANAL') {
                    const m = docData.maquina || {};
                    return (
                      <div className="relative z-10 w-full text-black font-sans text-[10px]">
                        <div className="border-2 border-black">
                          {/* Header */}
                          <div className="bg-[#7e22ce] text-white text-center py-2 border-b-2 border-black">
                            <h1 className="text-2xl font-black uppercase tracking-widest">INSPECCIÓN SEMANAL</h1>
                          </div>
                          <div className="bg-[#15803d] text-white text-center py-1 border-b-2 border-black">
                            <h2 className="text-xs font-black uppercase">MAQUINARIA</h2>
                          </div>
                          
                          {/* Info Grid */}
                          <div className="grid grid-cols-2 border-b-2 border-black font-black uppercase">
                            <div className="p-1 border-r-2 border-black">PROYECTO:</div>
                            <div className="p-1">FECHA:</div>
                          </div>
                          <div className="grid grid-cols-2 border-b-2 border-black font-black uppercase">
                            <div className="p-1 border-r-2 border-black">FRENTE:</div>
                            <div className="p-1">CONTRATISTA:</div>
                          </div>

                          <div className="p-1 text-[9px] border-b-2 border-black font-medium leading-none">
                            Considerando sus actividades y alcances, responde SI, NO o NA en el espacio correspondiente.
                          </div>

                          {/* Questions Table */}
                          <div className="grid grid-cols-2 border-b-2 border-black bg-white">
                            <div className="border-r-2 border-black">
                              {[
                                "1. ¿La maquinaria/equipo se tiene identificada?",
                                "2. ¿La maquinaria/equipo se encuentra limpia?",
                                "3. ¿La maquinaria/equipo se encuentra ordenada?",
                                "4. ¿La maquinaria/equipo se encuentra libre de material sin uso?",
                                "5. ¿La maquinaria/equipo cuenta con pañal para contener posible?",
                                "6. ¿La maquinaria/equipo cuenta con un kit antiderrames?"
                              ].map((q, i) => (
                                <div key={i} className="grid grid-cols-4 border-b-2 border-black last:border-b-0">
                                  <div className="col-span-3 p-1 h-10 flex items-center">{q}</div>
                                  <div className="border-l-2 border-black p-1 flex items-center justify-center font-bold">SI</div>
                                </div>
                              ))}
                            </div>
                            <div>
                              {[
                                "7. ¿Los kits antiderrames cuentan con el material necesario y suficiente?",
                                "8. ¿Los equipos o maquinaria cuentan con charolas antiderrames?",
                                "9. ¿Se verifica que la maquinaria o equipo no presente fugas en mangueras, tanques de combustibles o aceite?",
                                "10. ¿Se lleva el registro del último mantenimiento preventivo/correctivo del maquinaria o equipos?",
                                "11. ¿Toda la maquinaria/equipo se encuentran al corriente con los servicios de mantenimiento?",
                                "12. ¿Se usa charola, kit antiderrames y extintor en sitio para el suministro de combustible a equipos y maquinaria?"
                              ].map((q, i) => (
                                <div key={i} className="grid grid-cols-4 border-b-2 border-black last:border-b-0">
                                  <div className="col-span-3 p-1 h-10 flex items-center leading-none">{q}</div>
                                  <div className="border-l-2 border-black p-1 flex items-center justify-center font-bold">SI</div>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Machine Details */}
                          <div className="grid grid-cols-4 text-center font-black uppercase border-b-2 border-black bg-white">
                            <div className="border-r-2 border-black p-1 h-16 flex flex-col justify-between">
                              <span className="text-[8px]">Tipo</span>
                              <span className="text-xs">{m.tipo}</span>
                            </div>
                            <div className="border-r-2 border-black p-1 h-16 flex flex-col justify-between">
                              <span className="text-[8px]">Marca/Modelo</span>
                              <span className="text-xs">{m.marca} {m.modelo}</span>
                            </div>
                            <div className="border-r-2 border-black p-1 h-16 flex flex-col justify-between">
                              <span className="text-[8px]">Número de serie</span>
                              <span className="text-xs">{m.serie}</span>
                            </div>
                            <div className="p-1 h-16 flex flex-col justify-between">
                              <span className="text-[8px]">Año</span>
                              <span className="text-xs">{m.anio}</span>
                            </div>
                          </div>

                          {/* Signature */}
                          <div className="p-8 h-24 flex items-end justify-center font-black text-[9px] uppercase border-t-2 border-black bg-white">
                            Nombre y firma del responsable de Medio Ambiente (Contratista)
                          </div>
                        </div>
                      </div>
                    );
                  }

                  if (docData.type === 'PLAN_MANTENIMIENTO') {
                    return (
                      <div className="relative z-10 w-full text-black font-sans text-[8px] overflow-hidden border border-black">
                        <div className="bg-white">
                          <div className="text-center py-4 border-b border-black">
                             <h1 className="text-lg font-black uppercase tracking-wider">PROGRAMA DE MANTENIMIENTO A MAQUINARIA Y EQUIPOS</h1>
                          </div>
                          <div className="bg-gray-400 p-1 border-b border-black font-black uppercase">PROYECTO:</div>
                          <div className="bg-gray-300 grid grid-cols-2 border-b border-black font-black uppercase text-center">
                            <div className="border-r border-black p-1">DESCRIPCIÓN</div>
                            <div className="p-1"></div>
                          </div>
                          <table className="w-full text-center font-black uppercase border-collapse">
                            <thead>
                              <tr className="bg-gray-300 border-b border-black">
                                {['NO.', 'TIPO', 'MARCA', 'AÑO', 'MODELO', 'COLOR', 'NUMERO DE SERIE', 'PLACAS', 'HOROMETRO', 'TIPO DE MANTENIMIENTO', 'FECHA DE ULTIMO MANTENIMIENTO', 'FECHA DE PROXIMO MANTENIMIENTO'].map((h, i) => (
                                  <th key={i} className="border-r border-black last:border-r-0 p-1 text-[7px] leading-none h-12 align-middle">{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {(docData.maquinas || []).map((m, i) => (
                                <tr key={i} className="border-b border-black last:border-b-0 h-8">
                                  <td className="border-r border-black p-1">{i + 1}</td>
                                  <td className="border-r border-black p-1">{m.tipo}</td>
                                  <td className="border-r border-black p-1">{m.marca}</td>
                                  <td className="border-r border-black p-1">{m.anio}</td>
                                  <td className="border-r border-black p-1">{m.modelo}</td>
                                  <td className="border-r border-black p-1">{m.color}</td>
                                  <td className="border-r border-black p-1">{m.serie}</td>
                                  <td className="border-r border-black p-1">{m.placa || '-'}</td>
                                  <td className="border-r border-black p-1">{m.horometro_actual}</td>
                                  <td className="border-r border-black p-1">PREVENTIVO</td>
                                  <td className="border-r border-black p-1">{m.ultima_fecha_mantenimiento || '-'}</td>
                                  <td className="p-1">-</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          <div className="p-1 text-[7px] font-black border-t border-black bg-white uppercase">
                            OBSERVACIONES:
                          </div>
                          <div className="grid grid-cols-1 mt-12">
                             <div className="border-t border-black mx-auto px-12 pt-1 font-black uppercase text-[8px]">ELABORÓ</div>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  if (docData.type === 'UTILIZACION') {
                    return (
                      <div className="relative z-10 w-full text-black font-sans text-[8px] overflow-hidden border border-black">
                         <div className="bg-white">
                           <div className="text-center py-4">
                             <h1 className="text-lg font-black uppercase tracking-widest text-[#1e293b]">PROGRAMA DE UTILIZACION DE MAQUINARIA Y EQUIPO</h1>
                           </div>
                           <div className="bg-[#93c5fd] grid grid-cols-2 border-y border-black font-black uppercase">
                              <div className="p-1 border-r border-black">PROYECTO:</div>
                              <div className="p-1">FECHA:</div>
                           </div>
                           <div className="bg-[#93c5fd] border-b border-black p-1 font-black uppercase">
                              CONTRATISTA: 
                           </div>
                           <table className="w-full text-center font-black uppercase border-collapse">
                             <thead>
                               <tr className="bg-gray-300 border-b border-black">
                                 {['NO.', 'TIPO', 'MARCA / MODELO', 'COLOR', 'NUMERO ECONOMICO', 'INGRESO A OBRA', 'BAJA DE OBRA', 'EVIDENCIA FOTOGRAFICA'].map((h, i) => (
                                   <th key={i} className="border-r border-black last:border-r-0 p-1 h-10 align-middle">{h}</th>
                                 ))}
                               </tr>
                             </thead>
                             <tbody>
                               {(docData.maquinas || []).map((m, i) => (
                                 <tr key={i} className="border-b border-black last:border-b-0">
                                   <td className="border-r border-black p-1 h-16">{i + 1}</td>
                                   <td className="border-r border-black p-1">{m.tipo}</td>
                                   <td className="border-r border-black p-1">{m.marca} / {m.modelo}</td>
                                   <td className="border-r border-black p-1">{m.color}</td>
                                   <td className="border-r border-black p-1 font-bold">{m.num_economico || m.economico}</td>
                                   <td className="border-r border-black p-1">{m.fecha_ingreso_obra || '-'}</td>
                                   <td className="border-r border-black p-1">{m.fecha_baja || '-'}</td>
                                   <td className="p-1 h-16 flex items-center justify-center">
                                      {m.imagen_url ? (
                                        <img src={m.imagen_url} className="h-14 w-20 object-contain border border-gray-200" alt="Evidencia" />
                                      ) : (
                                        <div className="w-16 h-12 bg-gray-100 border border-dashed border-gray-400 flex items-center justify-center text-[6px] text-gray-400">SIN FOTO</div>
                                      )}
                                   </td>
                                 </tr>
                               ))}
                             </tbody>
                           </table>
                           <div className="p-1 text-[7px] font-black border-t border-black bg-white uppercase">
                            OBSERVACIONES:
                           </div>
                           <div className="grid grid-cols-1 mt-12 pb-4">
                             <div className="border-t border-black mx-auto px-12 pt-1 font-black uppercase text-[8px]">ELABORÓ</div>
                           </div>
                         </div>
                      </div>
                    );
                  }

                  if (docData.type === 'CERT') {
                    const ciudad = "TAPACHULA, CHIAPAS";
                    return (
                      <div className="relative z-10 space-y-12 text-black font-sans py-4">
                        {/* Salud Header */}
                        <div className="flex justify-between items-start mb-16">
                           <div className="flex items-center gap-3">
                              <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center font-bold text-gray-400 text-xs">Salud</div>
                              <div className="flex flex-col text-[10px] font-black tracking-tighter leading-none">
                                <span>SALUD</span>
                                <span className="text-[7px] font-medium border-t border-black mt-0.5 pt-0.5">Secretaría de Salud</span>
                              </div>
                           </div>
                           <div className="text-center font-black text-xs leading-tight tracking-tight uppercase">
                             <p>SECRETARIA DE SALUD</p>
                             <p>INSTITUTO DE SALUD</p>
                             <p>DISTRITO DE SALUD VII</p>
                             <p>REGION SOCONUSCO</p>
                           </div>
                           <div className="w-24 text-[9px] text-right font-bold text-gray-400">
                             {ciudad}
                           </div>
                        </div>

                        {/* Middle Content */}
                        <div className="text-center space-y-10">
                           <h2 className="text-xl font-black uppercase tracking-widest border-b-2 border-black inline-block pb-1">Certificado Médico</h2>
                           
                           <div className="text-justify text-xs leading-loose px-4 space-y-10 font-medium">
                              <p className="uppercase leading-relaxed">
                                LA QUE SUSCRIBE, <span className="font-black">DR. FERNANDO RODRIGUEZ</span> MEDICO ADSCRITO AL DISTRITO DE SALUD VII <span className="font-black">{ciudad}</span> CON CÉDULA PROFESIONAL <span className="font-black tracking-widest">992831-DEMO</span>.
                              </p>

                              <h3 className="text-xl font-black italic tracking-widest text-center">HACE CONSTAR</h3>

                              <p className="uppercase leading-relaxed">
                                QUE HABIENDO PRACTICADO RECONOCIMIENTO MEDICO AL C. <span className="font-black underline text-sm">{docData.worker.nombre_trabajador} {docData.worker.apellido_trabajador}</span> DE <span className="font-black">34</span> AÑOS, SE ENCONTRO EN BUENAS CONDICIONES DE SALUD TANTO FÍSICA COMO MENTALMENTE:
                              </p>

                              <div className="text-center">
                                <p className="text-sm font-black tracking-[0.2em]">TIPO SANGUINEO “O” Rh POSITIVO</p>
                              </div>

                              <p className="uppercase leading-relaxed">
                                SE EXTIENDE EL PRESENTE PARA LOS USOS O FINES QUE AL INTERESADO CONVENGAN EN LA CIUDAD DE <span className="font-black">{ciudad}</span> A 13 DE ABRIL DE 2026.
                              </p>
                           </div>
                        </div>

                        {/* Only Doctor Signature */}
                        <div className="pt-24 text-center">
                           <div className="inline-block border-t border-black pt-4 min-w-[250px]">
                             <p className="text-[10px] font-black uppercase mb-1 underline">ATENTAMENTE</p>
                             <div className="h-12 flex items-center justify-center opacity-20 grayscale pointer-events-none mb-2">
                               <img src="https://api.dicebear.com/7.x/initials/svg?seed=DR" className="w-12 h-12" alt="Firma" />
                             </div>
                             <p className="text-[10px] font-black uppercase">DR. FERNANDO RODRIGUEZ</p>
                           </div>
                        </div>

                        {/* Small corner text */}
                        <div className="absolute bottom-[-20px] left-[-20px] text-[8px] text-gray-400 font-sans italic opacity-50">
                          c.c.p. Minutario de Salida
                        </div>
                      </div>
                    );
                  }

                  if (docData.type === 'CARTA_SIMPLE') {
                    return (
                      <div className="flex-1 flex flex-col items-center justify-center p-12 text-center h-full">
                        <div className="max-w-2xl space-y-8 animate-in fade-in zoom-in duration-500">
                          <div className="w-24 h-24 bg-blue-100 dark:bg-blue-900/30 rounded-3xl flex items-center justify-center mx-auto shadow-inner text-4xl">
                            {docData.icon || <ShieldCheck className="w-12 h-12 text-blue-600 dark:text-blue-400" />}
                          </div>
                          <div className="space-y-3">
                            {docData.title && (
                              <p className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-[0.3em] font-sans">{docData.title}</p>
                            )}
                            <h2 className="text-3xl font-black text-slate-800 dark:text-white leading-tight uppercase tracking-tight">
                              {docData.message}
                            </h2>
                          </div>
                          
                          <div className="h-1 w-24 bg-blue-600 mx-auto rounded-full"></div>
                          
                          {docData.disclaimer && (
                            <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 p-6 rounded-2xl flex items-start gap-4 text-left">
                              <AlertTriangle className="w-6 h-6 text-red-500 shrink-0 mt-0.5" />
                              <div className="space-y-1">
                                <p className="text-[10px] font-black text-red-600 uppercase tracking-widest leading-none">Aviso de Cumplimiento</p>
                                <p className="text-xs font-bold text-red-800/70 dark:text-red-800/60 leading-relaxed italic">
                                  {docData.disclaimer}
                                </p>
                              </div>
                            </div>
                          )}
                          {!docData.disclaimer && (
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] leading-loose">
                              Formato oficial para el Dossier de Calidad y Seguridad ObrasOS
                            </p>
                          )}
                          
                        </div>
                      </div>
                    );
                  }
                  if (docData.type === 'BITACORA') {
                    return (
                      <div className="relative z-10 w-full text-black font-sans text-[8px] overflow-hidden border-2 border-slate-800">
                         {/* Header Dinámico (Basado en Estilo) */}
                         <div className={`p-4 border-b-2 border-slate-800 flex justify-between items-center ${
                           docData.style === 'A' ? 'bg-slate-50' : 
                           docData.style === 'B' ? 'bg-blue-50' : 'bg-emerald-50'
                         }`}>
                           <div className="flex flex-col">
                              <span className="text-[14px] font-black uppercase tracking-tighter">Bitácora de Mantenimiento</span>
                              <span className="text-[9px] font-bold text-slate-500 italic">{docData.filename}</span>
                           </div>
                           <div className="text-right">
                              <div className="text-[12px] font-black">{docData.style === 'A' ? 'FORMATO 12-A' : docData.style === 'B' ? 'REGISTRO 12-B' : 'CONTROL 12-C'}</div>
                              <div className="text-[8px] text-slate-400">Sistema HSE ObrasOS</div>
                           </div>
                         </div>

                         {docData.style === 'A' && (
                           <div className="p-4 space-y-4">
                              <div className="grid grid-cols-4 gap-2 font-bold uppercase border-b border-slate-200 pb-2">
                                 <div>Proyecto: <span className="font-normal border-b border-blue-500">PROCESO CONSTRUCTIVO</span></div>
                                 <div className="col-span-2">Ubicación: <span className="font-normal border-b border-blue-500 italic">TALLER DE MAQUINARIA</span></div>
                                 <div>Fecha: <span className="font-normal border-b border-blue-500">ABRIL 2026</span></div>
                              </div>
                              <table className="w-full border-collapse border border-slate-300">
                                 <thead>
                                    <tr className="bg-slate-100 uppercase">
                                       <th className="border border-slate-300 p-1">Item</th>
                                       <th className="border border-slate-300 p-1">Actividad de Mantenimiento</th>
                                       <th className="border border-slate-300 p-1">Responsable</th>
                                       <th className="border border-slate-300 p-1">Frecuencia</th>
                                    </tr>
                                 </thead>
                                 <tbody>
                                    {['Verificación de niveles de aceite', 'Limpieza de filtros de aire', 'Inspección de mangueras hidráulicas', 'Revisión de sistema eléctrico'].map((act, i) => (
                                      <tr key={i} className="hover:bg-slate-50">
                                        <td className="border border-slate-300 p-1 text-center font-bold font-mono">{i+1}</td>
                                        <td className="border border-slate-300 p-1">{act}</td>
                                        <td className="border border-slate-300 p-1 uppercase">MECANICO</td>
                                        <td className="border border-slate-300 p-1 text-center font-bold">DIARIO</td>
                                      </tr>
                                    ))}
                                 </tbody>
                              </table>
                           </div>
                         )}

                         {docData.style === 'B' && (
                           <div className="p-4 space-y-6">
                              <div className="flex gap-4 items-center">
                                 <div className="w-16 h-16 bg-blue-600 flex items-center justify-center text-white text-3xl">🛠️</div>
                                 <div className="flex flex-col">
                                    <h2 className="text-lg font-black text-blue-900 leading-none">CHECKLIST OPERATIVO</h2>
                                    <p className="text-[9px] text-blue-600 font-bold uppercase tracking-widest">Control Interno de Calidad</p>
                                 </div>
                              </div>
                              <div className="grid grid-cols-2 gap-8">
                                 <div className="space-y-2 border-l-2 border-blue-200 pl-4">
                                    <h3 className="font-black text-[10px] text-blue-800 underline uppercase">Componentes Críticos</h3>
                                    {[
                                      "Sistema de Frenos Automático",
                                      "Sensores de Proximidad",
                                      "Paro de Emergencia",
                                      "Luces de Advertencia"
                                    ].map((c, i) => (
                                      <div key={i} className="flex items-center gap-2">
                                         <div className="w-3 h-3 border border-blue-800 flex items-center justify-center font-black">X</div>
                                         <span className="font-medium tracking-tight text-slate-700">{c}</span>
                                      </div>
                                    ))}
                                 </div>
                                 <div className="space-y-2 border-l-2 border-blue-200 pl-4">
                                    <h3 className="font-black text-[10px] text-blue-800 underline uppercase">Estado Mecánico</h3>
                                    {[
                                      "Presión de neumáticos",
                                      "Balance de Voltaje",
                                      "Lubricación de ejes",
                                      "Integridad Estructural"
                                    ].map((c, i) => (
                                      <div key={i} className="flex items-center gap-2">
                                         <div className="w-3 h-3 border border-blue-800 flex items-center justify-center font-black">✓</div>
                                         <span className="font-medium tracking-tight text-slate-700">{c}</span>
                                      </div>
                                    ))}
                                 </div>
                              </div>
                           </div>
                         )}

                         {docData.style === 'C' && (
                           <div className="p-4 space-y-6">
                              <div className="bg-emerald-800 text-white p-2 text-center uppercase font-black tracking-widest text-[10px]">REPORTE DE EVIDENCIA TÉCNICA</div>
                              <div className="grid grid-cols-3 gap-4">
                                 {[1,2,3].map(n => (
                                    <div key={n} className="space-y-1">
                                       <div className="h-24 bg-slate-100 border border-emerald-200 flex items-center justify-center text-slate-300 font-serif italic text-[7px]">FOTO EVIDENCIA {n}</div>
                                       <div className="text-[7px] font-black uppercase bg-emerald-100 p-1 text-emerald-800">OBSERVACIÓN TÉCNICA {n}</div>
                                       <div className="h-10 border-b border-slate-300 text-[6px] italic p-1">Se observa estado óptimo cumpliendo con los estándares de seguridad establecidos en la norma oficial mexicana aplicable.</div>
                                    </div>
                                 ))}
                              </div>
                              <div className="border-2 border-emerald-800 p-2 bg-emerald-50">
                                 <h4 className="font-black text-[9px] uppercase mb-1">Notas de Ingeniería:</h4>
                                 <p className="text-[7px] leading-relaxed">El equipo ha superado las pruebas de carga y estrés sin presentar fatiga estructural. Se recomienda continuar con el monitoreo preventivo bimestral para asegurar la continuidad operativa en frentes críticos de trabajo.</p>
                              </div>
                           </div>
                         )}

                         <div className="mt-8 p-4 border-t-2 border-slate-800 bg-slate-900 text-white flex justify-between items-center h-16">
                            <div className="flex gap-8">
                               <div className="flex flex-col">
                                  <span className="text-[7px] font-bold text-slate-400 italic">ELABORÓ:</span>
                                  <span className="text-[9px] font-black uppercase">Firma del Responsable</span>
                               </div>
                               <div className="flex flex-col">
                                  <span className="text-[7px] font-bold text-slate-400 italic">VALIDÓ:</span>
                                  <span className="text-[9px] font-black uppercase">Firma HSE Master</span>
                               </div>
                            </div>
                            <div className="flex items-center gap-2 opacity-50">
                               <div className="w-8 h-8 rounded-full border border-white flex items-center justify-center text-[10px] font-serif">OS</div>
                               <span className="text-[7px] font-black uppercase italic tracking-widest">ObrasOS Certificated System</span>
                            </div>
                         </div>
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>
            </div>

            {/* Premium CTA Footer (Always Visible) */}
            <div className="px-10 py-6 bg-slate-900 border-t border-white/10 relative overflow-hidden">
               <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-indigo-600/20 to-transparent pointer-events-none"></div>
               <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                       <Sparkles className="w-5 h-5 text-indigo-400 animate-pulse" />
                       <h4 className="text-lg font-black text-white uppercase tracking-tight">Exportación Automática</h4>
                       <span className="px-2 py-0.5 bg-indigo-500 text-white text-[8px] font-black rounded uppercase tracking-widest">Premium Feature</span>
                    </div>
                    <p className="text-gray-400 text-xs font-medium max-w-2xl leading-relaxed">
                      En la versión completa, este reporte se genera como archivo <span className="text-white font-bold">Excel con formatos oficiales</span>, listo para imprimir en el periodo elegido.
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-4 shrink-0">
                    <div className="hidden lg:flex items-center gap-4 mr-4 border-r border-white/10 pr-8">
                       <div className="flex flex-col items-end">
                          <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">Formato Oficial</span>
                          <span className="text-[10px] text-emerald-400 font-bold tracking-tighter italic">Alineado a normatividad</span>
                       </div>
                    </div>
                    <button 
                      onClick={() => setShowDocModal(false)}
                      className="px-8 py-3 bg-white text-slate-900 font-black uppercase tracking-widest rounded-xl hover:scale-105 active:scale-95 transition-all flex items-center gap-3 text-xs shadow-2xl"
                    >
                      Aceptar y Cerrar <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    </button>
                  </div>
               </div>
            </div>
          </div>
        </div>
      )}
    </DemoContext.Provider>
  );
}
