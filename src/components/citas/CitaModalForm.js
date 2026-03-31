import { MapPin, Trash2 } from 'lucide-react';

export default function CitaModalForm({
  isOpen,
  onClose,
  isEditing,
  formData,
  setFormData,
  handleSubmit,
  handleDelete,
  canManageCitas,
  canEditResults,
  catSubcontratistas,
  catUsuarios,
  activeTab
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-2xl w-full border dark:border-slate-700 max-h-[90vh] overflow-y-auto">
        <div className={`px-6 py-4 border-b border-gray-200 dark:border-slate-700 flex justify-between items-center rounded-t-xl ${formData.area === 'Seguridad' ? 'bg-blue-50 dark:bg-blue-900/20' : 'bg-green-50 dark:bg-green-900/20'}`}>
          <h3 className={`text-lg font-bold flex items-center ${formData.area === 'Seguridad' ? 'text-blue-800 dark:text-blue-300' : 'text-green-800 dark:text-green-300'}`}>
            {isEditing ? 'Detalles de la Cita' : 'Agendar Nueva Cita'} {formData.area ? `- ${formData.area}` : ''}
            {!canManageCitas && <span className="ml-3 text-[10px] font-bold text-gray-500 bg-gray-200 dark:bg-slate-700 px-2 py-1 rounded">MODO LECTURA</span>}
          </h3>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 font-bold text-2xl">&times;</button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            <div className="md:col-span-2">
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Contratista a evaluar *</label>
              <select required disabled={!canManageCitas || isEditing} className="w-full bg-transparent border border-gray-300 dark:border-slate-600 dark:text-white rounded p-2 outline-none focus:ring-[var(--recal-blue)] disabled:opacity-60 disabled:bg-gray-100 dark:disabled:bg-slate-900" value={formData.id_subcontratista || ''} onChange={e => setFormData({...formData, id_subcontratista: e.target.value})}>
                <option value="" className="dark:bg-slate-800">-- Seleccione Contratista --</option>
                {catSubcontratistas.map(emp => <option key={emp.id_subcontratista} value={emp.id_subcontratista} className="dark:bg-slate-800">{emp.razon_social}</option>)}
              </select>
            </div>

            {!isEditing && activeTab === 'Ambas' && (
              <div className="md:col-span-2 p-3 bg-purple-50 dark:bg-purple-900/20 rounded border border-purple-200 dark:border-purple-800">
                <label className="block text-sm font-bold text-purple-800 dark:text-purple-300 mb-1">¿A qué área corresponde esta cita? *</label>
                <select required disabled={!canManageCitas} className="w-full bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 dark:text-white rounded p-2 outline-none focus:ring-purple-500 disabled:opacity-60" value={formData.area || ''} onChange={e => setFormData({...formData, area: e.target.value})}>
                  <option value="Seguridad" className="dark:bg-slate-800">Seguridad</option>
                  <option value="Medio Ambiente" className="dark:bg-slate-800">Medio Ambiente</option>
                </select>
              </div>
            )}

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Revisor Asignado</label>
              <select 
                disabled={!canManageCitas}
                className="w-full bg-transparent border border-gray-300 dark:border-slate-600 dark:text-white rounded p-2 outline-none focus:ring-[var(--recal-blue)] disabled:opacity-60 disabled:bg-gray-50 dark:disabled:bg-slate-900/50" 
                value={formData.revisor_nombre || ''} 
                onChange={e => setFormData({...formData, revisor_nombre: e.target.value})}
              >
                <option value="" className="dark:bg-slate-800">-- Sin Asignar --</option>
                {catUsuarios.map(u => (
                  <option key={u.id_personal} value={u.nombre} className="dark:bg-slate-800">{u.nombre}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Fecha Programada *</label>
              <input required disabled={!canManageCitas} type="date" className="w-full bg-transparent border border-gray-300 dark:border-slate-600 dark:text-white rounded p-2 outline-none focus:ring-[var(--recal-blue)] disabled:opacity-60 disabled:bg-gray-50 dark:disabled:bg-slate-900/50" value={formData.fecha_cita || ''} onChange={e => setFormData({...formData, fecha_cita: e.target.value})} />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Hora Programada *</label>
              <input required disabled={!canManageCitas} type="time" className="w-full bg-transparent border border-gray-300 dark:border-slate-600 dark:text-white rounded p-2 outline-none focus:ring-[var(--recal-blue)] disabled:opacity-60 disabled:bg-gray-50 dark:disabled:bg-slate-900/50" value={formData.hora_cita || ''} onChange={e => setFormData({...formData, hora_cita: e.target.value})} />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Periodo</label>
              <input disabled={!canManageCitas} type="text" placeholder="Ej. Marzo 2026" className="w-full bg-transparent border border-gray-300 dark:border-slate-600 dark:text-white rounded p-2 outline-none focus:ring-[var(--recal-blue)] uppercase disabled:opacity-60 disabled:bg-gray-50 dark:disabled:bg-slate-900/50" value={formData.periodo_evaluado || ''} onChange={e => setFormData({...formData, periodo_evaluado: e.target.value.toUpperCase()})} />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Número de Revisión</label>
              <select disabled={!canManageCitas} className="w-full bg-transparent border border-gray-300 dark:border-slate-600 dark:text-white rounded p-2 outline-none focus:ring-[var(--recal-blue)] disabled:opacity-60 disabled:bg-gray-50 dark:disabled:bg-slate-900/50" value={formData.num_revision || ''} onChange={e => setFormData({...formData, num_revision: e.target.value})}>
                <option value="1ra Revisión" className="dark:bg-slate-800">1ra Revisión</option>
                <option value="2da Revisión" className="dark:bg-slate-800">2da Revisión</option>
                <option value="3ra Revisión" className="dark:bg-slate-800">3ra Revisión</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Dossier a revisar</label>
              <input disabled={!canManageCitas} type="text" placeholder="Ej. Dossier Ambiental/Seguridad" className="w-full bg-transparent border border-gray-300 dark:border-slate-600 dark:text-white rounded p-2 outline-none focus:ring-[var(--recal-blue)] uppercase disabled:opacity-60 disabled:bg-gray-50 dark:disabled:bg-slate-900/50" value={formData.dossiers_entregados || ''} onChange={e => setFormData({...formData, dossiers_entregados: e.target.value.toUpperCase()})} />
            </div>

            {isEditing && (
              <div className={`md:col-span-2 mt-2 p-4 border rounded-lg ${canEditResults ? 'border-dashed border-[var(--recal-blue)] bg-blue-50 dark:bg-slate-900' : 'border-gray-300 dark:border-slate-600 bg-gray-50 dark:bg-slate-900 opacity-80'}`}>
                <div className="flex justify-between items-center mb-3">
                  <h4 className="text-sm font-bold text-[var(--recal-blue)] dark:text-blue-400 flex items-center"><MapPin className="w-4 h-4 mr-2" /> Resultados de la Revisión</h4>
                  {!canEditResults && <span className="text-[10px] font-bold text-red-500 bg-red-50 dark:bg-red-900/30 px-2 py-1 rounded">SOLO REVISOR ASIGNADO</span>}
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Estatus Final</label>
                    <select disabled={!canEditResults} className="w-full bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 dark:text-white rounded p-2 outline-none focus:ring-[var(--recal-blue)] disabled:opacity-80 disabled:cursor-not-allowed" value={formData.estatus || ''} onChange={e => setFormData({...formData, estatus: e.target.value})}>
                      <option value="Programada" className="dark:bg-slate-800">🕒 Programada (Pendiente)</option>
                      <option value="Liberado" className="dark:bg-slate-800">✅ Liberado (Todo OK)</option>
                      <option value="En observaciones" className="dark:bg-slate-800">⚠️ En observaciones</option>
                      <option value="No asistió" className="dark:bg-slate-800">❌ No asistió</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Comentarios del Revisor</label>
                    <textarea disabled={!canEditResults} rows="3" placeholder="Anota qué faltó, o por qué se liberó..." className="w-full bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 dark:text-white rounded p-2 outline-none focus:ring-[var(--recal-blue)] uppercase disabled:opacity-80 disabled:cursor-not-allowed" value={formData.comentarios_revisor || ''} onChange={e => setFormData({...formData, comentarios_revisor: e.target.value.toUpperCase()})}></textarea>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="pt-4 flex justify-between items-center border-t border-gray-200 dark:border-slate-700 mt-6">
            <div>
              {isEditing && canManageCitas && (
                <button type="button" onClick={handleDelete} className="px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40 rounded-md font-medium transition-colors flex items-center">
                  <Trash2 className="w-4 h-4 mr-2" /> Eliminar
                </button>
              )}
            </div>
            
            <div className="flex space-x-3">
              <button type="button" onClick={onClose} className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">Cerrar</button>
              
              {(canManageCitas || (isEditing && canEditResults)) && (
                <button type="submit" className="px-6 py-2 bg-[var(--recal-blue)] text-white rounded-md hover:bg-[var(--recal-blue-hover)] font-bold transition-colors shadow-sm">
                  {isEditing ? 'Guardar Cambios' : 'Agendar Cita'}
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
