const COLOR_INSPECCION = {
  '01': { nombre: 'Azul',     bg: '#3B82F6', text: '#ffffff' },
  '02': { nombre: 'Amarillo', bg: '#FACC15', text: '#713f12' },
  '03': { nombre: 'Blanco',   bg: '#f9fafb', text: '#374151' },
  '04': { nombre: 'Verde',    bg: '#22C55E', text: '#ffffff' },
  '05': { nombre: 'Azul',     bg: '#3B82F6', text: '#ffffff' },
  '06': { nombre: 'Amarillo', bg: '#FACC15', text: '#713f12' },
  '07': { nombre: 'Blanco',   bg: '#f9fafb', text: '#374151' },
  '08': { nombre: 'Verde',    bg: '#22C55E', text: '#ffffff' },
  '09': { nombre: 'Azul',     bg: '#3B82F6', text: '#ffffff' },
  '10': { nombre: 'Amarillo', bg: '#FACC15', text: '#713f12' },
  '11': { nombre: 'Blanco',   bg: '#f9fafb', text: '#374151' },
  '12': { nombre: 'Verde',    bg: '#22C55E', text: '#ffffff' },
};

const MESES_NOMBRES = {
  1: 'Enero', 2: 'Febrero', 3: 'Marzo', 4: 'Abril', 5: 'Mayo', 6: 'Junio',
  7: 'Julio', 8: 'Agosto', 9: 'Septiembre', 10: 'Octubre', 11: 'Noviembre', 12: 'Diciembre'
};

export default function MaquinariaInspeccionHerramientaModal({
  isOpen,
  onClose,
  herramientaSeleccionada,
  inspecciones,
  exportMes,
  exportAnio,
  onGuardar,
  saving,
}) {
  if (!isOpen || !herramientaSeleccionada) return null;

  const mesKey = String(exportMes).padStart(2, '0');
  const colorInfo = COLOR_INSPECCION[mesKey] || { nombre: 'N/A', bg: '#e5e7eb', text: '#374151' };
  const mesNombre = MESES_NOMBRES[parseInt(exportMes)] || exportMes;

  // Verificar si ya existe una inspección para el periodo actual
  const inspeccionActual = inspecciones.find(
    (i) => i.mes === parseInt(exportMes) && i.anio === parseInt(exportAnio)
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    onGuardar({
      id_maquinaria: herramientaSeleccionada.id_maquinaria,
      mes: parseInt(exportMes),
      anio: parseInt(exportAnio),
      color_mes: colorInfo.nombre,
      resultado: formData.get('resultado'),
      observaciones: formData.get('observaciones') || '',
      fecha_inspeccion: formData.get('fecha_inspeccion'),
      realizado_por: (formData.get('realizado_por') || '').toUpperCase(),
    });
  };

  const getResultadoBadge = (resultado) => {
    if (resultado === 'Aprobado') return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border-green-200 dark:border-green-800';
    if (resultado === 'Rechazado') return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 border-red-200 dark:border-red-800';
    return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800';
  };

  // Función para formatear fechas de la BD (YYYY-MM-DD) a (DD/MM/YYYY)
  const formatDBDate = (dbDate) => {
    if (!dbDate) return '—';
    try {
      const d = new Date(dbDate);
      if (isNaN(d.getTime())) return '—';
      // Ajuste de zona horaria para evitar desfases de un día
      const userTimezoneOffset = d.getTimezoneOffset() * 60000;
      const adjustedDate = new Date(d.getTime() + userTimezoneOffset);
      return adjustedDate.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch (e) { return '—'; }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-2xl max-w-5xl w-full flex flex-col max-h-[90vh] border dark:border-slate-700">
        {/* Header */}
        <div className="px-4 md:px-6 py-4 border-b border-gray-200 dark:border-slate-700 flex justify-between items-center rounded-t-lg"
          style={{ backgroundColor: colorInfo.bg }}>
          <div>
            <h3 className="text-base md:text-lg font-bold truncate pr-4" style={{ color: colorInfo.text }}>
              🔍 Inspecciones Visuales: {herramientaSeleccionada.tipo || 'S/N'}
            </h3>
            <p className="text-xs font-semibold mt-0.5" style={{ color: colorInfo.text, opacity: 0.85 }}>
              Color del mes {mesNombre} {exportAnio}: <strong>{colorInfo.nombre}</strong>
            </p>
          </div>
          <button onClick={onClose} className="font-bold text-xl md:text-2xl" style={{ color: colorInfo.text }}>
            &times;
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-6 flex flex-col md:grid md:grid-cols-4 gap-6 bg-gray-50 dark:bg-slate-900">

          {/* Formulario de nueva inspección */}
          <div className="w-full md:col-span-1 bg-white dark:bg-slate-800 p-4 rounded border border-gray-200 dark:border-slate-700 shadow-sm h-fit">
            <h4 className="font-bold text-gray-700 dark:text-gray-200 border-b dark:border-slate-700 pb-2 mb-4 text-sm uppercase">
              {inspeccionActual ? 'Actualizar Registro' : 'Registrar Inspección'}
            </h4>

            {/* Badge del color del mes */}
            <div className="mb-4 p-3 rounded-lg border-2 flex items-center gap-3"
              style={{ backgroundColor: colorInfo.bg, borderColor: colorInfo.bg }}>
              <div className="w-8 h-8 rounded-full border-2 border-white shadow-md flex-shrink-0"
                style={{ backgroundColor: colorInfo.bg, outline: '2px solid rgba(0,0,0,0.15)' }} />
              <div>
                <p className="text-xs font-bold uppercase" style={{ color: colorInfo.text }}>Color asignado</p>
                <p className="text-sm font-black" style={{ color: colorInfo.text }}>{colorInfo.nombre} — {mesNombre}</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Fecha de Inspección *
                </label>
                <input
                  type="date"
                  name="fecha_inspeccion"
                  required
                  defaultValue={inspeccionActual?.fecha_inspeccion ? new Date(inspeccionActual.fecha_inspeccion).toISOString().split('T')[0] : ''}
                  className="w-full bg-transparent border border-gray-300 dark:border-slate-600 dark:text-white rounded p-2 text-sm outline-none focus:border-[var(--recal-blue)]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Realizado por *
                </label>
                <input
                  type="text"
                  name="realizado_por"
                  required
                  defaultValue={inspeccionActual?.realizado_por || ''}
                  placeholder="NOMBRE DEL RESPONSABLE"
                  className="w-full bg-transparent border border-gray-300 dark:border-slate-600 dark:text-white rounded p-2 text-sm outline-none focus:border-[var(--recal-blue)]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Resultado *
                </label>
                <select
                  name="resultado"
                  required
                  defaultValue={inspeccionActual?.resultado || 'Aprobado'}
                  className="w-full bg-transparent border border-gray-300 dark:border-slate-600 dark:text-white rounded p-2 text-sm outline-none focus:border-[var(--recal-blue)]"
                >
                  <option value="Aprobado" className="dark:bg-slate-800">✅ Aprobado</option>
                  <option value="Rechazado" className="dark:bg-slate-800">❌ Rechazado</option>
                  <option value="Pendiente" className="dark:bg-slate-800">⏳ Pendiente</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Observaciones</label>
                <textarea
                  name="observaciones"
                  rows="3"
                  defaultValue={inspeccionActual?.observaciones || ''}
                  className="w-full bg-transparent border border-gray-300 dark:border-slate-600 dark:text-white rounded p-2 text-sm outline-none focus:border-[var(--recal-blue)]"
                  placeholder="Condición visual, daños..."
                />
              </div>
              <button
                type="submit"
                disabled={saving}
                className="w-full bg-blue-600 text-white rounded p-3 md:p-2 text-sm font-bold hover:bg-blue-700 transition-colors"
              >
                {saving ? 'Guardando...' : (inspeccionActual ? 'Actualizar Registro' : 'Guardar Inspección')}
              </button>
            </form>
          </div>

          {/* Historial de inspecciones */}
          <div className="w-full md:col-span-3 bg-white dark:bg-slate-800 rounded border border-gray-200 dark:border-slate-700 shadow-sm overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
              <thead className="bg-gray-100 dark:bg-slate-900">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-bold text-gray-600 dark:text-gray-400 uppercase">Periodo</th>
                  <th className="px-4 py-2 text-left text-xs font-bold text-gray-600 dark:text-gray-400 uppercase">Fecha Insp.</th>
                  <th className="px-4 py-2 text-left text-xs font-bold text-gray-600 dark:text-gray-400 uppercase">Responsable</th>
                  <th className="px-4 py-2 text-center text-xs font-bold text-gray-600 dark:text-gray-400 uppercase">Color</th>
                  <th className="px-4 py-2 text-center text-xs font-bold text-gray-600 dark:text-gray-400 uppercase">Estado</th>
                  <th className="px-4 py-2 text-left text-xs font-bold text-gray-600 dark:text-gray-400 uppercase">Observaciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                {inspecciones.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400 italic">
                      Sin inspecciones registradas aún.
                    </td>
                  </tr>
                ) : (
                  inspecciones.map((insp) => {
                    const mesInsp = String(insp.mes).padStart(2, '0');
                    const cInfo = COLOR_INSPECCION[mesInsp] || { nombre: 'N/A', bg: '#e5e7eb', text: '#374151' };
                    return (
                      <tr key={insp.id_inspeccion} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-bold text-gray-900 dark:text-gray-200">
                          {MESES_NOMBRES[insp.mes]} {insp.anio}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-mono text-blue-600 dark:text-blue-400">
                          {formatDBDate(insp.fecha_inspeccion)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300 font-medium italic">
                          {insp.realizado_por || '—'}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className="px-2 py-0.5 rounded-full text-[10px] font-black border"
                            style={{ backgroundColor: cInfo.bg, color: cInfo.text, borderColor: cInfo.bg }}
                          >
                            {insp.color_mes}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${getResultadoBadge(insp.resultado)}`}>
                            {insp.resultado}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 max-w-xs truncate" title={insp.observaciones}>
                          {insp.observaciones || '—'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
