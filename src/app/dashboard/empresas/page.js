"use client";

import { useState, useEffect } from 'react';
import { Pencil, Building } from 'lucide-react';
import Swal from 'sweetalert2';

export default function EmpresasPage() {
  const [empresas, setEmpresas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('empresas'); // 'empresas' o 'contratistas'
  const [contratistas, setContratistas] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  
  const formInicial = {
    id_empresa: null, nombre_comercial: '', rfc: '', plan_suscripcion: 'Free', fecha_inicio_plan: ''
  };
  const [formData, setFormData] = useState(formInicial);

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = empresas.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(empresas.length / itemsPerPage);

  const fetchEmpresas = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/empresas');
      const json = await res.json();
      if (json.success) setEmpresas(json.data);
    } catch (error) {
      console.error("Error cargando empresas:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchContratistas = async () => {
    try {
      const res = await fetch('/api/admin/contratistas');
      const data = await res.json();
      if (data.success) setContratistas(data.data);
    } catch (e) { console.error(e); }
  };

  useEffect(() => { 
    fetchEmpresas(); 
    fetchContratistas();
  }, []);

  const handleNewClick = () => {
    setFormData(formInicial);
    setIsEditing(false);
    setIsModalOpen(true);
  };

  const handleEditClick = (emp) => {
    setFormData({
      id_empresa: emp.id_empresa,
      nombre_comercial: emp.nombre_comercial,
      rfc: emp.rfc || '',
      plan_suscripcion: emp.plan_suscripcion || 'Free',
      fecha_inicio_plan: emp.fecha_inicio_plan ? emp.fecha_inicio_plan.split('T')[0] : ''
    });
    setIsEditing(true);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      const method = isEditing ? 'PUT' : 'POST';
      const res = await fetch('/api/empresas', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      
      if (data.success) {
        setIsModalOpen(false);
        fetchEmpresas();
        Swal.fire('Guardado', 'Datos actualizados correctamente.', 'success');
      } else {
        Swal.fire('Error', data.error || 'Ocurrió un error', 'error');
      }
    } catch (error) {
      Swal.fire('Error', 'Error de conexión.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id, nombre) => {
    Swal.fire({
      title: '¿Ocultar esta empresa?',
      text: `La empresa ${nombre} ya no será visible ni elegible.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Sí, Ocultar'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          const res = await fetch('/api/empresas', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id_empresa: id, estado: 'inactivo' })
          });
          const data = await res.json();
          if (data.success) {
            fetchEmpresas();
          }
        } catch {
          Swal.fire('Error', 'Error en la petición.', 'error');
        }
      }
    });
  };

  const handleUpdateContratistaFecha = async (id, fecha) => {
    try {
      const res = await fetch('/api/admin/contratistas', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_subcontratista: id, fecha_corte: fecha })
      });
      const data = await res.json();
      if (data.success) {
        fetchContratistas();
        Swal.fire({
          toast: true,
          position: 'top-end',
          icon: 'success',
          title: 'Fecha actualizada',
          showConfirmButton: false,
          timer: 1500
        });
      }
    } catch (e) { Swal.fire('Error', 'Error al actualizar', 'error'); }
  };

  return (
    <>
    <div className="max-w-[100rem] mx-auto p-4 md:p-6 lg:p-8 space-y-6 animate-in fade-in duration-500">
      <div className="bg-white/90 dark:bg-slate-800/80 backdrop-blur-xl rounded-[2.5rem] p-6 lg:p-8 shadow-xl border border-gray-200 dark:border-slate-700/50">
        
        <div className="flex flex-col md:flex-row items-start md:items-center gap-6 mb-8 border-b border-gray-100 dark:border-slate-700/50 pb-6">
           <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-[var(--recal-blue)] rounded-2xl shadow-lg flex items-center justify-center text-white shrink-0">
             <Building className="w-8 h-8" />
           </div>
           <div>
             <h1 className="text-3xl font-black text-gray-800 dark:text-white mb-2">Control de Empresas</h1>
             <p className="text-gray-500 dark:text-gray-400 font-medium">Gestión administrativa de los Tenants afiliados (Master).</p>
           </div>
           
           <div className="md:ml-auto w-full md:w-auto mt-4 md:mt-0 flex gap-2">
                <button 
                  onClick={() => setActiveTab('empresas')} 
                  className={`px-4 py-2 rounded-md font-bold text-sm transition-all ${activeTab === 'empresas' ? 'bg-[var(--recal-blue)] text-white shadow-lg' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                >
                  Tenants
                </button>
                <button 
                  onClick={() => setActiveTab('contratistas')} 
                  className={`px-4 py-2 rounded-md font-bold text-sm transition-all ${activeTab === 'contratistas' ? 'bg-[var(--recal-blue)] text-white shadow-lg' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                >
                  Contratistas (Cortes)
                </button>
                {activeTab === 'empresas' && (
                  <button onClick={handleNewClick} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-md font-bold text-sm flex items-center justify-center gap-2 ml-4">
                    + Nueva Empresa
                  </button>
                )}
            </div>
        </div>

        {activeTab === 'empresas' ? (
          <div className="space-y-6">
          <div className="bg-white dark:bg-slate-800 shadow-sm rounded-lg border border-gray-200 dark:border-slate-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
                <thead className="bg-gray-50 dark:bg-slate-900 hidden md:table-header-group">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Empresa</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Plan</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Vencimiento</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Estado</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Acciones</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-slate-800 divide-y md:divide-y-0 md:divide-gray-200 dark:md:divide-slate-700 block md:table-row-group">
                  {loading ? (
                    <tr className="block md:table-row"><td colSpan="3" className="px-6 py-8 text-center text-sm text-gray-500 dark:text-gray-400 block md:table-cell">Cargando empresas...</td></tr>
                  ) : currentItems.length === 0 ? (
                    <tr className="block md:table-row"><td colSpan="3" className="px-6 py-8 text-center text-sm text-gray-500 dark:text-gray-400 block md:table-cell">No hay empresas registradas.</td></tr>
                  ) : currentItems.map((emp) => (
                    <tr key={emp.id_empresa} className="block md:table-row border border-gray-200 dark:border-slate-700 md:border-none mb-4 md:mb-0 rounded-lg p-4 md:p-0 hover:bg-gray-50 dark:hover:bg-slate-700/50">
                      
                      <td className="flex justify-between md:table-cell px-2 md:px-6 py-2 md:py-4 border-b md:border-none">
                        <span className="md:hidden font-bold text-gray-500 text-sm">Empresa:</span>
                        <div className="text-right md:text-left">
                          <div className="font-bold text-gray-900 dark:text-gray-200">{emp.nombre_comercial}</div>
                          <div className="text-xs text-blue-600 dark:text-blue-400">{emp.rfc || 'Sin RFC'}</div>
                        </div>
                      </td>

                      <td className="flex justify-between md:table-cell px-2 md:px-6 py-2 md:py-4 border-b md:border-none">
                        <span className="md:hidden font-bold text-gray-500 text-sm">Plan:</span>
                        <span className={`px-2 py-1 text-xs font-bold rounded-full border ${
                          emp.plan_suscripcion === 'Total' 
                            ? 'bg-amber-50 text-amber-700 border-amber-200 shadow-sm shadow-amber-100' 
                            : emp.plan_suscripcion === 'Intermedio'
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : emp.plan_suscripcion === 'Basico'
                            ? 'bg-slate-50 text-slate-700 border-slate-200'
                            : 'bg-gray-50 text-gray-600 border-gray-200'
                        }`}>
                          {emp.plan_suscripcion ? emp.plan_suscripcion.toUpperCase() : 'FREE'}
                        </span>
                      </td>

                      <td className="flex justify-between md:table-cell px-2 md:px-6 py-2 md:py-4 border-b md:border-none">
                        <span className="md:hidden font-bold text-gray-500 text-sm">Vencimiento:</span>
                        <div className="text-right md:text-left">
                          <div className={`text-xs font-bold ${emp.fecha_inicio_plan ? 'text-gray-600 dark:text-gray-300' : 'text-gray-400 italic'}`}>
                            {emp.fecha_inicio_plan 
                              ? new Date(new Date(emp.fecha_inicio_plan).getTime() + (30 * 24 * 60 * 60 * 1000)).toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' })
                              : 'Sin fecha'
                            }
                          </div>
                        </div>
                      </td>

                      <td className="flex justify-between md:table-cell px-2 md:px-6 py-2 md:py-4 border-b md:border-none">
                        <span className="md:hidden font-bold text-gray-500 text-sm">Estado:</span>
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${emp.estado === 'activo' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          {emp.estado.toUpperCase()}
                        </span>
                      </td>

                      <td className="flex justify-end items-center md:table-cell px-2 md:px-6 py-4 md:py-4 border-b md:border-none">
                        <div className="flex justify-end gap-2 text-[var(--recal-blue)] cursor-pointer">
                          <button onClick={() => handleEditClick(emp)} className="hover:text-blue-800 p-2 border rounded-md"><Pencil className="w-5 h-5"/></button>
                          <button onClick={() => handleDelete(emp.id_empresa, emp.nombre_comercial)} className="hover:text-red-800 text-red-500 p-2 border rounded-md font-bold text-lg">&times;</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          
          {!loading && totalPages > 1 && (
            <div className="flex justify-between items-center mt-4">
              <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-2 border rounded-md disabled:opacity-50">Anterior</button>
              <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="p-2 border rounded-md disabled:opacity-50">Siguiente</button>
            </div>
          )}
        </div>
        ) : (
          /* VISTA DE CONTRATISTAS GLOBALES */
          <div className="bg-white dark:bg-slate-800 shadow-sm rounded-lg border border-gray-200 dark:border-slate-700 overflow-hidden animate-in fade-in slide-in-from-right-4 duration-500">
             <div className="p-4 bg-slate-50 dark:bg-slate-900 border-b border-gray-200 dark:border-slate-700 flex justify-between items-center">
                <h2 className="font-black text-slate-800 dark:text-white uppercase tracking-widest text-xs">Control Global de Fechas de Corte (Contratistas)</h2>
                <span className="text-[10px] font-bold text-slate-400 bg-white dark:bg-slate-800 px-3 py-1 rounded-full border">{contratistas.length} registros</span>
             </div>
             <div className="overflow-x-auto">
               <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
                  <thead className="bg-gray-50 dark:bg-slate-900">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">Empresa (Tenant)</th>
                      <th className="px-6 py-3 text-left text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">Contratista</th>
                      <th className="px-6 py-3 text-left text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">Fecha de Corte</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-700">
                    {contratistas.map((c) => (
                      <tr key={c.id_subcontratista} className="hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition-colors">
                        <td className="px-6 py-4">
                          <span className="text-xs font-black text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded-lg border border-blue-100 dark:border-blue-800 uppercase tracking-tighter">
                            {c.empresa_nombre}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-bold text-slate-700 dark:text-slate-200">{c.razon_social}</div>
                        </td>
                        <td className="px-6 py-4">
                          <input 
                            type="date" 
                            className="bg-transparent border border-gray-200 dark:border-slate-700 rounded-lg p-2 text-sm font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 transition-all outline-none"
                            value={c.fecha_corte ? c.fecha_corte.split('T')[0] : ''}
                            onChange={(e) => handleUpdateContratistaFecha(c.id_subcontratista, e.target.value)}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
               </table>
             </div>
          </div>
        )}
      </div>
    </div>

    {isModalOpen && (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[999] p-4 w-full h-full">
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-lg w-full">
          <div className="px-6 py-4 border-b flex justify-between bg-slate-100 dark:bg-slate-900 rounded-t-lg">
            <h3 className="text-lg font-bold">{isEditing ? 'Editar Empresa' : 'Nueva Empresa'}</h3>
            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 font-bold text-xl">&times;</button>
          </div>
          
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1 dark:text-white">Nombre Comercial *</label>
              <input required type="text" className="w-full bg-transparent border rounded p-2 dark:text-white" 
                value={formData.nombre_comercial} onChange={e => setFormData({...formData, nombre_comercial: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 dark:text-white">RFC</label>
              <input type="text" className="w-full bg-transparent border rounded p-2 dark:text-white uppercase" 
                value={formData.rfc} onChange={e => setFormData({...formData, rfc: e.target.value.toUpperCase()})} />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 dark:text-white">Plan de Suscripción *</label>
              <select required className="w-full bg-transparent border rounded p-2 dark:text-white dark:bg-slate-800"
                value={formData.plan_suscripcion} onChange={e => setFormData({...formData, plan_suscripcion: e.target.value})}>
                <option value="Free">Free / Demo</option>
                <option value="Basico">Básico</option>
                <option value="Intermedio">Intermedio</option>
                <option value="Total">Total (Premium)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 dark:text-white">Fecha de Inicio / Renovación de Plan</label>
              <input type="date" className="w-full bg-transparent border rounded p-2 dark:text-white" 
                value={formData.fecha_inicio_plan} onChange={e => setFormData({...formData, fecha_inicio_plan: e.target.value})} />
              <p className="text-[10px] text-gray-500 mt-1 italic">El sistema calculará automáticamente 30 días adicionales para el corte.</p>
            </div>

            <div className="pt-4 flex justify-end space-x-3 mt-6 border-t">
              <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 border rounded-md mt-4">Cancelar</button>
              <button type="submit" disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-md mt-4">
                {saving ? 'Guardando...' : (isEditing ? 'Actualizar' : 'Registrar')}
              </button>
            </div>
          </form>
        </div>
      </div>
    )}
    </>
  );
}
