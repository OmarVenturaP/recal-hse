"use client";

import { useState, useEffect, useCallback } from 'react';
import {
  History, Filter, Download, Edit3, Trash2, Plus, Eye,
  Search, RefreshCw, ChevronDown, X, FileText, Users,
  Shield, GraduationCap, Stethoscope, AlertCircle, Clock
} from 'lucide-react';

const MODULOS = [
  { value: '', label: 'Todos los módulos', icon: History },
  { value: 'Fuerza de Trabajo', label: 'Fuerza de Trabajo', icon: Users },
  { value: 'Informes de Seguridad', label: 'Informes de Seguridad', icon: Shield },
  { value: 'DC3', label: 'DC3 (Capacitación)', icon: GraduationCap },
  { value: 'Certificados Médicos', label: 'Certificados Médicos', icon: Stethoscope },
];

const ACCIONES_CONFIG = {
  INSERT: { label: 'Alta', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400', icon: Plus },
  UPDATE: { label: 'Edición', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', icon: Edit3 },
  DELETE: { label: 'Eliminación', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', icon: Trash2 },
  EXPORT: { label: 'Descarga', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400', icon: Download },
};

const MODULOS_ICONS = {
  'Fuerza de Trabajo': Users,
  'Informes de Seguridad': Shield,
  'DC3': GraduationCap,
  'Certificados Médicos': Stethoscope,
};

export default function TrazabilidadPage() {
  const [registros, setRegistros]       = useState([]);
  const [loading, setLoading]           = useState(true);
  const [busqueda, setBusqueda]         = useState('');
  const [modulo, setModulo]             = useState('');
  const [accion, setAccion]             = useState('');
  const [fechaInicio, setFechaInicio]   = useState('');
  const [fechaFin, setFechaFin]         = useState('');
  const [detalle, setDetalle]           = useState(null);

  const cargarHistorial = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (modulo)      params.set('modulo', modulo);
      if (accion)      params.set('accion', accion);
      if (fechaInicio) params.set('fechaInicio', fechaInicio);
      if (fechaFin)    params.set('fechaFin', fechaFin);
      params.set('limit', '500');

      const res = await fetch(`/api/trazabilidad?${params.toString()}`);
      const data = await res.json();
      if (data.success) setRegistros(data.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [modulo, accion, fechaInicio, fechaFin]);

  useEffect(() => { cargarHistorial(); }, [cargarHistorial]);

  const registrosFiltrados = registros.filter(r => {
    if (!busqueda) return true;
    const q = busqueda.toLowerCase();
    return (
      r.descripcion?.toLowerCase().includes(q) ||
      r.nombre_usuario?.toLowerCase().includes(q) ||
      r.correo_usuario?.toLowerCase().includes(q) ||
      r.modulo?.toLowerCase().includes(q) ||
      r.id_registro?.toLowerCase().includes(q)
    );
  });

  const formatFecha = (raw) => {
    if (!raw) return '—';
    const d = new Date(raw);
    return d.toLocaleString('es-MX', {
      timeZone: 'America/Mexico_City',
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hour12: true
    });
  };

  const AccionBadge = ({ accion }) => {
    const cfg = ACCIONES_CONFIG[accion] || { label: accion, color: 'bg-gray-100 text-gray-600', icon: Eye };
    const Icon = cfg.icon;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${cfg.color}`}>
        <Icon className="w-3 h-3" /> {cfg.label}
      </span>
    );
  };

  const ModuloBadge = ({ modulo }) => {
    const Icon = MODULOS_ICONS[modulo] || History;
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-600 dark:text-gray-300">
        <Icon className="w-3.5 h-3.5 shrink-0" /> {modulo}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-4 md:p-6">

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="p-2 bg-indigo-600 rounded-xl">
            <History className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Trazabilidad del Sistema</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">Historial completo de acciones y descargas</p>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-4 mb-5">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">

          {/* Busqueda libre */}
          <div className="relative lg:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por descripción, usuario..."
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Módulo */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <select
              value={modulo}
              onChange={e => setModulo(e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none"
            >
              {MODULOS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>

          {/* Acción */}
          <div className="relative">
            <select
              value={accion}
              onChange={e => setAccion(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none"
            >
              <option value="">Todas las acciones</option>
              <option value="INSERT">Altas</option>
              <option value="UPDATE">Ediciones</option>
              <option value="DELETE">Eliminaciones</option>
              <option value="EXPORT">Descargas</option>
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>

          {/* Botón actualizar */}
          <button
            onClick={cargarHistorial}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </button>
        </div>

        {/* Filtro de fechas */}
        <div className="flex flex-wrap gap-3 mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-gray-400" />
            <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Rango de fechas:</span>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500">Desde</label>
            <input
              type="date"
              value={fechaInicio}
              onChange={e => setFechaInicio(e.target.value)}
              className="text-xs px-2 py-1 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500">Hasta</label>
            <input
              type="date"
              value={fechaFin}
              onChange={e => setFechaFin(e.target.value)}
              className="text-xs px-2 py-1 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white"
            />
          </div>
          {(fechaInicio || fechaFin || modulo || accion) && (
            <button
              onClick={() => { setFechaInicio(''); setFechaFin(''); setModulo(''); setAccion(''); setBusqueda(''); }}
              className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 font-medium"
            >
              <X className="w-3 h-3" /> Limpiar filtros
            </button>
          )}
        </div>
      </div>

      {/* Contador */}
      <div className="flex items-center justify-between mb-3 px-1">
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {loading ? 'Cargando...' : `${registrosFiltrados.length} registro${registrosFiltrados.length !== 1 ? 's' : ''} encontrado${registrosFiltrados.length !== 1 ? 's' : ''}`}
        </span>
      </div>

      {/* Tabla */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin" />
            <p className="text-sm text-gray-500">Cargando historial...</p>
          </div>
        ) : registrosFiltrados.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-gray-400">
            <AlertCircle className="w-10 h-10" />
            <p className="text-sm font-medium">Sin registros con los filtros actuales</p>
            <p className="text-xs">Las acciones futuras aparecerán aquí automáticamente.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Fecha / Hora</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Usuario</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Módulo</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Acción</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Descripción</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {registrosFiltrados.map(r => (
                  <tr key={r.id_auditoria} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="text-xs font-semibold text-gray-800 dark:text-gray-200">{formatFecha(r.fecha_cambio)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="text-xs font-semibold text-gray-800 dark:text-gray-200">{r.nombre_usuario || '—'}</span>
                        <span className="text-[10px] text-gray-400">{r.correo_usuario || ''}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <ModuloBadge modulo={r.modulo} />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <AccionBadge accion={r.accion} />
                    </td>
                    <td className="px-4 py-3 max-w-xs">
                      <p className="text-xs text-gray-600 dark:text-gray-300 truncate" title={r.descripcion}>{r.descripcion || '—'}</p>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {(r.datos_anteriores || r.datos_nuevos) && (
                        <button
                          onClick={() => setDetalle(r)}
                          className="text-indigo-500 hover:text-indigo-700 p-1 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
                          title="Ver detalle"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Detalle */}
      {detalle && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setDetalle(null)}>
          <div
            className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-2xl max-h-[85vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                  <FileText className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <h2 className="font-bold text-gray-900 dark:text-white">Detalle del Cambio</h2>
                  <p className="text-xs text-gray-400">{formatFecha(detalle.fecha_cambio)} • {detalle.nombre_usuario || 'Usuario desconocido'}</p>
                </div>
              </div>
              <button onClick={() => setDetalle(null)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="flex flex-wrap gap-2">
                <AccionBadge accion={detalle.accion} />
                <span className="text-xs text-gray-500 dark:text-gray-400 px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded-full">{detalle.modulo}</span>
                <span className="text-xs text-gray-500 dark:text-gray-400 px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded-full">ID: {detalle.id_registro}</span>
              </div>

              <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
                <p className="text-sm text-gray-700 dark:text-gray-200 font-medium">{detalle.descripcion}</p>
              </div>

              {detalle.datos_anteriores && (
                <div>
                  <h3 className="text-xs font-bold text-red-500 uppercase tracking-wide mb-2 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-red-400 inline-block"></span> Datos Anteriores
                  </h3>
                  <pre className="text-xs bg-red-50 dark:bg-red-950/30 text-red-800 dark:text-red-300 p-3 rounded-xl overflow-auto border border-red-100 dark:border-red-900">
                    {JSON.stringify(detalle.datos_anteriores, null, 2)}
                  </pre>
                </div>
              )}

              {detalle.datos_nuevos && (
                <div>
                  <h3 className="text-xs font-bold text-emerald-600 uppercase tracking-wide mb-2 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block"></span>
                    {detalle.accion === 'EXPORT' ? 'Parámetros de Descarga' : 'Datos Nuevos / Actualizados'}
                  </h3>
                  <pre className="text-xs bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 p-3 rounded-xl overflow-auto border border-emerald-100 dark:border-emerald-900">
                    {JSON.stringify(detalle.datos_nuevos, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
