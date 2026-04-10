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
  canManageMaquinaria
}) {
  if (!isOpen || !maquinaSeleccionada) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-2xl max-w-4xl w-full flex flex-col max-h-[90vh] border dark:border-slate-700">
        <div className="px-4 md:px-6 py-4 border-b border-gray-200 dark:border-slate-700 flex justify-between items-center bg-[var(--recal-blue)] text-white rounded-t-lg">
          <h3 className="text-base md:text-lg font-bold truncate pr-4">Servicios: {maquinaSeleccionada.tipo || 'S/N'}</h3>
          <button onClick={onClose} className="text-white hover:text-gray-200 font-bold text-xl md:text-2xl">&times;</button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 md:p-6 flex flex-col md:grid md:grid-cols-3 gap-6 bg-gray-50 dark:bg-slate-900">
          {canManageMaquinaria && (
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
          )}
          <div className={`w-full ${canManageMaquinaria ? 'md:col-span-2' : 'md:col-span-3'} bg-white dark:bg-slate-800 rounded border border-gray-200 dark:border-slate-700 shadow-sm overflow-x-auto`}>
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
  );
}
