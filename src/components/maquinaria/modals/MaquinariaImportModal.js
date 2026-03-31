import { Tractor } from 'lucide-react';

export default function MaquinariaImportModal({
  isOpen,
  onClose,
  importError,
  importFase,
  handleAnalizarExcel,
  catPrincipales,
  importSubcontratista,
  setImportSubcontratista,
  setImportFile,
  importing,
  importResumen,
  importPreviewData,
  handleGuardarImportacion
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-4xl w-full max-h-[95vh] overflow-hidden flex flex-col border dark:border-slate-700">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700 flex justify-between items-center bg-purple-50 dark:bg-purple-900/20">
          <div className="flex items-center">
            <Tractor className="w-6 h-6 text-purple-600 dark:text-purple-400 mr-2" />
            <h3 className="text-xl font-bold text-purple-900 dark:text-purple-300">Importación Masiva de Equipo</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 font-bold text-2xl">&times;</button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 bg-gray-50 dark:bg-slate-900">
          {importError && (
            <div className="mb-4 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 text-red-700 dark:text-red-400 p-4 text-sm shadow-sm">
              <p className="font-bold">Aviso de Lectura</p>
              <p className="whitespace-pre-line">{importError}</p>
            </div>
          )}

          {importFase === 1 && (
            <form onSubmit={handleAnalizarExcel} className="space-y-6 bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 bg-blue-50 dark:bg-blue-900/20 p-3 rounded border border-blue-100 dark:border-blue-800/50">
                Sube el Plan de Servicio Oficial <b>(12_PLAN_SERVICIO.xlsx)</b>. El sistema extraerá los equipos a partir de la Fila 7, cruzará los datos mediante el <b>Número de Serie</b> y te mostrará los equipos nuevos a registrar.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">1. Selecciona la Contratista Propietaria *</label>
                  <select required className="w-full bg-transparent border border-gray-300 dark:border-slate-600 dark:text-white rounded-md p-3 focus:ring-purple-500 outline-none shadow-sm" value={importSubcontratista} onChange={(e) => setImportSubcontratista(e.target.value)}>
                    <option value="" className="dark:bg-slate-800">-- Elige una opción --</option>
                    {catPrincipales && catPrincipales.map(empresa => (
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

          {importFase === 2 && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-gray-200 dark:border-slate-700 shadow-sm">
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase">Equipos en el Excel</p>
                  <p className="text-2xl font-bold text-gray-700 dark:text-gray-200">{importResumen?.totales || 0}</p>
                </div>
                <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-gray-200 dark:border-slate-700 shadow-sm">
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase">Ya registrados</p>
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{(importResumen?.totales || 0) - (importResumen?.nuevos || 0)}</p>
                </div>
                <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg border border-purple-200 dark:border-purple-800/50 shadow-sm">
                  <p className="text-xs text-purple-700 dark:text-purple-400 font-bold uppercase">Nuevos por guardar</p>
                  <p className="text-3xl font-black text-purple-700 dark:text-purple-400">{importResumen?.nuevos || 0}</p>
                </div>
              </div>

              {!importPreviewData || importPreviewData.length === 0 ? (
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/50 rounded-lg p-8 text-center">
                  <p className="text-green-700 dark:text-green-400 font-bold text-lg mb-2">¡Inventario Cuadrado!</p>
                  <p className="text-green-600 dark:text-green-500">Todos los números de serie detectados en este Excel ya existen activos en tu base de datos.</p>
                </div>
              ) : (
                <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden">
                  <div className="max-h-64 overflow-y-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700 text-sm">
                      <thead className="bg-gray-100 dark:bg-slate-900 sticky top-0">
                        <tr>
                          <th className="px-4 py-3 text-left font-bold text-gray-600 dark:text-gray-400">Tipo</th>
                          <th className="px-4 py-3 text-left font-bold text-gray-600 dark:text-gray-400">Marca / Modelo</th>
                          <th className="px-4 py-3 text-left font-bold text-gray-600 dark:text-gray-400">Número de Serie</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                        {importPreviewData.map((m, idx) => (
                          <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                            <td className="px-4 py-2 font-medium text-gray-900 dark:text-gray-200">{m.tipo}</td>
                            <td className="px-4 py-2 text-gray-600 dark:text-gray-400">{m.marca} / {m.modelo || '-'}</td>
                            <td className="px-4 py-2 text-gray-600 dark:text-gray-400 font-mono">{m.serie}</td>
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

        <div className="px-6 py-4 border-t border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex justify-end space-x-3">
          <button onClick={onClose} className="px-6 py-2 border border-gray-300 dark:border-slate-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 font-medium transition-colors">Cancelar</button>
          {importFase === 2 && importPreviewData && importPreviewData.length > 0 && (
            <button onClick={handleGuardarImportacion} disabled={importing} className="px-6 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 font-bold transition-colors shadow-md flex items-center disabled:bg-gray-400 dark:disabled:bg-slate-600">
              {importing ? 'Guardando...' : `Guardar ${importResumen.nuevos} Equipos`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
