import React from 'react';
import { X, Clock, User, Clipboard, Trash2, Edit3, Database } from 'lucide-react';

const TrazabilidadModal = ({ isOpen, onClose, log }) => {
  if (!isOpen || !log) return null;

  const {
    modulo,
    accion,
    id_registro,
    descripcion,
    datos_anteriores,
    datos_nuevos,
    fecha_cambio,
    nombre_usuario,
    correo_usuario,
  } = log;

  // Formatear fecha
  const fecha = new Date(fecha_cambio).toLocaleString('es-MX', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });

  // Parsear JSONs si vienen como string (aunque la API debería darlos como obj)
  const anteriores = typeof datos_anteriores === 'string' ? JSON.parse(datos_anteriores) : datos_anteriores;
  const nuevos = typeof datos_nuevos === 'string' ? JSON.parse(datos_nuevos) : datos_nuevos;

  // Filtrar campos que realmente cambiaron o son relevantes
  const getDiff = () => {
    if (accion === 'INSERT') return { nuevos: nuevos || {} };
    if (accion === 'DELETE') return { anteriores: anteriores || {} };
    
    if (!anteriores || !nuevos) return { nuevos: nuevos || {}, anteriores: anteriores || {} };

    const diff = { antes: {}, ahora: {} };
    const allKeys = Array.from(new Set([...Object.keys(anteriores), ...Object.keys(nuevos)]));

    allKeys.forEach(key => {
      // Ignorar campos de auditoría interna
      if (['usuario_registro', 'usuario_actualizacion', 'fecha_creacion', 'ultima_modificacion', 'id_empresa'].includes(key)) return;

      const valAnt = anteriores[key];
      const valNue = nuevos[key];

      if (JSON.stringify(valAnt) !== JSON.stringify(valNue)) {
        diff.antes[key] = valAnt;
        diff.ahora[key] = valNue;
      }
    });

    return diff;
  };

  const diff = getDiff();

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[9999] p-4 animate-in fade-in duration-300">
      <div className="bg-[#0f172a] text-slate-200 rounded-3xl shadow-2xl max-w-2xl w-full border border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-8 py-6 border-b border-white/5 flex justify-between items-center bg-slate-900/50">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-500/10 rounded-2xl border border-indigo-500/20">
              <Clipboard className="w-6 h-6 text-indigo-400" />
            </div>
            <div>
              <h3 className="text-xl font-bold tracking-tight text-white uppercase">Detalle del Cambio</h3>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-slate-400 font-medium">{fecha}</span>
                <span className="text-slate-600">•</span>
                <span className="text-xs text-slate-400 font-bold">{nombre_usuario || 'Sistema'}</span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors">
            <X className="w-6 h-6 text-slate-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-8 overflow-y-auto space-y-8 custom-scrollbar">
          
          {/* Badge Section */}
          <div className="flex flex-wrap gap-3">
            <span className={`px-4 py-1.5 rounded-full text-[10px] font-black tracking-widest flex items-center gap-2 border ${
              accion === 'DELETE' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
              accion === 'INSERT' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
              'bg-blue-500/10 text-blue-400 border-blue-500/20'
            }`}>
              {accion === 'DELETE' ? <Trash2 className="w-3 h-3" /> : accion === 'INSERT' ? <Database className="w-3 h-3" /> : <Edit3 className="w-3 h-3" />}
              {accion === 'DELETE' ? 'ELIMINACIÓN' : accion === 'INSERT' ? 'REGISTRO' : 'EDICIÓN'}
            </span>
            <span className="px-4 py-1.5 bg-slate-800/50 text-slate-400 rounded-full text-[10px] font-black tracking-widest border border-slate-700/50">
              {modulo}
            </span>
            <span className="px-4 py-1.5 bg-slate-800/50 text-slate-400 rounded-full text-[10px] font-black tracking-widest border border-slate-700/50">
              ID: {id_registro}
            </span>
          </div>

          {/* Description */}
          <div className="bg-slate-900/80 p-5 rounded-2xl border border-slate-800/50 shadow-inner">
            <p className="text-slate-300 text-sm font-medium leading-relaxed italic">
              "{descripcion}"
            </p>
          </div>

          {/* Data Section */}
          <div className="space-y-6">
            
            {/* Antes (Solo si es UPDATE o DELETE) */}
            {(accion === 'UPDATE' || accion === 'DELETE') && Object.keys(diff.antes || diff.anteriores || {}).length > 0 && (
              <div className="animate-in slide-in-from-left duration-500">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2 h-2 rounded-full bg-red-500" />
                  <h4 className="text-[10px] font-black text-red-500 tracking-widest uppercase">Estado Anterior / Eliminado</h4>
                </div>
                <div className="bg-red-950/20 border border-red-500/20 p-6 rounded-2xl font-mono text-xs overflow-x-auto shadow-inner">
                  <pre className="text-red-300/80">
                    {JSON.stringify(diff.antes || diff.anteriores, null, 2)}
                  </pre>
                </div>
              </div>
            )}

            {/* Ahora (Solo si es UPDATE o INSERT) */}
            {(accion === 'UPDATE' || accion === 'INSERT') && Object.keys(diff.ahora || diff.nuevos || {}).length > 0 && (
              <div className="animate-in slide-in-from-right duration-500">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <h4 className="text-[10px] font-black text-emerald-500 tracking-widest uppercase">Datos Nuevos / Actualizados</h4>
                </div>
                <div className="bg-emerald-950/20 border border-emerald-500/20 p-6 rounded-2xl font-mono text-xs overflow-x-auto shadow-inner">
                  <pre className="text-emerald-300/80">
                    {JSON.stringify(diff.ahora || diff.nuevos, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 py-4 bg-slate-900/80 border-t border-white/5 flex justify-end">
          <button 
            onClick={onClose}
            className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-all border border-slate-700"
          >
            Cerrar Detalle
          </button>
        </div>
      </div>
    </div>
  );
};

export default TrazabilidadModal;
