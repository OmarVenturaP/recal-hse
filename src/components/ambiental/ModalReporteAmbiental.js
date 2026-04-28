"use client";

import { useState, useEffect } from 'react';
import { Camera, FileText, Plus, Trash2, Save, MapPin, AlertCircle, Loader2, X } from 'lucide-react';
import Swal from 'sweetalert2';

export default function ModalReporteAmbiental({ isOpen, onClose, report, period }) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    frente_trabajo: '',
    observaciones: '',
    is_na: false,
    fotos: [] // { id_foto, url_cloudinary, pie_de_foto, isNew, file }
  });
  const [supervisores, setSupervisores] = useState([]);

  useEffect(() => {
    if (isOpen) {
      fetchSupervisores();
    }
  }, [isOpen]);

  const fetchSupervisores = async () => {
    try {
      const res = await fetch('/api/ambiental/supervisores');
      const data = await res.json();
      if (data.success) setSupervisores(data.data);
    } catch (e) {
      console.error("Error fetching supervisores", e);
    }
  };

  useEffect(() => {
    if (isOpen && report) {
      fetchReportData();
    }
  }, [isOpen, report, period]);

  const fetchReportData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/ambiental/reportes?mes=${period.month}&anio=${period.year}&id_cat_reporte=${report.id_cat_reporte}`);
      const data = await res.json();
      if (data.success && data.data) {
        setFormData({
          frente_trabajo: data.data.frente_trabajo || '',
          observaciones: data.data.observaciones || '',
          is_na: !!data.data.is_na,
          fotos: data.data.fotos || []
        });
      } else {
        setFormData({ frente_trabajo: '', observaciones: '', is_na: false, fotos: [] });
      }
    } catch (error) {
      console.error("Error cargando datos", error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    const newFotos = files.map(file => ({
      url_cloudinary: URL.createObjectURL(file),
      pie_de_foto: '',
      isNew: true,
      file: file
    }));
    setFormData(prev => ({ ...prev, fotos: [...prev.fotos, ...newFotos] }));
  };

  const removeFoto = async (index, idFoto) => {
    if (idFoto) {
      const result = await Swal.fire({
        title: '¿Eliminar foto?',
        text: "Esta acción no se puede deshacer",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        cancelButtonColor: '#64748b',
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'Cancelar'
      });

      if (result.isConfirmed) {
        try {
          await fetch(`/api/ambiental/reportes?id_foto=${idFoto}`, { method: 'DELETE' });
        } catch (e) {}
      } else {
        return;
      }
    }
    
    setFormData(prev => ({
      ...prev,
      fotos: prev.fotos.filter((_, i) => i !== index)
    }));
  };

  const handleSave = async () => {
    // Si es N/A, guardamos directamente sin validar fotos ni frentes
    if (formData.is_na) {
      const confirmNa = await Swal.fire({
        title: '¿Marcar como No Aplicable?',
        text: 'Este reporte se guardará como N/A para este periodo.',
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#64748b',
        confirmButtonText: 'Sí, marcar N/A'
      });
      if (!confirmNa.isConfirmed) return;
      return executeSave();
    }

    const hasMinPhotos = formData.fotos.length >= 6;
    const hasWorkFront = formData.frente_trabajo.trim() !== '';
    const hasAllDescriptions = formData.fotos.every(f => f.pie_de_foto && f.pie_de_foto.trim() !== '');
    const hasSupervisor = formData.observaciones && formData.observaciones.trim() !== '';

    if (!hasMinPhotos || !hasWorkFront || !hasAllDescriptions || !hasSupervisor) {
      const result = await Swal.fire({
        title: 'Reporte Incompleto',
        html: `
          <div class="text-left text-sm space-y-2">
            <p>Tu reporte no cumple con los requisitos mínimos para el dossier:</p>
            <ul class="list-disc ml-5">
              ${!hasMinPhotos ? '<li class="text-amber-600 font-bold">Faltan fotos (Mínimo 6)</li>' : ''}
              ${!hasWorkFront ? '<li class="text-amber-600 font-bold">Falta Frente de Trabajo</li>' : ''}
              ${!hasSupervisor ? '<li class="text-amber-600 font-bold">Falta asignar Supervisor</li>' : ''}
              ${!hasAllDescriptions ? '<li class="text-amber-600 font-bold">Faltan descripciones en fotos</li>' : ''}
            </ul>
            <p class="mt-4 font-bold">¿Deseas guardarlo como INCOMPLETO?</p>
          </div>
        `,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#f59e0b',
        confirmButtonText: 'Guardar como Incompleto',
        cancelButtonText: 'Seguir editando'
      });

      if (!result.isConfirmed) return;
    }

    executeSave();
  };

  const executeSave = async () => {
    setSaving(true);
    try {
      const body = new FormData();
      body.append('mes', period.month);
      body.append('anio', period.year);
      body.append('id_cat_reporte', report.id_cat_reporte);
      body.append('frente_trabajo', formData.frente_trabajo);
      body.append('observaciones', formData.observaciones);
      body.append('is_na', formData.is_na);

      formData.fotos.forEach(foto => {
        if (foto.isNew) {
          body.append('fotos', foto.file);
          body.append('pies_de_foto', foto.pie_de_foto);
        } else {
          // Si no es nueva, enviamos el pie de foto para actualización si fuera necesario
          // (Aunque la API actual no lo maneja, lo dejamos listo)
          body.append('pies_de_foto_existentes', JSON.stringify({id: foto.id_foto, pie: foto.pie_de_foto}));
        }
      });

      const res = await fetch('/api/ambiental/reportes', {
        method: 'POST',
        body: body
      });

      const data = await res.json();
      if (data.success) {
        Swal.fire('¡Guardado!', 'El reporte se ha actualizado correctamente.', 'success');
        onClose();
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      Swal.fire('Error', error.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white dark:bg-slate-900 w-full max-w-5xl max-h-[95vh] rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col border border-white/20">
        
        {/* Header Modal */}
        <button 
            onClick={onClose}
            className="absolute top-6 right-6 p-2 hover:bg-white/20 rounded-full transition-colors z-50 text-white"
          >
            <X className="w-6 h-6" />
          </button>
        <div className="bg-emerald-600 p-6 text-white relative overflow-hidden">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 flex-1 min-w-0">
              <div className="w-12 h-12 bg-white/20 rounded-2xl flex-shrink-0 flex items-center justify-center backdrop-blur-md">
                <FileText className="w-6 h-6" />
              </div>
              <div className="min-w-0">
                <h2 className="text-xl md:text-2xl font-black tracking-tight leading-tight uppercase truncate" title={report.nombre_reporte}>
                  {report.nombre_reporte}
                </h2>
                <p className="text-emerald-100 text-[10px] md:text-xs font-medium uppercase tracking-widest mt-0.5">Dossier Ambiental • {period.month}/{period.year}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 ml-4 mr-10 flex-shrink-0">
               <div className="hidden sm:flex flex-col items-end">
                  <span className="text-[9px] font-black uppercase tracking-tighter text-emerald-100 leading-none">¿No aplica?</span>
                  <span className="text-[8px] font-medium text-emerald-200/60 uppercase">Periodo actual</span>
               </div>
               <button 
                onClick={() => setFormData(prev => ({ ...prev, is_na: !prev.is_na }))}
                className={`px-3 md:px-4 py-1.5 rounded-full text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all ${formData.is_na ? 'bg-slate-900 text-white border-white' : 'bg-white/20 text-white border-transparent hover:bg-white/30'} border`}
               >
                  {formData.is_na ? 'MARCADO COMO N/A' : 'MARCAR N/A'}
               </button>
            </div>
          </div>
        </div>

        {/* Contenido Modal */}
        <div className="flex-grow overflow-y-auto p-6 md:p-8 space-y-8">
          
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
               <Loader2 className="w-12 h-12 text-emerald-500 animate-spin mb-4" />
               <p className="text-slate-500 font-medium">Cargando datos del reporte...</p>
            </div>
          ) : formData.is_na ? (
            <div className="flex flex-col items-center justify-center py-32 text-center animate-in zoom-in duration-300">
               <div className="w-24 h-24 bg-slate-100 dark:bg-slate-800 rounded-[2.5rem] flex items-center justify-center text-slate-400 mb-6">
                  <AlertCircle className="w-12 h-12" />
               </div>
               <h3 className="text-2xl font-black text-slate-800 dark:text-white mb-2">Este reporte está marcado como N/A</h3>
               <p className="text-slate-500 max-w-md">Se ha indicado que este cumplimiento no es aplicable para este periodo. Puedes desmarcarlo en la parte superior si deseas ingresar datos.</p>
            </div>
          ) : (
            <>
              {/* Alerta de Mínimo 6 Fotos */}
              <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 p-4 rounded-2xl flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center text-emerald-600 shrink-0">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <p className="text-sm font-medium text-emerald-800 dark:text-emerald-200">
                  Este reporte requiere un **mínimo de 6 fotografías** de evidencia con su respectiva descripción para cumplir con el estándar del dossier.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Frente de Trabajo</label>
                  <div className="relative">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                      type="text" 
                      value={formData.frente_trabajo}
                      onChange={(e) => setFormData(prev => ({ ...prev, frente_trabajo: e.target.value }))}
                      placeholder="Ej: Patio 4, Almacén General..."
                      className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500 transition-all font-bold text-slate-700 dark:text-white"
                    />
                  </div>
                </div>
                 <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Supervisor de Medio Ambiente</label>
                  <select 
                    value={formData.observaciones}
                    onChange={(e) => setFormData(prev => ({ ...prev, observaciones: e.target.value }))}
                    className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500 transition-all font-bold text-slate-700 dark:text-white appearance-none cursor-pointer"
                  >
                    <option value="">Selecciona un supervisor...</option>
                    {supervisores.map((sup, idx) => (
                      <option key={idx} value={sup.nombre}>{sup.nombre} - {sup.rol}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Sección de Fotos */}
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tight flex items-center gap-2">
                    Evidencia Fotográfica <span className="text-emerald-500">({formData.fotos.length})</span>
                  </h4>
                  <label className="cursor-pointer px-6 py-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-200 transition-all">
                    <Plus className="w-3 h-3 inline mr-1" /> Agregar Fotos
                    <input type="file" multiple accept="image/*" onChange={handleFileChange} className="hidden" />
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {formData.fotos.map((foto, index) => (
                    <div key={index} className="group relative bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-800 overflow-hidden shadow-md">
                      <div className="aspect-video relative overflow-hidden">
                        <img src={foto.url_cloudinary} alt="Evidencia" className="w-full h-full object-cover" />
                        <button 
                          onClick={() => removeFoto(index, foto.id_foto)}
                          className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        {foto.isNew && (
                          <span className="absolute bottom-2 left-2 px-2 py-1 bg-emerald-500 text-white text-[8px] font-black uppercase rounded-md shadow-lg">Nuevo</span>
                        )}
                      </div>
                      <div className="p-4">
                        <textarea 
                          placeholder="Descripción de la foto..."
                          value={foto.pie_de_foto}
                          maxLength={160}
                          onChange={(e) => {
                            const newFotos = [...formData.fotos];
                            newFotos[index].pie_de_foto = e.target.value;
                            setFormData(prev => ({ ...prev, fotos: newFotos }));
                          }}
                          className="w-full p-3 bg-slate-50 dark:bg-slate-900 border-none rounded-xl text-xs font-medium text-slate-600 dark:text-slate-300 focus:ring-1 focus:ring-emerald-500 resize-none h-20"
                        />
                        <div className="flex justify-end mt-1 px-1">
                          <span className={`text-[9px] font-black uppercase tracking-tighter ${foto.pie_de_foto.length >= 160 ? 'text-red-500' : 'text-slate-400'}`}>
                            {foto.pie_de_foto.length} / 160
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}

                  {formData.fotos.length < 6 && (
                    <label className="aspect-video bg-slate-50 dark:bg-slate-800/50 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center gap-3 hover:border-emerald-400 transition-all cursor-pointer group">
                       <div className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-800 shadow-sm flex items-center justify-center group-hover:scale-110 transition-transform">
                          <Plus className="w-6 h-6 text-emerald-500" />
                       </div>
                       <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Añadir Foto</span>
                       <input type="file" multiple accept="image/*" onChange={handleFileChange} className="hidden" />
                    </label>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer Modal */}
        <div className="p-6 md:p-8 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-4">
          <button 
            onClick={onClose}
            disabled={saving}
            className="px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest text-slate-500 hover:text-slate-700 transition-colors"
          >
            Cancelar
          </button>
          <button 
            onClick={handleSave}
            disabled={saving || loading}
            className="px-10 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-emerald-600/30 transition-all hover:-translate-y-1 active:scale-95 flex items-center gap-2 disabled:opacity-50 disabled:translate-y-0"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Guardando...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" /> Guardar Reporte
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
