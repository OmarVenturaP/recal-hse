"use client";

import { useState, useEffect, useRef } from 'react';
import { ClipboardList, Pencil, Trash2 } from 'lucide-react';

export default function MaquinariaPage() {
  const topRef = useRef(null); // Referencia para el scroll suave

  // Estados de Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  
  const [maquinaria, setMaquinaria] = useState([]);
  const [loading, setLoading] = useState(true);

  // Catálogos y Filtros
  const [catPrincipales, setCatPrincipales] = useState([]);
  const [filtroSub, setFiltroSub] = useState('');
  const [busqueda, setBusqueda] = useState('');

  // Exportación
  const currentYear = new Date().getFullYear();
  const currentMonth = String(new Date().getMonth() + 1).padStart(2, '0');
  const [exportMes, setExportMes] = useState(currentMonth);
  const [exportAnio, setExportAnio] = useState(String(currentYear));

  // Estados para Modal de Registro / Edición
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  
  const formInicial = {
    num_economico: '', tipo: '', marca: '', anio: '', modelo: '', 
    color: '', serie: '', placa: '', horometro: '', 
    intervalo_mantenimiento: '', fecha_ingreso_obra: '', id_subcontratista: '',
    imagen_url_actual: ''
  };
  const [formData, setFormData] = useState(formInicial);

  // Estados para Modal de Baja
  const [isBajaModalOpen, setIsBajaModalOpen] = useState(false);
  const [bajaId, setBajaId] = useState(null);
  const [bajaFecha, setBajaFecha] = useState('');

  // Estados para Modal de Historial
  const [isHistorialOpen, setIsHistorialOpen] = useState(false);
  const [maquinaSeleccionada, setMaquinaSeleccionada] = useState(null);
  const [historial, setHistorial] = useState([]);
  const [formMantenimiento, setFormMantenimiento] = useState({
    fecha_mantenimiento: '', tipo_mantenimiento: 'Preventivo', horometro_mantenimiento: '', observaciones: ''
  });

  // --- Funciones de Formato ---
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
      let url = `/api/maquinaria?mes=${exportMes}&anio=${exportAnio}&`;
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

  useEffect(() => { fetchMaquinaria(); }, [filtroSub, exportMes, exportAnio, busqueda]);

  // Regresar a la página 1 al usar filtros
  useEffect(() => { setCurrentPage(1); }, [busqueda, filtroSub, exportMes, exportAnio]);

  // --- LÓGICA DE PAGINACIÓN AVANZADA Y SCROLL ---
  useEffect(() => {
    if (topRef.current) {
      topRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
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

      if (currentPage <= 3) {
        endPage = 5;
      } else if (currentPage >= totalPages - 2) {
        startPage = totalPages - 4;
      }

      for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
      }
    }
    return pages;
  };

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const maquinariaPaginada = maquinaria.slice(indexOfFirstItem, indexOfLastItem);

  // --- ACCIONES DE EDICIÓN Y NUEVO ---
  const handleNewClick = () => {
    setFormData(formInicial);
    setImageFile(null);
    setIsEditing(false);
    setEditId(null);
    setIsModalOpen(true);
  };

  const handleEditClick = (m) => {
    setFormData({
      num_economico: m.num_economico || '', tipo: m.tipo || '', marca: m.marca || '', 
      anio: m.anio || '', modelo: m.modelo || '', color: m.color || '', 
      serie: m.serie || '', placa: m.placa || '', horometro: m.horometro_actual || '', 
      intervalo_mantenimiento: m.intervalo_mantenimiento || '', 
      fecha_ingreso_obra: formatForInput(m.fecha_ingreso_obra), 
      id_subcontratista: m.id_subcontratista || '',
      imagen_url_actual: m.imagen_url || ''
    });
    setImageFile(null); 
    setEditId(m.id_maquinaria);
    setIsEditing(true);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    
    const submitData = new FormData();
    Object.keys(formData).forEach(key => submitData.append(key, formData[key]));
    if (isEditing) submitData.append('id_maquinaria', editId);
    if (imageFile) submitData.append('imagen', imageFile);

    try {
      const method = isEditing ? 'PUT' : 'POST';
      const res = await fetch('/api/maquinaria', { method, body: submitData });
      const data = await res.json();
      
      if (data.success) {
        setIsModalOpen(false);
        setImageFile(null);
        fetchMaquinaria();
      } else alert(data.error);
    } catch (error) {
      alert("Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  // --- ACCIONES DE BAJA ---
  const handleBajaClick = (id) => {
    setBajaId(id);
    setBajaFecha(new Date().toISOString().split('T')[0]);
    setIsBajaModalOpen(true);
  };

  const handleBajaSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/maquinaria', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_maquinaria: bajaId, fecha_baja: bajaFecha })
      });
      const data = await res.json();
      if (data.success) {
        setIsBajaModalOpen(false);
        fetchMaquinaria();
      } else alert(data.error);
    } catch (error) {
      alert("Error de conexión");
    } finally {
      setSaving(false);
    }
  };

  // --- HISTORIAL ---
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
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/maquinaria/mantenimiento', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formMantenimiento, id_maquinaria: maquinaSeleccionada.id_maquinaria })
      });
      const data = await res.json();
      if (data.success) {
        abrirHistorial(maquinaSeleccionada);
        fetchMaquinaria(); 
      }
    } catch (error) {} finally { setSaving(false); }
  };

  const renderBadge = (estado, horasRestantes) => {
    if (estado === 'N/A') return <span className="text-gray-400 text-xs">No aplica</span>;
    let colorClass = "bg-green-100 text-green-800";
    if (estado === 'Vencido') colorClass = "bg-red-100 text-red-800 animate-pulse";
    else if (estado === 'Próximo') colorClass = "bg-yellow-100 text-yellow-800";
    return (
      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-bold rounded-full shadow-sm ${colorClass}`}>
        {estado === 'Vencido' ? `Vencido por ${Math.abs(horasRestantes)} hrs` : `Faltan ${horasRestantes} hrs`}
      </span>
    );
  };

  return (
    <div className="space-y-6 relative" ref={topRef}>
      
      {/* HEADER Y BOTONES RESPONSIVOS */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center space-y-4 lg:space-y-0">
        <h2 className="text-xl sm:text-2xl font-bold text-[var(--recal-blue)]">Maquinaria y Equipo</h2>
        
        <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3 w-full lg:w-auto">
          {/* CONTROL DE PERIODO PARA EXPORTACIÓN */}
          <div className="flex items-center justify-between sm:justify-start space-x-2 bg-gray-50 border border-gray-200 p-1.5 rounded-md shadow-sm w-full sm:w-auto">
            <span className="text-xs font-bold text-gray-500 uppercase px-2 hidden md:inline">Reporte:</span>
            <select className="text-sm border-gray-300 rounded py-1 pl-2 pr-8 focus:ring-[var(--recal-blue)] outline-none flex-1 sm:flex-none" value={exportMes} onChange={(e) => setExportMes(e.target.value)}>
              <option value="01">Enero</option><option value="02">Febrero</option>
              <option value="03">Marzo</option><option value="04">Abril</option>
              <option value="05">Mayo</option><option value="06">Junio</option>
              <option value="07">Julio</option><option value="08">Agosto</option>
              <option value="09">Septiembre</option><option value="10">Octubre</option>
              <option value="11">Noviembre</option><option value="12">Diciembre</option>
            </select>
            <select className="text-sm border-gray-300 rounded py-1 pl-2 pr-8 focus:ring-[var(--recal-blue)] outline-none flex-1 sm:flex-none" value={exportAnio} onChange={(e) => setExportAnio(e.target.value)}>
              <option value="2024">2024</option><option value="2025">2025</option>
              <option value="2026">2026</option><option value="2027">2027</option>
            </select>
          </div>

          <div className="flex gap-2 w-full sm:w-auto">
            <a href={`/api/maquinaria/exportar-utilizacion?mes=${exportMes}&anio=${exportAnio}`} target="_blank" className="flex-1 sm:flex-none justify-center bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-md font-bold shadow-sm transition-colors text-xs sm:text-sm flex items-center">
              <span className="mr-1 sm:mr-2">📊</span> <span className="hidden sm:inline">11. Prog Utilización</span><span className="sm:hidden">Utilización</span>
            </a>
            <a href={`/api/maquinaria/exportar-plan-servicio?mes=${exportMes}&anio=${exportAnio}`} target="_blank" className="flex-1 sm:flex-none justify-center bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-md font-bold shadow-sm transition-colors text-xs sm:text-sm flex items-center">
              <span className="mr-1 sm:mr-2">🛠️</span> <span className="hidden sm:inline">12. Plan Servicio</span><span className="sm:hidden">Servicio</span>
            </a>
          </div>
          
          <button onClick={handleNewClick} className="w-full sm:w-auto bg-[var(--recal-blue)] hover:bg-[var(--recal-blue-hover)] text-white px-4 py-3 sm:py-2 rounded-md font-medium shadow-sm lg:ml-2">
            + Registrar Equipo
          </button>
        </div>
      </div>

      {/* PANEL DE FILTROS Y BÚSQUEDA */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="w-full">
          <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Buscar Equipo</label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">🔍</span>
            <input type="text" placeholder="Num Eco, Serie, Marca, Placa..." 
              className="w-full pl-10 border border-gray-300 rounded-md p-2 shadow-sm focus:ring-[var(--recal-blue)] outline-none sm:text-sm"
              value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
          </div>
        </div>
        <div className="w-full">
          <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Filtrar por Contratista</label>
          <select className="w-full border border-gray-300 rounded-md p-2 shadow-sm focus:ring-[var(--recal-blue)] outline-none sm:text-sm" 
            value={filtroSub} onChange={(e) => setFiltroSub(e.target.value)}>
            <option value="">Todo el equipo en obra...</option>
            {catPrincipales.map(empresa => <option key={empresa.id_subcontratista} value={empresa.id_subcontratista}>{empresa.razon_social}</option>)}
          </select>
        </div>
      </div>

      {/* TABLA PRINCIPAL TABLE-TO-CARDS */}
      <div className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 hidden md:table-header-group">
              <tr>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Imagen</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Marca / Modelo</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contratista</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-blue-800 uppercase">Último Servicio</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Estatus</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acciones</th>
              </tr>
            </thead>
            
            <tbody className="bg-white divide-y md:divide-y-0 md:divide-gray-200 block md:table-row-group">
              {loading ? (
                <tr className="block md:table-row"><td colSpan="7" className="px-6 py-8 text-center text-sm text-gray-500 block md:table-cell">Cargando inventario...</td></tr>
              ) : maquinaria.length === 0 ? (
                <tr className="block md:table-row">
                  <td colSpan="7" className="px-6 py-12 text-center block md:table-cell">
                    <div className="text-gray-400 text-4xl mb-2">🔍</div>
                    <p className="text-sm font-medium text-gray-900">No se han encontrado resultados</p>
                    <p className="text-xs text-gray-500 mt-1">Intenta ajustando los filtros o los términos de búsqueda.</p>
                  </td>
                </tr>
              ) : maquinariaPaginada.map((m) => (
                  <tr key={m.id_maquinaria} className="block md:table-row border border-gray-200 md:border-none mb-4 md:mb-0 rounded-lg shadow-sm md:shadow-none p-4 md:p-0 hover:bg-gray-50">
                    
                    <td className="flex justify-between items-center md:table-cell px-2 md:px-4 py-2 md:py-4 border-b md:border-none">
                      <span className="md:hidden font-bold text-gray-500 text-sm">Foto:</span>
                      <div className="flex-shrink-0 h-12 w-12 md:h-10 md:w-10 mx-auto md:mx-0">
                        {m.imagen_url ? (
                          <img className="h-12 w-12 md:h-10 md:w-10 rounded-md object-cover border border-gray-200" src={m.imagen_url} alt="" />
                        ) : (
                          <div className="h-12 w-12 md:h-10 md:w-10 rounded-full bg-gray-100 flex items-center justify-center border border-gray-200 text-gray-400">🚜</div>
                        )}
                      </div>
                    </td>
                    
                    <td className="flex justify-between items-center md:table-cell px-2 md:px-4 py-2 md:py-4 text-sm font-bold text-[var(--recal-blue)] md:text-gray-900 border-b md:border-none">
                      <span className="md:hidden font-bold text-gray-500">Tipo:</span>
                      <span>{m.tipo}</span>
                    </td>
                    
                    <td className="flex justify-between items-center md:table-cell px-2 md:px-4 py-2 md:py-4 text-sm border-b md:border-none">
                      <span className="md:hidden font-bold text-gray-500">Equipo:</span>
                      <div className="text-right md:text-left">
                        <div className="text-sm text-gray-900">{m.marca} / {m.modelo}</div>
                        <div className="text-xs font-bold text-gray-500 bg-gray-100 inline-block px-1 mt-1 rounded">Num. Eco: {m.num_economico}</div>
                      </div>
                    </td>
                    
                    <td className="flex justify-between items-center md:table-cell px-2 md:px-4 py-2 md:py-4 text-sm text-gray-500 border-b md:border-none">
                      <span className="md:hidden font-bold text-gray-500">Contratista:</span>
                      <span>{m.nombre_subcontratista || '-'}</span>
                    </td>
                    
                    <td className="flex justify-between items-center md:table-cell px-2 md:px-4 py-2 md:py-4 border-b md:border-none">
                      <span className="md:hidden font-bold text-gray-500 text-sm">Último Servicio:</span>
                      <div className="text-right md:text-center">
                        <div className="text-sm font-semibold text-blue-900">{m.ultima_fecha_mantenimiento ? formatDDMMYYYY(m.ultima_fecha_mantenimiento) : 'Sin Registro'}</div>
                        <div className="text-xs text-gray-500">{m.horometro_actual ? `${m.horometro_actual} hrs` : ''}</div>
                      </div>
                    </td>
                    
                    <td className="flex justify-between items-center md:table-cell px-2 md:px-4 py-2 md:py-4 text-center border-b md:border-none">
                      <span className="md:hidden font-bold text-gray-500 text-sm">Estatus:</span>
                      <div>
                        {m.fecha_baja ? (
                          <span className="px-2 inline-flex text-xs font-semibold rounded-full bg-gray-200 text-gray-800">Baja: {formatDDMMYYYY(m.fecha_baja)}</span>
                        ) : (
                          renderBadge(m.estado_mantenimiento, m.horas_restantes)
                        )}
                      </div>
                    </td>
                    
                    <td className="flex justify-end items-center md:table-cell px-2 md:px-4 py-4 md:py-4 text-sm font-medium border-b md:border-none">
                      <div className="flex justify-end items-center gap-2 md:gap-3">
                        
                        {/* Botón Historial */}
                        <button 
                          onClick={() => abrirHistorial(m)} 
                          title="Historial de Servicio"
                          className="text-[var(--recal-blue)] bg-blue-50 hover:bg-blue-100 p-2 rounded-md border border-blue-200 transition-colors flex items-center justify-center"
                        >
                          <ClipboardList className="w-4 h-4 sm:w-5 sm:h-5" />
                        </button>
                        
                        {/* Botón Editar */}
                        <button 
                          onClick={() => handleEditClick(m)} 
                          title="Editar Equipo"
                          className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 p-2 rounded-md transition-colors flex items-center justify-center"
                        >
                          <Pencil className="w-4 h-4 sm:w-5 sm:h-5" />
                        </button>
                        
                        {/* Botón Baja */}
                        {!m.fecha_baja && (
                          <button 
                            onClick={() => handleBajaClick(m.id_maquinaria)} 
                            title="Dar de Baja"
                            className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-md transition-colors flex items-center justify-center"
                          >
                            <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
                          </button>
                        )}

                      </div>
                    </td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
      </div>

      {/* CONTROLES DE PAGINACIÓN AVANZADOS */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between bg-white px-4 py-3 border border-gray-200 rounded-lg shadow-sm gap-4 sm:gap-0 mt-4">
          <div className="text-sm text-gray-700 text-center sm:text-left">
            Mostrando del <span className="font-bold">{indexOfFirstItem + 1}</span> al <span className="font-bold">{Math.min(indexOfLastItem, maquinaria.length)}</span> de <span className="font-bold">{maquinaria.length}</span> equipos
          </div>
          <div>
            <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
              <button onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1}
                className={`relative inline-flex items-center px-3 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium ${currentPage === 1 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:bg-gray-50'}`}>
                Anterior
              </button>
              
              {/* Números dinámicos (Visibles en Tablet y PC) */}
              <div className="hidden md:flex">
                {getPageNumbers().map(page => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium transition-colors
                      ${currentPage === page 
                        ? 'z-10 bg-blue-50 border-[var(--recal-blue)] text-[var(--recal-blue)]' 
                        : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'}`}
                  >
                    {page}
                  </button>
                ))}
              </div>

              {/* Contador compacto (Visible solo en Celulares) */}
              <span className="md:hidden relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                {currentPage} / {totalPages}
              </span>

              <button onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages}
                className={`relative inline-flex items-center px-3 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium ${currentPage === totalPages ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:bg-gray-50'}`}>
                Siguiente
              </button>
            </nav>
          </div>
        </div>
      )}

      {/* MODAL 1: REGISTRAR / EDITAR MÁQUINA */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-[var(--recal-gray)]">
              <h3 className="text-lg font-bold text-[var(--recal-blue)]">{isEditing ? 'Editar Equipo' : 'Ingreso de Maquinaria'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 font-bold text-xl">&times;</button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700">Num. Económico (opcional)</label><input type="text" className="mt-1 w-full border border-gray-300 rounded-md p-2 outline-none focus:ring-[var(--recal-blue)]" value={formData.num_economico} onChange={e => setFormData({...formData, num_economico: e.target.value.toUpperCase()})} /></div>
                <div><label className="block text-sm font-medium text-gray-700">Tipo de Equipo *</label><input required type="text" className="mt-1 w-full border border-gray-300 rounded-md p-2 outline-none focus:ring-[var(--recal-blue)]" value={formData.tipo} onChange={e => setFormData({...formData, tipo: e.target.value.toUpperCase()})} /></div>
                <div><label className="block text-sm font-medium text-gray-700">Marca *</label><input required type="text" className="mt-1 w-full border border-gray-300 rounded-md p-2 outline-none focus:ring-[var(--recal-blue)]" value={formData.marca} onChange={e => setFormData({...formData, marca: e.target.value.toUpperCase()})} /></div>
                <div><label className="block text-sm font-medium text-gray-700">Modelo (opcional)</label><input type="text" className="mt-1 w-full border border-gray-300 rounded-md p-2 outline-none focus:ring-[var(--recal-blue)]" value={formData.modelo} onChange={e => setFormData({...formData, modelo: e.target.value.toUpperCase()})} /></div>
                <div><label className="block text-sm font-medium text-gray-700">Año</label><input type="text" className="mt-1 w-full border border-gray-300 rounded-md p-2 outline-none focus:ring-[var(--recal-blue)]" value={formData.anio} onChange={e => setFormData({...formData, anio: e.target.value})} /></div>
                <div><label className="block text-sm font-medium text-gray-700">Color (opcional)</label><input type="text" className="mt-1 w-full border border-gray-300 rounded-md p-2 outline-none focus:ring-[var(--recal-blue)]" value={formData.color} onChange={e => setFormData({...formData, color: e.target.value})} /></div>
                <div><label className="block text-sm font-medium text-gray-700">Número de Serie (opcional)</label><input type="text" className="mt-1 w-full border border-gray-300 rounded-md p-2 outline-none focus:ring-[var(--recal-blue)]" value={formData.serie} onChange={e => setFormData({...formData, serie: e.target.value})} /></div>
                <div><label className="block text-sm font-medium text-gray-700">Placa (opcional)</label><input type="text" className="mt-1 w-full border border-gray-300 rounded-md p-2 outline-none focus:ring-[var(--recal-blue)]" value={formData.placa} onChange={e => setFormData({...formData, placa: e.target.value})} /></div>
                <div><label className="block text-sm font-bold text-blue-900">Horómetro Actual</label><input type="number" step="0.01" className="mt-1 w-full border border-gray-300 rounded-md p-2 bg-blue-50 outline-none focus:ring-[var(--recal-blue)]" value={formData.horometro} onChange={e => setFormData({...formData, horometro: e.target.value})} /></div>
                <div><label className="block text-sm font-bold text-blue-900">Mantenimiento cada (Hrs)</label><input type="number" className="mt-1 w-full border border-gray-300 rounded-md p-2 bg-blue-50 outline-none focus:ring-[var(--recal-blue)]" value={formData.intervalo_mantenimiento} onChange={e => setFormData({...formData, intervalo_mantenimiento: e.target.value})} /></div>
                <div><label className="block text-sm font-medium text-gray-700">Fecha Ingreso a Obra *</label><input required type="date" className="mt-1 w-full border border-gray-300 rounded-md p-2 outline-none focus:ring-[var(--recal-blue)]" value={formData.fecha_ingreso_obra} onChange={e => setFormData({...formData, fecha_ingreso_obra: e.target.value})} /></div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Contratista Propietaria</label>
                  <select className="mt-1 w-full border border-gray-300 rounded-md p-2 outline-none focus:ring-[var(--recal-blue)]" value={formData.id_subcontratista} onChange={e => setFormData({...formData, id_subcontratista: e.target.value})}>
                    <option value="">RECAL (Equipo Propio)</option>
                    {catPrincipales.map(empresa => <option key={empresa.id_subcontratista} value={empresa.id_subcontratista}>{empresa.razon_social}</option>)}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">Fotografía</label>
                  <input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files[0])} className="mt-1 w-full border border-gray-300 rounded-md p-2 text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-bold file:bg-[var(--recal-blue)] file:text-white hover:file:bg-[var(--recal-blue-hover)]" />
                  {formData.imagen_url_actual && !imageFile && (
                    <p className="text-xs text-blue-600 mt-1">Ya cuenta con una imagen. Sube otra si deseas reemplazarla.</p>
                  )}
                </div>
              </div>
              <div className="pt-4 flex justify-end space-x-3 border-t mt-6">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">Cancelar</button>
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-sm w-full">
            <div className="px-6 py-4 border-b border-gray-200 bg-red-50 rounded-t-lg">
              <h3 className="text-lg font-bold text-red-700">Confirmar Baja</h3>
            </div>
            <form onSubmit={handleBajaSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Fecha de retiro *</label>
                <input required type="date" className="mt-1 w-full border border-gray-300 rounded-md p-2 focus:ring-red-500 outline-none" value={bajaFecha} onChange={e => setBajaFecha(e.target.value)} />
                <p className="mt-2 text-xs text-gray-500">La máquina ya no se incluirá en los reportes exportables de Excel.</p>
              </div>
              <div className="pt-4 flex justify-end space-x-3 border-t mt-6">
                <button type="button" onClick={() => setIsBajaModalOpen(false)} className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">Cancelar</button>
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
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-4xl w-full flex flex-col max-h-[90vh]">
            <div className="px-4 md:px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-[var(--recal-blue)] text-white rounded-t-lg">
              <h3 className="text-base md:text-lg font-bold truncate pr-4">Servicios: {maquinaSeleccionada.num_economico}</h3>
              <button onClick={() => setIsHistorialOpen(false)} className="text-white hover:text-gray-200 font-bold text-xl md:text-2xl">&times;</button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 md:p-6 flex flex-col md:grid md:grid-cols-3 gap-6 bg-gray-50">
              <div className="w-full md:col-span-1 bg-white p-4 rounded border border-gray-200 shadow-sm h-fit">
                <h4 className="font-bold text-gray-700 border-b pb-2 mb-4 text-sm uppercase">Registrar Servicio</h4>
                <form onSubmit={handleMantenimientoSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Fecha de Servicio *</label>
                    <input required type="date" className="w-full border border-gray-300 rounded p-2 text-sm outline-none focus:border-[var(--recal-blue)]" 
                      value={formMantenimiento.fecha_mantenimiento} onChange={e => setFormMantenimiento({...formMantenimiento, fecha_mantenimiento: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Tipo *</label>
                    <select className="w-full border border-gray-300 rounded p-2 text-sm outline-none focus:border-[var(--recal-blue)]" 
                      value={formMantenimiento.tipo_mantenimiento} onChange={e => setFormMantenimiento({...formMantenimiento, tipo_mantenimiento: e.target.value})}>
                      <option value="Preventivo">Preventivo</option>
                      <option value="Correctivo">Correctivo</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Horómetro al servicio</label>
                    <input 
                      type="number" 
                      step="0.01" 
                      className="w-full border border-gray-300 rounded p-2 text-sm outline-none focus:border-[var(--recal-blue)]" 
                      value={formMantenimiento.horometro_mantenimiento} 
                      onChange={e => setFormMantenimiento({...formMantenimiento, horometro_mantenimiento: e.target.value})} 
                      placeholder='Opcional si es equipo menor'
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Observaciones</label>
                    <textarea rows="3" className="w-full border border-gray-300 rounded p-2 text-sm outline-none focus:border-[var(--recal-blue)]" 
                      value={formMantenimiento.observaciones} onChange={e => setFormMantenimiento({...formMantenimiento, observaciones: e.target.value})}></textarea>
                  </div>
                  <button type="submit" disabled={saving} className="w-full bg-green-600 text-white rounded p-3 md:p-2 text-sm font-bold hover:bg-green-700 transition-colors">
                    Guardar Mantenimiento
                  </button>
                </form>
              </div>
              <div className="w-full md:col-span-2 bg-white rounded border border-gray-200 shadow-sm overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-100">
                    <tr><th className="px-4 py-2 text-left text-xs font-bold text-gray-600 uppercase">Fecha</th><th className="px-4 py-2 text-left text-xs font-bold text-gray-600 uppercase">Tipo</th><th className="px-4 py-2 text-center text-xs font-bold text-gray-600 uppercase">Horómetro</th><th className="px-4 py-2 text-left text-xs font-bold text-gray-600 uppercase">Detalles</th></tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {historial.length === 0 ? (
                      <tr><td colSpan="4" className="px-4 py-8 text-center text-sm text-gray-500 italic">No hay registros.</td></tr>
                    ) : (
                      historial.map((h) => (
                        <tr key={h.id_mantenimiento} className="hover:bg-gray-50">
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 font-medium">{formatDDMMYYYY(h.fecha_mantenimiento)}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm"><span className={`px-2 py-1 rounded text-xs font-bold ${h.tipo_mantenimiento === 'Preventivo' ? 'bg-blue-100 text-blue-800' : 'bg-orange-100 text-orange-800'}`}>{h.tipo_mantenimiento}</span></td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-center font-mono text-gray-600 bg-gray-50">{h.horometro_mantenimiento !== null ? `${h.horometro_mantenimiento} hrs` : 'N/A'}</td>
                          <td className="px-4 py-3 text-sm text-gray-500 min-w-[150px] max-w-xs truncate" title={h.observaciones}>{h.observaciones || '-'}</td>
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
    </div>
  );
}