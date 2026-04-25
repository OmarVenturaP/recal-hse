import React from 'react';
import { X, Calendar, Settings, FileText, Check } from 'lucide-react';

export default function MaquinariaExportBitacoraModal({ 
  isOpen, 
  onClose, 
  maquina, 
  historial, 
  onExport 
}) {
  if (!isOpen || !maquina) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden border border-white/20 dark:border-slate-800 animate-in zoom-in-95 duration-300">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 p-6 flex justify-between items-center text-white">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold">Generar Bitácora</h3>
              <p className="text-orange-100 text-xs">Selecciona el registro de mantenimiento</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="flex items-center gap-4 bg-orange-50 dark:bg-orange-900/10 p-4 rounded-2xl border border-orange-100 dark:border-orange-800/50">
            <div className="flex-1">
              <p className="text-xs font-bold text-orange-600 dark:text-orange-400 uppercase tracking-wider mb-1">Equipo Seleccionado</p>
              <h4 className="text-lg font-black text-slate-800 dark:text-white leading-tight">
                {maquina.num_economico} - {maquina.tipo}
              </h4>
              <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
                {maquina.marca} {maquina.modelo}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
              Historial de Mantenimientos Disponibles
            </label>
            
            <div className="max-h-60 overflow-y-auto space-y-2 pr-2 scrollbar-thin scrollbar-thumb-orange-200 dark:scrollbar-thumb-slate-700">
              {historial.length > 0 ? (
                historial.map((mtto) => (
                  <button
                    key={mtto.id_mantenimiento}
                    onClick={() => onExport(maquina.id_maquinaria, mtto.id_mantenimiento)}
                    className="w-full flex items-center justify-between p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:border-orange-400 dark:hover:border-orange-500 hover:bg-orange-50/50 dark:hover:bg-orange-900/20 transition-all group"
                  >
                    <div className="flex items-center gap-3 text-left">
                      <div className="p-2 bg-slate-100 dark:bg-slate-700 rounded-lg group-hover:bg-orange-100 dark:group-hover:bg-orange-900/50 transition-colors">
                        <Calendar className="w-5 h-5 text-slate-600 dark:text-slate-400 group-hover:text-orange-600 dark:group-hover:text-orange-400" />
                      </div>
                      <div>
                        <p className="font-black text-slate-800 dark:text-white">
                          {new Date(mtto.fecha_mantenimiento).toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' })}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase">
                          {mtto.tipo_mantenimiento} • {mtto.horometro_mantenimiento} {maquina.tipo_unidad === 'vehiculo' ? 'km' : 'hrs'}
                        </p>
                      </div>
                    </div>
                    <div className="p-2 rounded-full opacity-0 group-hover:opacity-100 bg-orange-100 dark:bg-orange-900/50 transition-all">
                      <Check className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                    </div>
                  </button>
                ))
              ) : (
                <div className="text-center py-8 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700">
                  <Settings className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3 animate-spin-slow" />
                  <p className="text-slate-500 dark:text-slate-400 font-bold">Sin historial de mantenimiento</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Registra un servicio para poder generar la bitácora.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="p-6 bg-slate-50 dark:bg-slate-800/30 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition-all"
          >
            Cancelar
          </button>
          <button
            onClick={() => onExport(maquina.id_maquinaria, null)}
            className="px-6 py-2.5 bg-slate-800 dark:bg-white text-white dark:text-slate-900 rounded-xl font-bold hover:bg-slate-900 dark:hover:bg-slate-100 transition-all shadow-lg"
          >
            Solo Datos Generales
          </button>
        </div>
      </div>
    </div>
  );
}
