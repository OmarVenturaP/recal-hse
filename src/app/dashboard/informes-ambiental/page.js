"use client";

import { useState, useEffect } from 'react';
import { Sprout, Camera, FileText, ChevronLeft, Loader2, Plus, Trash2, Save, Calendar, MapPin, AlertCircle, X, Download } from 'lucide-react';
import Link from 'next/link';
import Swal from 'sweetalert2';
import ModalReporteAmbiental from '@/components/ambiental/ModalReporteAmbiental';

export default function InformesAmbientalPage() {
  const [catalog, setCatalog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());

  const allCompleted = catalog.length > 0 && catalog.every(item => item.status === 'LLENADO' || item.status === 'NA');

  useEffect(() => {
    fetchCatalog();
  }, [month, year]);

  const fetchCatalog = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/ambiental/catalogo?mes=${month}&anio=${year}`);
      const data = await res.json();
      if (data.success) {
        setCatalog(data.data);
      }
    } catch (error) {
      console.error("Error cargando catálogo", error);
    } finally {
      setLoading(false);
    }
  };

  const handleExportDossier = async () => {
    try {
      Swal.fire({
        title: 'Generando Dossier',
        text: 'Estamos preparando el archivo ZIP con todos los reportes y fotografías. Esto puede tardar unos segundos...',
        icon: 'info',
        allowOutsideClick: false,
        showConfirmButton: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });

      const res = await fetch(`/api/ambiental/exportar?mes=${month}&anio=${year}`);
      if (!res.ok) throw new Error("Error al generar el dossier");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Dossier_Ambiental_${month}_${year}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      
      Swal.close();
      Swal.fire('¡Listo!', 'El dossier se ha descargado correctamente.', 'success');
    } catch (error) {
      Swal.fire('Error', 'No se pudo generar el dossier en este momento.', 'error');
    }
  };

  const handleDownloadIndividual = async (item) => {
    if (item.status === 'PENDIENTE') {
      Swal.fire('Atención', 'El reporte no tiene información cargada aún.', 'warning');
      return;
    }

    try {
      Swal.fire({
        title: 'Generando Reporte',
        text: 'Preparando el archivo Excel...',
        icon: 'info',
        allowOutsideClick: false,
        showConfirmButton: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });

      const res = await fetch(`/api/ambiental/exportar?id_item=${item.id_item}`);
      if (!res.ok) throw new Error("Error al generar el reporte");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Reporte_${item.nombre_reporte.replace(/\s+/g, '_')}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      
      Swal.close();
    } catch (error) {
      Swal.fire('Error', 'No se pudo descargar el reporte.', 'error');
    }
  };

  const handleOpenReport = (report) => {
    setSelectedReport(report);
    setIsModalOpen(true);
  };

  const handleDeleteReport = async (e, item) => {
    e.stopPropagation(); // Evitar abrir el modal
    
    const result = await Swal.fire({
      title: '¿Eliminar reporte?',
      text: `Se borrará toda la información y fotos de "${item.nombre_reporte}" para este periodo. Esta acción no se puede deshacer.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Sí, eliminar todo',
      cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
      try {
        const res = await fetch(`/api/ambiental/reportes?id_item=${item.id_item}`, { method: 'DELETE' });
        const data = await res.json();
        if (data.success) {
          Swal.fire('Eliminado', 'El reporte ha sido borrado.', 'success');
          fetchCatalog();
        } else {
          throw new Error(data.error);
        }
      } catch (error) {
        Swal.fire('Error', error.message, 'error');
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-slate-950 p-4 md:p-8 lg:p-12 font-sans transition-colors duration-300">
      
      {/* Header Estilo Premium */}
      <div className="max-w-7xl mx-auto mb-12">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="p-3 bg-white dark:bg-slate-800 rounded-2xl shadow-md hover:shadow-lg transition-all text-slate-600 dark:text-slate-300 hover:-translate-x-1">
              <ChevronLeft className="w-6 h-6" />
            </Link>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-3 py-0.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase tracking-widest rounded-full border border-emerald-200 dark:border-emerald-800">
                  HSE Ambiental
                </span>
              </div>
              <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
                Informes Ambientales <Sprout className="w-8 h-8 text-emerald-500" />
              </h1>
              <p className="text-slate-500 dark:text-slate-400 font-medium mt-1">
                Gestión mensual de cumplimiento y reportes fotográficos.
              </p>
            </div>
          </div>

          {/* Botón de Exportación Global */}
          {allCompleted && (
            <button 
              onClick={handleExportDossier}
              className="flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-3xl font-black uppercase text-[10px] tracking-[0.2em] shadow-xl shadow-emerald-500/20 transition-all hover:-translate-y-1 active:scale-95 animate-in slide-in-from-right-4 duration-500"
            >
              <FileText className="w-5 h-5" />
              Exportar Reportes Completos (ZIP)
            </button>
          )}

          {/* Selector de Periodo */}
          <div className="flex items-center gap-3 bg-white dark:bg-slate-900 p-2 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
             <div className="flex items-center gap-2 px-3 border-r border-slate-100 dark:border-slate-800">
                <Calendar className="w-4 h-4 text-emerald-500" />
                <select 
                  value={month} 
                  onChange={(e) => setMonth(e.target.value)}
                  className="bg-transparent border-none text-sm font-bold text-slate-700 dark:text-slate-200 focus:ring-0 cursor-pointer"
                >
                  <option value="1">Enero</option>
                  <option value="2">Febrero</option>
                  <option value="3">Marzo</option>
                  <option value="4">Abril</option>
                  <option value="5">Mayo</option>
                  <option value="6">Junio</option>
                  <option value="7">Julio</option>
                  <option value="8">Agosto</option>
                  <option value="9">Septiembre</option>
                  <option value="10">Octubre</option>
                  <option value="11">Noviembre</option>
                  <option value="12">Diciembre</option>
                </select>
             </div>
             <div className="px-3">
                <select 
                  value={year} 
                  onChange={(e) => setYear(e.target.value)}
                  className="bg-transparent border-none text-sm font-bold text-slate-700 dark:text-slate-200 focus:ring-0 cursor-pointer"
                >
                  <option value="2024">2024</option>
                  <option value="2025">2025</option>
                  <option value="2026">2026</option>
                </select>
             </div>
          </div>
        </div>
      </div>

      {/* Grid de Reportes (Bento Style) */}
      <div className="max-w-7xl mx-auto">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
             <Loader2 className="w-12 h-12 text-emerald-500 animate-spin mb-4" />
             <p className="text-slate-500 font-medium animate-pulse">Cargando catálogo ambiental...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {catalog.map((item, index) => (
              <div
                key={item.id_cat_reporte}
                onClick={() => handleOpenReport(item)}
                className="group relative flex flex-col items-start p-6 bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-xl hover:shadow-emerald-500/10 hover:-translate-y-2 transition-all duration-500 overflow-hidden text-left cursor-pointer"
              >
                {/* Badge de Estado y Botón Eliminar */}
                <div className="absolute top-6 right-6 z-20 flex items-center gap-2">

                  {item.status !== 'PENDIENTE' && (
                    <button
                      onClick={(e) => handleDeleteReport(e, item)}
                      className="p-2 bg-red-50 hover:bg-red-500 text-red-600 hover:text-white rounded-full transition-all border border-red-200"
                      title="Eliminar Reporte"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}

                  {item.status === 'LLENADO' && (
                    <div className="bg-emerald-500 text-white px-3 py-1 rounded-full backdrop-blur-md flex items-center gap-1.5 border border-white/10 shadow-lg animate-in fade-in zoom-in">
                      <Save className="w-3 h-3" />
                      <span className="text-[8px] font-black uppercase tracking-widest">Llenado</span>
                    </div>
                  )}

                  {item.status === 'INCOMPLETO' && (
                    <div className="bg-amber-500 text-white px-3 py-1 rounded-full backdrop-blur-md flex items-center gap-1.5 border border-white/10 shadow-lg animate-in fade-in zoom-in">
                      <AlertCircle className="w-3 h-3" />
                      <span className="text-[8px] font-black uppercase tracking-widest">Incompleto</span>
                    </div>
                  )}

                  {item.status === 'NA' && (
                    <div className="bg-slate-500 text-white px-3 py-1 rounded-full backdrop-blur-md flex items-center gap-1.5 border border-white/10 shadow-lg animate-in fade-in zoom-in">
                      <X className="w-3 h-3" />
                      <span className="text-[8px] font-black uppercase tracking-widest">N/A</span>
                    </div>
                  )}
                </div>

                <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 mb-6 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300">
                   <Camera className="w-6 h-6" />
                </div>
                
                <h3 className="text-sm font-black text-slate-800 dark:text-white leading-tight uppercase tracking-tight mb-2 flex-grow">
                  {item.nombre_reporte}
                </h3>
                
                <div className="w-full mt-4 pt-4 border-t border-slate-50 dark:border-slate-800 flex items-center justify-between">
                   {item.status === 'LLENADO' ? (
                     <button 
                      onClick={(e) => { e.stopPropagation(); handleDownloadIndividual(item); }}
                      className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-[9px] font-black uppercase tracking-widest rounded-xl shadow-lg shadow-emerald-500/20 transition-all active:scale-95 hover:-translate-y-0.5"
                     >
                       <Download className="w-3 h-3" /> XLSX Individual
                     </button>
                   ) : (
                     <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Ver Reporte</span>
                   )}
                   <div className="w-8 h-8 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                      <Plus className="w-4 h-4" />
                   </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal del Reporte */}
      <ModalReporteAmbiental 
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          fetchCatalog(); // Refrescar para ver badge
        }}
        report={selectedReport}
        period={{ month, year }}
      />

    </div>
  );
}
