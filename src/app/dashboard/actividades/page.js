"use client";

import { useState, useEffect, useRef } from 'react';
import { Upload, Search, Calendar, HardHat } from 'lucide-react';

export default function ActividadesPage() {
  const topRef = useRef(null); 

  // Fechas por defecto (Mes y Año actual)
  const currentYear = String(new Date().getFullYear());
  const currentMonth = String(new Date().getMonth() + 1).padStart(2, '0');
  
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  // Filtros
  const [filtroContratista, setFiltroContratista] = useState('');
  const [filtroPK, setFiltroPK] = useState('');
  const [filtroMes, setFiltroMes] = useState(currentMonth);
  const [filtroAnio, setFiltroAnio] = useState(currentYear);

  // Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  const fetchData = async () => {
    setLoading(true);
    // Armamos el formato YYYY-MM que espera la base de datos
    const mesPeriodo = `${filtroAnio}-${filtroMes}`;
    const params = new URLSearchParams({
      contratista: filtroContratista,
      pk: filtroPK,
      mes: mesPeriodo
    });
    
    try {
      const res = await fetch(`/api/actividades?${params.toString()}`);
      const result = await res.json();
      
      if (Array.isArray(result)) {
        setData(result);
      } else {
        console.error("Error retornado por la API:", result);
        setData([]);
      }
    } catch (error) {
      console.error("Error en la petición de red:", error);
      setData([]);
    }
    setLoading(false);
  };

  // Efectos para recargar datos y resetear paginación al cambiar filtros
  useEffect(() => { 
    fetchData(); 
  }, [filtroContratista, filtroPK, filtroMes, filtroAnio]);

  useEffect(() => { 
    setCurrentPage(1); 
  }, [filtroContratista, filtroPK, filtroMes, filtroAnio]);

  useEffect(() => {
    if (topRef.current) topRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [currentPage]);

  // Lógica de Paginación
  const totalPages = Math.max(1, Math.ceil(data.length / itemsPerPage));
  
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
  const dataPaginada = data.slice(indexOfFirstItem, indexOfLastItem);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/upload-actividades', {
        method: 'POST',
        body: formData
      });
      const responseData = await res.json();
      alert(responseData.message || responseData.error);
      fetchData(); // Recargar la tabla
    } catch (error) {
      alert("Error al subir el archivo");
    }
    setUploading(false);
    e.target.value = null; // Limpiar input
  };

  const limpiarFiltros = () => { 
    setFiltroContratista(''); 
    setFiltroPK('');
    setFiltroMes(currentMonth);
    setFiltroAnio(currentYear);
  };

  return (
    <div className="max-w-[100rem] mx-auto p-4 md:p-6 lg:p-8 space-y-6 animate-in fade-in duration-500" ref={topRef}>
      <div className="bg-white/90 dark:bg-slate-800/80 backdrop-blur-xl rounded-[2.5rem] p-6 lg:p-8 shadow-xl shadow-gray-200/50 dark:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.6)] border border-white/80 dark:border-slate-700/50">
        
        {/* HERO BENTO HEADER */}
        <div className="flex flex-col md:flex-row items-start md:items-center gap-6 mb-8 border-b border-gray-100 dark:border-slate-700/50 pb-6">
           <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-lg shadow-purple-500/30 flex items-center justify-center text-white shrink-0">
             <HardHat className="w-8 h-8" />
           </div>
           <div>
             <h1 className="text-3xl font-black text-gray-800 dark:text-white tracking-tight leading-none mb-2">Control de Actividades</h1>
             <p className="text-gray-500 dark:text-gray-400 font-medium text-sm md:text-base">Mapeo de avances por PK y contratista en obra.</p>
           </div>
        </div>

        <div className="space-y-6 relative">
      
      <div className="flex flex-col lg:flex-row justify-end items-start lg:items-center space-y-4 lg:space-y-0">
        
        <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2 w-full lg:w-auto">
          {/* 
          <div className="relative flex-1 sm:flex-none">
            <input 
              type="file" 
              accept=".xlsx, .xls, .csv" 
              onChange={handleFileUpload} 
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              disabled={uploading}
            />
            <button className={`w-full justify-center bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded-md font-bold shadow-sm transition-colors text-xs sm:text-sm flex items-center ${uploading ? 'opacity-50' : ''}`}>
              <Upload className="w-4 h-4 mr-1 sm:mr-2" /> {uploading ? 'Procesando...' : 'Importar Excel'}
            </button>
          </div>
           */}

          <div className="flex items-center justify-between sm:justify-start space-x-1 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 p-1 rounded-md shadow-sm w-full sm:w-auto">
            <Calendar className="w-4 h-4 text-gray-500 ml-2 hidden sm:block" />
            <select className="text-sm bg-transparent border-gray-300 dark:border-slate-600 dark:text-gray-200 rounded py-1 pl-2 pr-6 focus:ring-[var(--recal-blue)] outline-none flex-1 sm:flex-none font-medium" value={filtroMes} onChange={(e) => setFiltroMes(e.target.value)}>
              <option value="01">Enero</option><option value="02">Febrero</option><option value="03">Marzo</option><option value="04">Abril</option>
              <option value="05">Mayo</option><option value="06">Junio</option><option value="07">Julio</option><option value="08">Agosto</option>
              <option value="09">Septiembre</option><option value="10">Octubre</option><option value="11">Noviembre</option><option value="12">Diciembre</option>
            </select>
            <select className="text-sm bg-transparent border-gray-300 dark:border-slate-600 dark:text-gray-200 rounded py-1 pl-2 pr-6 focus:ring-[var(--recal-blue)] outline-none flex-1 sm:flex-none font-medium" value={filtroAnio} onChange={(e) => setFiltroAnio(e.target.value)}>
              <option value="2024">2024</option><option value="2025">2025</option><option value="2026">2026</option><option value="2027">2027</option>
            </select>
          </div>
        </div>
      </div>

      {/* PANEL DE FILTROS Y BÚSQUEDA */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="md:col-span-2">
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">Buscar Contratista</label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400"><Search className="w-4 h-4" /></span>
            <input type="text" placeholder="Ej. QL LABS, YANERI, RECSA..." 
              className="w-full pl-10 bg-transparent border border-gray-300 dark:border-slate-600 dark:text-white rounded-md p-2 shadow-sm focus:ring-[var(--recal-blue)] outline-none sm:text-sm"
              value={filtroContratista} onChange={(e) => setFiltroContratista(e.target.value)} />
          </div>
        </div>
        <div className="md:col-span-1">
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">Ubicación / PK</label>
          <input type="text" placeholder="Ej. 181+800" 
              className="w-full bg-transparent border border-gray-300 dark:border-slate-600 dark:text-white rounded-md p-2 shadow-sm focus:ring-[var(--recal-blue)] outline-none sm:text-sm"
              value={filtroPK} onChange={(e) => setFiltroPK(e.target.value)} />
        </div>
        <div className="md:col-span-1 flex items-end">
          <button onClick={limpiarFiltros} className="w-full bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-700 dark:text-gray-200 px-4 py-2 rounded-md font-medium sm:text-sm transition-colors border border-gray-300 dark:border-slate-600">
            Limpiar Todo
          </button>
        </div>
      </div>

      {/* TABLA PRINCIPAL RESPONSIVA */}
      <div className="bg-white dark:bg-slate-800 shadow-sm rounded-lg border border-gray-200 dark:border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
            <thead className="bg-gray-50 dark:bg-slate-900 hidden md:table-header-group">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Fecha</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Contratista</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">PK</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Maquinaria</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Fuerza de Trabajo</th>
              </tr>
            </thead>
            
            <tbody className="bg-white dark:bg-slate-800 divide-y md:divide-y-0 md:divide-gray-200 dark:md:divide-slate-700 block md:table-row-group">
              {loading ? (
                <tr className="block md:table-row"><td colSpan="5" className="px-6 py-8 text-center text-sm text-gray-500 dark:text-gray-400 block md:table-cell">Cargando actividades...</td></tr>
              ) : data.length === 0 ? (
                <tr className="block md:table-row">
                  <td colSpan="5" className="px-6 py-12 text-center block md:table-cell">
                    <div className="text-gray-400 dark:text-gray-500 text-4xl mb-2">🔍</div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-200">No se encontraron actividades para este periodo.</p>
                  </td>
                </tr>
              ) : dataPaginada.map((row) => (
                  <tr key={row.id} className="block md:table-row border border-gray-200 dark:border-slate-700 md:border-none mb-4 md:mb-0 rounded-lg shadow-sm md:shadow-none p-4 md:p-0 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
                    
                    <td className="flex justify-between items-center md:table-cell px-2 md:px-4 py-2 md:py-4 border-b dark:border-slate-700 md:border-none text-sm font-bold text-gray-700 dark:text-gray-300">
                      <span className="md:hidden font-bold text-gray-500 dark:text-gray-400 text-xs uppercase">Fecha:</span>
                      <span>{new Date(row.fecha).toLocaleDateString('es-MX', {timeZone: 'UTC'})}</span>
                    </td>
                    
                    <td className="flex justify-between items-center md:table-cell px-2 md:px-4 py-2 md:py-4 text-sm font-bold text-[var(--recal-blue)] dark:text-blue-400 md:text-gray-900 dark:md:text-white border-b dark:border-slate-700 md:border-none">
                      <span className="md:hidden font-bold text-gray-500 dark:text-gray-400 text-xs uppercase">Contratista:</span>
                      <span>{row.contratista}</span>
                    </td>
                    
                    <td className="flex justify-between items-center md:table-cell px-2 md:px-4 py-2 md:py-4 text-sm text-gray-600 dark:text-gray-300 border-b dark:border-slate-700 md:border-none">
                      <span className="md:hidden font-bold text-gray-500 dark:text-gray-400 text-xs uppercase">PK:</span>
                      <span className="bg-gray-100 dark:bg-slate-700 px-2 py-1 rounded font-mono text-xs">{row.pk || 'N/A'}</span>
                    </td>
                    
                    <td className="flex flex-col sm:flex-row justify-between items-start md:table-cell px-2 md:px-4 py-2 md:py-4 text-xs text-gray-500 dark:text-gray-400 border-b dark:border-slate-700 md:border-none">
                      <span className="md:hidden font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Maquinaria:</span>
                      <span className="whitespace-pre-wrap max-w-xs">{row.maquinaria || 'Sin registro'}</span>
                    </td>
                    
                    <td className="flex justify-between items-center md:table-cell px-2 md:px-4 py-2 md:py-4 text-center border-b dark:border-slate-700 md:border-none">
                      <span className="md:hidden font-bold text-gray-500 dark:text-gray-400 text-xs uppercase">Fuerza de Trabajo:</span>
                      <span className="bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 py-1 px-3 rounded-full text-xs font-black border border-blue-200 dark:border-blue-800">
                        {row.total_trabajadores} Personas
                      </span>
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
        <div className="flex flex-col sm:flex-row items-center justify-between bg-white dark:bg-slate-800 px-4 py-3 border border-gray-200 dark:border-slate-700 rounded-lg shadow-sm gap-4 sm:gap-0 mt-4">
          <div className="text-sm text-gray-700 dark:text-gray-300 text-center sm:text-left">
            Mostrando del <span className="font-bold">{indexOfFirstItem + 1}</span> al <span className="font-bold">{Math.min(indexOfLastItem, data.length)}</span> de <span className="font-bold">{data.length}</span> registros
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
  );
}