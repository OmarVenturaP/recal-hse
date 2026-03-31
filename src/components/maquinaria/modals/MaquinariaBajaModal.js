export default function MaquinariaBajaModal({
  isOpen,
  onClose,
  bajaFecha,
  setBajaFecha,
  handleBajaSubmit,
  saving
}) {
  if (!isOpen) return null;

  return (
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
            <button type="button" onClick={onClose} className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700">Cancelar</button>
            <button type="submit" disabled={saving} className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 font-medium">
              {saving ? 'Procesando...' : 'Dar de Baja'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
