"use client";

import { useState, useEffect, useRef } from 'react';
import { ClipboardList, Pencil, Trash2, Upload, Tractor, FileSpreadsheet, FolderDown } from 'lucide-react';
import Swal from 'sweetalert2';

export default function MaquinariaPage() {
  const topRef = useRef(null); 

  const [userRole, setUserRole] = useState(null);
  const [userArea, setUserArea] = useState(null); 

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
  }, []);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  const [maquinaria, setMaquinaria] = useState([]);
  const [loading, setLoading] = useState(true);

  const [catPrincipales, setCatPrincipales] = useState([]);
  const [filtroSub, setFiltroSub] = useState('');
  const [busqueda, setBusqueda] = useState('');

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
    intervalo_mantenimiento: '', fecha_ingreso_obra: '', id_subcontratista: '',
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
  const [historial, setHistorial] = useState([]);
  const [formMantenimiento, setFormMantenimiento] = useState({
    fecha_mantenimiento: '', tipo_mantenimiento: 'Preventivo', horometro_mantenimiento: '', observaciones: ''
  });

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
      
      if (userArea === 'ambiental') {
        url += `semana=${exportSemana}&`;
      } else {
        url += `mes=${exportMes}&anio=${exportAnio}&`;
      }

      if (filtroSub) url += `subcontratista=${filtroSub}&`;
      if (busqueda) url += `busqueda=${encodeURIComponent(busqueda)}&`; 
      
      const res = await fetch(url);
      const json = await res.json();
      if (json.success) setMaquinaria(json.data);
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchMaquinaria(); }, [filtroSub, exportMes, exportAnio, exportSemana, userArea, busqueda, ordenPor, ordenDireccion]);
  useEffect(() => { setCurrentPage(1); }, [busqueda, filtroSub, exportMes, exportAnio, exportSemana, userArea, ordenPor, ordenDireccion]);

  useEffect(() => {
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
      fecha_ingreso_obra: formatForInput(m.fecha_ingreso_obra), 
      id_subcontratista: m.id_subcontratista || '', 
      area: m.area || 'seguridad',
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
    setFormMantenimiento({ fecha_mantenimiento: '', tipo_mantenimiento: 'Preventivo', horometro_mantenimiento: '', observaciones: '' });
    setIsHistorialOpen(true);
    try {
      const res = await fetch(`/api/maquinaria/mantenimiento?id_maquinaria=${maquina.id_maquinaria}`);
      const data = await res.json();
      if (data.success) setHistorial(data.data);
    } catch (error) {}
  };

  const handleMantenimientoSubmit = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      const res = await fetch('/api/maquinaria/mantenimiento', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formMantenimiento, id_maquinaria: maquinaSeleccionada.id_maquinaria })
      });
      const data = await res.json();
      if (data.success) { 
        abrirHistorial(maquinaSeleccionada); fetchMaquinaria(); 
        Swal.fire('Servicio Registrado', 'El mantenimiento se ha guardado exitosamente.', 'success');
      } else {
        Swal.fire('Error', data.error || 'No se pudo guardar el servicio', 'error');
      }
    } catch (error) { Swal.fire('Error', 'Problema de conexión al guardar el servicio', 'error'); } finally { setSaving(false); }
  };

  const renderBadge = (estado, horasRestantes) => {
    if (estado === 'N/A') return <span className="text-gray-400 dark:text-gray-500 text-xs">No aplica</span>;
    let colorClass = "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300";
    if (estado === 'Vencido') colorClass = "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 animate-pulse";
    else if (estado === 'Próximo') colorClass = "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300";
    return (
      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-bold rounded-full shadow-sm ${colorClass}`}>
        {estado === 'Vencido' ? `Vencido por ${Math.abs(horasRestantes)} hrs` : `Faltan ${horasRestantes} hrs`}
      </span>
    );
  };

  const limpiarFiltros = () => { 
    setFiltroSub(''); 
    setBusqueda('');
  };

const handleGenerarInspeccion = (id_maquina) => {
    window.open(`/api/maquinaria/exportar-inspeccion?id=${id_maquina}&mes=${exportMes}&anio=${exportAnio}`, '_blank');
  };

  return (
    <div className="space-y-6 relative" ref={topRef}>
      
      {/* HEADER Y BOTONES RESPONSIVOS */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center space-y-4 lg:space-y-0">
        <h2 className="text-xl sm:text-2xl font-bold text-[var(--recal-blue)] dark:text-white">Maquinaria y Equipo</h2>
        
        <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2 w-full lg:w-auto">
          
          <button onClick={handleOpenImportModal} className="flex-1 sm:flex-none justify-center bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded-md font-bold shadow-sm transition-colors text-xs sm:text-sm flex items-center">
            <Upload className="w-4 h-4 mr-1 sm:mr-2" /> Importar Excel
          </button>

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
            <a href={`/api/maquinaria/exportar-utilizacion?${userArea === 'ambiental' ? `mes=${exportMes}&anio=${exportAnio}` : `mes=${exportMes}&anio=${exportAnio}`}&area_usuario=${userArea}`} target="_blank" className="flex-1 sm:flex-none justify-center bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-md font-bold shadow-sm transition-colors text-xs sm:text-sm flex items-center">
              <span className="mr-1">📊</span> <span className="hidden sm:inline">Utilización</span><span className="sm:hidden">Util</span>
            </a>
            <a href={`/api/maquinaria/exportar-plan-servicio?${userArea === 'ambiental' ? `mes=${exportMes}&anio=${exportAnio}` : `mes=${exportMes}&anio=${exportAnio}`}&area_usuario=${userArea}`} target="_blank" className="flex-1 sm:flex-none justify-center bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-md font-bold shadow-sm transition-colors text-xs sm:text-sm flex items-center">
              <span className="mr-1">🛠️</span> <span className="hidden sm:inline">Servicio</span><span className="sm:hidden">Serv</span>
            </a>
          </div>
          
          <button onClick={handleNewClick} className="w-full sm:w-auto bg-[var(--recal-blue)] hover:bg-[var(--recal-blue-hover)] text-white px-4 py-3 sm:py-2 rounded-md font-medium shadow-sm lg:ml-2">
            + Nuevo
          </button>
        </div>
      </div>

      {/* PANEL DE FILTROS Y BÚSQUEDA */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="md:col-span-2">
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">Buscar Equipo</label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">🔍</span>
            <input type="text" placeholder="Num Eco, Serie, Marca, Placa..." 
              className="w-full pl-10 bg-transparent border border-gray-300 dark:border-slate-600 dark:text-white rounded-md p-2 shadow-sm focus:ring-[var(--recal-blue)] outline-none sm:text-sm"
              value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
          </div>
        </div>
        <div className="md:col-span-1">
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">Filtrar por Contratista</label>
          <select className="w-full bg-transparent border border-gray-300 dark:border-slate-600 dark:text-white rounded-md p-2 shadow-sm focus:ring-[var(--recal-blue)] outline-none sm:text-sm" 
            value={filtroSub} onChange={(e) => setFiltroSub(e.target.value)}>
            <option value="">Todo el equipo en obra...</option>
            {catPrincipales.map(empresa => <option key={empresa.id_subcontratista} value={empresa.id_subcontratista}>{empresa.razon_social}</option>)}
          </select>
        </div>
        <div className="md:col-span-1 flex items-end">
          <button onClick={limpiarFiltros} className="w-full bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-700 dark:text-gray-200 px-4 py-2 rounded-md font-medium sm:text-sm transition-colors border border-gray-300 dark:border-slate-600">Limpiar Todo</button>
        </div>
      </div>

      {/* TABLA PRINCIPAL */}
      <div className="bg-white dark:bg-slate-800 shadow-sm rounded-lg border border-gray-200 dark:border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
            <thead className="bg-gray-50 dark:bg-slate-900 hidden md:table-header-group">
              <tr>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Imagen</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors" onClick={() => manejarOrden('tipo')}>
                  Tipo {ordenPor === 'tipo' && (ordenDireccion === 'ASC' ? '↑' : '↓')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors" onClick={() => manejarOrden('marca')}>
                  Equipo {ordenPor === 'marca' && (ordenDireccion === 'ASC' ? '↑' : '↓')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors" onClick={() => manejarOrden('nombre_subcontratista')}>
                  Contratista {ordenPor === 'nombre_subcontratista' && (ordenDireccion === 'ASC' ? '↑' : '↓')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors" onClick={() => manejarOrden('fecha_ingreso_obra')}>
                  Ingreso {ordenPor === 'fecha_ingreso_obra' && (ordenDireccion === 'ASC' ? '↑' : '↓')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors" onClick={() => manejarOrden('fecha_baja')}>
                  Baja {ordenPor === 'fecha_baja' && (ordenDireccion === 'ASC' ? '↑' : '↓')}
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-[var(--recal-blue)] dark:text-blue-400 uppercase">Último Servicio</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Estatus</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Acciones</th>
                {(userRole === 'Admin' || userRole === 'Master') && (
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Trazabilidad</th>
                )}
              </tr>
            </thead>
            
            <tbody className="bg-white dark:bg-slate-800 divide-y md:divide-y-0 md:divide-gray-200 dark:md:divide-slate-700 block md:table-row-group">
              {loading ? (
                <tr className="block md:table-row"><td colSpan="8" className="px-6 py-8 text-center text-sm text-gray-500 dark:text-gray-400 block md:table-cell">Cargando inventario...</td></tr>
              ) : maquinaria.length === 0 ? (
                <tr className="block md:table-row">
                  <td colSpan="8" className="px-6 py-12 text-center block md:table-cell">
                    <div className="text-gray-400 dark:text-gray-500 text-4xl mb-2">🔍</div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-200">No se han encontrado resultados</p>
                  </td>
                </tr>
              ) : maquinariaPaginada.map((m) => (
                  <tr key={m.id_maquinaria} className="block md:table-row border border-gray-200 dark:border-slate-700 md:border-none mb-4 md:mb-0 rounded-lg shadow-sm md:shadow-none p-4 md:p-0 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
                    
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
                    
                    <td className="flex justify-between items-center md:table-cell px-2 md:px-4 py-2 md:py-4 text-sm font-bold text-[var(--recal-blue)] dark:text-blue-400 md:text-gray-900 dark:md:text-white border-b dark:border-slate-700 md:border-none">
                      <span className="md:hidden font-bold text-gray-500 dark:text-gray-400">Tipo:</span>
                      <span>{m.tipo}</span>
                    </td>
                    
                    <td className="flex justify-between items-start md:table-cell px-2 md:px-4 py-2 md:py-4 text-sm border-b dark:border-slate-700 md:border-none">
                      <span className="md:hidden font-bold text-gray-500 dark:text-gray-400 mt-1">Equipo:</span>
                      <div className="flex flex-col sm:items-start items-end gap-1">
                        <span className="text-sm font-bold text-gray-900 dark:text-gray-200 bg-gray-100 dark:bg-slate-700 px-1.5 py-0.5 rounded w-fit">Marca: {m.marca || 'S/N'}</span>
                        <span className="text-sm font-bold text-gray-900 dark:text-gray-200 bg-gray-100 dark:bg-slate-700 px-1.5 py-0.5 rounded w-fit">Modelo: {m.modelo || 'S/N'}</span>
                        <span className="text-xs font-bold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-slate-700 px-1.5 py-0.5 rounded w-fit">Num. Eco: {m.num_economico || 'S/N'}</span>
                        <span className="text-xs font-bold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-slate-700 px-1.5 py-0.5 rounded w-fit">Serie: {m.serie || 'S/N'}</span>
                      </div>
                    </td>
                    
                    <td className="flex justify-between items-center md:table-cell px-2 md:px-4 py-2 md:py-4 text-sm text-gray-500 dark:text-gray-300 border-b dark:border-slate-700 md:border-none">
                      <span className="md:hidden font-bold text-gray-500 dark:text-gray-400">Contratista:</span>
                      <span>{m.nombre_subcontratista || '-'}</span>
                    </td>

                    <td className="flex justify-between items-center md:table-cell px-2 md:px-4 py-2 md:py-4 text-sm text-gray-500 dark:text-gray-300 border-b dark:border-slate-700 md:border-none">
                      <span className="md:hidden font-bold text-gray-500 dark:text-gray-400">Ingreso:</span>
                      <span>{formatDDMMYYYY(m.fecha_ingreso_obra)}</span>
                    </td>

                    <td className="flex justify-between items-center md:table-cell px-2 md:px-4 py-2 md:py-4 text-sm text-gray-500 dark:text-gray-300 border-b dark:border-slate-700 md:border-none">
                      <span className="md:hidden font-bold text-gray-500 dark:text-gray-400">Baja:</span>
                      <span>{m.fecha_baja ? formatDDMMYYYY(m.fecha_baja) : '-'}</span>
                    </td>
                    
                    <td className="flex justify-between items-center md:table-cell px-2 md:px-4 py-2 md:py-4 border-b dark:border-slate-700 md:border-none">
                      <span className="md:hidden font-bold text-gray-500 dark:text-gray-400 text-sm">Último Servicio:</span>
                      <div className="text-right md:text-center">
                        <div className="text-sm font-semibold text-blue-900 dark:text-blue-400">{m.ultima_fecha_mantenimiento && m.ultima_fecha_mantenimiento != m.fecha_ingreso_obra ? formatDDMMYYYY(m.ultima_fecha_mantenimiento) : 'Sin Registro'}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{m.horometro_actual ? `${m.horometro_actual} hrs` : ''}</div>
                      </div>
                    </td>
                    
                    <td className="flex justify-between items-center md:table-cell px-2 md:px-4 py-2 md:py-4 text-center border-b dark:border-slate-700 md:border-none">
                      <span className="md:hidden font-bold text-gray-500 dark:text-gray-400 text-sm">Estatus:</span>
                      <div>
                        {m.fecha_baja ? (
                          <span className="px-2 inline-flex text-xs font-semibold rounded-full bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-300">Baja: {formatDDMMYYYY(m.fecha_baja)}</span>
                        ) : (
                          renderBadge(m.estado_mantenimiento, m.horas_restantes)
                        )}
                      </div>
                    </td>
                    
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
                          <button onClick={() => abrirHistorial(m)} className="text-[var(--recal-blue)] dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 p-2 rounded-md transition-colors">
                            <ClipboardList className="w-4 h-4 sm:w-5 sm:h-5" />
                          </button>
                          <div className="absolute bottom-full mb-2 hidden group-hover:block w-max bg-gray-800 text-white text-[10px] font-bold px-2 py-1 rounded shadow-md z-50">
                            Historial de Servicio
                            <div className="absolute top-full left-1/2 -translate-x-1/2 border-[4px] border-transparent border-t-gray-800"></div>
                          </div>
                        </div>

                        <div className="relative group flex items-center justify-center">
                          <button onClick={() => handleEditClick(m)} className="text-blue-600 dark:text-blue-400 hover:text-blue-800 hover:bg-blue-50 p-2 rounded-md transition-colors">
                            <Pencil className="w-4 h-4 sm:w-5 sm:h-5" />
                          </button>
                          <div className="absolute bottom-full mb-2 hidden group-hover:block w-max bg-gray-800 text-white text-[10px] font-bold px-2 py-1 rounded shadow-md z-50">
                            Editar Equipo
                            <div className="absolute top-full left-1/2 -translate-x-1/2 border-[4px] border-transparent border-t-gray-800"></div>
                          </div>
                        </div>

                        {!m.fecha_baja && (
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

                    {(userRole === 'Admin' || userRole === 'Master') && (
                      <td className="flex justify-between items-center md:table-cell px-2 md:px-4 py-2 md:py-4 border-b dark:border-slate-700 md:border-none">
                        <span className="md:hidden font-bold text-gray-500 dark:text-gray-400 text-sm">Trazabilidad:</span>
                        <div className="flex flex-col items-end md:items-start gap-1">
                          {m.creador ? (
                            <span className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 px-2 py-0.5 rounded text-[10px] font-bold border border-green-200 dark:border-green-800 w-max" title="Registrado por">
                              Agregó: {m.creador}
                            </span>
                          ) : (
                            <span className="bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-gray-400 px-2 py-0.5 rounded text-[10px] font-bold border border-gray-200 dark:border-slate-600 w-max" title="Registrado por Master">
                              Agregó: Master
                            </span>
                          )}
                          {m.modificador && (
                            <span className="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 px-2 py-0.5 rounded text-[10px] font-bold border border-yellow-200 dark:border-yellow-800 w-max" title="Modificado por">
                              Modificó: {m.modificador}
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

      {/* MODAL 1: REGISTRAR / EDITAR MÁQUINA */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border dark:border-slate-700">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700 flex justify-between items-center bg-[var(--recal-gray)] dark:bg-slate-900">
              <h3 className="text-lg font-bold text-[var(--recal-blue)] dark:text-white">{isEditing ? 'Editar Equipo' : 'Ingreso de Maquinaria'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 font-bold text-xl">&times;</button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Num. Económico (opcional)</label><input type="text" className="mt-1 w-full bg-transparent border border-gray-300 dark:border-slate-600 dark:text-white rounded-md p-2 outline-none focus:ring-[var(--recal-blue)]" value={formData.num_economico} onChange={e => setFormData({...formData, num_economico: e.target.value.toUpperCase()})} /></div>
                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Tipo de Equipo *</label><input required type="text" className="mt-1 w-full bg-transparent border border-gray-300 dark:border-slate-600 dark:text-white rounded-md p-2 outline-none focus:ring-[var(--recal-blue)]" value={formData.tipo} onChange={e => setFormData({...formData, tipo: e.target.value.toUpperCase()})} /></div>
                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Marca *</label><input required type="text" className="mt-1 w-full bg-transparent border border-gray-300 dark:border-slate-600 dark:text-white rounded-md p-2 outline-none focus:ring-[var(--recal-blue)]" value={formData.marca} onChange={e => setFormData({...formData, marca: e.target.value.toUpperCase()})} /></div>
                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Modelo (opcional)</label><input type="text" className="mt-1 w-full bg-transparent border border-gray-300 dark:border-slate-600 dark:text-white rounded-md p-2 outline-none focus:ring-[var(--recal-blue)]" value={formData.modelo} onChange={e => setFormData({...formData, modelo: e.target.value.toUpperCase()})} /></div>
                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Año</label><input type="text" className="mt-1 w-full bg-transparent border border-gray-300 dark:border-slate-600 dark:text-white rounded-md p-2 outline-none focus:ring-[var(--recal-blue)]" value={formData.anio} onChange={e => setFormData({...formData, anio: e.target.value})} /></div>
                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Color (opcional)</label><input type="text" className="mt-1 w-full bg-transparent border border-gray-300 dark:border-slate-600 dark:text-white rounded-md p-2 outline-none focus:ring-[var(--recal-blue)]" value={formData.color} onChange={e => setFormData({...formData, color: e.target.value})} /></div>
                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Número de Serie (opcional)</label><input type="text" className="mt-1 w-full bg-transparent border border-gray-300 dark:border-slate-600 dark:text-white rounded-md p-2 outline-none focus:ring-[var(--recal-blue)]" value={formData.serie} onChange={e => setFormData({...formData, serie: e.target.value})} /></div>
                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Placa (opcional)</label><input type="text" className="mt-1 w-full bg-transparent border border-gray-300 dark:border-slate-600 dark:text-white rounded-md p-2 outline-none focus:ring-[var(--recal-blue)]" value={formData.placa} onChange={e => setFormData({...formData, placa: e.target.value})} /></div>
                <div><label className="block text-sm font-bold text-blue-900 dark:text-blue-400">Horómetro Actual</label><input type="number" step="0.01" className="mt-1 w-full bg-blue-50 dark:bg-blue-900/20 border border-gray-300 dark:border-blue-800 dark:text-white rounded-md p-2 outline-none focus:ring-[var(--recal-blue)]" value={formData.horometro} onChange={e => setFormData({...formData, horometro: e.target.value})} /></div>
                <div><label className="block text-sm font-bold text-blue-900 dark:text-blue-400">Mantenimiento cada (Hrs)</label><input type="number" className="mt-1 w-full bg-blue-50 dark:bg-blue-900/20 border border-gray-300 dark:border-blue-800 dark:text-white rounded-md p-2 outline-none focus:ring-[var(--recal-blue)]" value={formData.intervalo_mantenimiento} onChange={e => setFormData({...formData, intervalo_mantenimiento: e.target.value})} /></div>
                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Fecha Ingreso a Obra *</label><input required type="date" className="mt-1 w-full bg-transparent border border-gray-300 dark:border-slate-600 dark:text-white rounded-md p-2 outline-none focus:ring-[var(--recal-blue)]" value={formData.fecha_ingreso_obra} onChange={e => setFormData({...formData, fecha_ingreso_obra: e.target.value})} /></div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Contratista Propietaria</label>
                  <select className="mt-1 w-full bg-transparent border border-gray-300 dark:border-slate-600 dark:text-white rounded-md p-2 outline-none focus:ring-[var(--recal-blue)]" value={formData.id_subcontratista} onChange={e => setFormData({...formData, id_subcontratista: e.target.value})}>
                    <option value="" className="dark:bg-slate-800">RECAL (Equipo Propio)</option>
                    {catPrincipales.map(empresa => <option key={empresa.id_subcontratista} value={empresa.id_subcontratista} className="dark:bg-slate-800">{empresa.razon_social}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Área Asignada *</label>
                  <select required className="mt-1 w-full bg-transparent border border-gray-300 dark:border-slate-600 dark:text-white rounded-md p-2 outline-none focus:ring-[var(--recal-blue)]" value={formData.area} onChange={e => setFormData({...formData, area: e.target.value})}>
                    <option value="seguridad" className="dark:bg-slate-800">Seguridad</option>
                    <option value="ambiental" className="dark:bg-slate-800">Medio Ambiente</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Fotografía</label>
                  <input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files[0])} className="mt-1 w-full bg-transparent border border-gray-300 dark:border-slate-600 dark:text-white rounded-md p-2 text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-bold file:bg-[var(--recal-blue)] file:text-white hover:file:bg-[var(--recal-blue-hover)]" />
                  {formData.imagen_url_actual && !imageFile && (
                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">Ya cuenta con una imagen. Sube otra si deseas reemplazarla.</p>
                  )}
                </div>
              </div>
              <div className="pt-4 flex justify-end space-x-3 border-t border-gray-200 dark:border-slate-700 mt-6">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700">Cancelar</button>
                <button type="submit" disabled={saving} className="px-4 py-2 bg-[var(--recal-blue)] text-white rounded-md hover:bg-[var(--recal-blue-hover)]">
                  {saving ? 'Guardando...' : (isEditing ? 'Actualizar' : 'Registrar Equipo')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: CONFIRMAR BAJA */}
      {isBajaModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-sm w-full border dark:border-slate-700">
            <div className="px-6 py-4 border-b border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-900/20 rounded-t-lg">
              <h3 className="text-lg font-bold text-red-700 dark:text-red-400">Confirmar Baja</h3>
            </div>
            <form onSubmit={handleBajaSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Fecha de retiro *</label>
                <input required type="date" className="mt-1 w-full bg-transparent border border-gray-300 dark:border-slate-600 dark:text-white rounded-md p-2 focus:ring-red-500 outline-none" value={bajaFecha} onChange={e => setBajaFecha(e.target.value)} />
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">La máquina ya no se incluirá en los reportes exportables de Excel.</p>
              </div>
              <div className="pt-4 flex justify-end space-x-3 border-t border-gray-200 dark:border-slate-700 mt-6">
                <button type="button" onClick={() => setIsBajaModalOpen(false)} className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700">Cancelar</button>
                <button type="submit" disabled={saving} className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 font-medium">
                  {saving ? 'Procesando...' : 'Dar de Baja'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: HISTORIAL DE MANTENIMIENTO */}
      {isHistorialOpen && maquinaSeleccionada && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-2xl max-w-4xl w-full flex flex-col max-h-[90vh] border dark:border-slate-700">
            <div className="px-4 md:px-6 py-4 border-b border-gray-200 dark:border-slate-700 flex justify-between items-center bg-[var(--recal-blue)] text-white rounded-t-lg">
              <h3 className="text-base md:text-lg font-bold truncate pr-4">Servicios: {maquinaSeleccionada.num_economico || 'S/N'}</h3>
              <button onClick={() => setIsHistorialOpen(false)} className="text-white hover:text-gray-200 font-bold text-xl md:text-2xl">&times;</button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 md:p-6 flex flex-col md:grid md:grid-cols-3 gap-6 bg-gray-50 dark:bg-slate-900">
              <div className="w-full md:col-span-1 bg-white dark:bg-slate-800 p-4 rounded border border-gray-200 dark:border-slate-700 shadow-sm h-fit">
                <h4 className="font-bold text-gray-700 dark:text-gray-200 border-b dark:border-slate-700 pb-2 mb-4 text-sm uppercase">Registrar Servicio</h4>
                <form onSubmit={handleMantenimientoSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Fecha de Servicio *</label>
                    <input required type="date" className="w-full bg-transparent border border-gray-300 dark:border-slate-600 dark:text-white rounded p-2 text-sm outline-none focus:border-[var(--recal-blue)]" 
                      value={formMantenimiento.fecha_mantenimiento} onChange={e => setFormMantenimiento({...formMantenimiento, fecha_mantenimiento: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Tipo *</label>
                    <select className="w-full bg-transparent border border-gray-300 dark:border-slate-600 dark:text-white rounded p-2 text-sm outline-none focus:border-[var(--recal-blue)]" 
                      value={formMantenimiento.tipo_mantenimiento} onChange={e => setFormMantenimiento({...formMantenimiento, tipo_mantenimiento: e.target.value})}>
                      <option value="Preventivo" className="dark:bg-slate-800">Preventivo</option>
                      <option value="Correctivo" className="dark:bg-slate-800">Correctivo</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Horómetro al servicio</label>
                    <input 
                      type="number" step="0.01" className="w-full bg-transparent border border-gray-300 dark:border-slate-600 dark:text-white rounded p-2 text-sm outline-none focus:border-[var(--recal-blue)]" 
                      value={formMantenimiento.horometro_mantenimiento} onChange={e => setFormMantenimiento({...formMantenimiento, horometro_mantenimiento: e.target.value})} placeholder='Opcional si es equipo menor'
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Observaciones</label>
                    <textarea rows="3" className="w-full bg-transparent border border-gray-300 dark:border-slate-600 dark:text-white rounded p-2 text-sm outline-none focus:border-[var(--recal-blue)]" 
                      value={formMantenimiento.observaciones} onChange={e => setFormMantenimiento({...formMantenimiento, observaciones: e.target.value})}></textarea>
                  </div>
                  <button type="submit" disabled={saving} className="w-full bg-green-600 text-white rounded p-3 md:p-2 text-sm font-bold hover:bg-green-700 transition-colors">
                    Guardar Mantenimiento
                  </button>
                </form>
              </div>
              <div className="w-full md:col-span-2 bg-white dark:bg-slate-800 rounded border border-gray-200 dark:border-slate-700 shadow-sm overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
                  <thead className="bg-gray-100 dark:bg-slate-900">
                    <tr><th className="px-4 py-2 text-left text-xs font-bold text-gray-600 dark:text-gray-400 uppercase">Fecha</th><th className="px-4 py-2 text-left text-xs font-bold text-gray-600 dark:text-gray-400 uppercase">Tipo</th><th className="px-4 py-2 text-center text-xs font-bold text-gray-600 dark:text-gray-400 uppercase">Horómetro</th><th className="px-4 py-2 text-left text-xs font-bold text-gray-600 dark:text-gray-400 uppercase">Detalles</th></tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                    {historial.length === 0 ? (
                      <tr><td colSpan="4" className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400 italic">No hay registros.</td></tr>
                    ) : (
                      historial.map((h) => (
                        <tr key={h.id_mantenimiento} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200 font-medium">{formatDDMMYYYY(h.fecha_mantenimiento)}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm"><span className={`px-2 py-1 rounded text-xs font-bold ${h.tipo_mantenimiento === 'Preventivo' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' : 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300'}`}>{h.tipo_mantenimiento}</span></td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-center font-mono text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-slate-900/50">{h.horometro_mantenimiento !== null ? `${h.horometro_mantenimiento} hrs` : 'N/A'}</td>
                          <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 min-w-[150px] max-w-xs truncate" title={h.observaciones}>{h.observaciones || '-'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL 4: IMPORTACIÓN MASIVA DE MAQUINARIA --- */}
      {isImportModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-4xl w-full max-h-[95vh] overflow-hidden flex flex-col border dark:border-slate-700">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700 flex justify-between items-center bg-purple-50 dark:bg-purple-900/20">
              <div className="flex items-center">
                <Tractor className="w-6 h-6 text-purple-600 dark:text-purple-400 mr-2" />
                <h3 className="text-xl font-bold text-purple-900 dark:text-purple-300">Importación Masiva de Equipo</h3>
              </div>
              <button onClick={() => setIsImportModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 font-bold text-2xl">&times;</button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 bg-gray-50 dark:bg-slate-900">
              {importError && (
                <div className="mb-4 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 text-red-700 dark:text-red-400 p-4 text-sm shadow-sm">
                  <p className="font-bold">Aviso de Lectura</p>
                  <p className="whitespace-pre-line">{importError}</p>
                </div>
              )}

              {importFase === 1 && (
                <form onSubmit={handleAnalizarExcel} className="space-y-6 bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 bg-blue-50 dark:bg-blue-900/20 p-3 rounded border border-blue-100 dark:border-blue-800/50">
                    Sube el Plan de Servicio Oficial <b>(12_PLAN_SERVICIO.xlsx)</b>. El sistema extraerá los equipos a partir de la Fila 7, cruzará los datos mediante el <b>Número de Serie</b> y te mostrará los equipos nuevos a registrar.
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">1. Selecciona la Contratista Propietaria *</label>
                      <select required className="w-full bg-transparent border border-gray-300 dark:border-slate-600 dark:text-white rounded-md p-3 focus:ring-purple-500 outline-none shadow-sm" value={importSubcontratista} onChange={(e) => setImportSubcontratista(e.target.value)}>
                        <option value="" className="dark:bg-slate-800">-- Elige una opción --</option>
                        {catPrincipales.map(empresa => (
                          <option key={empresa.id_subcontratista} value={empresa.id_subcontratista} className="dark:bg-slate-800">{empresa.razon_social}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">2. Sube el archivo Excel *</label>
                      <input required type="file" accept=".xlsx, .xls" className="w-full bg-transparent border border-gray-300 dark:border-slate-600 rounded-md p-2 focus:outline-none file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-purple-50 dark:file:bg-purple-900/30 file:text-purple-700 dark:file:text-purple-400 hover:file:bg-purple-100 dark:hover:file:bg-purple-900/50 dark:text-gray-300" onChange={(e) => setImportFile(e.target.files[0])} />
                    </div>
                  </div>

                  <div className="flex justify-end pt-4">
                    <button type="submit" disabled={importing} className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-6 rounded-lg flex items-center shadow-md transition-colors disabled:bg-gray-400 dark:disabled:bg-slate-600">
                      {importing ? 'Analizando documento...' : 'Cruzar Datos y Analizar'}
                    </button>
                  </div>
                </form>
              )}

              {importFase === 2 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-gray-200 dark:border-slate-700 shadow-sm">
                      <p className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase">Equipos en el Excel</p>
                      <p className="text-2xl font-bold text-gray-700 dark:text-gray-200">{importResumen.totales}</p>
                    </div>
                    <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-gray-200 dark:border-slate-700 shadow-sm">
                      <p className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase">Ya registrados</p>
                      <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{importResumen.totales - importResumen.nuevos}</p>
                    </div>
                    <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg border border-purple-200 dark:border-purple-800/50 shadow-sm">
                      <p className="text-xs text-purple-700 dark:text-purple-400 font-bold uppercase">Nuevos por guardar</p>
                      <p className="text-3xl font-black text-purple-700 dark:text-purple-400">{importResumen.nuevos}</p>
                    </div>
                  </div>

                  {importPreviewData.length === 0 ? (
                    <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/50 rounded-lg p-8 text-center">
                      <p className="text-green-700 dark:text-green-400 font-bold text-lg mb-2">¡Inventario Cuadrado!</p>
                      <p className="text-green-600 dark:text-green-500">Todos los números de serie detectados en este Excel ya existen activos en tu base de datos.</p>
                    </div>
                  ) : (
                    <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden">
                      <div className="max-h-64 overflow-y-auto">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700 text-sm">
                          <thead className="bg-gray-100 dark:bg-slate-900 sticky top-0">
                            <tr>
                              <th className="px-4 py-3 text-left font-bold text-gray-600 dark:text-gray-400">Tipo</th>
                              <th className="px-4 py-3 text-left font-bold text-gray-600 dark:text-gray-400">Marca / Modelo</th>
                              <th className="px-4 py-3 text-left font-bold text-gray-600 dark:text-gray-400">Número de Serie</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                            {importPreviewData.map((m, idx) => (
                              <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                                <td className="px-4 py-2 font-medium text-gray-900 dark:text-gray-200">{m.tipo}</td>
                                <td className="px-4 py-2 text-gray-600 dark:text-gray-400">{m.marca} / {m.modelo || '-'}</td>
                                <td className="px-4 py-2 text-gray-600 dark:text-gray-400 font-mono">{m.serie}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex justify-end space-x-3">
              <button onClick={() => setIsImportModalOpen(false)} className="px-6 py-2 border border-gray-300 dark:border-slate-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 font-medium transition-colors">Cancelar</button>
              {importFase === 2 && importPreviewData.length > 0 && (
                <button onClick={handleGuardarImportacion} disabled={importing} className="px-6 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 font-bold transition-colors shadow-md flex items-center disabled:bg-gray-400 dark:disabled:bg-slate-600">
                  {importing ? 'Guardando...' : `Guardar ${importResumen.nuevos} Equipos`}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}