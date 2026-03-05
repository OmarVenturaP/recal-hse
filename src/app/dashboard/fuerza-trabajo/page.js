"use client";

import { useState, useEffect } from 'react';

export default function FuerzaTrabajoPage() {
  const [trabajadores, setTrabajadores] = useState([]);
  const [loading, setLoading] = useState(true);

  // Catálogos
  const [catPrincipales, setCatPrincipales] = useState([]);
  const [catCuadrillas, setCatCuadrillas] = useState([]);

  // Estados para Filtros
  const [filtroSub, setFiltroSub] = useState('');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');

  // Estados para el Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState(null);

  // Estados para el Modal de Dar de Baja
  const [isBajaModalOpen, setIsBajaModalOpen] = useState(false);
  const [bajaId, setBajaId] = useState(null);
  const [bajaFecha, setBajaFecha] = useState('');

  const formInicial = {
    numero_empleado: '', nombre_trabajador: '', puesto_categoria: '', 
    nss: '', fecha_ingreso_obra: '', fecha_alta_imss: '', 
    origen: 'Local', id_subcontratista_ft: '', id_subcontratista_principal: ''
  };
  
  const [formData, setFormData] = useState(formInicial);

  // --- FUNCIONES AUXILIARES PARA EL MANEJO EXACTO DE FECHAS ---
  
  // 1. Formato para mostrar en la tabla: dd/mm/yyyy
  const formatDDMMYYYY = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    // Usamos getUTC para evitar que la zona horaria de México le reste 1 día por accidente
    const day = String(date.getUTCDate()).padStart(2, '0');
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const year = date.getUTCFullYear();
    return `${day}/${month}/${year}`;
  };

  // 2. Formato para cargar en los inputs del Modal (yyyy-mm-dd)
  const formatForInput = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  useEffect(() => {
    const fetchCatalogos = async () => {
      try {
        const res = await fetch('/api/catalogos/subcontratistas');
        const data = await res.json();
        if (data.success) {
          setCatPrincipales(data.principales);
          setCatCuadrillas(data.cuadrillas);
        }
      } catch (error) {
        console.error("Error cargando catálogos", error);
      }
    };
    fetchCatalogos();
  }, []);

  const fetchTrabajadores = async () => {
    setLoading(true);
    try {
      let url = '/api/fuerza-trabajo?';
      if (filtroSub) url += `subcontratista_principal=${filtroSub}&`;
      if (fechaInicio && fechaFin) url += `fechaInicio=${fechaInicio}&fechaFin=${fechaFin}`;

      const res = await fetch(url);
      const json = await res.json();
      if (json.success) setTrabajadores(json.data);
    } catch (error) {
      console.error("Error cargando datos", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTrabajadores(); }, [filtroSub, fechaInicio, fechaFin]);

  const handleNewClick = () => {
    setFormData(formInicial);
    setIsEditing(false);
    setEditId(null);
    setIsModalOpen(true);
  };

  const handleEditClick = (trabajador) => {
    setFormData({
      numero_empleado: trabajador.numero_empleado || '',
      nombre_trabajador: trabajador.nombre_trabajador,
      puesto_categoria: trabajador.puesto_categoria,
      nss: trabajador.nss || '',
      fecha_ingreso_obra: formatForInput(trabajador.fecha_ingreso_obra),
      fecha_alta_imss: formatForInput(trabajador.fecha_alta_imss),
      origen: trabajador.origen,
      id_subcontratista_ft: trabajador.id_subcontratista_ft || '',
      id_subcontratista_principal: trabajador.id_subcontratista_principal || ''
    });
    setEditId(trabajador.id_trabajador);
    setIsEditing(true);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.nss && !/^\d{11}$/.test(formData.nss)) {
      alert("El NSS debe contener exactamente 11 dígitos numéricos.");
      return;
    }

    if (formData.fecha_alta_imss && formData.fecha_ingreso_obra) {
      const alta = new Date(formData.fecha_alta_imss);
      const ingreso = new Date(formData.fecha_ingreso_obra);
      if (alta > ingreso) {
        alert("Error: La fecha de alta del IMSS no puede ser mayor a la fecha de ingreso a obra.");
        return;
      }
    }

    setSaving(true);
    try {
      const url = '/api/fuerza-trabajo';
      const method = isEditing ? 'PUT' : 'POST';
      const bodyData = isEditing ? { ...formData, id_trabajador: editId } : formData;

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyData)
      });
      const data = await res.json();
      
      if (data.success) {
        setIsModalOpen(false);
        fetchTrabajadores();
      } else {
        alert(data.error);
      }
    } catch (error) {
      alert("Error de conexión al guardar");
    } finally {
      setSaving(false);
    }
  };

  // Función para abrir la ventanita de Baja
  const handleBajaClick = (id) => {
    setBajaId(id);
    // Sugerimos la fecha de hoy por defecto para mayor rapidez
    const hoy = new Date().toISOString().split('T')[0];
    setBajaFecha(hoy);
    setIsBajaModalOpen(true);
  };

  // Función para guardar la baja en MySQL
  const handleBajaSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/fuerza-trabajo', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_trabajador: bajaId, fecha_baja: bajaFecha })
      });
      const data = await res.json();
      
      if (data.success) {
        setIsBajaModalOpen(false);
        fetchTrabajadores(); // Refrescamos la tabla para que se pinte de rojo
      } else {
        alert(data.error);
      }
    } catch (error) {
      alert("Error de conexión");
    } finally {
      setSaving(false);
    }
  };

  const cuadrillasFiltradas = catCuadrillas.filter(
    cuadrilla => cuadrilla.id_subcontratista_principal == formData.id_subcontratista_principal
  );

  return (
    <div className="space-y-6 relative">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-[var(--recal-blue)]">Control de Fuerza de Trabajo</h2>
        <button onClick={handleNewClick} className="bg-[var(--recal-blue)] hover:bg-[var(--recal-blue-hover)] text-white px-4 py-2 rounded-md font-medium shadow-sm">
          + Nuevo Trabajador
        </button>
      </div>

      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Contratista Principal</label>
          <select className="w-full border-gray-300 rounded-md shadow-sm focus:ring-[var(--recal-blue)] sm:text-sm" 
            value={filtroSub} onChange={(e) => setFiltroSub(e.target.value)}>
            <option value="">Todas las empresas...</option>
            {catPrincipales.map(empresa => (
              <option key={empresa.id_subcontratista} value={empresa.id_subcontratista}>{empresa.razon_social}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Ingreso Desde</label>
          <input type="date" className="w-full border-gray-300 rounded-md shadow-sm sm:text-sm" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Ingreso Hasta</label>
          <input type="date" className="w-full border-gray-300 rounded-md shadow-sm sm:text-sm" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} />
        </div>
        <div className="flex items-end">
          <button onClick={() => { setFiltroSub(''); setFechaInicio(''); setFechaFin(''); }} className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-md font-medium sm:text-sm transition-colors">
            Limpiar Filtros
          </button>
        </div>
      </div>

      <div className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nombre</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Puesto</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cuadrilla (FT)</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Origen</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase text-blue-800">Alta IMSS</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ingreso</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estatus</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr><td colSpan="8" className="px-6 py-4 text-center text-sm text-gray-500">Cargando datos...</td></tr>
              ) : trabajadores.map((t) => (
                  <tr key={t.id_trabajador} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{t.nombre_trabajador}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{t.puesto_categoria}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{t.nombre_subcontratista_ft || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{t.origen}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-blue-900">
                      {/* Formato DD/MM/YYYY aplicado aquí */}
                      {t.fecha_alta_imss ? formatDDMMYYYY(t.fecha_alta_imss) : 'Sin Alta'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {/* Formato DD/MM/YYYY aplicado aquí */}
                      {formatDDMMYYYY(t.fecha_ingreso_obra)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {t.fecha_baja ? (
                        <span className="px-2 inline-flex text-xs font-semibold rounded-full bg-red-100 text-red-800">Baja</span>
                      ) : (
                        <span className="px-2 inline-flex text-xs font-semibold rounded-full bg-green-100 text-green-800">Activo</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button onClick={() => handleEditClick(t)} className="text-[var(--recal-blue)] hover:text-blue-900 mr-4">Editar</button>
                      
                      {!t.fecha_baja ? (
                        <button onClick={() => handleBajaClick(t.id_trabajador)} className="text-red-600 hover:text-red-900 font-bold">Dar de Baja</button>
                      ) : (
                        <span className="text-gray-400 italic text-xs">Retirado</span>
                      )}
                    </td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-[var(--recal-gray)]">
              <h3 className="text-lg font-bold text-[var(--recal-blue)]">
                {isEditing ? 'Editar Trabajador' : 'Registro de Nuevo Trabajador'}
              </h3>
              <button type="button" onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 font-bold text-xl">&times;</button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">Nombre Completo *</label>
                  <input required type="text" className="mt-1 w-full border border-gray-300 rounded-md p-2 focus:ring-[var(--recal-blue)] outline-none" 
                    value={formData.nombre_trabajador} onChange={e => setFormData({...formData, nombre_trabajador: e.target.value})} />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Puesto / Categoría *</label>
                  <input required type="text" className="mt-1 w-full border border-gray-300 rounded-md p-2 focus:ring-[var(--recal-blue)] outline-none" 
                    value={formData.puesto_categoria} onChange={e => setFormData({...formData, puesto_categoria: e.target.value})} />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Origen *</label>
                  <select className="mt-1 w-full border border-gray-300 rounded-md p-2 focus:ring-[var(--recal-blue)] outline-none" 
                    value={formData.origen} onChange={e => setFormData({...formData, origen: e.target.value})}>
                    <option value="Local">Local</option>
                    <option value="Foráneo">Foráneo</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Número de Seguridad Social (NSS)</label>
                  <input type="text" maxLength={11} className="mt-1 w-full border border-gray-300 rounded-md p-2 focus:ring-[var(--recal-blue)] outline-none" 
                    placeholder="11 dígitos"
                    value={formData.nss} onChange={e => setFormData({...formData, nss: e.target.value})} />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Fecha Alta IMSS (Opcional)</label>
                  <input type="date" className="mt-1 w-full border border-gray-300 rounded-md p-2 focus:ring-[var(--recal-blue)] outline-none" 
                    value={formData.fecha_alta_imss} onChange={e => setFormData({...formData, fecha_alta_imss: e.target.value})} />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Fecha Ingreso a Obra *</label>
                  <input required type="date" className="mt-1 w-full border border-gray-300 rounded-md p-2 focus:ring-[var(--recal-blue)] outline-none" 
                    value={formData.fecha_ingreso_obra} onChange={e => setFormData({...formData, fecha_ingreso_obra: e.target.value})} />
                </div>

                <div className="md:col-span-1 bg-blue-50 p-3 rounded border border-blue-100">
                  <label className="block text-sm font-bold text-blue-900">Contratista Principal *</label>
                  <select required className="mt-1 w-full border border-gray-300 rounded-md p-2 focus:ring-[var(--recal-blue)] outline-none" 
                    value={formData.id_subcontratista_principal} onChange={e => setFormData({...formData, id_subcontratista_principal: e.target.value, id_subcontratista_ft: ''})}>
                    <option value="">Seleccione Principal...</option>
                    {catPrincipales.map(empresa => (
                      <option key={empresa.id_subcontratista} value={empresa.id_subcontratista}>{empresa.razon_social}</option>
                    ))}
                  </select>
                </div>

                <div className={`md:col-span-1 p-3 rounded border ${!formData.id_subcontratista_principal ? 'bg-gray-100 border-gray-200' : 'bg-white border-gray-300'}`}>
                  <label className="block text-sm font-medium text-gray-700">Cuadrilla (Opcional)</label>
                  <select 
                    disabled={!formData.id_subcontratista_principal}
                    className={`mt-1 w-full rounded-md p-2 outline-none ${!formData.id_subcontratista_principal ? 'bg-gray-100 cursor-not-allowed text-gray-400 border-none' : 'border border-gray-300 focus:ring-[var(--recal-blue)]'}`}
                    value={formData.id_subcontratista_ft} 
                    onChange={e => setFormData({...formData, id_subcontratista_ft: e.target.value})}
                  >
                    <option value="">Ninguna...</option>
                    {cuadrillasFiltradas.map(cuadrilla => (
                      <option key={cuadrilla.id_subcontratista_ft} value={cuadrilla.id_subcontratista_ft}>{cuadrilla.nombre}</option>
                    ))}
                  </select>
                </div>

              </div>

              <div className="pt-4 flex justify-end space-x-3 border-t mt-6">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors">Cancelar</button>
                <button type="submit" disabled={saving} className="px-4 py-2 bg-[var(--recal-blue)] text-white rounded-md hover:bg-[var(--recal-blue-hover)] transition-colors">
                  {saving ? 'Guardando...' : (isEditing ? 'Actualizar Datos' : 'Guardar Trabajador')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMACIÓN DE BAJA */}
      {isBajaModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-sm w-full">
            <div className="px-6 py-4 border-b border-gray-200 bg-red-50 rounded-t-lg">
              <h3 className="text-lg font-bold text-red-700">Confirmar Baja de Personal</h3>
            </div>
            
            <form onSubmit={handleBajaSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Fecha de salida de la obra *</label>
                <input required type="date" className="mt-1 w-full border border-gray-300 rounded-md p-2 focus:ring-red-500 outline-none" 
                  value={bajaFecha} onChange={e => setBajaFecha(e.target.value)} />
                <p className="mt-2 text-xs text-gray-500">El trabajador se mantendrá en la base de datos para historial, pero se marcará como inactivo a partir de esta fecha.</p>
              </div>

              <div className="pt-4 flex justify-end space-x-3 border-t mt-6">
                <button type="button" onClick={() => setIsBajaModalOpen(false)} className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors">Cancelar</button>
                <button type="submit" disabled={saving} className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors font-medium">
                  {saving ? 'Procesando...' : 'Confirmar Baja'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}