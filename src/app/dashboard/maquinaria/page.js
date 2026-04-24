"use client";

import { useState, useEffect, useRef } from 'react';
import { ClipboardList, Pencil, Trash2, Upload, Tractor, FileSpreadsheet, FolderDown, Settings, Eye, Check } from 'lucide-react';
import Swal from 'sweetalert2';
import MaquinariaFormModal from '@/components/maquinaria/modals/MaquinariaFormModal';
import MaquinariaBajaModal from '@/components/maquinaria/modals/MaquinariaBajaModal';
import MaquinariaHistorialModal from '@/components/maquinaria/modals/MaquinariaHistorialModal';
import MaquinariaImportModal from '@/components/maquinaria/modals/MaquinariaImportModal';
import MaquinariaInspeccionHerramientaModal from '@/components/maquinaria/modals/MaquinariaInspeccionHerramientaModal';

// CÓDIGO DE COLORES DE INSPECCIÓN MENSUAL PARA HERRAMIENTAS DE PODER
const COLOR_INSPECCION_POR_MES = {
  '01': { nombre: 'Azul',      bg: 'bg-blue-500',    text: 'text-white',          border: 'border-blue-600' },
  '02': { nombre: 'Amarillo',  bg: 'bg-yellow-400',  text: 'text-yellow-900',     border: 'border-yellow-500' },
  '03': { nombre: 'Blanco',    bg: 'bg-white',       text: 'text-gray-700',       border: 'border-gray-400' },
  '04': { nombre: 'Verde',     bg: 'bg-green-500',   text: 'text-white',          border: 'border-green-600' },
  '05': { nombre: 'Azul',      bg: 'bg-blue-500',    text: 'text-white',          border: 'border-blue-600' },
  '06': { nombre: 'Amarillo',  bg: 'bg-yellow-400',  text: 'text-yellow-900',     border: 'border-yellow-500' },
  '07': { nombre: 'Blanco',    bg: 'bg-white',       text: 'text-gray-700',       border: 'border-gray-400' },
  '08': { nombre: 'Verde',     bg: 'bg-green-500',   text: 'text-white',          border: 'border-green-600' },
  '09': { nombre: 'Azul',      bg: 'bg-blue-500',    text: 'text-white',          border: 'border-blue-600' },
  '10': { nombre: 'Amarillo',  bg: 'bg-yellow-400',  text: 'text-yellow-900',     border: 'border-yellow-500' },
  '11': { nombre: 'Blanco',    bg: 'bg-white',       text: 'text-gray-700',       border: 'border-gray-400' },
  '12': { nombre: 'Verde',     bg: 'bg-green-500',   text: 'text-white',          border: 'border-green-600' },
};

export default function MaquinariaPage() {
  const topRef = useRef(null); 
  const tableContainerRef = useRef(null);
  const configRef = useRef(null);

  const [userRole, setUserRole] = useState(null);
  const [userArea, setUserArea] = useState(null); 
  const [userMaquinariaPermission, setUserMaquinariaPermission] = useState(null);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setUserRole(data.user.rol);
          setUserArea(data.user.area); 
          console.log("Rol:", data.user.rol, "Area:", data.user.area);
        }
      });

    fetch('/api/usuarios/me')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.data.length > 0) {
          setUserMaquinariaPermission(data.data[0].permisos_maquinaria);
        }
      });
  }, []);

  const canManageMaquinaria = userMaquinariaPermission === 1 || userRole === 'Admin' || userRole === 'Master';

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  const [maquinaria, setMaquinaria] = useState([]);
  const [loading, setLoading] = useState(true);

  const canSeeBothAreas = userArea === 'Ambas' || userRole === 'Admin' || userRole === 'Master';

  const [catPrincipales, setCatPrincipales] = useState([]);
  const [filtroSub, setFiltroSub] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [filtroArea, setFiltroArea] = useState('');
  const [filtroTipoUnidad, setFiltroTipoUnidad] = useState('todos');

  const [ordenPor, setOrdenPor] = useState('fecha_ingreso_obra');
  const [ordenDireccion, setOrdenDireccion] = useState('DESC');

  const currentYear = new Date().getFullYear();
  const currentMonth = String(new Date().getMonth() + 1).padStart(2, '0');
  const [exportMes, setExportMes] = useState(currentMonth);
  const [exportAnio, setExportAnio] = useState(String(currentYear));

  const getCurrentWeek = () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 1);
    const days = Math.floor((now - start) / (24 * 60 * 60 * 1000));
    const week = Math.ceil((days + start.getDay() + 1) / 7);
    return `${now.getFullYear()}-W${String(week).padStart(2, '0')}`;
  };
  const [exportSemana, setExportSemana] = useState(getCurrentWeek()); 

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  
  const formInicial = {
    num_economico: '', tipo: '', marca: '', anio: '', modelo: '', 
    color: '', serie: '', placa: '', horometro: '', 
    tipo_unidad: 'maquinaria', horometro_inicial: '',
    intervalo_mantenimiento: '', fecha_proximo_mantenimiento: '', fecha_ingreso_obra: '', id_subcontratista: '',
    area: 'seguridad', 
    imagen_url_actual: ''
  };
  const [formData, setFormData] = useState(formInicial);

  const [isBajaModalOpen, setIsBajaModalOpen] = useState(false);
  const [bajaId, setBajaId] = useState(null);
  const [bajaFecha, setBajaFecha] = useState('');

  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importSubcontratista, setImportSubcontratista] = useState('');
  const [importPreviewData, setImportPreviewData] = useState([]); 
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState('');
  const [importFase, setImportFase] = useState(1); 
  const [importResumen, setImportResumen] = useState({ totales: 0, nuevos: 0 });

  const [isHistorialOpen, setIsHistorialOpen] = useState(false);
  const [maquinaSeleccionada, setMaquinaSeleccionada] = useState(null);

  // Estado para modal de inspecciones de herramientas
  const [isInspeccionHerramientaOpen, setIsInspeccionHerramientaOpen] = useState(false);
  const [herramientaSeleccionada, setHerramientaSeleccionada] = useState(null);
  const [inspeccionesHerramienta, setInspeccionesHerramienta] = useState([]);

  // --- CONFIGURACIÓN DE VISIBILIDAD DE COLUMNAS ---
  const [showColumnConfig, setShowColumnConfig] = useState(false);
  const [columnasVisibles, setColumnasVisibles] = useState({
    foto: true,
    categoria: true,
    equipo: true, // Obligatorio
    info: true,   // Obligatorio
    contratista: true,
    ingreso: true,
    baja: true,
    area: true,
    horometro: true,
    ultimoServicio: true,
    estatus: true,
    realizadoPor: true,
    acciones: true, // Obligatorio
    trazabilidad: true
  });

  const isInitialMount = useRef(true);

  // Cargar preferencias al montar
  useEffect(() => {
    const saved = localStorage.getItem('recal_maquinaria_columns');
    if (saved) {
      try {
        setColumnasVisibles(prev => ({ ...prev, ...JSON.parse(saved) }));
      } catch (e) {
        console.error("Error al cargar columnas:", e);
      }
    }
  }, []);

  // Guardar preferencias ante cambios
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    localStorage.setItem('recal_maquinaria_columns', JSON.stringify(columnasVisibles));
  }, [columnasVisibles]);

  // Cerrar configuración al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (configRef.current && !configRef.current.contains(event.target)) {
        setShowColumnConfig(false);
      }
    };
    if (showColumnConfig) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showColumnConfig]);

  const toggleColumna = (key) => {
    // Evitar ocultar obligatorias
    if (['equipo', 'info', 'acciones'].includes(key)) return;
    setColumnasVisibles(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const getVisibleCount = () => {
    let count = 0;
    if (columnasVisibles.foto) count++;
    if (columnasVisibles.categoria) count++;
    if (columnasVisibles.equipo) count++;
    if (columnasVisibles.info) count++;
    if (columnasVisibles.contratista) count++;
    if (columnasVisibles.ingreso) count++;
    if (columnasVisibles.baja) count++;
    if (columnasVisibles.area && canSeeBothAreas) count++;
    if (columnasVisibles.horometro) count++;
    if (columnasVisibles.ultimoServicio) count++;
    if (columnasVisibles.estatus) count++;
    if (columnasVisibles.realizadoPor) count++;
    if (columnasVisibles.acciones) count++;
    if (columnasVisibles.trazabilidad && (userRole === 'Admin' || userRole === 'Master')) count++;
    return count;
  };
  const [historial, setHistorial] = useState([]);
  const [formMantenimiento, setFormMantenimiento] = useState({
    fecha_mantenimiento: '', tipo_mantenimiento: 'Preventivo', horometro_mantenimiento: '', observaciones: '', realizado_por: ''
  });
  const [isEditingMantenimiento, setIsEditingMantenimiento] = useState(false);

  const formatDDMMYYYY = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const day = String(date.getUTCDate()).padStart(2, '0');
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    return `${day}/${month}/${date.getUTCFullYear()}`;
  };

  const formatForInput = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const day = String(date.getUTCDate()).padStart(2, '0');
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    return `${date.getUTCFullYear()}-${month}-${day}`;
  };

  useEffect(() => {
    const fetchCatalogos = async () => {
      try {
        const res = await fetch('/api/catalogos/subcontratistas');
        const data = await res.json();
        if (data.success) setCatPrincipales(data.principales);
      } catch (error) {}
    };
    fetchCatalogos();
  }, []);

  const fetchMaquinaria = async () => {
    setLoading(true);
    try {
      let url = `/api/maquinaria?ordenPor=${ordenPor}&ordenDireccion=${ordenDireccion}&`;
      if (userArea) url += `area_usuario=${userArea}&`;
      if (filtroArea) url += `area_filtro=${filtroArea}&`;
      
      if (userArea === 'Medio Ambiente') {
        url += `semana=${exportSemana}&`;
      } else {
        url += `mes=${exportMes}&anio=${exportAnio}&`;
      }

      if (filtroSub) url += `subcontratista=${filtroSub}&`;
      if (filtroTipoUnidad && filtroTipoUnidad !== 'todos') url += `tipo_unidad=${filtroTipoUnidad}&`;
      if (busqueda) url += `busqueda=${encodeURIComponent(busqueda)}&`; 
      
      const res = await fetch(url);
      const json = await res.json();
      if (json.success) setMaquinaria(json.data);
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchMaquinaria(); }, [filtroSub, filtroArea, filtroTipoUnidad, exportMes, exportAnio, exportSemana, userArea, busqueda, ordenPor, ordenDireccion]);
  useEffect(() => { setCurrentPage(1); }, [busqueda, filtroSub, filtroArea, filtroTipoUnidad, exportMes, exportAnio, exportSemana, userArea, ordenPor, ordenDireccion]);

  useEffect(() => {
    if (tableContainerRef.current) tableContainerRef.current.scrollTop = 0;
    if (topRef.current) topRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [currentPage]);

  const totalPages = Math.ceil(maquinaria.length / itemsPerPage);
  
  const getPageNumbers = () => {
    const maxPagesToShow = 5;
    const pages = [];
    if (totalPages <= maxPagesToShow) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      let startPage = Math.max(1, currentPage - 2);
      let endPage = Math.min(totalPages, currentPage + 2);
      if (currentPage <= 3) endPage = 5;
      else if (currentPage >= totalPages - 2) startPage = totalPages - 4;
      for (let i = startPage; i <= endPage; i++) pages.push(i);
    }
    return pages;
  };

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const maquinariaPaginada = maquinaria.slice(indexOfFirstItem, indexOfLastItem);

  const manejarOrden = (columna) => {
    if (ordenPor === columna) {
      setOrdenDireccion(ordenDireccion === 'ASC' ? 'DESC' : 'ASC');
    } else {
      setOrdenPor(columna);
      setOrdenDireccion('ASC'); 
    }
  };

  const handleOpenImportModal = () => {
    setImportFile(null);
    setImportSubcontratista('');
    setImportPreviewData([]);
    setImportError('');
    setImportFase(1);
    setIsImportModalOpen(true);
  };

  const handleAnalizarExcel = async (e) => {
    e.preventDefault();
    if (!importFile || !importSubcontratista) {
      setImportError("Por favor selecciona un archivo y la contratista.");
      return;
    }

    setImporting(true);
    setImportError('');

    const formData = new FormData();
    formData.append('file', importFile);
    formData.append('id_subcontratista_principal', importSubcontratista);

    try {
      const res = await fetch('/api/maquinaria/importar', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setImportPreviewData(data.data);
        setImportResumen({ totales: data.totalesExcel, nuevos: data.nuevos });
        setImportFase(2); 
      } else {
        setImportError(data.error || "Error al procesar el archivo.");
      }
    } catch (error) {
      setImportError("Error de conexión con el servidor.");
    } finally {
      setImporting(false);
    }
  };

  const handleGuardarImportacion = async () => {
    if (importPreviewData.length === 0) return;
    setImporting(true);
    try {
      const res = await fetch('/api/maquinaria/importar', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ maquinarias: importPreviewData }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setIsImportModalOpen(false);
        fetchMaquinaria(); 
        Swal.fire('¡Éxito!', data.mensaje, 'success'); 
      } else {
        setImportError(data.error || "Error al guardar en base de datos.");
      }
    } catch (error) {
      setImportError("Error de conexión al guardar.");
    } finally {
      setImporting(false);
    }
  };

  const handleNewClick = () => {
    setFormData(formInicial); setImageFile(null); setIsEditing(false); setEditId(null); setIsModalOpen(true);
  };

  const handleEditClick = (m) => {
    setFormData({
      num_economico: m.num_economico || '', tipo: m.tipo || '', marca: m.marca || '', 
      anio: m.anio || '', modelo: m.modelo || '', color: m.color || '', 
      serie: m.serie || '', placa: m.placa || '', horometro: m.horometro_actual || '', 
      intervalo_mantenimiento: m.intervalo_mantenimiento || '', 
      fecha_proximo_mantenimiento: m.fecha_proximo_mantenimiento ? formatForInput(m.fecha_proximo_mantenimiento) : '',
      fecha_ingreso_obra: formatForInput(m.fecha_ingreso_obra), 
      id_subcontratista: m.id_subcontratista || '', 
      area: m.area || (userArea === 'Medio Ambiente' ? 'ambiental' : 'seguridad'),
      tipo_unidad: m.tipo_unidad || 'maquinaria',
      horometro_inicial: m.horometro_inicial || '',
      imagen_url_actual: m.imagen_url || ''
    });
    setImageFile(null); setEditId(m.id_maquinaria); setIsEditing(true); setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true);
    const submitData = new FormData();
    Object.keys(formData).forEach(key => submitData.append(key, formData[key]));
    if (isEditing) submitData.append('id_maquinaria', editId);
    if (imageFile) submitData.append('imagen', imageFile);

    try {
      const method = isEditing ? 'PUT' : 'POST';
      const res = await fetch('/api/maquinaria', { method, body: submitData });
      const data = await res.json();
      if (data.success) { 
        setIsModalOpen(false); setImageFile(null); fetchMaquinaria(); 
        Swal.fire('Guardado', 'Los datos de la maquinaria/equipo se guardaron correctamente.', 'success');
      } else Swal.fire('Error', data.error, 'error');
    } catch (error) { Swal.fire('Error', 'Error al guardar los datos de la maquinaria/equipo.', 'error'); } finally { setSaving(false); }
  };

  const handleBajaClick = (id) => {
    setBajaId(id); setBajaFecha(new Date().toISOString().split('T')[0]); setIsBajaModalOpen(true);
  };

  const handleBajaSubmit = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      const res = await fetch('/api/maquinaria', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_maquinaria: bajaId, fecha_baja: bajaFecha })
      });
      const data = await res.json();
      if (data.success) { 
        setIsBajaModalOpen(false); fetchMaquinaria(); 
        Swal.fire('Baja Confirmada', 'La maquinaria ha sido dada de baja correctamente.', 'success');
      } else Swal.fire('Error', data.error, 'error');
    } catch (error) { Swal.fire('Error', 'Error de conexión al procesar la baja.', 'error'); } finally { setSaving(false); }
  };

  const abrirHistorial = async (maquina) => {
    setMaquinaSeleccionada(maquina);
    setFormMantenimiento({ fecha_mantenimiento: '', tipo_mantenimiento: 'Preventivo', horometro_mantenimiento: '', observaciones: '', realizado_por: '' });
    setIsEditingMantenimiento(false); // Reiniciar estado de edición
    setIsHistorialOpen(true);
    try {
      const res = await fetch(`/api/maquinaria/mantenimiento?id_maquinaria=${maquina.id_maquinaria}`);
      const data = await res.json();
      if (data.success) setHistorial(data.data);
    } catch (error) {}
  };

  const handlePrepEditMantenimiento = (m) => {
    setFormMantenimiento({
      id_mantenimiento: m.id_mantenimiento,
      fecha_mantenimiento: formatForInput(m.fecha_mantenimiento),
      tipo_mantenimiento: m.tipo_mantenimiento,
      horometro_mantenimiento: m.horometro_mantenimiento || '',
      realizado_por: m.realizado_por || '',
      observaciones: m.observaciones || ''
    });
    setIsEditingMantenimiento(true);
  };

  const handleCancelEditMantenimiento = () => {
    setFormMantenimiento({ 
      fecha_mantenimiento: '', 
      tipo_mantenimiento: 'Preventivo', 
      horometro_mantenimiento: '', 
      observaciones: '', 
      realizado_por: '' 
    });
    setIsEditingMantenimiento(false);
  };

  const handleDeleteMantenimiento = async (id) => {
    const result = await Swal.fire({
      title: '¿Estás seguro?',
      text: "Esta acción eliminará el registro de mantenimiento permanentemente.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
      setSaving(true);
      try {
        const res = await fetch(`/api/maquinaria/mantenimiento?id=${id}`, { method: 'DELETE' });
        const data = await res.json();
        if (data.success) {
          abrirHistorial(maquinaSeleccionada);
          fetchMaquinaria();
          Swal.fire('Eliminado', 'El registro ha sido eliminado.', 'success');
        }
      } catch (error) {
        Swal.fire('Error', 'No se pudo eliminar el registro.', 'error');
      } finally {
        setSaving(false);
      }
    }
  };

  const abrirInspeccionHerramienta = async (herramienta) => {
    setHerramientaSeleccionada(herramienta);
    setInspeccionesHerramienta([]); // Limpiar historial anterior para evitar datos estancados
    setIsEditingMantenimiento(false); // Reset de estado por si acaso
    setIsInspeccionHerramientaOpen(true);
    try {
      const res = await fetch(
        `/api/maquinaria/inspecciones-herramienta?id_maquinaria=${herramienta.id_maquinaria}&mes=${parseInt(exportMes)}&anio=${exportAnio}`
      );
      // Obtenemos TODO el historial de esta herramienta (sin filtro de periodo)
      const resAll = await fetch(
        `/api/maquinaria/inspecciones-herramienta?id_maquinaria=${herramienta.id_maquinaria}&mes=0&anio=0`
      );
      // Usamos el endpoint general que devuelve todas si mes=0
      const dataAll = await resAll.json();
      if (dataAll.success && Array.isArray(dataAll.data)) {
        setInspeccionesHerramienta(dataAll.data);
      } else {
        // Si el endpoint no soporta mes=0, cargamos solo la del periodo actual
        const data = await res.json();
        setInspeccionesHerramienta(data.data ? [data.data] : []);
      }
    } catch (error) { setInspeccionesHerramienta([]); }
  };

  const handleGuardarInspeccion = async (payload) => {
    setSaving(true);
    try {
      const res = await fetch('/api/maquinaria/inspecciones-herramienta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        Swal.fire('Inspección Guardada', 'La inspección visual se guardó correctamente.', 'success');
        abrirInspeccionHerramienta(herramientaSeleccionada); // refrescar historial
      } else {
        Swal.fire('Error', data.error || 'No se pudo guardar la inspección', 'error');
      }
    } catch (error) {
      Swal.fire('Error', 'Problema de conexión al guardar', 'error');
    } finally { setSaving(false); }
  };

  // Alias: abre historial de mtto para maquinaria/vehículo/equipo,
  // e inspecciones para herramientas
  const handleHistorialOpen = (maquina) => {
    if (maquina.tipo_unidad === 'herramienta') {
      abrirInspeccionHerramienta(maquina);
    } else {
      abrirHistorial(maquina);
    }
  };

  const handleMantenimientoSubmit = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      // VALIDACIÓN: Alertar si el horómetro ingresado es mayor al actual
      if (formMantenimiento.horometro_mantenimiento && !isEditingMantenimiento) {
        const hIngresado = Number(formMantenimiento.horometro_mantenimiento);
        const hActual = Number(maquinaSeleccionada.horometro_actual || 0);

        if (hIngresado > hActual) {
          const result = await Swal.fire({
            title: '¿Lectura Inconsistente?',
            text: `El horómetro/kilometraje ingresado (${hIngresado}) es MAYOR al horómetro actual del equipo (${hActual}). ¿Deseas guardar de todos modos?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: 'var(--recal-blue)',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Sí, guardar',
            cancelButtonText: 'Corregir'
          });

          if (!result.isConfirmed) {
            setSaving(false);
            return;
          }
        }
      }

      const method = isEditingMantenimiento ? 'PUT' : 'POST';
      const res = await fetch('/api/maquinaria/mantenimiento', {
        method, 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formMantenimiento, id_maquinaria: maquinaSeleccionada.id_maquinaria })
      });
      const data = await res.json();
      if (data.success) { 
        abrirHistorial(maquinaSeleccionada); 
        fetchMaquinaria(); 
        setIsEditingMantenimiento(false);
        setFormMantenimiento({ fecha_mantenimiento: '', tipo_mantenimiento: 'Preventivo', horometro_mantenimiento: '', observaciones: '', realizado_por: '' });
        Swal.fire(isEditingMantenimiento ? 'Actualizado' : 'Registrado', data.mensaje, 'success');
      } else {
        Swal.fire('Error', data.error || 'No se pudo procesar el servicio', 'error');
      }
    } catch (error) { Swal.fire('Error', 'Problema de conexión al guardar el servicio', 'error'); } finally { setSaving(false); }
  };

  const renderBadge = (m) => {
    const badges = [];

    // 1. Estatus por Horas / Kilometraje (Maquinaria Pesada / Vehículos)
    if (m.estado_mantenimiento && m.estado_mantenimiento !== 'N/A') {
      let colorClass = "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300";
      if (m.estado_mantenimiento === 'Vencido') colorClass = "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 animate-pulse";
      else if (m.estado_mantenimiento === 'Próximo') colorClass = "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300";
      
      const label = m.estado_mantenimiento === 'Vencido' 
        ? `Vencido por ${Math.abs(m.horas_restantes).toFixed(2)} ${m.tipo_unidad === 'vehiculo' ? 'km' : 'hrs'}` 
        : `Faltan ${Number(m.horas_restantes).toFixed(2)} ${m.tipo_unidad === 'vehiculo' ? 'km' : 'hrs'}`;

      badges.push(
        <span key="horas" className={`px-2 py-0.5 inline-flex text-[10px] leading-4 font-black rounded-md shadow-sm uppercase border border-current opacity-90 ${colorClass}`}>
          {label}
        </span>
      );
    }

    // 2. Estatus por Fecha Programada
    if (m.fecha_proximo_mantenimiento) {
      // Parsear la fecha manualmente para evitar desfases de zona horaria (UTC vs Local)
      const dateParts = String(m.fecha_proximo_mantenimiento).split(/[-T ]/);
      const y = parseInt(dateParts[0]);
      const mesP = parseInt(dateParts[1]);
      const d = parseInt(dateParts[2]);
      
      const fechaProx = new Date(y, mesP - 1, d); // Fecha local exacta
      const mesFiltro = parseInt(exportMes) - 1;
      const anioFiltro = parseInt(exportAnio);
      const fechaReferencia = new Date(anioFiltro, mesFiltro, 1);
      
      const esVencido = fechaProx < fechaReferencia;
      const esMesActual = fechaProx.getMonth() === mesFiltro && fechaProx.getFullYear() === anioFiltro;

      let dateColor = "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800";
      let statusText = "Programado";

      if (esVencido) {
        dateColor = "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800 animate-pulse";
        statusText = "Vencido";
      } else if (esMesActual) {
        dateColor = "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-300 dark:border-orange-800";
        statusText = "Toca este mes";
      }

      badges.push(
        <span key="fecha" className={`px-2 py-0.5 inline-flex text-[10px] leading-4 font-black rounded-md shadow-sm uppercase border ${dateColor}`}>
          {statusText}: {formatDDMMYYYY(m.fecha_proximo_mantenimiento)}
        </span>
      );
    }

    if (badges.length === 0) return <span className="text-gray-400 dark:text-gray-500 text-[10px] font-bold uppercase">No aplica</span>;

    return (
      <div className="flex flex-col items-center md:items-center gap-1.5 py-1">
        {badges}
      </div>
    );
  };

  const limpiarFiltros = () => { 
    setFiltroSub(''); 
    setBusqueda('');
    setFiltroArea('');
    setFiltroTipoUnidad('todos');
  };

  const handleGenerarInspeccion = (id_maquina) => {
    window.open(`/api/maquinaria/exportar-inspeccion?id=${id_maquina}&mes=${exportMes}&anio=${exportAnio}`, '_blank');
  };

  const handleExportarUtilizacion = (e) => {
    e.preventDefault();
    const endpoint = userArea === 'Medio Ambiente' ? '/api/maquinaria/ambiental/exportar-utilizacion' : '/api/maquinaria/exportar-utilizacion';
    const url = `${endpoint}?mes=${exportMes}&anio=${exportAnio}&area_usuario=${userArea}&tipo_unidad=${filtroTipoUnidad}`;
    
    const maquinasActivasSinFoto = maquinaria.filter(m => !m.fecha_baja && !m.imagen_url);
    
    if (maquinasActivasSinFoto.length > 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Equipos sin fotografía',
        text: `Tienes ${maquinasActivasSinFoto.length} equipos activos que no cuentan con fotografía. Los recuadros de las imágenes aparecerán vacíos en el Excel. ¿Deseas descargar el reporte de Utilización de todas formas?`,
        showCancelButton: true,
        confirmButtonText: 'Sí, descargar',
        cancelButtonText: 'Cancelar'
      }).then((result) => {
        if (result.isConfirmed) {
          window.open(url, '_blank');
        }
      });
    } else {
      window.open(url, '_blank');
    }
  };
  return (
    <>
    <div className="max-w-[100rem] mx-auto p-4 md:p-6 lg:p-8 space-y-6 animate-in fade-in duration-500" ref={topRef}>
      <div className="bg-white/90 dark:bg-slate-800/80 backdrop-blur-xl rounded-[2.5rem] p-6 lg:p-8 shadow-xl shadow-gray-200/50 dark:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.6)] border border-white/80 dark:border-slate-700/50">
        
        {/* HERO BENTO HEADER */}
        <div className="flex flex-col md:flex-row items-start md:items-center gap-6 mb-8 border-b border-gray-100 dark:border-slate-700/50 pb-6">
           <div className="w-16 h-16 bg-gradient-to-br from-orange-400 to-orange-600 rounded-2xl shadow-lg shadow-orange-500/30 flex items-center justify-center text-white shrink-0">
             <Tractor className="w-8 h-8" />
           </div>
           <div>
             <h1 className="text-3xl font-black text-gray-800 dark:text-white tracking-tight leading-none mb-2">Maquinaria e Inventario Operativo</h1>
             <p className="text-gray-500 dark:text-gray-400 font-medium text-sm md:text-base">Listado, códigos QR interactivos e historiales de mantenimiento de campo.</p>
           </div>
        </div>

        <div className="space-y-6 relative">
      
      {/* BOTONES RESPONSIVOS */}
      <div className="flex flex-col lg:flex-row justify-end items-start lg:items-center space-y-4 lg:space-y-0">
        
        <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2 w-full lg:w-auto">
          
          {canManageMaquinaria && (
            <button onClick={handleOpenImportModal} className="flex-1 sm:flex-none justify-center bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded-md font-bold shadow-sm transition-colors text-xs sm:text-sm flex items-center">
              <Upload className="w-4 h-4 mr-1 sm:mr-2" /> Importar Excel
            </button>
          )}

          {/* --- AJUSTE: MUESTRA SEMANA PARA AMBIENTAL, MES/AÑO PARA LOS DEMÁS --- */}
          {userArea === 'Medio Ambiente' ? (
            <div className="flex items-center justify-between sm:justify-start space-x-1 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 p-1 rounded-md shadow-sm w-full sm:w-auto">
              <input 
                type="week" 
                className="text-sm bg-transparent border-none dark:text-gray-200 rounded py-1 px-2 focus:ring-[var(--recal-blue)] outline-none flex-1 sm:flex-none" 
                value={exportSemana} 
                onChange={(e) => setExportSemana(e.target.value)} 
                title="Semana de Inspección"
              />
            </div>
          ) : (
            <div className="flex items-center justify-between sm:justify-start space-x-1 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 p-1 rounded-md shadow-sm w-full sm:w-auto">
              <select className="text-sm bg-transparent border-gray-300 dark:border-slate-600 dark:text-gray-200 rounded py-1 pl-2 pr-6 focus:ring-[var(--recal-blue)] outline-none flex-1 sm:flex-none" value={exportMes} onChange={(e) => setExportMes(e.target.value)}>
                <option value="01">Ene</option><option value="02">Feb</option><option value="03">Mar</option><option value="04">Abr</option>
                <option value="05">May</option><option value="06">Jun</option><option value="07">Jul</option><option value="08">Ago</option>
                <option value="09">Sep</option><option value="10">Oct</option><option value="11">Nov</option><option value="12">Dic</option>
              </select>
              <select className="text-sm bg-transparent border-gray-300 dark:border-slate-600 dark:text-gray-200 rounded py-1 pl-2 pr-6 focus:ring-[var(--recal-blue)] outline-none flex-1 sm:flex-none" value={exportAnio} onChange={(e) => setExportAnio(e.target.value)}>
                <option value="2024">2024</option><option value="2025">2025</option><option value="2026">2026</option><option value="2027">2027</option>
              </select>
            </div>
          )}
          {(userArea === 'Medio Ambiente' || userRole === 'Master') && (
            <button onClick={() => window.open(`/api/maquinaria/exportar-inspecciones-masivas?mes=${exportMes}&anio=${exportAnio}`, '_blank')} className="flex-1 sm:flex-none justify-center bg-teal-600 hover:bg-teal-700 text-white px-3 py-2 rounded-md font-bold shadow-sm transition-colors text-xs sm:text-sm flex items-center">
              <FolderDown className="w-4 h-4 mr-1 sm:mr-2" /> ZIP Inspecciones
            </button>
          )}
          <div className="flex gap-1 w-full sm:w-auto">
            <button onClick={handleExportarUtilizacion} className="flex-1 sm:flex-none justify-center bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-md font-bold shadow-sm transition-colors text-xs sm:text-sm flex items-center">
              <span className="mr-1">📊</span> <span className="hidden sm:inline">Utilización</span><span className="sm:hidden">Util</span>
            </button>
            <button 
              onClick={() => {
                const endpoint = userArea === 'Medio Ambiente' ? '/api/maquinaria/ambiental/exportar-plan-servicio' : '/api/maquinaria/exportar-plan-servicio';
                window.open(`${endpoint}?mes=${exportMes}&anio=${exportAnio}&area_usuario=${userArea}&tipo_unidad=${filtroTipoUnidad}`, '_blank');
              }} 
              className="flex-1 sm:flex-none justify-center bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-md font-bold shadow-sm transition-colors text-xs sm:text-sm flex items-center"
            >
              <span className="mr-1">🛠️</span> <span className="hidden sm:inline">Servicio</span><span className="sm:hidden">Serv</span>
            </button>
          </div>
          
          {/* Badge de color de inspección - solo visible al filtrar herramientas */}
          {filtroTipoUnidad === 'herramienta' && (() => {
            const colorInfo = COLOR_INSPECCION_POR_MES[exportMes];
            if (!colorInfo) return null;
            return (
              <div className={`flex items-center gap-2 px-3 py-2 rounded-md border-2 ${colorInfo.bg} ${colorInfo.border} shadow-sm`}>
                <span className={`text-xs font-black uppercase ${colorInfo.text}`}>🔍 INSPECCIÓN {exportMes}/{exportAnio}</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-black border ${colorInfo.bg} ${colorInfo.border} ${colorInfo.text} shadow`}>
                  {colorInfo.nombre}
                </span>
              </div>
            );
          })()}
          
          {canManageMaquinaria && (
            <button onClick={handleNewClick} className="w-full sm:w-auto bg-[var(--recal-blue)] hover:bg-[var(--recal-blue-hover)] text-white px-4 py-3 sm:py-2 rounded-md font-medium shadow-sm lg:ml-2">
              + Nuevo
            </button>
          )}
        </div>
      </div>

      {/* PANEL DE FILTROS Y BÚSQUEDA */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className={`lg:col-span-${canSeeBothAreas ? '3' : '5'}`}>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">Buscar Equipo</label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">🔍</span>
            <input type="text" placeholder="Num Eco, Serie, Marca, Placa..." 
              className="w-full pl-10 bg-transparent border border-gray-300 dark:border-slate-600 dark:text-white rounded-md p-2 shadow-sm focus:ring-[var(--recal-blue)] outline-none sm:text-sm"
              value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
          </div>
        </div>
        <div className="lg:col-span-2">
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">Tipo de Unidad</label>
          <select className="w-full bg-transparent border border-gray-300 dark:border-slate-600 dark:text-white rounded-md p-2 shadow-sm focus:ring-[var(--recal-blue)] outline-none sm:text-sm" 
            value={filtroTipoUnidad} onChange={(e) => setFiltroTipoUnidad(e.target.value)}>
            <option value="todos">Todos los tipos</option>
            <option value="maquinaria">Maquinaria</option>
            <option value="equipo">Equipo Menor</option>
            <option value="herramienta">Herramienta</option>
            <option value="vehiculo">Vehículo</option>
          </select>
        </div>
        <div className="lg:col-span-3">
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">Filtrar por Contratista</label>
          <select className="w-full bg-transparent border border-gray-300 dark:border-slate-600 dark:text-white rounded-md p-2 shadow-sm focus:ring-[var(--recal-blue)] outline-none sm:text-sm" 
            value={filtroSub} onChange={(e) => setFiltroSub(e.target.value)}>
            <option value="">Todo el equipo en obra...</option>
            {catPrincipales && catPrincipales.map(empresa => <option key={empresa.id_subcontratista} value={empresa.id_subcontratista}>{empresa.razon_social}</option>)}
          </select>
        </div>
        {canSeeBothAreas && (
          <div className="lg:col-span-2">
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">Filtrar por Área</label>
            <select className="w-full bg-transparent border border-gray-300 dark:border-slate-600 dark:text-white rounded-md p-2 shadow-sm focus:ring-[var(--recal-blue)] outline-none sm:text-sm" 
              value={filtroArea} onChange={(e) => setFiltroArea(e.target.value)}>
              <option value="">Ambas Áreas</option>
              <option value="seguridad">Seguridad</option>
              <option value="ambiental">Medio Ambiente</option>
            </select>
          </div>
        )}
        <div className="lg:col-span-2 flex items-end gap-2">
          <button onClick={limpiarFiltros} className="flex-1 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-700 dark:text-gray-200 px-4 py-2 rounded-md font-medium sm:text-sm transition-colors border border-gray-300 dark:border-slate-600">
            Limpiar Todo
          </button>
          
          {/* Botón Configurador de Columnas */}
          <div className="relative" ref={configRef}>
            <button 
              onClick={() => setShowColumnConfig(!showColumnConfig)}
              className={`p-2 rounded-md border transition-all ${showColumnConfig ? 'bg-orange-100 border-orange-300 text-orange-600' : 'bg-gray-100 border-gray-300 text-gray-600 hover:bg-gray-200 dark:bg-slate-700 dark:border-slate-600 dark:text-gray-300'}`}
              title="Configurar Columnas"
            >
              <Settings className={`w-5 h-5 ${showColumnConfig ? 'animate-spin-slow' : ''}`} />
            </button>

            {showColumnConfig && (
              <div className="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-gray-100 dark:border-slate-700 p-4 z-[9999] animate-in slide-in-from-top-2 duration-200">
                <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-100 dark:border-slate-700">
                  <span className="text-sm font-bold text-gray-800 dark:text-white flex items-center">
                    <Eye className="w-4 h-4 mr-2" /> Columnas Visibles
                  </span>
                  <button onClick={() => setShowColumnConfig(false)} className="text-gray-400 hover:text-gray-600">&times;</button>
                </div>
                <div className="space-y-1.5 max-h-[40vh] overflow-y-auto custom-scrollbar">
                  {[
                    { id: 'foto', label: 'Imagen' },
                    { id: 'categoria', label: 'Categoría' },
                    { id: 'equipo', label: 'Equipo', mandatory: true },
                    { id: 'info', label: 'Info', mandatory: true },
                    { id: 'contratista', label: 'Contratista' },
                    { id: 'ingreso', label: 'Fecha Ingreso' },
                    { id: 'baja', label: 'Fecha Baja' },
                    { id: 'area', label: 'Área Asignada', permission: canSeeBothAreas },
                    { id: 'horometro', label: 'Horómetro' },
                    { id: 'ultimoServicio', label: 'Último Servicio' },
                    { id: 'estatus', label: 'Estatus' },
                    { id: 'realizadoPor', label: 'Realizado por' },
                    { id: 'trazabilidad', label: 'Trazabilidad', permission: (userRole === 'Admin' || userRole === 'Master') },
                    { id: 'acciones', label: 'Acciones', mandatory: true },
                  ].map(col => {
                    if (col.permission === false) return null;
                    return (
                      <label key={col.id} className={`flex items-center p-2 rounded-lg cursor-pointer transition-colors ${col.mandatory ? 'bg-gray-50 dark:bg-slate-900/50 opacity-80 cursor-not-allowed' : 'hover:bg-gray-50 dark:hover:bg-slate-700/50'}`}>
                        <input 
                          type="checkbox" 
                          className="w-4 h-4 rounded text-orange-500 focus:ring-orange-500 border-gray-300"
                          checked={columnasVisibles[col.id]}
                          disabled={col.mandatory}
                          onChange={() => toggleColumna(col.id)}
                        />
                        <span className="ml-3 text-sm font-medium text-gray-700 dark:text-gray-300">
                          {col.label} {col.mandatory && <span className="text-[10px] text-gray-400 font-normal">(Oblig.)</span>}
                        </span>
                        {columnasVisibles[col.id] && <Check className="w-3 h-3 ml-auto text-green-500" />}
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* TABLA PRINCIPAL */}
      <div className="bg-white dark:bg-slate-800 shadow-sm rounded-lg border border-gray-200 dark:border-slate-700 overflow-hidden">
        <div className="overflow-auto max-h-[75vh] custom-scrollbar" ref={tableContainerRef}>
          <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700 relative">
            <thead className="bg-gray-50 dark:bg-slate-900 hidden md:table-header-group sticky top-0 z-10 shadow-sm outline outline-1 outline-gray-200 dark:outline-slate-700">
              <tr>
                {columnasVisibles.foto && <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Imagen</th>}
                
                {columnasVisibles.categoria && (
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors" onClick={() => manejarOrden('tipo_unidad')}>
                    Categoría {ordenPor === 'tipo_unidad' && (ordenDireccion === 'ASC' ? '↑' : '↓')}
                  </th>
                )}

                {columnasVisibles.equipo && (
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors" onClick={() => manejarOrden('tipo')}>
                    Equipo {ordenPor === 'tipo' && (ordenDireccion === 'ASC' ? '↑' : '↓')}
                  </th>
                )}

                {columnasVisibles.info && (
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors" onClick={() => manejarOrden('marca')}>
                    Info {ordenPor === 'marca' && (ordenDireccion === 'ASC' ? '↑' : '↓')}
                  </th>
                )}

                {columnasVisibles.contratista && (
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors" onClick={() => manejarOrden('nombre_subcontratista')}>
                    Contratista {ordenPor === 'nombre_subcontratista' && (ordenDireccion === 'ASC' ? '↑' : '↓')}
                  </th>
                )}

                {columnasVisibles.ingreso && (
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors" onClick={() => manejarOrden('fecha_ingreso_obra')}>
                    Ingreso {ordenPor === 'fecha_ingreso_obra' && (ordenDireccion === 'ASC' ? '↑' : '↓')}
                  </th>
                )}

                {columnasVisibles.baja && (
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors" onClick={() => manejarOrden('fecha_baja')}>
                    Baja {ordenPor === 'fecha_baja' && (ordenDireccion === 'ASC' ? '↑' : '↓')}
                  </th>
                )}
                
                {columnasVisibles.area && canSeeBothAreas && (
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors" onClick={() => manejarOrden('area')}>
                    Área {ordenPor === 'area' && (ordenDireccion === 'ASC' ? '↑' : '↓')}
                  </th>
                )}

                {columnasVisibles.horometro && (
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors" onClick={() => manejarOrden('horometro_actual')}>
                    {filtroTipoUnidad === 'vehiculo' ? 'Kilometraje' : 'Horómetro'} {ordenPor === 'horometro_actual' && (ordenDireccion === 'ASC' ? '↑' : '↓')}
                  </th>
                )}

                {columnasVisibles.ultimoServicio && (
                  <th className="px-4 py-3 text-center text-xs font-medium text-[var(--recal-blue)] dark:text-blue-400 uppercase">
                    {filtroTipoUnidad === 'herramienta' ? 'Última Inspección' : 'Último Servicio'}
                  </th>
                )}

                {columnasVisibles.estatus && (
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Estatus</th>
                )}

                {columnasVisibles.realizadoPor && (
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Realizado por</th>
                )}

                {columnasVisibles.acciones && <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Acciones</th>}
                
                {columnasVisibles.trazabilidad && (userRole === 'Admin' || userRole === 'Master') && (
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Trazabilidad</th>
                )}
              </tr>
            </thead>
            
            <tbody className="bg-white dark:bg-slate-800 divide-y md:divide-y-0 md:divide-gray-200 dark:md:divide-slate-700 block md:table-row-group">
              {loading ? (
                <tr className="block md:table-row"><td colSpan={getVisibleCount()} className="px-6 py-8 text-center text-sm text-gray-500 dark:text-gray-400 block md:table-cell">Cargando inventario...</td></tr>
              ) : maquinaria.length === 0 ? (
                <tr className="block md:table-row">
                  <td colSpan={getVisibleCount()} className="px-6 py-12 text-center block md:table-cell">
                    <div className="text-gray-400 dark:text-gray-500 text-4xl mb-2">🔍</div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-200">No se han encontrado resultados</p>
                  </td>
                </tr>
              ) : maquinariaPaginada.map((m) => (
                  <tr key={m.id_maquinaria} className="block md:table-row border border-gray-200 dark:border-slate-700 md:border-none mb-4 md:mb-0 rounded-lg shadow-sm md:shadow-none p-4 md:p-0 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
                    
                {columnasVisibles.foto && (
                  <td className="flex justify-between items-center md:table-cell px-2 md:px-4 py-2 md:py-4 border-b dark:border-slate-700 md:border-none">
                    <span className="md:hidden font-bold text-gray-500 dark:text-gray-400 text-sm">Foto:</span>
                    <div className="flex-shrink-0 h-12 w-12 md:h-10 md:w-10 mx-auto md:mx-0">
                      {m.imagen_url ? (
                        <img className="h-12 w-12 md:h-10 md:w-10 rounded-md object-cover border border-gray-200 dark:border-slate-600" src={m.imagen_url} alt="" />
                      ) : (
                        <div className="h-12 w-12 md:h-10 md:w-10 rounded-full bg-gray-100 dark:bg-slate-700 flex items-center justify-center border border-gray-200 dark:border-slate-600 text-gray-400 dark:text-gray-500">🚜</div>
                      )}
                    </div>
                  </td>
                )}
                
                {columnasVisibles.categoria && (
                  <td className="flex justify-between items-center md:table-cell px-2 md:px-4 py-2 md:py-4 text-xs font-bold uppercase text-gray-600 dark:text-gray-400 border-b dark:border-slate-700 md:border-none">
                    <span className="md:hidden font-bold">Categoría:</span>
                    <div className="flex flex-col items-end md:items-start gap-1">
                      <span className="px-1.5 py-0.5 bg-gray-100 dark:bg-slate-700 rounded border border-gray-200 dark:border-slate-600">{m.tipo_unidad === 'equipo' ? 'Equipo Menor' : (m.tipo_unidad || 'N/A')}</span>
                      {/* Badge de inspección sólo en herramientas */}
                      {m.tipo_unidad === 'herramienta' && (() => {
                        const colorInfo = COLOR_INSPECCION_POR_MES[exportMes];
                        if (!colorInfo) return null;
                        return (
                          <span className={`px-1.5 py-0.5 rounded border text-[10px] font-black flex items-center gap-1 ${colorInfo.bg} ${colorInfo.border} ${colorInfo.text}`}>
                            🔍 {colorInfo.nombre}
                          </span>
                        );
                      })()}
                    </div>
                  </td>
                )}

                {columnasVisibles.equipo && (
                  <td className="flex justify-between items-center md:table-cell px-2 md:px-4 py-2 md:py-4 text-sm font-bold text-[var(--recal-blue)] dark:text-blue-400 md:text-gray-900 dark:md:text-white border-b dark:border-slate-700 md:border-none">
                    <span className="md:hidden font-bold text-gray-500 dark:text-gray-400">Equipo:</span>
                    <span>{m.tipo}</span>
                  </td>
                )}
                
                {columnasVisibles.info && (
                  <td className="flex justify-between items-start md:table-cell px-2 md:px-4 py-2 md:py-4 text-sm border-b dark:border-slate-700 md:border-none">
                    <span className="md:hidden font-bold text-gray-500 dark:text-gray-400 mt-1">Info:</span>
                    <div className="flex flex-col sm:items-start items-end gap-1">
                      <span className="text-sm font-bold text-gray-900 dark:text-gray-200 bg-gray-100 dark:bg-slate-700 px-1.5 py-0.5 rounded w-fit">Marca: {m.marca || 'S/N'}</span>
                      <span className="text-sm font-bold text-gray-900 dark:text-gray-200 bg-gray-100 dark:bg-slate-700 px-1.5 py-0.5 rounded w-fit">Modelo: {m.modelo || 'S/N'}</span>
                      <span className="text-xs font-bold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-slate-700 px-1.5 py-0.5 rounded w-fit">Num. Eco: {m.num_economico || 'S/N'}</span>
                      <span className="text-xs font-bold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-slate-700 px-1.5 py-0.5 rounded w-fit">Serie: {m.serie || 'S/N'}</span>
                    </div>
                  </td>
                )}
                    
                {columnasVisibles.contratista && (
                  <td className="flex justify-between items-center md:table-cell px-2 md:px-4 py-2 md:py-4 text-sm text-gray-500 dark:text-gray-300 border-b dark:border-slate-700 md:border-none">
                    <span className="md:hidden font-bold text-gray-500 dark:text-gray-400">Contratista:</span>
                    <span>{m.nombre_subcontratista || '-'}</span>
                  </td>
                )}

                {columnasVisibles.ingreso && (
                  <td className="flex justify-between items-center md:table-cell px-2 md:px-4 py-2 md:py-4 text-sm text-gray-500 dark:text-gray-300 border-b dark:border-slate-700 md:border-none">
                    <span className="md:hidden font-bold text-gray-500 dark:text-gray-400">Ingreso:</span>
                    <span>{formatDDMMYYYY(m.fecha_ingreso_obra)}</span>
                  </td>
                )}

                {columnasVisibles.baja && (
                  <td className="flex justify-between items-center md:table-cell px-2 md:px-4 py-2 md:py-4 text-sm text-gray-500 dark:text-gray-300 border-b dark:border-slate-700 md:border-none">
                    <span className="md:hidden font-bold text-gray-500 dark:text-gray-400">Baja:</span>
                    <span>{m.fecha_baja ? formatDDMMYYYY(m.fecha_baja) : '-'}</span>
                  </td>
                )}

                {columnasVisibles.area && canSeeBothAreas && (
                  <td className="flex justify-between items-center md:table-cell px-2 md:px-4 py-2 md:py-4 text-center border-b dark:border-slate-700 md:border-none">
                    <span className="md:hidden font-bold text-gray-500 dark:text-gray-400 text-sm">Área:</span>
                    <span className={`px-2 py-1 inline-flex text-[10px] uppercase font-bold rounded shadow-sm border ${m.area === 'ambiental' ? 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800/50' : 'bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-900/50 dark:text-slate-300 dark:border-slate-700/50'}`}>
                      {m.area === 'ambiental' ? 'Medio Ambiente' : 'Seguridad'}
                    </span>
                  </td>
                )}
                    
                {columnasVisibles.horometro && (
                  <td className="flex justify-between items-center md:table-cell px-2 md:px-4 py-2 md:py-4 border-b dark:border-slate-700 md:border-none">
                    <span className="md:hidden font-bold text-gray-500 dark:text-gray-400 text-sm">Horómetro:</span>
                    <div className="flex flex-col items-end md:items-center">
                      {(m.tipo_unidad === 'herramienta' || m.tipo_unidad === 'equipo') ? (
                        <span className="text-gray-400 dark:text-gray-500 text-xs font-bold uppercase italic">N/A</span>
                      ) : (
                        <div className="bg-gray-50 dark:bg-slate-900/50 p-1.5 rounded-lg border border-gray-100 dark:border-slate-700/50 min-w-[120px]">
                          <div className="flex justify-between gap-4 text-[10px] text-gray-400 dark:text-gray-500 uppercase font-black">
                            <span>{m.tipo_unidad === 'vehiculo' ? 'Km Inicial' : 'Inicial'}</span>
                            <span className="text-gray-600 dark:text-gray-300">{Number(m.horometro_inicial || 0).toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between gap-4 text-[10px] text-gray-400 dark:text-gray-500 uppercase font-black border-y border-gray-100 dark:border-slate-700/50 my-0.5 py-0.5">
                            <span>{m.tipo_unidad === 'vehiculo' ? 'Mtto Ant. km' : 'Mtto Ant.'}</span>
                            <span className="text-blue-600 dark:text-blue-400">{Number(m.ultimo_horometro_mantenimiento || 0).toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between gap-4 text-[11px] text-gray-400 dark:text-gray-500 uppercase font-black">
                            <span>{m.tipo_unidad === 'vehiculo' ? 'Km Actual' : 'Actual'}</span>
                            <span className="text-orange-600 dark:text-orange-400 font-bold">{Number(m.horometro_actual || 0).toFixed(2)}</span>
                          </div>
                          
                          {/* Campo Restante (Solo para Seguridad) */}
                          {m.area === 'seguridad' && m.intervalo_mantenimiento > 0 && (
                            <div className="flex justify-between gap-4 text-[10px] mt-1 pt-0.5 border-t border-dashed border-gray-200 dark:border-slate-700 uppercase font-black italic">
                              <span className="text-gray-400">Restante:</span>
                              <span className={`${
                                (Number(m.ultimo_horometro_mantenimiento || 0) + Number(m.intervalo_mantenimiento)) - Number(m.horometro_actual || 0) <= 24 
                                  ? 'text-red-600 dark:text-red-400' 
                                  : 'text-indigo-600 dark:text-indigo-400'
                              }`}>
                                {((Number(m.ultimo_horometro_mantenimiento || 0) + Number(m.intervalo_mantenimiento)) - Number(m.horometro_actual || 0)).toFixed(2)}
                              </span>
                            </div>
                          )}

                          <div className="text-[9px] text-center mt-1 text-gray-400 italic">
                            ({m.tipo_unidad === 'vehiculo' ? 'km' : 'hrs'})
                          </div>
                        </div>
                      )}
                    </div>
                  </td>
                )}
                    
                {columnasVisibles.ultimoServicio && (
                  <td className="flex justify-between items-center md:table-cell px-2 md:px-4 py-2 md:py-4 border-b dark:border-slate-700 md:border-none">
                    <span className="md:hidden font-bold text-gray-500 dark:text-gray-400 text-sm">
                      {m.tipo_unidad === 'herramienta' ? 'Última Inspección:' : 'Último Servicio:'}
                    </span>
                    <div className="flex flex-col items-end md:items-center mt-1">
                      <div className="inline-flex flex-col items-center gap-1 bg-blue-50/50 dark:bg-blue-900/10 p-2 rounded-xl border border-blue-100/50 dark:border-blue-800/30 min-w-[140px] shadow-sm">
                        <div className="text-[9px] text-blue-600 dark:text-blue-400 uppercase font-black tracking-widest w-full text-center border-b border-blue-100/50 dark:border-blue-800/30 pb-1 mb-1">
                          {m.tipo_unidad === 'herramienta' ? 'Última Inspección' : 'Último Servicio'}
                        </div>
                        <div className="text-sm font-black text-blue-900 dark:text-blue-200">
                          {m.tipo_unidad === 'herramienta' 
                            ? (m.ultima_fecha_inspeccion ? formatDDMMYYYY(m.ultima_fecha_inspeccion) : 'Sin Registro')
                            : (m.ultima_fecha_mantenimiento && m.ultima_fecha_mantenimiento != m.fecha_ingreso_obra ? formatDDMMYYYY(m.ultima_fecha_mantenimiento) : 'Sin Registro')
                          }
                        </div>
                        <div className="w-full h-px bg-blue-100/50 dark:bg-blue-800/30 my-0.5"></div>
                        {m.horometro_actual && (m.tipo_unidad === 'maquinaria' || m.tipo_unidad === 'vehiculo') && (
                          <div className="mt-1 flex items-center gap-1.5 px-2 py-0.5 bg-white dark:bg-slate-800 rounded-lg border border-blue-100 dark:border-blue-900 shadow-sm animate-in fade-in zoom-in duration-300">
                            <span className="text-[10px] font-black text-blue-600 dark:text-blue-400">
                              {m.horometro_actual}
                            </span>
                            <span className="text-[9px] font-bold text-gray-400 dark:text-gray-500 uppercase">
                              {m.tipo_unidad === 'vehiculo' ? 'km' : 'hrs'}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                )}
                
                {columnasVisibles.estatus && (
                  <td className="flex justify-between items-center md:table-cell px-2 md:px-4 py-2 md:py-4 text-center border-b dark:border-slate-700 md:border-none">
                    <span className="md:hidden font-bold text-gray-500 dark:text-gray-400 text-sm">Estatus:</span>
                    <div>
                      {m.fecha_baja ? (
                        <span className="px-2 inline-flex text-xs font-semibold rounded-full bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-300">Baja: {formatDDMMYYYY(m.fecha_baja)}</span>
                      ) : (
                        renderBadge(m)
                      )}
                    </div>
                  </td>
                )}

                {columnasVisibles.realizadoPor && (
                  <td className="flex justify-between items-center md:table-cell px-2 md:px-4 py-2 md:py-4 text-center border-b dark:border-slate-700 md:border-none">
                    <span className="md:hidden font-bold text-gray-500 dark:text-gray-400 text-xs uppercase">Realizado por:</span>
                    <span className="text-xs font-semibold text-gray-600 dark:text-gray-300 italic">
                      {m.tipo_unidad === 'herramienta' 
                        ? (m.responsable_ultima_inspeccion || '-') 
                        : (m.responsable_ultimo_mantenimiento || '-')}
                    </span>
                  </td>
                )}
                    
                    {columnasVisibles.acciones && (
                      <td className="flex justify-end items-center md:table-cell px-2 md:px-4 py-4 md:py-4 text-sm font-medium border-b dark:border-slate-700 md:border-none">
                        <div className="flex justify-end items-center gap-2 md:gap-3">
                          
                          {/* Botón: Generar Inspección (Individual) */}
                          {(userArea === 'Medio Ambiente' || userRole === 'Master') && (
                            <div className="relative group flex items-center justify-center">
                              <button onClick={() => handleGenerarInspeccion(m.id_maquinaria)} className="text-green-600 dark:text-green-400 hover:text-green-800 hover:bg-blue-50 dark:hover:bg-blue-50 p-2 rounded-md transition-colors">
                                <FileSpreadsheet className="w-4 h-4 sm:w-5 sm:h-5" />
                              </button>
                              <div className="absolute bottom-full mb-2 hidden group-hover:block w-max bg-gray-800 text-white text-[10px] font-bold px-2 py-1 rounded shadow-md z-50">
                                Generar Inspección
                                <div className="absolute top-full left-1/2 -translate-x-1/2 border-[4px] border-transparent border-t-gray-800"></div>
                              </div>
                            </div>
                          )}

                          <div className="relative group flex items-center justify-center">
                            <button onClick={() => handleHistorialOpen(m)} className="text-[var(--recal-blue)] dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 p-2 rounded-md transition-colors">
                              <ClipboardList className="w-4 h-4 sm:w-5 sm:h-5" />
                            </button>
                            <div className="absolute bottom-full mb-2 hidden group-hover:block w-max bg-gray-800 text-white text-[10px] font-bold px-2 py-1 rounded shadow-md z-50">
                              Historial de Servicio
                              <div className="absolute top-full left-1/2 -translate-x-1/2 border-[4px] border-transparent border-t-gray-800"></div>
                            </div>
                          </div>

                          {canManageMaquinaria && (
                            <div className="relative group flex items-center justify-center">
                              <button onClick={() => handleEditClick(m)} className="text-blue-600 dark:text-blue-400 hover:text-blue-800 hover:bg-blue-50 p-2 rounded-md transition-colors">
                                <Pencil className="w-4 h-4 sm:w-5 sm:h-5" />
                              </button>
                              <div className="absolute bottom-full mb-2 hidden group-hover:block w-max bg-gray-800 text-white text-[10px] font-bold px-2 py-1 rounded shadow-md z-50">
                                Editar Equipo
                                <div className="absolute top-full left-1/2 -translate-x-1/2 border-[4px] border-transparent border-t-gray-800"></div>
                              </div>
                            </div>
                          )}

                          {canManageMaquinaria && !m.fecha_baja && (
                            <div className="relative group flex items-center justify-center">
                              <button onClick={() => handleBajaClick(m.id_maquinaria)} className="text-red-500 dark:text-red-400 hover:text-red-700 hover:bg-red-50 p-2 rounded-md transition-colors">
                                <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
                              </button>
                              <div className="absolute bottom-full mb-2 hidden group-hover:block w-max bg-gray-800 text-white text-[10px] font-bold px-2 py-1 rounded shadow-md z-50">
                                Dar de Baja
                                <div className="absolute top-full left-1/2 -translate-x-1/2 border-[4px] border-transparent border-t-gray-800"></div>
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                    )}
                    {columnasVisibles.trazabilidad && (userRole === 'Admin' || userRole === 'Master') && (
                      <td className="flex justify-between items-center md:table-cell px-2 md:px-4 py-2 md:py-4 border-b dark:border-slate-700 md:border-none">
                        <span className="md:hidden font-bold text-gray-500 dark:text-gray-400 text-sm">Trazabilidad:</span>
                        <div className="flex flex-col items-end md:items-start gap-1">
                          {m.creador ? (
                            <span className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 px-2 py-0.5 rounded text-[10px] font-bold border border-green-200 dark:border-green-800 w-max" title="Registrado por">
                              Agregó: {m.creador}
                              {m.fecha_creacion && ` el ${new Date(m.fecha_creacion).toLocaleDateString('es-MX')}`}
                            </span>
                          ) : (
                            <span className="bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-gray-400 px-2 py-0.5 rounded text-[10px] font-bold border border-gray-200 dark:border-slate-600 w-max" title="Registrado por Master">
                              Agregó: Master
                            </span>
                          )}
                          {m.modificador && (
                            <span className="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 px-2 py-0.5 rounded text-[10px] font-bold border border-yellow-200 dark:border-yellow-800 w-max" title="Modificado por">
                              Modificó: {m.modificador}
                              {m.ultima_modificacion && ` el ${new Date(m.ultima_modificacion).toLocaleDateString('es-MX')}`}
                            </span>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
      </div>

      {/* CONTROLES DE PAGINACIÓN AVANZADOS */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between bg-white dark:bg-slate-800 px-4 py-3 border border-gray-200 dark:border-slate-700 rounded-lg shadow-sm gap-4 sm:gap-0 mt-4">
          <div className="text-sm text-gray-700 dark:text-gray-300 text-center sm:text-left">
            Mostrando del <span className="font-bold">{indexOfFirstItem + 1}</span> al <span className="font-bold">{Math.min(indexOfLastItem, maquinaria.length)}</span> de <span className="font-bold">{maquinaria.length}</span> equipos
          </div>
          <div>
            <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
              <button onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1} className={`relative inline-flex items-center px-3 py-2 rounded-l-md border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm font-medium ${currentPage === 1 ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700'}`}>Anterior</button>
              <div className="hidden md:flex">
                {getPageNumbers().map(page => (
                  <button key={page} onClick={() => setCurrentPage(page)} className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium transition-colors ${currentPage === page ? 'z-10 bg-blue-50 dark:bg-blue-900/30 border-[var(--recal-blue)] dark:border-blue-500 text-[var(--recal-blue)] dark:text-blue-400' : 'bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-600 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700'}`}>{page}</button>
                ))}
              </div>
              <span className="md:hidden relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm font-medium text-gray-700 dark:text-gray-300">{currentPage} / {totalPages}</span>
              <button onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages} className={`relative inline-flex items-center px-3 py-2 rounded-r-md border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm font-medium ${currentPage === totalPages ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700'}`}>Siguiente</button>
            </nav>
          </div>
        </div>
      )}
        </div>
      </div>
    </div>

            {/* MODALES REFACTORIZADOS */}
      <MaquinariaFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        isEditing={isEditing}
        formData={formData}
        setFormData={setFormData}
        handleSubmit={handleSubmit}
        saving={saving}
        imageFile={imageFile}
        setImageFile={setImageFile}
        catPrincipales={catPrincipales}
        canSeeBothAreas={canSeeBothAreas}
      />
      
      <MaquinariaBajaModal
        isOpen={isBajaModalOpen}
        onClose={() => setIsBajaModalOpen(false)}
        bajaFecha={bajaFecha}
        setBajaFecha={setBajaFecha}
        handleBajaSubmit={handleBajaSubmit}
        saving={saving}
      />
      
      <MaquinariaHistorialModal
        isOpen={isHistorialOpen}
        onClose={() => {
          setIsHistorialOpen(false);
          handleCancelEditMantenimiento(); // Limpiar todo al cerrar
        }}
        maquinaSeleccionada={maquinaSeleccionada}
        formMantenimiento={formMantenimiento}
        setFormMantenimiento={setFormMantenimiento}
        handleMantenimientoSubmit={handleMantenimientoSubmit}
        historial={historial}
        saving={saving}
        formatDDMMYYYY={formatDDMMYYYY}
        canManageMaquinaria={canManageMaquinaria}
        // Nuevos props
        isEditingMantenimiento={isEditingMantenimiento}
        onEditMantenimiento={handlePrepEditMantenimiento}
        onDeleteMantenimiento={handleDeleteMantenimiento}
        onCancelEditMantenimiento={handleCancelEditMantenimiento}
      />
      
      <MaquinariaImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        importError={importError}
        importFase={importFase}
        handleAnalizarExcel={handleAnalizarExcel}
        catPrincipales={catPrincipales}
        importSubcontratista={importSubcontratista}
        setImportSubcontratista={setImportSubcontratista}
        setImportFile={setImportFile}
        importing={importing}
        importResumen={importResumen}
        importPreviewData={importPreviewData}
        handleGuardarImportacion={handleGuardarImportacion}
      />

      <MaquinariaInspeccionHerramientaModal
        key={herramientaSeleccionada ? `${herramientaSeleccionada.id_maquinaria}-${exportMes}-${exportAnio}` : 'no-tool'}
        isOpen={isInspeccionHerramientaOpen}
        onClose={() => setIsInspeccionHerramientaOpen(false)}
        herramientaSeleccionada={herramientaSeleccionada}
        inspecciones={inspeccionesHerramienta}
        exportMes={exportMes}
        exportAnio={exportAnio}
        onGuardar={handleGuardarInspeccion}
        saving={saving}
      />
    </>
  );
}
