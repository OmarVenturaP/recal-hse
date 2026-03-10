"use client";

import { useState, useEffect, useRef } from 'react';
import { Pencil, Trash2, Upload, FileSpreadsheet } from 'lucide-react';

export default function FuerzaTrabajoPage() {
  const topRef = useRef(null); 

  const [userRole, setUserRole] = useState(null);

  useEffect(() => {
    // NUEVO: Preguntamos quién está logeado
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setUserRole(data.user.rol);
          console.log("Rol:", data.user.rol);
        }
      });
  }, []);

  const [trabajadores, setTrabajadores] = useState([]);
  const [loading, setLoading] = useState(true);

  // Catálogos
  const [catPrincipales, setCatPrincipales] = useState([]);
  const [catCuadrillas, setCatCuadrillas] = useState([]);
  const [catPuestos, setCatPuestos] = useState([]);

  // --- FECHAS POR DEFECTO (Última Semana) ---
  const getDateString = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  
  const hoy = new Date();
  const haceUnaSemana = new Date();
  haceUnaSemana.setDate(hoy.getDate() - 6);

  // Estados Unificados para Filtros y Exportación
  const [fechaInicio, setFechaInicio] = useState(getDateString(haceUnaSemana));
  const [fechaFin, setFechaFin] = useState(getDateString(hoy));
  const [filtroSub, setFiltroSub] = useState('');
  const [busqueda, setBusqueda] = useState('');

  // Estados para Ordenamiento
  const [ordenPor, setOrdenPor] = useState('fecha_ingreso_obra');
  const [ordenDireccion, setOrdenDireccion] = useState('DESC');

  // Estados de Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Estados para el Modal de Edición/Nuevo
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState(null);

  // Estados para el Modal de Baja
  const [isBajaModalOpen, setIsBajaModalOpen] = useState(false);
  const [bajaId, setBajaId] = useState(null);
  const [bajaFecha, setBajaFecha] = useState('');

  // Estados de Importación Masiva
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importSubcontratista, setImportSubcontratista] = useState('');
  const [importPreviewData, setImportPreviewData] = useState([]); 
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState('');
  const [importFase, setImportFase] = useState(1); 
  const [importResumen, setImportResumen] = useState({ totales: 0, nuevos: 0 });

  const formInicial = {
    numero_empleado: '', nombre_trabajador: '', puesto_categoria: '', 
    nss: '', fecha_ingreso_obra: '', fecha_alta_imss: '', 
    origen: 'Local', id_subcontratista_ft: '', id_subcontratista_principal: ''
  };
  
  const [formData, setFormData] = useState(formInicial);

  const formatDDMMYYYY = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const day = String(date.getUTCDate()).padStart(2, '0');
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const year = date.getUTCFullYear();
    return `${day}/${month}/${year}`;
  };

  const formatForInput = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

    useEffect(() => {
    const fetchCatalogos = async () => {
      try {
        const res = await fetch('/api/catalogos/subcontratistas');
        const data = await res.json();
        if (data.success) {
          setCatPrincipales(data.principales);
          setCatCuadrillas(data.cuadrillas);
        }

        // --- CARGAR PUESTOS DESDE LA API ---
        const resPuestos = await fetch('/api/fuerza-trabajo/puestos');
        const dataPuestos = await resPuestos.json();
        if (dataPuestos.success) {
          setCatPuestos(dataPuestos.puestos);
        }
      } catch (error) {
        console.error("Error cargando catálogos", error);
      }
    };
    fetchCatalogos();
  }, []);

  useEffect(() => {
    const fetchCatalogos = async () => {
      try {
        const res = await fetch('/api/catalogos/subcontratistas');
        const data = await res.json();
        if (data.success) {
          setCatPrincipales(data.principales);
          setCatCuadrillas(data.cuadrillas);
        }
      } catch (error) {}
    };
    fetchCatalogos();
  }, []);

  const fetchTrabajadores = async () => {
    setLoading(true);
    try {
      let url = `/api/fuerza-trabajo?ordenPor=${ordenPor}&ordenDireccion=${ordenDireccion}&`;
      if (filtroSub) url += `subcontratista=${filtroSub}&`; 
      if (fechaInicio && fechaFin) url += `fechaInicio=${fechaInicio}&fechaFin=${fechaFin}&`;
      if (busqueda) url += `busqueda=${encodeURIComponent(busqueda)}&`;

      const res = await fetch(url);
      const json = await res.json();
      if (json.success) setTrabajadores(json.data);
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTrabajadores(); }, [filtroSub, fechaInicio, fechaFin, busqueda, ordenPor, ordenDireccion]);
  useEffect(() => { setCurrentPage(1); }, [filtroSub, fechaInicio, fechaFin, busqueda, ordenPor, ordenDireccion]);

  useEffect(() => {
    if (topRef.current) topRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [currentPage]);

  const totalPages = Math.ceil(trabajadores.length / itemsPerPage);
  
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
  const trabajadoresPaginados = trabajadores.slice(indexOfFirstItem, indexOfLastItem);

  const manejarOrden = (columna) => {
    if (ordenPor === columna) setOrdenDireccion(ordenDireccion === 'ASC' ? 'DESC' : 'ASC');
    else { setOrdenPor(columna); setOrdenDireccion('ASC'); }
  };

  // --- NUEVA FUNCIÓN DE EXPORTACIÓN CON CONFIRMACIÓN ---
  const handleExportarClick = () => {
    if (!fechaInicio || !fechaFin) {
      alert("Por favor selecciona las fechas de la semana que deseas exportar.");
      return;
    }
    const confirmacion = window.confirm(`¿Confirmas que deseas exportar únicamente al personal activo en el periodo del ${formatDDMMYYYY(fechaInicio)} al ${formatDDMMYYYY(fechaFin)}?`);
    if (confirmacion) {
      const url = `/api/fuerza-trabajo/exportar?fechaInicio=${fechaInicio}&fechaFin=${fechaFin}&subcontratista=${filtroSub}`;
      window.open(url, '_blank');
    }
  };

  const handleOpenImportModal = () => {
    setImportFile(null); setImportSubcontratista(''); setImportPreviewData([]);
    setImportError(''); setImportFase(1); setIsImportModalOpen(true);
  };

  const handleAnalizarExcel = async (e) => {
    e.preventDefault();
    if (!importFile || !importSubcontratista) { setImportError("Por favor selecciona un archivo y la contratista."); return; }
    setImporting(true); setImportError('');

    const formData = new FormData();
    formData.append('file', importFile); formData.append('id_subcontratista_principal', importSubcontratista);

    try {
      const res = await fetch('/api/fuerza-trabajo/importar', { method: 'POST', body: formData });
      const data = await res.json();

      if (res.ok && data.success) {
        setImportPreviewData(data.data); setImportResumen({ totales: data.totalesExcel, nuevos: data.nuevos }); setImportFase(2);
      } else setImportError(data.error || "Error al procesar el archivo.");
    } catch (error) { setImportError("Error de conexión con el servidor."); } finally { setImporting(false); }
  };

  const handleGuardarImportacion = async () => {
    if (importPreviewData.length === 0) return;
    setImporting(true);
    try {
      const res = await fetch('/api/fuerza-trabajo/importar', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ trabajadores: importPreviewData }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setIsImportModalOpen(false); fetchTrabajadores(); alert(data.mensaje); 
      } else setImportError(data.error || "Error al guardar en base de datos.");
    } catch (error) { setImportError("Error de conexión al guardar."); } finally { setImporting(false); }
  };

  const handleNewClick = () => {
    setFormData(formInicial); setIsEditing(false); setEditId(null); setIsModalOpen(true);
  };

  const handleEditClick = (trabajador) => {
    setFormData({
      numero_empleado: trabajador.numero_empleado || '',
      nombre_trabajador: trabajador.nombre_trabajador,
      puesto_categoria: trabajador.puesto_categoria,
      nss: trabajador.nss || '',
      fecha_ingreso_obra: formatForInput(trabajador.fecha_ingreso_obra),
      fecha_alta_imss: formatForInput(trabajador.fecha_alta_imss),
      origen: trabajador.origen,
      id_subcontratista_ft: trabajador.id_subcontratista_ft || '',
      id_subcontratista_principal: trabajador.id_subcontratista_principal || ''
    });
    setEditId(trabajador.id_trabajador); setIsEditing(true); setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.nss && !/^\d{11}$/.test(formData.nss)) {
      alert("El NSS debe contener exactamente 11 dígitos numéricos."); return;
    }
    if (formData.fecha_alta_imss && formData.fecha_ingreso_obra) {
      const alta = new Date(formData.fecha_alta_imss); const ingreso = new Date(formData.fecha_ingreso_obra);
      if (alta > ingreso) { alert("Error: La fecha de alta del IMSS no puede ser mayor a la fecha de ingreso."); return; }
    }
    setSaving(true);
    try {
      const url = '/api/fuerza-trabajo';
      const method = isEditing ? 'PUT' : 'POST';
      const bodyData = isEditing ? { ...formData, id_trabajador: editId } : formData;

      const res = await fetch(url, {
        method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(bodyData)
      });
      const data = await res.json();
      
      if (data.success) { setIsModalOpen(false); fetchTrabajadores(); } else alert(data.error);
    } catch (error) { alert("Error de conexión al guardar"); } finally { setSaving(false); }
  };

  const handleBajaClick = (id) => {
    setBajaId(id); setBajaFecha(new Date().toISOString().split('T')[0]); setIsBajaModalOpen(true);
  };

  const handleBajaSubmit = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      const res = await fetch('/api/fuerza-trabajo', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id_trabajador: bajaId, fecha_baja: bajaFecha })
      });
      const data = await res.json();
      if (data.success) { setIsBajaModalOpen(false); fetchTrabajadores(); } else alert(data.error);
    } catch (error) { alert("Error de conexión"); } finally { setSaving(false); }
  };

  const limpiarFiltros = () => { 
    setFiltroSub(''); 
    setBusqueda(''); 
    setFechaInicio(getDateString(haceUnaSemana));
    setFechaFin(getDateString(hoy));
  };

  const cuadrillasFiltradas = catCuadrillas.filter(c => c.id_subcontratista_principal == formData.id_subcontratista_principal);

  return (
    <div className="space-y-6 relative" ref={topRef}>
      
      {/* HEADER Y BOTONES RESPONSIVOS */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center space-y-4 xl:space-y-0">
        <h2 className="text-xl sm:text-2xl font-bold text-[var(--recal-blue)] dark:text-white">Control de Fuerza de Trabajo</h2>
        
        <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2 w-full xl:w-auto">
          
          <button onClick={handleOpenImportModal} className="flex-1 sm:flex-none justify-center bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded-md font-bold shadow-sm transition-colors text-xs sm:text-sm flex items-center">
            <Upload className="w-4 h-4 mr-1 sm:mr-2" /> Importar Excel
          </button>

          {/* CONTROL UNIFICADO DE PERIODO POR RANGOS DE FECHA */}
          <div className="flex items-center justify-between sm:justify-start space-x-1 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 p-1.5 rounded-md shadow-sm w-full sm:w-auto">
            <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase px-2 hidden md:inline">Filtro / Exportación:</span>
            <input type="date" className="text-xs sm:text-sm bg-transparent border-gray-300 dark:border-slate-600 dark:text-gray-200 rounded py-1 px-1 sm:px-2 focus:ring-[var(--recal-blue)] outline-none flex-1 sm:flex-none w-full sm:w-36" 
              value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} />
            <span className="text-xs font-bold text-gray-400 dark:text-gray-500 px-1">al</span>
            <input type="date" className="text-xs sm:text-sm bg-transparent border-gray-300 dark:border-slate-600 dark:text-gray-200 rounded py-1 px-1 sm:px-2 focus:ring-[var(--recal-blue)] outline-none flex-1 sm:flex-none w-full sm:w-36" 
              value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} />
          </div>

          <button onClick={handleExportarClick} className="flex-1 sm:flex-none justify-center bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-md font-bold shadow-sm transition-colors text-xs sm:text-sm flex items-center">
            <span className="mr-1 sm:mr-2">📊</span> Exportar
          </button>
          
          <button onClick={handleNewClick} className="w-full sm:w-auto bg-[var(--recal-blue)] hover:bg-[var(--recal-blue-hover)] text-white px-4 py-3 sm:py-2 rounded-md font-medium shadow-sm xl:ml-2">
            + Nuevo
          </button>
        </div>
      </div>

      {/* PANEL DE FILTROS REDUCIDO */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="md:col-span-2">
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">Buscar Trabajador</label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">🔍</span>
            <input type="text" placeholder="Nombre, NSS..." className="w-full pl-10 bg-transparent border border-gray-300 dark:border-slate-600 dark:text-white rounded-md p-2 shadow-sm focus:ring-[var(--recal-blue)] outline-none sm:text-sm" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
          </div>
        </div>
        <div className="md:col-span-1">
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">Contratista</label>
          <select className="w-full bg-transparent border border-gray-300 dark:border-slate-600 dark:text-white rounded-md shadow-sm focus:ring-[var(--recal-blue)] p-2 sm:text-sm outline-none" value={filtroSub} onChange={(e) => setFiltroSub(e.target.value)}>
            <option value="">Todas...</option>
            {catPrincipales.map(empresa => (<option key={empresa.id_subcontratista} value={empresa.id_subcontratista}>{empresa.razon_social}</option>))}
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors" onClick={() => manejarOrden('nombre_trabajador')}>Nombre {ordenPor === 'nombre_trabajador' && (ordenDireccion === 'ASC' ? '↑' : '↓')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors" onClick={() => manejarOrden('puesto_categoria')}>Categoría {ordenPor === 'puesto_categoria' && (ordenDireccion === 'ASC' ? '↑' : '↓')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors" onClick={() => manejarOrden('nss')}>NSS {ordenPor === 'nss' && (ordenDireccion === 'ASC' ? '↑' : '↓')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[var(--recal-blue)] dark:text-blue-400 uppercase cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors" onClick={() => manejarOrden('fecha_ingreso_obra')}>Ingreso {ordenPor === 'fecha_ingreso_obra' && (ordenDireccion === 'ASC' ? '↑' : '↓')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors" onClick={() => manejarOrden('nombre_subcontratista')}>Contratista {ordenPor === 'nombre_subcontratista' && (ordenDireccion === 'ASC' ? '↑' : '↓')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Estatus</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Acciones</th>
                {(userRole === 'Admin' || userRole === 'Master') && (
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Trazabilidad</th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-slate-800 divide-y md:divide-y-0 md:divide-gray-200 dark:md:divide-slate-700 block md:table-row-group">
              {loading ? (
                <tr className="block md:table-row"><td colSpan="8" className="px-6 py-8 text-center text-sm text-gray-500 dark:text-gray-400 block md:table-cell">Cargando personal...</td></tr>
              ) : trabajadores.length === 0 ? (
                <tr className="block md:table-row">
                  <td colSpan="8" className="px-6 py-12 text-center block md:table-cell">
                    <div className="text-gray-400 dark:text-gray-500 text-4xl mb-2">🔍</div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-200">No se encontraron resultados en esta semana</p>
                  </td>
                </tr>
              ) : trabajadoresPaginados.map((t) => (
                  <tr key={t.id_trabajador} className="block md:table-row border border-gray-200 dark:border-slate-700 md:border-none mb-4 md:mb-0 rounded-lg shadow-sm md:shadow-none p-4 md:p-0 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
                    <td className="flex justify-between items-center md:table-cell px-2 md:px-6 py-2 md:py-4 text-sm font-bold text-[var(--recal-blue)] dark:text-white md:text-gray-900 border-b dark:border-slate-700 md:border-none">
                      <span className="md:hidden font-bold text-gray-500 dark:text-gray-400">Nombre:</span>{t.nombre_trabajador}
                    </td>
                    <td className="flex justify-between items-center md:table-cell px-2 md:px-6 py-2 md:py-4 text-sm text-gray-500 dark:text-gray-300 border-b dark:border-slate-700 md:border-none">
                      <span className="md:hidden font-bold text-gray-500 dark:text-gray-400">Categoría:</span>{t.puesto_categoria}
                    </td>
                    <td className="flex justify-between items-center md:table-cell px-2 md:px-6 py-2 md:py-4 text-sm text-gray-500 dark:text-gray-300 border-b dark:border-slate-700 md:border-none">
                      <span className="md:hidden font-bold text-gray-500 dark:text-gray-400">NSS:</span>{t.nss || 'N/A'}
                    </td>
                    <td className="flex justify-between items-center md:table-cell px-2 md:px-6 py-2 md:py-4 text-sm text-gray-500 dark:text-gray-300 border-b dark:border-slate-700 md:border-none">
                      <span className="md:hidden font-bold text-gray-500 dark:text-gray-400">Ingreso:</span>{formatDDMMYYYY(t.fecha_ingreso_obra)}
                    </td>
                    <td className="flex justify-between items-center md:table-cell px-2 md:px-6 py-2 md:py-4 text-sm text-gray-500 dark:text-gray-300 border-b dark:border-slate-700 md:border-none">
                      <span className="md:hidden font-bold text-gray-500 dark:text-gray-400">Contratista:</span>{t.nombre_subcontratista || 'RECAL'}
                    </td>
                    <td className="flex justify-between items-center md:table-cell px-2 md:px-6 py-2 md:py-4 text-sm border-b dark:border-slate-700 md:border-none">
                      <span className="md:hidden font-bold text-gray-500 dark:text-gray-400">Estatus:</span>
                      {t.fecha_baja ? (<span className="px-2 inline-flex text-xs font-semibold rounded-full bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300">Baja: {formatDDMMYYYY(t.fecha_baja)}</span>) : (<span className="px-2 inline-flex text-xs font-semibold rounded-full bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300">Activo</span>)}
                    </td>
                    <td className="flex justify-end items-center md:table-cell px-2 md:px-6 py-4 md:py-4 text-sm font-medium border-b dark:border-slate-700 md:border-none">
                      <div className="flex justify-end items-center gap-2 md:gap-3">
                        <button onClick={() => handleEditClick(t)} title="Editar" className="text-[var(--recal-blue)] dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 p-2 rounded-md transition-colors"><Pencil className="w-4 h-4 sm:w-5 sm:h-5" /></button>
                        {!t.fecha_baja ? (
                          <button onClick={() => handleBajaClick(t.id_trabajador)} title="Dar Baja" className="text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/30 p-2 rounded-md transition-colors"><Trash2 className="w-4 h-4 sm:w-5 sm:h-5" /></button>
                        ) : (<span className="text-gray-400 dark:text-gray-500 italic text-xs px-2 flex items-center h-full">Retirado</span>)}
                      </div>
                    </td>
                      {(userRole === 'Admin' || userRole === 'Master') && (
                        <td className="flex justify-between items-center md:table-cell px-2 md:px-4 py-2 md:py-4 border-b dark:border-slate-700 md:border-none">
                          <span className="md:hidden font-bold text-gray-500 dark:text-gray-400 text-sm">Trazabilidad:</span>
                          <div className="flex flex-col items-end md:items-start gap-1">
                            {t.creador ? (
                              <span className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 px-2 py-0.5 rounded text-[10px] font-bold border border-green-200 dark:border-green-800 w-max" title="Registrado por">
                                Agregó: {t.creador}
                              </span>
                            ) : (
                              <span className="bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-gray-400 px-2 py-0.5 rounded text-[10px] font-bold border border-gray-200 dark:border-slate-600 w-max" title="Registrado por Master">
                                Agregó: Master
                              </span>
                            )}
                            {t.modificador && (
                              <span className="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 px-2 py-0.5 rounded text-[10px] font-bold border border-yellow-200 dark:border-yellow-800 w-max" title="Modificado por">
                                Modificó: {t.modificador}
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

      {/* CONTROLES DE PAGINACIÓN */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between bg-white dark:bg-slate-800 px-4 py-3 border border-gray-200 dark:border-slate-700 rounded-lg shadow-sm gap-4 sm:gap-0 mt-4">
          <div className="text-sm text-gray-700 dark:text-gray-300 text-center sm:text-left">
            Mostrando del <span className="font-bold">{indexOfFirstItem + 1}</span> al <span className="font-bold">{Math.min(indexOfLastItem, trabajadores.length)}</span> de <span className="font-bold">{trabajadores.length}</span> trabajadores
          </div>
          <div>
            <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
              <button onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1} className={`relative inline-flex items-center px-3 py-2 rounded-l-md border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm font-medium ${currentPage === 1 ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors'}`}>Anterior</button>
              <div className="hidden md:flex">
                {getPageNumbers().map(page => (
                  <button key={page} onClick={() => setCurrentPage(page)} className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium transition-colors ${currentPage === page ? 'z-10 bg-blue-50 dark:bg-blue-900/30 border-[var(--recal-blue)] dark:border-blue-500 text-[var(--recal-blue)] dark:text-blue-400' : 'bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-600 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700'}`}>{page}</button>
                ))}
              </div>
              <span className="md:hidden relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm font-medium text-gray-700 dark:text-gray-300">{currentPage} / {totalPages}</span>
              <button onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages} className={`relative inline-flex items-center px-3 py-2 rounded-r-md border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm font-medium ${currentPage === totalPages ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors'}`}>Siguiente</button>
            </nav>
          </div>
        </div>
      )}

      {/* MODAL 1: REGISTRO / EDICIÓN */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border dark:border-slate-700">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700 flex justify-between items-center bg-[var(--recal-gray)] dark:bg-slate-900">
              <h3 className="text-lg font-bold text-[var(--recal-blue)] dark:text-white">{isEditing ? 'Editar Trabajador' : 'Registro de Nuevo Trabajador'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 font-bold text-xl">&times;</button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Nombre Completo *</label>
                  <input required type="text" className="mt-1 w-full bg-transparent border border-gray-300 dark:border-slate-600 dark:text-white rounded-md p-2 focus:ring-[var(--recal-blue)] outline-none" value={formData.nombre_trabajador} onChange={e => setFormData({...formData, nombre_trabajador: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Puesto / Categoría *</label>
                  <select 
                    required 
                    className="mt-1 w-full bg-transparent border border-gray-300 dark:border-slate-600 dark:text-white rounded-md p-2 focus:ring-[var(--recal-blue)] outline-none" 
                    value={formData.puesto_categoria} 
                    onChange={e => setFormData({...formData, puesto_categoria: e.target.value})}
                  >
                    <option value="" className="dark:bg-slate-800">Seleccione un puesto...</option>
                    {catPuestos.map((puesto, index) => (
                      <option key={index} value={puesto} className="dark:bg-slate-800">{puesto}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Origen *</label>
                  <select className="mt-1 w-full bg-transparent border border-gray-300 dark:border-slate-600 dark:text-white rounded-md p-2 focus:ring-[var(--recal-blue)] outline-none" value={formData.origen} onChange={e => setFormData({...formData, origen: e.target.value})}>
                    <option value="Local" className="dark:bg-slate-800">Local</option><option value="Foráneo" className="dark:bg-slate-800">Foráneo</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Número de Seguridad Social (NSS)</label>
                  <input type="text" maxLength={11} className="mt-1 w-full bg-transparent border border-gray-300 dark:border-slate-600 dark:text-white rounded-md p-2 focus:ring-[var(--recal-blue)] outline-none placeholder-gray-400 dark:placeholder-gray-500" placeholder="11 dígitos" value={formData.nss} onChange={e => setFormData({...formData, nss: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Fecha Alta IMSS (Opcional)</label>
                  <input type="date" className="mt-1 w-full bg-transparent border border-gray-300 dark:border-slate-600 dark:text-white rounded-md p-2 focus:ring-[var(--recal-blue)] outline-none" value={formData.fecha_alta_imss} onChange={e => setFormData({...formData, fecha_alta_imss: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Fecha Ingreso a Obra *</label>
                  <input required type="date" className="mt-1 w-full bg-transparent border border-gray-300 dark:border-slate-600 dark:text-white rounded-md p-2 focus:ring-[var(--recal-blue)] outline-none" value={formData.fecha_ingreso_obra} onChange={e => setFormData({...formData, fecha_ingreso_obra: e.target.value})} />
                </div>
                <div className="md:col-span-1 bg-blue-50 dark:bg-blue-900/20 p-3 rounded border border-blue-100 dark:border-blue-800/50">
                  <label className="block text-sm font-bold text-blue-900 dark:text-blue-400">Contratista Principal *</label>
                  <select required className="mt-1 w-full bg-transparent border border-gray-300 dark:border-slate-600 dark:text-white rounded-md p-2 focus:ring-[var(--recal-blue)] outline-none" value={formData.id_subcontratista_principal} onChange={e => setFormData({...formData, id_subcontratista_principal: e.target.value, id_subcontratista_ft: ''})}>
                    <option value="" className="dark:bg-slate-800">Seleccione Principal...</option>
                    {catPrincipales.map(empresa => (<option key={empresa.id_subcontratista} value={empresa.id_subcontratista} className="dark:bg-slate-800">{empresa.razon_social}</option>))}
                  </select>
                </div>
                <div className={`md:col-span-1 p-3 rounded border ${!formData.id_subcontratista_principal ? 'bg-gray-100 dark:bg-slate-700/50 border-gray-200 dark:border-slate-700/50' : 'bg-white dark:bg-transparent border-gray-300 dark:border-slate-600'}`}>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Cuadrilla (Opcional)</label>
                  <select disabled={!formData.id_subcontratista_principal} className={`mt-1 w-full bg-transparent rounded-md p-2 outline-none ${!formData.id_subcontratista_principal ? 'cursor-not-allowed text-gray-400 dark:text-gray-500 border-none' : 'border border-gray-300 dark:border-slate-600 dark:text-white focus:ring-[var(--recal-blue)]'}`} value={formData.id_subcontratista_ft} onChange={e => setFormData({...formData, id_subcontratista_ft: e.target.value})}>
                    <option value="" className="dark:bg-slate-800">Ninguna...</option>
                    {cuadrillasFiltradas.map(cuadrilla => (<option key={cuadrilla.id_subcontratista_ft} value={cuadrilla.id_subcontratista_ft} className="dark:bg-slate-800">{cuadrilla.nombre}</option>))}
                  </select>
                </div>
              </div>
              <div className="pt-4 flex justify-end space-x-3 border-t border-gray-200 dark:border-slate-700 mt-6">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">Cancelar</button>
                <button type="submit" disabled={saving} className="px-4 py-2 bg-[var(--recal-blue)] text-white rounded-md hover:bg-[var(--recal-blue-hover)] transition-colors">
                  {saving ? 'Guardando...' : (isEditing ? 'Actualizar Datos' : 'Guardar Trabajador')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: CONFIRMACIÓN DE BAJA */}
      {isBajaModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-sm w-full border dark:border-slate-700">
            <div className="px-6 py-4 border-b border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-900/20 rounded-t-lg">
              <h3 className="text-lg font-bold text-red-700 dark:text-red-400">Confirmar Baja</h3>
            </div>
            <form onSubmit={handleBajaSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Fecha de salida de la obra *</label>
                <input required type="date" className="mt-1 w-full bg-transparent border border-gray-300 dark:border-slate-600 dark:text-white rounded-md p-2 focus:ring-red-500 outline-none" value={bajaFecha} onChange={e => setBajaFecha(e.target.value)} />
              </div>
              <div className="pt-4 flex justify-end space-x-3 border-t border-gray-200 dark:border-slate-700 mt-6">
                <button type="button" onClick={() => setIsBajaModalOpen(false)} className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">Cancelar</button>
                <button type="submit" disabled={saving} className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors font-medium">{saving ? 'Procesando...' : 'Confirmar Baja'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL 3: IMPORTACIÓN DE EXCEL (Carga Masiva) --- */}
      {isImportModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-4xl w-full max-h-[95vh] overflow-hidden flex flex-col border dark:border-slate-700">
            
            {/* Header del Modal */}
            <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700 flex justify-between items-center bg-purple-50 dark:bg-purple-900/20">
              <div className="flex items-center">
                <FileSpreadsheet className="w-6 h-6 text-purple-600 dark:text-purple-400 mr-2" />
                <h3 className="text-xl font-bold text-purple-900 dark:text-purple-300">Importación Masiva de Personal</h3>
              </div>
              <button onClick={() => setIsImportModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 font-bold text-2xl">&times;</button>
            </div>

            {/* Contenido */}
            <div className="p-6 overflow-y-auto flex-1 bg-gray-50 dark:bg-slate-900">
              
              {importError && (
                <div className="mb-4 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 text-red-700 dark:text-red-400 p-4 text-sm shadow-sm">
                  <p className="font-bold">Error de lectura</p>
                  <p>{importError}</p>
                </div>
              )}

              {/* FASE 1: Seleccionar Archivo y Contratista */}
              {importFase === 1 && (
                <form onSubmit={handleAnalizarExcel} className="space-y-6 bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 bg-blue-50 dark:bg-blue-900/20 p-3 rounded border border-blue-100 dark:border-blue-800/50">
                    Sube el formato oficial de Fuerza de Trabajo <b>(09_FUERZA_TRABAJO.xlsx)</b>. El sistema extraerá a los trabajadores a partir de la Fila 5, cruzará los datos con tu base instalada mediante el <b>NSS</b> y te mostrará únicamente a las personas que son nuevas en la obra.
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">1. Selecciona a la Contratista Empleadora *</label>
                      <select required className="w-full bg-transparent border border-gray-300 dark:border-slate-600 dark:text-white rounded-md p-3 focus:ring-purple-500 focus:border-purple-500 outline-none shadow-sm" value={importSubcontratista} onChange={(e) => setImportSubcontratista(e.target.value)}>
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

              {/* FASE 2: Previsualización de Datos Nuevos */}
              {importFase === 2 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-gray-200 dark:border-slate-700 shadow-sm">
                      <p className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase">Total en el Excel</p>
                      <p className="text-2xl font-bold text-gray-700 dark:text-gray-200">{importResumen.totales}</p>
                    </div>
                    <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-gray-200 dark:border-slate-700 shadow-sm">
                      <p className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase">Ya registrados (Omitidos)</p>
                      <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{importResumen.totales - importResumen.nuevos}</p>
                    </div>
                    <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg border border-purple-200 dark:border-purple-800/50 shadow-sm">
                      <p className="text-xs text-purple-700 dark:text-purple-400 font-bold uppercase">Nuevos por guardar</p>
                      <p className="text-3xl font-black text-purple-700 dark:text-purple-400">{importResumen.nuevos}</p>
                    </div>
                  </div>

                  {importPreviewData.length === 0 ? (
                    <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/50 rounded-lg p-8 text-center">
                      <p className="text-green-700 dark:text-green-400 font-bold text-lg mb-2">¡Todo al día!</p>
                      <p className="text-green-600 dark:text-green-500">Todos los trabajadores de este Excel ya existen actualmente en tu base de datos. No hay nada nuevo que agregar.</p>
                    </div>
                  ) : (
                    <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden">
                      <div className="max-h-64 overflow-y-auto">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700 text-sm">
                          <thead className="bg-gray-100 dark:bg-slate-900 sticky top-0">
                            <tr>
                              <th className="px-4 py-3 text-left font-bold text-gray-600 dark:text-gray-400">Nombre</th>
                              <th className="px-4 py-3 text-left font-bold text-gray-600 dark:text-gray-400">Categoría</th>
                              <th className="px-4 py-3 text-left font-bold text-gray-600 dark:text-gray-400">NSS</th>
                              <th className="px-4 py-3 text-left font-bold text-gray-600 dark:text-gray-400">Ingreso</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                            {importPreviewData.map((t, idx) => (
                              <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                                <td className="px-4 py-2 font-medium text-gray-900 dark:text-gray-200">{t.nombre_trabajador}</td>
                                <td className="px-4 py-2 text-gray-600 dark:text-gray-400">{t.puesto_categoria}</td>
                                <td className="px-4 py-2 text-gray-600 dark:text-gray-400">{t.nss || 'S/N'}</td>
                                <td className="px-4 py-2 text-gray-600 dark:text-gray-400">{formatDDMMYYYY(t.fecha_ingreso_obra)}</td>
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

            {/* Footer del Modal */}
            <div className="px-6 py-4 border-t border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex justify-end space-x-3">
              <button onClick={() => setIsImportModalOpen(false)} className="px-6 py-2 border border-gray-300 dark:border-slate-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 font-medium transition-colors">
                Cancelar
              </button>
              {importFase === 2 && importPreviewData.length > 0 && (
                <button onClick={handleGuardarImportacion} disabled={importing} className="px-6 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 font-bold transition-colors shadow-md flex items-center disabled:bg-gray-400 dark:disabled:bg-slate-600">
                  {importing ? 'Guardando...' : `Guardar ${importResumen.nuevos} Nuevos Registros`}
                </button>
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
}