export default function MaquinariaHistorialModal({
  isOpen,
  onClose,
  maquinaSeleccionada,
  formMantenimiento,
  setFormMantenimiento,
  handleMantenimientoSubmit,
  historial,
  saving,
  formatDDMMYYYY,
  canManageMaquinaria,
  // Nuevos props
  isEditingMantenimiento,
  onEditMantenimiento,
  onDeleteMantenimiento,
  onCancelEditMantenimiento
}) {
  if (!isOpen || !maquinaSeleccionada) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-2xl max-w-5xl w-full flex flex-col max-h-[90vh] border dark:border-slate-700">
        <div className="px-4 md:px-6 py-4 border-b border-gray-200 dark:border-slate-700 flex justify-between items-center bg-[var(--recal-blue)] text-white rounded-t-lg">
          <div className="flex flex-col">
            <h3 className="text-base md:text-lg font-bold truncate pr-4">Servicios: {maquinaSeleccionada.tipo || 'S/N'}</h3>
            <span className="text-[10px] uppercase tracking-widest opacity-80">{maquinaSeleccionada.num_economico || 'Sin Número'}</span>
          </div>
          <button onClick={onClose} className="text-white hover:text-gray-200 font-bold text-xl md:text-2xl">&times;</button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 md:p-6 flex flex-col md:grid md:grid-cols-4 gap-6 bg-gray-50 dark:bg-slate-900">
          {canManageMaquinaria && (
            <div className="w-full md:col-span-1 bg-white dark:bg-slate-800 p-4 rounded border-2 border-dashed border-gray-200 dark:border-slate-700 shadow-sm h-fit sticky top-0">
              <h4 className="font-bold text-[var(--recal-blue)] dark:text-blue-400 border-b dark:border-slate-700 pb-2 mb-4 text-xs uppercase flex items-center gap-2">
                {isEditingMantenimiento ? (
                  <>
                    <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></span>
                    Editando Servicio
                  </>
                ) : (
                  <>
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                    Nuevo Registro
                  </>
                )}
              </h4>
              <form onSubmit={handleMantenimientoSubmit} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 mb-1 uppercase">Fecha *</label>
                  <input required type="date" className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 dark:text-white rounded p-2 text-sm outline-none focus:border-[var(--recal-blue)]" 
                    value={formMantenimiento.fecha_mantenimiento} onChange={e => setFormMantenimiento({...formMantenimiento, fecha_mantenimiento: e.target.value})} />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 mb-1 uppercase">Tipo *</label>
                  <select className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 dark:text-white rounded p-2 text-sm outline-none focus:border-[var(--recal-blue)]" 
                    value={formMantenimiento.tipo_mantenimiento} onChange={e => setFormMantenimiento({...formMantenimiento, tipo_mantenimiento: e.target.value})}>
                    <option value="Preventivo" className="dark:bg-slate-800">Preventivo</option>
                    <option value="Correctivo" className="dark:bg-slate-800">Correctivo</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 mb-1 uppercase">
                    {maquinaSeleccionada.tipo_unidad === 'vehiculo' ? 'Kilometraje' : 'Horómetro'}
                  </label>
                  <input 
                    type="number" step="0.01" className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 dark:text-white rounded p-2 text-sm outline-none focus:border-[var(--recal-blue)] font-mono" 
                    value={formMantenimiento.horometro_mantenimiento} onChange={e => setFormMantenimiento({...formMantenimiento, horometro_mantenimiento: e.target.value})} placeholder={maquinaSeleccionada.tipo_unidad === 'vehiculo' ? 'KM' : 'HRS'}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 mb-1 uppercase">Técnico/Responsable *</label>
                  <input required type="text" className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 dark:text-white rounded p-2 text-sm outline-none focus:border-[var(--recal-blue)]" 
                    value={formMantenimiento.realizado_por || ''} onChange={e => setFormMantenimiento({...formMantenimiento, realizado_por: e.target.value.toUpperCase()})} placeholder='NOMBRE'
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 mb-1 uppercase">Observaciones</label>
                  <textarea rows="2" className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 dark:text-white rounded p-2 text-sm outline-none focus:border-[var(--recal-blue)]" 
                    value={formMantenimiento.observaciones} onChange={e => setFormMantenimiento({...formMantenimiento, observaciones: e.target.value})}></textarea>
                </div>
                <div className="flex flex-col gap-2 pt-2">
                  <button type="submit" disabled={saving} className={`w-full ${isEditingMantenimiento ? 'bg-amber-600 hover:bg-amber-700' : 'bg-green-600 hover:bg-green-700'} text-white rounded p-2 text-xs font-bold transition-all shadow-sm`}>
                    {saving ? 'PROCESANDO...' : (isEditingMantenimiento ? 'ACTUALIZAR REGISTRO' : 'GUARDAR SERVICIO')}
                  </button>
                  {isEditingMantenimiento && (
                    <button type="button" onClick={onCancelEditMantenimiento} className="w-full bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded p-2 text-xs font-bold hover:bg-gray-300 dark:hover:bg-slate-600 transition-all">
                      CANCELAR
                    </button>
                  )}
                </div>
              </form>
            </div>
          )}
          <div className={`w-full ${canManageMaquinaria ? 'md:col-span-3' : 'md:col-span-4'} bg-white dark:bg-slate-800 rounded border border-gray-200 dark:border-slate-700 shadow-xl overflow-hidden flex flex-col`}>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
                <thead className="bg-[var(--recal-gray)] dark:bg-slate-850">
                  <tr>
                    <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Fecha</th>
                    <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Tipo</th>
                    <th className="px-4 py-3 text-center text-[10px] font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Lectura</th>
                    <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Responsable</th>
                    <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Detalles</th>
                    {canManageMaquinaria && <th className="px-4 py-3 text-center text-[10px] font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Acciones</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-700/50 bg-white dark:bg-slate-800">
                  {historial.length === 0 ? (
                    <tr key="no-data"><td colSpan={canManageMaquinaria ? "6" : "5"} className="px-4 py-12 text-center text-sm text-gray-500 dark:text-gray-400 italic">No hay servicios registrados para esta unidad.</td></tr>
                  ) : (
                    historial.map((h, i) => (
                      <tr key={h.id_mantenimiento || i} className={`hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-colors ${isEditingMantenimiento && h.id_mantenimiento === formMantenimiento.id_mantenimiento ? 'bg-amber-50 dark:bg-amber-900/10' : ''}`}>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200 font-bold">{formatDDMMYYYY(h.fecha_mantenimiento)}</td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm">
                          <span className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-tighter ${h.tipo_mantenimiento === 'Preventivo' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300' : 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300'}`}>
                            {h.tipo_mantenimiento}
                          </span>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-center font-mono text-gray-600 dark:text-gray-400 bg-gray-50/50 dark:bg-slate-900/30">
                          {h.horometro_mantenimiento !== null ? (
                            <span className="font-bold">{Number(h.horometro_mantenimiento).toFixed(2)} <small className="opacity-50 font-normal">{maquinaSeleccionada.tipo_unidad === 'vehiculo' ? 'km' : 'hrs'}</small></span>
                          ) : (
                            <span className="opacity-30">N/A</span>
                          )}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300 font-medium">
                          <div className="flex flex-col">
                            <span>{h.realizado_por || 'DESCONOCIDO'}</span>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-xs text-gray-500 dark:text-gray-400 min-w-[150px] max-w-xs" title={h.observaciones}>
                          <p className="line-clamp-2 leading-relaxed">{h.observaciones || '-'}</p>
                        </td>
                        {canManageMaquinaria && (
                          <td className="px-4 py-4 whitespace-nowrap text-center text-sm">
                            <div className="flex items-center justify-center gap-1">
                              <button 
                                onClick={() => onEditMantenimiento(h)}
                                className="p-1.5 text-blue-600 hover:bg-blue-100 dark:text-blue-400 dark:hover:bg-blue-900/30 rounded transition-colors"
                                title="Editar registro"
                              >
                                ✎
                              </button>
                              <button 
                                onClick={() => onDeleteMantenimiento(h.id_mantenimiento)}
                                className="p-1.5 text-red-600 hover:bg-red-100 dark:text-red-400 dark:hover:bg-red-900/30 rounded transition-colors"
                                title="Eliminar registro"
                              >
                                🗑
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
