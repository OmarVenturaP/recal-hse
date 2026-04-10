"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { FileBarChart, Plus, Pencil, Download, Trash2, Camera, Image as ImageIcon, Loader2 } from 'lucide-react';
import Swal from 'sweetalert2';

const DIAS = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];
const DIAS_LABEL = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

const TIPOS_DESVIACION = [
  'Condición Insegura / R. Preventivo',
  'Acto Inseguro / R. Violación al Reglamento',
  'Acuerdo y Seguimiento',
  'Paros de Actividad',
  'Guía de Inspección',
  'Atención Médica',
  'Accidente SMO',
  'Accidente IMSS',
];

const GENERADA_POR_OPTIONS = [
  'Gerencia de Construcción',
  'Superintendencia',
  'Supervisor Jefe de Obra o de Frente',
  'Técnico Administrativo',
  'Visitas y Proveedores',
  'Supervisión de Seguridad',
  'Encargado y/o Capataz',
  'Personal Operativo (Sobrestante, etc.)',
];

const EMPTY_DESV = {
  tipo_desviacion: '',
  generada_por: '',
  descripcion: '',
  accion_inmediata: '',
  fecha_plazo: '',
  dia_semana: 'lunes',
};

const EMPTY_FT_ROW = {
  frente: '', 
  hr_lunes: 0, per_lunes: 0, ext_hr_lunes: 0, ext_per_lunes: 0,
  hr_martes: 0, per_martes: 0, ext_hr_martes: 0, ext_per_martes: 0,
  hr_miercoles: 0, per_miercoles: 0, ext_hr_miercoles: 0, ext_per_miercoles: 0,
  hr_jueves: 0, per_jueves: 0, ext_hr_jueves: 0, ext_per_jueves: 0,
  hr_viernes: 0, per_viernes: 0, ext_hr_viernes: 0, ext_per_viernes: 0,
  hr_sabado: 0, per_sabado: 0, ext_hr_sabado: 0, ext_per_sabado: 0,
  hr_domingo: 0, per_domingo: 0, ext_hr_domingo: 0, ext_per_domingo: 0,
};

function calcRowTotal(row) {
  let t = 0;
  for (const d of DIAS) { 
    t += (parseInt(row[`hr_${d}`]) || 0) * (parseInt(row[`per_${d}`]) || 0); 
    t += (parseInt(row[`ext_hr_${d}`]) || 0) * (parseInt(row[`ext_per_${d}`]) || 0); 
  }
  return t;
}

export default function InformesSeguridad() {
  const topRef = useRef(null);
  const fileInputRef = useRef(null);

  // Auth y Permisos
  const [userRole, setUserRole] = useState(null);
  const [userPermisoInforme, setUserPermisoInforme] = useState(0);
  const [userId, setUserId] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Datos
  const [informes, setInformes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [catSubcontratistas, setCatSubcontratistas] = useState([]);

  // Filtro mensual (estilo maquinaria)
  const now = new Date();
  const currentMonth = String(now.getMonth() + 1).padStart(2, '0');
  const currentYear = String(now.getFullYear());
  const [filterMes, setFilterMes] = useState(currentMonth);
  const [filterAnio, setFilterAnio] = useState(currentYear);
  const mesFilter = `${filterAnio}-${filterMes}`;

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [uploadingFoto, setUploadingFoto] = useState(false);
  const [exportingId, setExportingId] = useState(null);

  // Form Data
  const [formData, setFormData] = useState({
    num_reporte: '', id_subcontratista: '', subcontratista: '',
    periodo_inicio: '', periodo_fin: '',
    hh_semana_anterior: 0,
    fotos: [],
  });
  const [ubicaciones, setUbicaciones] = useState([{ pk_referencia: '' }]);
  const [ftRows, setFtRows] = useState([{ ...EMPTY_FT_ROW }]);
  const [desviaciones, setDesviaciones] = useState([]);

  // Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // =====================================================================
  // AUTH
  // =====================================================================
  useEffect(() => {
    const loadAuth = async () => {
      try {
        const [resAuth, resUser] = await Promise.all([
          fetch('/api/auth/me').then(r => r.json()),
          fetch('/api/usuarios/me').then(r => r.json()),
        ]);
        if (resAuth.success) {
          setUserRole(resAuth.user.rol);
          setUserId(resAuth.user.id);
        }
        if (resUser.success && resUser.data?.length > 0) {
          setUserPermisoInforme(resUser.data[0].permisos_informe || 0);
        }
      } catch (e) { console.error(e); }
      finally { setAuthLoading(false); }
    };
    loadAuth();
  }, []);

  const canManage = userRole === 'Master' || userPermisoInforme === 1;

  // =====================================================================
  // CARGA DE DATOS
  // =====================================================================
  const fetchInformes = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/informes-seguridad?mes=${mesFilter}`);
      const data = await res.json();
      if (data.success) setInformes(data.data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [mesFilter]);

  useEffect(() => {
    if (!authLoading) fetchInformes();
  }, [authLoading, fetchInformes]);

  useEffect(() => {
    fetch('/api/catalogos/subcontratistas')
      .then(r => r.json())
      .then(d => { if (d.success) setCatSubcontratistas(d.principales || []); });
  }, []);

  // Paginación
  const totalPages = Math.ceil(informes.length / itemsPerPage);
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return informes.slice(start, start + itemsPerPage);
  }, [informes, currentPage]);

  useEffect(() => { setCurrentPage(1); }, [filterMes, filterAnio]);

  const mesNombre = (mesStr) => {
    const [y, m] = mesStr.split('-');
    const d = new Date(parseInt(y), parseInt(m) - 1, 1);
    return d.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' });
  };

  // =====================================================================
  // MODAL: Abrir / Cerrar
  // =====================================================================
  const handleNew = () => {
    setIsEditing(false);
    setEditId(null);
    setFormData({
      num_reporte: '', id_subcontratista: '', subcontratista: '',
      periodo_inicio: '', periodo_fin: '', hh_semana_anterior: 0,
      fotos: [],
    });
    setUbicaciones([{ pk_referencia: '' }]);
    setFtRows([{ ...EMPTY_FT_ROW }]);
    setDesviaciones([]);
    setIsModalOpen(true);
  };

  const handleEdit = async (informe) => {
    try {
      const res = await fetch(`/api/informes-seguridad/${informe.id_informe}`);
      const data = await res.json();
      if (!data.success) return Swal.fire('Error', 'No se pudo cargar el informe', 'error');

      const d = data.data;
      setFormData({
        num_reporte: d.num_reporte,
        id_subcontratista: d.id_subcontratista || '',
        subcontratista: d.subcontratista,
        periodo_inicio: d.periodo_inicio?.split('T')[0] || '',
        periodo_fin: d.periodo_fin?.split('T')[0] || '',
        hh_semana_anterior: d.hh_semana_anterior || 0,
        fotos: d.fotos || [],
      });
      setUbicaciones(d.ubicaciones?.length > 0 ? d.ubicaciones : [{ pk_referencia: '' }]);
      setFtRows(d.ft_rows?.length > 0 ? d.ft_rows : [{ ...EMPTY_FT_ROW }]);
      setDesviaciones(d.desviaciones || []);
      setEditId(d.id_informe);
      setIsEditing(true);
      setIsModalOpen(true);
    } catch (e) {
      Swal.fire('Error', 'Error de conexión', 'error');
    }
  };

  // =====================================================================
  // MODAL: Lógica de formulario
  // =====================================================================
  const handleFormChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubChange = (e) => {
    const id = e.target.value;
    const sub = catSubcontratistas.find(s => s.id_subcontratista.toString() === id.toString());
    setFormData(prev => ({
      ...prev,
      id_subcontratista: id,
      subcontratista: sub ? sub.razon_social : '',
    }));
  };

  useEffect(() => {
    const fetchHH = async () => {
      if (formData.num_reporte && formData.id_subcontratista && parseInt(formData.num_reporte) > 1) {
        try {
          const res = await fetch(
            `/api/informes-seguridad?hh_anterior=1&mes=${mesFilter}&id_subcontratista=${formData.id_subcontratista}&num_reporte=${formData.num_reporte}`
          );
          const data = await res.json();
          if (data.success) {
            setFormData(prev => ({ ...prev, hh_semana_anterior: data.hh_semana_anterior }));
          }
        } catch (e) { /* silencioso */ }
      } else {
        setFormData(prev => ({ ...prev, hh_semana_anterior: 0 }));
      }
    };
    if (isModalOpen) fetchHH();
  }, [formData.num_reporte, formData.id_subcontratista, mesFilter, isModalOpen]);

  const addUbicacion = () => setUbicaciones(prev => [...prev, { pk_referencia: '' }]);
  const removeUbicacion = (idx) => setUbicaciones(prev => prev.filter((_, i) => i !== idx));
  const updateUbicacion = (idx, val) => {
    setUbicaciones(prev => prev.map((u, i) => i === idx ? { ...u, pk_referencia: val.toUpperCase() } : u));
  };

  const addFtRow = () => setFtRows(prev => [...prev, { ...EMPTY_FT_ROW }]);
  const removeFtRow = (idx) => setFtRows(prev => prev.filter((_, i) => i !== idx));
  const updateFtRow = (idx, field, value) => {
    setFtRows(prev => prev.map((row, i) => {
      if (i !== idx) return row;
      return { ...row, [field]: field === 'frente' ? value.toUpperCase() : value };
    }));
  };

  const addDesviacion = () => setDesviaciones(prev => [...prev, { ...EMPTY_DESV }]);
  const removeDesviacion = (idx) => setDesviaciones(prev => prev.filter((_, i) => i !== idx));
  const updateDesviacion = (idx, field, value) => {
    setDesviaciones(prev => prev.map((d, i) => i === idx ? { ...d, [field]: value } : d));
  };
  
  // =====================================================================
  // AUXILIARES DE COMPRESIÓN
  // =====================================================================
  const compressImage = async (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onerror = (e) => reject(e);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onerror = (e) => reject(e);
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          
          // Límites razonables para reportes (Ej: 1280px)
          const MAX_WIDTH = 1280;
          const MAX_HEIGHT = 1280;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          
          canvas.toBlob((blob) => {
            if (!blob) return reject(new Error('Canvas toBlob failed'));
            const compressedFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });
            resolve(compressedFile);
          }, 'image/jpeg', 0.8); // 80% de calidad
        };
      };
    });
  };

  // =====================================================================
  // LÓGICA FOTOGRAFÍAS
  // =====================================================================
  const handleFotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingFoto(true);
    
    try {
      // COMPRESIÓN PRE-SUBIDA
      const compressedFile = await compressImage(file);
      
      const formDataUpload = new FormData();
      formDataUpload.append('foto', compressedFile);

      const res = await fetch('/api/informes-seguridad/upload-foto', {
        method: 'POST',
        body: formDataUpload
      });
      const textVal = await res.text();
      let data;
      try {
        data = JSON.parse(textVal);
      } catch(e) {
        if (res.status === 413 || textVal.includes('Too Large') || textVal.includes('Entity')) {
          throw new Error('La imagen es demasiado pesada (Error 413). Dile a tu administrador que aumente el client_max_body_size en NGINX.');
        }
        throw new Error('Respuesta del servidor no es JSON válido: ' + textVal.substring(0, 40));
      }

      if (data && data.success) {
        setFormData(prev => ({
          ...prev,
          fotos: [...prev.fotos, { ruta_imagen: data.ruta, descripcion: '' }]
        }));
      } else {
        Swal.fire({
          title: 'Error',
          text: data.error || 'No se pudo subir la foto',
          icon: 'error',
          customClass: { container: 'swal2-container-z-index-high' },
          didOpen: () => {
            document.querySelector('.swal2-container').style.zIndex = '99999';
          }
        });
      }
    } catch (error) {
      Swal.fire({
        title: 'Error',
        text: 'Error de conexión al subir foto' + (error.message ? ': ' + error.message : ''),
        icon: 'error',
        didOpen: () => {
          document.querySelector('.swal2-container').style.zIndex = '99999';
        }
      });
    } finally {
      setUploadingFoto(false);
      e.target.value = ''; // Reset input
    }
  };

  const removeFoto = (idx) => {
    setFormData(prev => ({
      ...prev,
      fotos: prev.fotos.filter((_, i) => i !== idx)
    }));
  };

  const updateFotoDesc = (idx, desc) => {
    setFormData(prev => ({
      ...prev,
      fotos: prev.fotos.map((f, i) => i === idx ? { ...f, descripcion: desc.toUpperCase() } : f)
    }));
  };

  const totalHHActual = useMemo(() => {
    return ftRows.reduce((sum, row) => sum + calcRowTotal(row), 0);
  }, [ftRows]);

  // =====================================================================
  // SINCRONIZACIÓN AUTOMÁTICA
  // =====================================================================
  useEffect(() => {
    if (!isModalOpen) return;
    
    // Extraer frentes únicos y no vacíos
    const frentesUnicos = [...new Set(
      ftRows
        .map(row => row.frente?.trim().toUpperCase())
        .filter(f => f && f !== '')
    )];

    // Si no hay frentes, dejar al menos uno vacío o resetear
    if (frentesUnicos.length === 0) {
      // Solo resetear si ya había algo para evitar loops si el estado inicial es diferente
      setUbicaciones(prev => {
        if (prev.length === 1 && prev[0].pk_referencia === '') return prev;
        return [{ pk_referencia: '' }];
      });
      return;
    }

    // Convertir a formato de objetos { pk_referencia: '...' }
    const nuevasUbicaciones = frentesUnicos.map(f => ({ pk_referencia: f }));

    // Comparar con el estado actual para evitar actualizaciones infinitas
    setUbicaciones(prev => {
      const currentVals = prev.map(u => u.pk_referencia).filter(v => v).sort().join(',');
      const newVals = frentesUnicos.sort().join(',');
      
      if (currentVals === newVals) return prev;
      return nuevasUbicaciones;
    });
  }, [ftRows, isModalOpen]);

  // =====================================================================
  // GUARDAR
  // =====================================================================
  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.num_reporte || !formData.id_subcontratista || !formData.periodo_inicio || !formData.periodo_fin) {
      return Swal.fire('Campos requeridos', 'Completa todos los campos obligatorios.', 'warning');
    }

    setSaving(true);

    // Aviso si hay menos de 4 fotos en el reporte (no bloquea el guardado)
    if ((formData.fotos || []).length < 4) {
      const { isConfirmed } = await Swal.fire({
        title: 'Pocas evidencias fotográficas',
        text: `Solo se han cargado ${(formData.fotos || []).length} foto(s). Se recomienda incluir al menos 4 evidencias por informe. ¿Deseas guardar de todas formas?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Sí, guardar',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#dc2626',
        customClass: { container: '!z-[99999]' },
      });
      if (!isConfirmed) { setSaving(false); return; }
    }

    const payload = {
      ...formData,
      mes_anio: mesFilter,
      ubicaciones: ubicaciones.filter(u => u.pk_referencia && u.pk_referencia.trim()),
      ft_rows: ftRows.filter(r => (r.frente && r.frente.trim()) || calcRowTotal(r) > 0),
      desviaciones: desviaciones.filter(d => d.tipo_desviacion && d.generada_por),
    };

    try {
      const url = isEditing ? `/api/informes-seguridad/${editId}` : '/api/informes-seguridad';
      const method = isEditing ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', 'x-user-id': userId || '1' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (data.success) {
        Swal.fire('Guardado', data.message, 'success');
        setIsModalOpen(false);
        fetchInformes();
      } else {
        Swal.fire('Error', data.error || 'Error al guardar', 'error');
      }
    } catch (e) {
      Swal.fire('Error', 'Error de conexión', 'error');
    } finally { setSaving(false); }
  };

  const handleExport = async (inf) => {
    const { id_informe, num_reporte, subcontratista, mes_anio } = inf;
    setExportingId(id_informe);
    try {
      const res = await fetch(`/api/informes-seguridad/exportar?id=${id_informe}`);
      if (!res.ok) {
        const errData = await res.json();
        return Swal.fire('Error', errData.error || 'Error al exportar', 'error');
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      
      const periodoStr = mesNombre(mes_anio).toUpperCase();
      const fileName = `INFORME_SEGURIDAD_${num_reporte}_${subcontratista}_${periodoStr}.xlsx`.replace(/\s+/g, '_');

      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      Swal.fire('Error', 'Error de descarga', 'error');
    } finally {
      setExportingId(null);
    }
  };

  const fmtDate = (d) => {
    if (!d) return '';
    return new Date(d).toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-12 h-12 border-4 border-red-500/30 border-t-red-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!canManage) {
    return (
      <div className="p-6 max-w-7xl mx-auto min-h-screen flex flex-col items-center justify-center">
        <div className="text-6xl mb-4">🔒</div>
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Acceso Denegado</h2>
        <p className="text-gray-500 dark:text-gray-400 mt-2">No tienes permisos para ver los Informes de Seguridad.</p>
      </div>
    );
  }

  return (
    <>
    <div className="max-w-[100rem] mx-auto p-4 md:p-6 lg:p-8 space-y-6 animate-in fade-in duration-500" ref={topRef}>
      <div className="bg-white/90 dark:bg-slate-800/80 backdrop-blur-xl rounded-[2.5rem] p-6 lg:p-8 shadow-xl shadow-gray-200/50 dark:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.6)] border border-white/80 dark:border-slate-700/50">

        <div className="flex flex-col md:flex-row items-start md:items-center gap-6 mb-8 border-b border-gray-100 dark:border-slate-700/50 pb-6">
          <div className="w-16 h-16 bg-gradient-to-br from-red-600 to-red-700 rounded-2xl shadow-lg shadow-red-500/30 flex items-center justify-center text-white shrink-0">
            <FileBarChart className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-gray-800 dark:text-white tracking-tight leading-none mb-2">Informes de Seguridad</h1>
            <p className="text-gray-500 dark:text-gray-400 font-medium text-sm md:text-base">
              Control semanal de reportes, horas hombre y fuerza de trabajo por subcontratista.
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div className="flex items-center justify-between sm:justify-start space-x-1 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 p-1.5 rounded-md shadow-sm w-full sm:w-auto">
            <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase px-2 hidden md:inline">Periodo:</span>
            <select className="text-sm bg-transparent border-gray-300 dark:border-slate-600 dark:text-gray-200 rounded py-1 pl-2 pr-6 focus:ring-red-500 outline-none flex-1 sm:flex-none" value={filterMes} onChange={(e) => setFilterMes(e.target.value)}>
              <option value="01">Ene</option><option value="02">Feb</option><option value="03">Mar</option><option value="04">Abr</option>
              <option value="05">May</option><option value="06">Jun</option><option value="07">Jul</option><option value="08">Ago</option>
              <option value="09">Sep</option><option value="10">Oct</option><option value="11">Nov</option><option value="12">Dic</option>
            </select>
            <select className="text-sm bg-transparent border-gray-300 dark:border-slate-600 dark:text-gray-200 rounded py-1 pl-2 pr-6 focus:ring-red-500 outline-none flex-1 sm:flex-none" value={filterAnio} onChange={(e) => setFilterAnio(e.target.value)}>
              <option value="2024">2024</option><option value="2025">2025</option><option value="2026">2026</option><option value="2027">2027</option>
            </select>
          </div>
          <button onClick={handleNew} className="bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg shadow-red-500/25 transition-all flex items-center gap-2">
            <Plus className="w-5 h-5" /> Agregar Informe
          </button>
        </div>

        <div className="overflow-hidden rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm">
          <div className="max-h-[65vh] overflow-y-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
              <thead className="bg-gray-50 dark:bg-slate-900 sticky top-0 z-10">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-wider">N° Reporte</th>
                  <th className="px-6 py-4 text-left text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-wider">Subcontratista</th>
                  <th className="px-6 py-4 text-left text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-wider">Periodo</th>
                  <th className="px-6 py-4 text-left text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-wider">Ubicaciones</th>
                  <th className="px-6 py-4 text-right text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-wider">H.H. Totales</th>
                  <th className="px-6 py-4 text-center text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-800 bg-white dark:bg-slate-800/50">
                {loading ? (
                  <tr><td colSpan={6} className="text-center py-16 text-gray-400">
                    <div className="w-8 h-8 border-4 border-red-500/30 border-t-red-500 rounded-full animate-spin mx-auto mb-3"></div>
                    Cargando informes...
                  </td></tr>
                ) : paginatedData.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-16 text-gray-400">
                    <div className="text-5xl mb-3">📋</div>
                    No hay informes registrados para <span className="font-bold capitalize">{mesNombre(mesFilter)}</span>.
                  </td></tr>
                ) : paginatedData.map((inf) => (
                  <tr key={inf.id_informe} className="hover:bg-red-50/30 dark:hover:bg-slate-700/30 transition-colors">
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 font-black text-lg">
                        {inf.num_reporte}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-bold text-gray-900 dark:text-white text-sm">{inf.subcontratista}</p>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                      {fmtDate(inf.periodo_inicio)} — {fmtDate(inf.periodo_fin)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 max-w-[200px] truncate" title={inf.ubicaciones || ''}>
                      {inf.ubicaciones || '—'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-lg font-black text-red-600 dark:text-red-400">
                        {parseInt(inf.hh_total || 0).toLocaleString('es-MX', { minimumFractionDigits: 0 })}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => handleEdit(inf)} className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors" title="Editar">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleExport(inf)} 
                          disabled={exportingId === inf.id_informe}
                          className="p-2 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors disabled:opacity-50" 
                          title="Exportar a Excel"
                        >
                          {exportingId === inf.id_informe ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Download className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-3 mt-6">
            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-4 py-2 rounded-xl bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-200 font-bold disabled:opacity-40 hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors">
              Anterior
            </button>
            <span className="text-sm font-bold text-gray-500 dark:text-gray-400">
              {currentPage} / {totalPages}
            </span>
            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-4 py-2 rounded-xl bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-200 font-bold disabled:opacity-40 hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors">
              Siguiente
            </button>
          </div>
        )}
      </div>
    </div>

    {isModalOpen && createPortal(
      <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-start justify-center z-[9999] p-4 overflow-y-auto">
        <div className="bg-white dark:bg-slate-800 rounded-[2rem] shadow-2xl max-w-6xl w-full my-8 border border-white/20 overflow-hidden animate-in zoom-in duration-300">
          
          <div className="px-8 py-5 bg-gradient-to-r from-red-600 to-red-700 text-white flex justify-between items-center sticky top-0 z-20">
            <div>
              <h3 className="text-xl font-black">{isEditing ? 'Editar Informe' : 'Nuevo Informe de Seguridad'}</h3>
              <p className="text-red-100 text-sm capitalize">{mesNombre(mesFilter)}</p>
            </div>
            <button onClick={() => setIsModalOpen(false)} className="hover:bg-white/20 p-2 rounded-full transition-colors text-2xl">&times;</button>
          </div>

          <form onSubmit={handleSave} className="p-6 md:p-8 space-y-8">

            <div>
              <h4 className="text-lg font-black text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                <span className="w-8 h-8 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center text-red-600 text-sm font-black">1</span>
                Datos Generales
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">N° de Reporte *</label>
                  <input type="number" min="1" required
                    value={formData.num_reporte}
                    onChange={(e) => handleFormChange('num_reporte', e.target.value)}
                    className="w-full border border-gray-300 dark:border-slate-600 rounded-xl px-4 py-3 bg-white dark:bg-slate-900 text-gray-900 dark:text-white font-bold focus:ring-2 focus:ring-red-500 outline-none"
                  />
                </div>
                <div className="md:col-span-2 lg:col-span-1">
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Subcontratista *</label>
                  <select required
                    value={formData.id_subcontratista}
                    onChange={handleSubChange}
                    className="w-full border border-gray-300 dark:border-slate-600 rounded-xl px-4 py-3 bg-white dark:bg-slate-900 text-gray-900 dark:text-white font-bold focus:ring-2 focus:ring-red-500 outline-none"
                  >
                    <option value="">Seleccionar...</option>
                    {catSubcontratistas.map(s => (
                      <option key={s.id_subcontratista} value={s.id_subcontratista}>{s.razon_social}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Periodo Inicio *</label>
                  <input type="date" required
                    value={formData.periodo_inicio}
                    onChange={(e) => handleFormChange('periodo_inicio', e.target.value)}
                    className="w-full border border-gray-300 dark:border-slate-600 rounded-xl px-4 py-3 bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Periodo Fin *</label>
                  <input type="date" required
                    value={formData.periodo_fin}
                    onChange={(e) => handleFormChange('periodo_fin', e.target.value)}
                    className="w-full border border-gray-300 dark:border-slate-600 rounded-xl px-4 py-3 bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl p-4">
                  <p className="text-[10px] font-black text-gray-400 uppercase mb-1">H.H. Semana Anterior</p>
                  <p className="text-2xl font-black text-gray-700 dark:text-gray-300">
                    {parseFloat(formData.hh_semana_anterior).toLocaleString('es-MX', { minimumFractionDigits: 0 })}
                  </p>
                </div>
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-xl p-4">
                  <p className="text-[10px] font-black text-red-600 dark:text-red-400 uppercase mb-1">H.H. Semana Actual (Calculado)</p>
                  <p className="text-2xl font-black text-red-700 dark:text-red-400">
                    {totalHHActual.toLocaleString('es-MX', { minimumFractionDigits: 0 })}
                  </p>
                </div>
              </div>
            </div>


            <div>
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-black text-gray-800 dark:text-white flex items-center gap-2">
                  <span className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center text-green-600 text-sm font-black">2</span>
                  Fuerza de Trabajo
                </h4>
                <button type="button" onClick={addFtRow} className="text-green-600 hover:text-green-700 font-bold text-sm flex items-center gap-1">
                  <Plus className="w-4 h-4" /> Agregar Frente
                </button>
              </div>

              <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-slate-700">
                <table className="min-w-[1200px] w-full divide-y divide-gray-200 dark:divide-slate-700 text-[10px]">
                  <thead className="bg-gray-50 dark:bg-slate-900 sticky top-0 z-10">
                    <tr>
                      <th className="px-3 py-3 text-left font-black text-gray-500 uppercase w-40">Frente de Trabajo</th>
                      {DIAS_LABEL.map((dia, i) => (
                        <th key={i} className="px-1 py-3 text-center font-black text-gray-500 uppercase border-l border-gray-200 dark:border-slate-700">
                          {dia}
                        </th>
                      ))}
                      <th className="px-3 py-3 text-center font-black text-red-600 uppercase border-l border-gray-200 dark:border-slate-700">Total HH</th>
                      <th className="px-2 py-3 w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                    {ftRows.map((row, idx) => (
                      <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-slate-700/30">
                        <td className="px-2 py-2">
                          <input type="text" placeholder="FRENTE" value={row.frente}
                            onChange={(e) => updateFtRow(idx, 'frente', e.target.value)}
                            className="w-full border border-gray-200 dark:border-slate-600 rounded px-2 py-2 bg-white dark:bg-slate-900 text-gray-950 dark:text-white font-bold uppercase text-[10px] focus:ring-1 focus:ring-red-500 outline-none"
                          />
                        </td>
                        {DIAS.map((dia) => (
                          <td key={dia} className="px-1 py-1 border-l border-gray-100 dark:border-slate-700 min-w-[90px]">
                            <div className="flex flex-col gap-1">
                              {/* ORDINARIO */}
                              <div className="flex items-center gap-1">
                                <span className="text-[8px] font-black text-blue-500 w-5 shrink-0 uppercase">Ord</span>
                                <div className="flex gap-0.5 flex-1">
                                  <input type="number" min="0" title="Horas Ordinarias" placeholder="H"
                                    value={parseInt(row[`hr_${dia}`])}
                                    onChange={(e) => updateFtRow(idx, `hr_${dia}`, parseInt(e.target.value) || 0)}
                                    className="w-1/2 border border-gray-200 dark:border-slate-600 rounded px-1 py-1 text-center bg-white dark:bg-slate-900 text-gray-950 dark:text-white text-[10px] font-bold outline-none border-blue-100 dark:border-blue-900/30"
                                  />
                                  <input type="number" min="0" title="Personal Ordinario" placeholder="P"
                                    value={row[`per_${dia}`]}
                                    onChange={(e) => updateFtRow(idx, `per_${dia}`, parseInt(e.target.value) || 0)}
                                    className="w-1/2 border border-blue-200 dark:border-blue-800/50 rounded px-1 py-1 text-center bg-blue-50/30 dark:bg-blue-900/10 text-blue-700 dark:text-blue-300 text-[10px] font-black outline-none"
                                  />
                                </div>
                              </div>
                              
                              {/* EXTRA */}
                              <div className="flex items-center gap-1 border-t border-gray-50 dark:border-slate-800/50 pt-1">
                                <span className="text-[8px] font-black text-amber-500 w-5 shrink-0 uppercase">Ext</span>
                                <div className="flex gap-0.5 flex-1">
                                  <input type="number" min="0" title="Horas Extra" placeholder="H"
                                    value={parseInt(row[`ext_hr_${dia}`])}
                                    onChange={(e) => updateFtRow(idx, `ext_hr_${dia}`, parseInt(e.target.value) || 0)}
                                    className="w-1/2 border border-gray-200 dark:border-slate-600 rounded px-1 py-1 text-center bg-white dark:bg-slate-900 text-gray-950 dark:text-white text-[10px] font-bold outline-none border-amber-50/50 dark:border-amber-900/20"
                                  />
                                  <input type="number" min="0" title="Personal Extra" placeholder="P"
                                    value={row[`ext_per_${dia}`]}
                                    onChange={(e) => updateFtRow(idx, `ext_per_${dia}`, parseInt(e.target.value) || 0)}
                                    className="w-1/2 border border-amber-200 dark:border-amber-800/50 rounded px-1 py-1 text-center bg-amber-50/30 dark:bg-amber-900/10 text-amber-700 dark:text-amber-400 text-[10px] font-black outline-none"
                                  />
                                </div>
                              </div>
                            </div>
                          </td>
                        ))}
                        <td className="px-2 py-2 text-center font-black text-red-600 dark:text-red-400 border-l border-gray-200 dark:border-slate-700 text-xs bg-red-50/10">
                          {calcRowTotal(row).toLocaleString('es-MX', { minimumFractionDigits: 1 })}
                        </td>
                        <td className="px-2 py-2">
                          <button type="button" onClick={() => removeFtRow(idx)} className="p-1 rounded text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>


            {/* SECCIÓN 3: DESVIACIONES */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-black text-gray-800 dark:text-white flex items-center gap-2">
                  <span className="w-8 h-8 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center text-orange-600 text-sm font-black">3</span>
                  Desviaciones de Seguridad
                </h4>
                <button type="button" onClick={addDesviacion} className="text-orange-600 hover:text-orange-700 font-bold text-sm flex items-center gap-1">
                  <Plus className="w-4 h-4" /> Agregar Desviación
                </button>
              </div>

              {desviaciones.length === 0 ? (
                <div className="border-2 border-dashed border-orange-200 dark:border-orange-800/40 rounded-2xl p-8 text-center">
                  <p className="text-gray-400 dark:text-gray-500 font-medium text-sm">Sin desviaciones registradas. Haz clic en "Agregar Desviación" para añadir una.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {desviaciones.map((desv, idx) => (
                    <div key={idx} className="bg-orange-50/60 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-800/30 rounded-2xl p-4 relative">
                      <button type="button" onClick={() => removeDesviacion(idx)} className="absolute top-3 right-3 p-1 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-3">
                        <div>
                          <label className="block text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase mb-1">Día de la Semana</label>
                          <select value={desv.dia_semana} onChange={e => updateDesviacion(idx, 'dia_semana', e.target.value)}
                            className="w-full border border-orange-200 dark:border-orange-700 rounded-xl px-3 py-2 bg-white dark:bg-slate-900 text-gray-900 dark:text-white text-xs font-bold focus:ring-2 focus:ring-orange-500 outline-none">
                            {DIAS.map((d, i) => <option key={d} value={d}>{['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'][i]}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase mb-1">Tipo de Desviación *</label>
                          <select value={desv.tipo_desviacion} onChange={e => updateDesviacion(idx, 'tipo_desviacion', e.target.value)}
                            className="w-full border border-orange-200 dark:border-orange-700 rounded-xl px-3 py-2 bg-white dark:bg-slate-900 text-gray-900 dark:text-white text-xs font-bold focus:ring-2 focus:ring-orange-500 outline-none">
                            <option value="">Seleccionar...</option>
                            {TIPOS_DESVIACION.map(t => <option key={t} value={t}>{t}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase mb-1">Generada por *</label>
                          <select value={desv.generada_por} onChange={e => updateDesviacion(idx, 'generada_por', e.target.value)}
                            className="w-full border border-orange-200 dark:border-orange-700 rounded-xl px-3 py-2 bg-white dark:bg-slate-900 text-gray-900 dark:text-white text-xs font-bold focus:ring-2 focus:ring-orange-500 outline-none">
                            <option value="">Seleccionar...</option>
                            {GENERADA_POR_OPTIONS.map(g => <option key={g} value={g}>{g}</option>)}
                          </select>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="md:col-span-1">
                          <label className="block text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase mb-1">Descripción de la Desviación</label>
                          <textarea value={desv.descripcion} onChange={e => updateDesviacion(idx, 'descripcion', e.target.value)}
                            placeholder="Describa la situación..."
                            className="w-full border border-orange-200 dark:border-orange-700 rounded-xl px-3 py-2 bg-white dark:bg-slate-900 text-gray-900 dark:text-white text-xs focus:ring-2 focus:ring-orange-500 outline-none resize-none min-h-[64px]" />
                        </div>
                        <div className="md:col-span-1">
                          <label className="block text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase mb-1">Acción Inmediata</label>
                          <textarea value={desv.accion_inmediata} onChange={e => updateDesviacion(idx, 'accion_inmediata', e.target.value)}
                            placeholder="Acción tomada de inmediato..."
                            className="w-full border border-orange-200 dark:border-orange-700 rounded-xl px-3 py-2 bg-white dark:bg-slate-900 text-gray-900 dark:text-white text-xs focus:ring-2 focus:ring-orange-500 outline-none resize-none min-h-[64px]" />
                        </div>
                        <div>
                          <label className="block text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase mb-1">Fecha de Plazo</label>
                          <input type="text" value={desv.fecha_plazo} onChange={e => updateDesviacion(idx, 'fecha_plazo', e.target.value)}
                            placeholder="Ej: 15/04/2026 o Inmediato"
                            className="w-full border border-orange-200 dark:border-orange-700 rounded-xl px-3 py-2 bg-white dark:bg-slate-900 text-gray-900 dark:text-white text-xs focus:ring-2 focus:ring-orange-500 outline-none" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* SECCIÓN 4: REPORTE FOTOGRÁFICO */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-black text-gray-800 dark:text-white flex items-center gap-2">
                  <span className="w-8 h-8 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center text-red-600 text-sm font-black">3</span>
                  Reporte Fotográfico
                </h4>
                <div className="flex items-center gap-2">
                   <input 
                    type="file" 
                    id="foto-upload" 
                    className="hidden" 
                    accept="image/*"
                    onChange={handleFotoUpload}
                    ref={fileInputRef}
                  />
                  <button 
                    type="button" 
                    disabled={uploadingFoto}
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-red-100 transition-colors disabled:opacity-50"
                  >
                    {uploadingFoto ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                    Subir Fotografía
                  </button>
                </div>
              </div>

              {formData.fotos.length === 0 ? (
                <div className="border-2 border-dashed border-gray-200 dark:border-slate-700 rounded-3xl p-12 text-center">
                  <div className="w-16 h-16 bg-gray-50 dark:bg-slate-900 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <ImageIcon className="w-8 h-8 text-gray-300" />
                  </div>
                  <p className="text-gray-400 font-medium">No se han cargado fotografías para este reporte.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {formData.fotos.map((foto, idx) => (
                    <div key={idx} className="bg-gray-50 dark:bg-slate-900/50 rounded-[1.5rem] border border-gray-200 dark:border-slate-700 p-4 relative group">
                      <button 
                        type="button" 
                        onClick={() => removeFoto(idx)}
                        className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity z-10 shadow-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <div className="aspect-video w-full rounded-xl overflow-hidden bg-black mb-4 flex items-center justify-center">
                        <img 
                          src={foto.ruta_imagen} 
                          alt={`Foto ${idx + 1}`} 
                          className="max-w-full max-h-full object-contain"
                        />
                      </div>
                      <textarea
                        placeholder="Descripción de la actividad"
                        value={foto.descripcion}
                        onChange={(e) => updateFotoDesc(idx, e.target.value)}
                        className="w-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl py-3 text-sm font-medium focus:ring-2 focus:ring-red-500 outline-none min-h-[80px] resize-none uppercase"
                        style={{ paddingLeft: '5px', paddingRight: '5px' }}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-slate-700">
              <button type="button" onClick={() => setIsModalOpen(false)}
                className="px-6 py-3 rounded-xl border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 font-bold hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors">
                Cancelar
              </button>
              <button type="submit" disabled={saving}
                className="px-8 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black shadow-lg shadow-red-500/25 transition-all disabled:opacity-50 flex items-center gap-2">
                {saving ? 'Guardando...' : (isEditing ? 'Actualizar Informe' : 'Crear Informe')}
              </button>
            </div>
          </form>
        </div>
      </div>
    , document.body)}
    </>
  );
}
