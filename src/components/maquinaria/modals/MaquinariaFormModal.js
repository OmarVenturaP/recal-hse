export default function MaquinariaFormModal({
  isOpen,
  onClose,
  isEditing,
  formData,
  setFormData,
  handleSubmit,
  saving,
  imageFile,
  setImageFile,
  catPrincipales,
  canSeeBothAreas
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border dark:border-slate-700">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700 flex justify-between items-center bg-[var(--recal-gray)] dark:bg-slate-900">
          <h3 className="text-lg font-bold text-[var(--recal-blue)] dark:text-white">{isEditing ? 'Editar Equipo' : 'Ingreso de Maquinaria'}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 font-bold text-xl">&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Num. Económico (opcional)</label><input type="text" className="mt-1 w-full bg-transparent border border-gray-300 dark:border-slate-600 dark:text-white rounded-md p-2 outline-none focus:ring-[var(--recal-blue)]" value={formData.num_economico || ''} onChange={e => setFormData({...formData, num_economico: e.target.value.toUpperCase()})} /></div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Categoría de Unidad *</label>
              <select required className="mt-1 w-full bg-transparent border border-gray-300 dark:border-slate-600 dark:text-white rounded-md p-2 outline-none focus:ring-[var(--recal-blue)]" value={formData.tipo_unidad || 'maquinaria'} onChange={e => setFormData({...formData, tipo_unidad: e.target.value})}>
                <option value="maquinaria" className="dark:bg-slate-800">Maquinaria</option>
                <option value="equipo" className="dark:bg-slate-800">Equipo menor</option>
                <option value="herramienta" className="dark:bg-slate-800">Herramienta</option>
                <option value="vehiculo" className="dark:bg-slate-800">Vehículo</option>
              </select>
            </div>
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Equipo / Modelo Específico *</label><input required type="text" className="mt-1 w-full bg-transparent border border-gray-300 dark:border-slate-600 dark:text-white rounded-md p-2 outline-none focus:ring-[var(--recal-blue)]" value={formData.tipo || ''} onChange={e => setFormData({...formData, tipo: e.target.value.toUpperCase()})} /></div>
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Marca *</label><input required type="text" className="mt-1 w-full bg-transparent border border-gray-300 dark:border-slate-600 dark:text-white rounded-md p-2 outline-none focus:ring-[var(--recal-blue)]" value={formData.marca || ''} onChange={e => setFormData({...formData, marca: e.target.value.toUpperCase()})} /></div>
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Modelo (opcional)</label><input type="text" className="mt-1 w-full bg-transparent border border-gray-300 dark:border-slate-600 dark:text-white rounded-md p-2 outline-none focus:ring-[var(--recal-blue)]" value={formData.modelo || ''} onChange={e => setFormData({...formData, modelo: e.target.value.toUpperCase()})} /></div>
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Año</label><input type="text" className="mt-1 w-full bg-transparent border border-gray-300 dark:border-slate-600 dark:text-white rounded-md p-2 outline-none focus:ring-[var(--recal-blue)]" value={formData.anio || ''} onChange={e => setFormData({...formData, anio: e.target.value})} /></div>
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Color (opcional)</label><input type="text" className="mt-1 w-full bg-transparent border border-gray-300 dark:border-slate-600 dark:text-white rounded-md p-2 outline-none focus:ring-[var(--recal-blue)]" value={formData.color || ''} onChange={e => setFormData({...formData, color: e.target.value})} /></div>
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Número de Serie (opcional)</label><input type="text" className="mt-1 w-full bg-transparent border border-gray-300 dark:border-slate-600 dark:text-white rounded-md p-2 outline-none focus:ring-[var(--recal-blue)]" value={formData.serie || ''} onChange={e => setFormData({...formData, serie: e.target.value})} /></div>
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Placa (opcional)</label><input type="text" className="mt-1 w-full bg-transparent border border-gray-300 dark:border-slate-600 dark:text-white rounded-md p-2 outline-none focus:ring-[var(--recal-blue)]" value={formData.placa || ''} onChange={e => setFormData({...formData, placa: e.target.value})} /></div>
                   {/* Bloque: Horómetro / Kilometraje (Solo Maquinaria y Vehículos) */}
            {(formData.tipo_unidad === 'maquinaria' || formData.tipo_unidad === 'vehiculo') && (
              <>
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">
                    {formData.tipo_unidad === 'vehiculo' ? 'Kilometraje Inicial' : 'Horómetro Inicial'}
                  </label>
                  <input type="number" step="0.01" className="mt-1 w-full bg-transparent border border-gray-300 dark:border-slate-600 dark:text-white rounded-md p-2 outline-none focus:ring-[var(--recal-blue)]" value={formData.horometro_inicial || ''} onChange={e => setFormData({...formData, horometro_inicial: e.target.value})} />
                </div>

                <div>
                  <label className="block text-sm font-bold text-blue-900 dark:text-blue-400">
                    {formData.tipo_unidad === 'vehiculo' ? 'Kilometraje Actual' : 'Horómetro Actual'}
                  </label>
                  <input type="number" step="0.01" className="mt-1 w-full bg-blue-50 dark:bg-blue-900/20 border border-gray-300 dark:border-blue-800 dark:text-white rounded-md p-2 outline-none focus:ring-[var(--recal-blue)]" value={formData.horometro || ''} onChange={e => setFormData({...formData, horometro: e.target.value})} />
                </div>
              </>
            )}
            
            {/* Bloque: Mantenimiento (Condicional por categoría) */}
            {(() => {
              const t = formData.tipo_unidad;
              
              if (t === 'maquinaria' || t === 'vehiculo') {
                return (
                  <div>
                    <label className="block text-sm font-bold text-blue-900 dark:text-blue-400">
                      {t === 'vehiculo' ? 'Mantenimiento cada (KM)' : 'Mantenimiento cada (Hrs)'}
                    </label>
                    <input 
                      type="number" 
                      className="mt-1 w-full bg-blue-50 dark:bg-blue-900/20 border border-gray-300 dark:border-blue-800 dark:text-white rounded-md p-2 outline-none focus:ring-[var(--recal-blue)]" 
                      value={formData.intervalo_mantenimiento || ''} 
                      onChange={e => setFormData({...formData, intervalo_mantenimiento: e.target.value})} 
                    />
                  </div>
                );
              }
              
              return null;
            })() }

            {/* Fecha de Próximo Mantenimiento (Cualquiera excepto Herramientas) */}
            {formData.tipo_unidad !== 'herramienta' && (
              <div>
                <label className="block text-sm font-bold text-indigo-900 dark:text-indigo-400 font-mono italic underline decoration-indigo-200">Próximo Mantenimiento</label>
                <input 
                  type="date" 
                  className="mt-1 w-full bg-indigo-50 dark:bg-indigo-900/10 border border-indigo-200 dark:border-indigo-900/50 dark:text-white rounded-md p-2 outline-none focus:ring-indigo-500" 
                  value={formData.fecha_proximo_mantenimiento || ''} 
                  onChange={e => setFormData({...formData, fecha_proximo_mantenimiento: e.target.value})} 
                />
              </div>
            )}
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Fecha Ingreso a Obra *</label><input required type="date" className="mt-1 w-full bg-transparent border border-gray-300 dark:border-slate-600 dark:text-white rounded-md p-2 outline-none focus:ring-[var(--recal-blue)]" value={formData.fecha_ingreso_obra || ''} onChange={e => setFormData({...formData, fecha_ingreso_obra: e.target.value})} /></div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Contratista Propietaria</label>
              <select className="mt-1 w-full bg-transparent border border-gray-300 dark:border-slate-600 dark:text-white rounded-md p-2 outline-none focus:ring-[var(--recal-blue)]" value={formData.id_subcontratista || ''} onChange={e => setFormData({...formData, id_subcontratista: e.target.value})}>
                <option value="" className="dark:bg-slate-800">RECAL (Equipo Propio)</option>
                {catPrincipales && catPrincipales.map(empresa => <option key={empresa.id_subcontratista} value={empresa.id_subcontratista} className="dark:bg-slate-800">{empresa.razon_social}</option>)}
              </select>
            </div>

            {canSeeBothAreas && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Área Asignada *</label>
                <select required className="mt-1 w-full bg-transparent border border-gray-300 dark:border-slate-600 dark:text-white rounded-md p-2 outline-none focus:ring-[var(--recal-blue)]" value={formData.area || ''} onChange={e => setFormData({...formData, area: e.target.value})}>
                  <option value="seguridad" className="dark:bg-slate-800">Seguridad</option>
                  <option value="ambiental" className="dark:bg-slate-800">Medio Ambiente</option>
                </select>
              </div>
            )}

            {/* Campos de Actividad y Frente (Solicitados por Ambiental) */}
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 font-bold text-emerald-700 dark:text-emerald-400">Actividad</label><input type="text" className="mt-1 w-full bg-transparent border border-gray-300 dark:border-slate-600 dark:text-white rounded-md p-2 outline-none focus:ring-emerald-500" value={formData.actividad || ''} onChange={e => setFormData({...formData, actividad: e.target.value.toUpperCase()})} placeholder="Ejem: TRASLADO DE MATERIAL" /></div>
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 font-bold text-emerald-700 dark:text-emerald-400">Frente / Ubicación</label><input type="text" className="mt-1 w-full bg-transparent border border-gray-300 dark:border-slate-600 dark:text-white rounded-md p-2 outline-none focus:ring-emerald-500" value={formData.frente || ''} onChange={e => setFormData({...formData, frente: e.target.value.toUpperCase()})} placeholder="Ejem: TRAMO 1" /></div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Fotografía</label>
              <input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files[0])} className="mt-1 w-full bg-transparent border border-gray-300 dark:border-slate-600 dark:text-white rounded-md p-2 text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-bold file:bg-[var(--recal-blue)] file:text-white hover:file:bg-[var(--recal-blue-hover)]" />
              {formData.imagen_url_actual && !imageFile && (
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">Ya cuenta con una imagen. Sube otra si deseas reemplazarla.</p>
              )}
            </div>
          </div>
          <div className="pt-4 flex justify-end space-x-3 border-t border-gray-200 dark:border-slate-700 mt-6">
            <button type="button" onClick={onClose} className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700">Cancelar</button>
            <button type="submit" disabled={saving} className="px-4 py-2 bg-[var(--recal-blue)] text-white rounded-md hover:bg-[var(--recal-blue-hover)]">
              {saving ? 'Guardando...' : (isEditing ? 'Actualizar' : 'Registrar Equipo')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
