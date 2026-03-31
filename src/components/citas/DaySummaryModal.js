import { Calendar as CalendarIcon, MapPin, Clock, User } from 'lucide-react';

export default function DaySummaryModal({ isOpen, onClose, fecha, citas, isDiaCordina, userName }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-lg w-full border dark:border-slate-700 max-h-[90vh] overflow-y-auto flex flex-col">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700 flex justify-between items-center bg-gray-50 dark:bg-slate-900 rounded-t-xl sticky top-0 z-10">
          <h3 className="text-lg font-bold text-gray-800 dark:text-white flex items-center">
            <CalendarIcon className="w-5 h-5 mr-2 text-[var(--recal-blue)]" />
            Resumen: {fecha ? fecha.split('-').reverse().join('/') : ''}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 font-bold text-2xl">&times;</button>
        </div>
        
        <div className="p-6 flex-1 overflow-y-auto">
          {isDiaCordina && (
            <div className="mb-4 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 p-3 rounded-lg border border-purple-200 dark:border-purple-800/50 flex items-center text-sm font-bold shadow-sm">
              <MapPin className="w-5 h-5 mr-2" />
              Día de &quot;Revisión en Cordina&quot;
            </div>
          )}

          {(!citas || citas.length === 0) ? (
            <div className="text-center text-gray-500 dark:text-gray-400 py-8">
              <Clock className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No hay citas programadas para este día.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {citas.map(c => {
                const isMiCita = c.revisor_nombre === userName;
                let borderClass = 'border-l-blue-500';
                if (c.estatus === 'Liberado') borderClass = 'border-l-emerald-500';
                else if (c.estatus === 'En observaciones') borderClass = 'border-l-amber-500';
                else if (c.estatus === 'No asistió') borderClass = 'border-l-red-500';

                return (
                  <div key={c.id_cita} className={`p-4 rounded-lg shadow-sm bg-white dark:bg-slate-800/80 border ${borderClass} border-t-gray-200 border-r-gray-200 border-b-gray-200 dark:border-t-slate-700 dark:border-r-slate-700 dark:border-b-slate-700 relative`}>
                    {isMiCita && (
                      <span className="absolute top-3 right-3 bg-yellow-300 text-yellow-900 text-[9px] px-1.5 py-0.5 rounded font-extrabold border border-yellow-400 shadow-sm">
                        TU CITA
                      </span>
                    )}
                    <div className="flex flex-col gap-1 pr-12">
                      <span className="font-black text-gray-800 dark:text-gray-200 text-base">{c.hora_cita.substring(0, 5)} hrs</span>
                      <span className="font-bold text-[var(--recal-blue)] dark:text-blue-400">{c.contratista || 'Contratista sin nombre'}</span>
                    </div>
                    
                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                      <div className="flex items-center text-gray-600 dark:text-gray-400">
                        <User className="w-3.5 h-3.5 mr-1" /> 
                        <span className="font-semibold text-gray-800 dark:text-gray-300">{c.revisor_nombre || 'Sin asignar'}</span>
                      </div>
                      <div className="flex items-center text-gray-600 dark:text-gray-400">
                        <span className="font-bold uppercase px-2 py-0.5 rounded bg-gray-100 dark:bg-slate-700 w-fit">{c.estatus}</span>
                      </div>
                      <div className="flex items-center text-gray-600 dark:text-gray-400 col-span-2 mt-1">
                        <span className="font-bold mr-1">Área:</span> {c.area}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        
        <div className="px-6 py-4 border-t border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900 rounded-b-xl flex justify-end sticky bottom-0">
          <button onClick={onClose} className="px-6 py-2 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors font-medium">Cerrar Detalle</button>
        </div>
      </div>
    </div>
  );
}
