"use client";

import { useState, useEffect } from 'react';
import { Pencil, KeyRound, Shield } from 'lucide-react';
// 1. IMPORTAMOS SWEETALERT
import Swal from 'sweetalert2';

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Estados para el Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  
  const formInicial = {
    id_personal: null, nombre: '', cargo: '', correo: '', 
    area: 'Seguridad', rol: 'Usuario', activo: 1
  };
  const [formData, setFormData] = useState(formInicial);

  const fetchUsuarios = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/usuarios');
      const json = await res.json();
      if (json.success) setUsuarios(json.data);
    } catch (error) {
      console.error("Error cargando usuarios:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsuarios(); }, []);

  const handleNewClick = () => {
    setFormData(formInicial);
    setIsEditing(false);
    setIsModalOpen(true);
  };

  const handleEditClick = (usuario) => {
    setFormData({
      id_personal: usuario.id_personal,
      nombre: usuario.nombre,
      cargo: usuario.cargo,
      correo: usuario.correo,
      area: usuario.area,
      rol: usuario.rol,
      activo: usuario.activo
    });
    setIsEditing(true);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      const method = isEditing ? 'PUT' : 'POST';
      const res = await fetch('/api/usuarios', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      
      if (data.success) {
        setIsModalOpen(false);
        fetchUsuarios();
        Swal.fire('Guardado', 'Los datos del usuario se han actualizado correctamente.', 'success');
      } else {
        Swal.fire('Error', data.error, 'error');
      }
    } catch (error) {
      Swal.fire('Error', 'Error de conexión al guardar los datos.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleResetPassword = async (id, nombre) => {
    Swal.fire({
      title: '¿Restaurar contraseña?',
      text: `La contraseña de ${nombre} volverá a ser "RecalHSE" y el sistema le pedirá cambiarla en su próximo ingreso.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Sí, restaurar',
      cancelButtonText: 'Cancelar'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          const res = await fetch('/api/usuarios', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id_personal: id })
          });
          const data = await res.json();
          
          if (data.success) {
            Swal.fire('¡Éxito!', `Contraseña de ${nombre} restaurada correctamente.`, 'success');
            fetchUsuarios();
          } else {
            Swal.fire('Error', data.error, 'error');
          }
        } catch (error) {
          Swal.fire('Error', 'Ocurrió un error al intentar restaurar la contraseña.', 'error');
        }
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-[var(--recal-blue)] dark:text-white flex items-center gap-2">
            <Shield className="w-6 h-6" /> Control de Accesos
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Gestión de usuarios y permisos del sistema RECAL</p>
        </div>
        <button onClick={handleNewClick} className="w-full sm:w-auto bg-[var(--recal-blue)] hover:bg-[var(--recal-blue-hover)] text-white px-4 py-3 sm:py-2 rounded-md font-medium shadow-sm">
          + Nuevo Usuario
        </button>
      </div>

      <div className="bg-white dark:bg-slate-800 shadow-sm rounded-lg border border-gray-200 dark:border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
            <thead className="bg-gray-50 dark:bg-slate-900 hidden md:table-header-group">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Personal</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Área / Rol</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Estatus</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-slate-800 divide-y md:divide-y-0 md:divide-gray-200 dark:md:divide-slate-700 block md:table-row-group">
              {loading ? (
                <tr className="block md:table-row"><td colSpan="4" className="px-6 py-8 text-center text-sm text-gray-500 dark:text-gray-400 block md:table-cell">Cargando usuarios...</td></tr>
              ) : usuarios.map((u) => (
                <tr key={u.id_personal} className="block md:table-row border border-gray-200 dark:border-slate-700 md:border-none mb-4 md:mb-0 rounded-lg shadow-sm md:shadow-none p-4 md:p-0 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
                  
                  <td className="flex justify-between md:table-cell px-2 md:px-6 py-2 md:py-4 border-b dark:border-slate-700 md:border-none">
                    <span className="md:hidden font-bold text-gray-500 dark:text-gray-400 text-sm">Personal:</span>
                    <div className="text-right md:text-left">
                      <div className="text-sm font-bold text-gray-900 dark:text-gray-200">{u.nombre}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{u.cargo}</div>
                      <div className="text-xs text-blue-600 dark:text-blue-400">{u.correo}</div>
                    </div>
                  </td>

                  <td className="flex justify-between items-center md:table-cell px-2 md:px-6 py-2 md:py-4 border-b dark:border-slate-700 md:border-none">
                    <span className="md:hidden font-bold text-gray-500 dark:text-gray-400 text-sm">Área/Rol:</span>
                    <div className="text-right md:text-left">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-bold rounded-full shadow-sm mb-1 ${u.rol === 'Master' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300' : u.rol === 'Admin' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300' : 'bg-gray-100 dark:bg-slate-700 text-gray-800 dark:text-gray-300'}`}>
                        {u.rol}
                      </span>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{u.area}</div>
                    </div>
                  </td>

                  <td className="flex justify-between items-center md:table-cell px-2 md:px-6 py-2 md:py-4 text-center border-b dark:border-slate-700 md:border-none">
                    <span className="md:hidden font-bold text-gray-500 dark:text-gray-400 text-sm">Estatus:</span>
                    <div>
                      {u.activo ? (
                        <span className="px-2 inline-flex text-xs font-semibold rounded-full bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300">Activo</span>
                      ) : (
                        <span className="px-2 inline-flex text-xs font-semibold rounded-full bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300">Suspendido</span>
                      )}
                      {u.debe_cambiar_password === 1 && (
                         <div className="text-[10px] text-orange-500 dark:text-orange-400 font-bold mt-1 tracking-wider">PENDIENTE DE CAMBIO</div>
                      )}
                    </div>
                  </td>

                  <td className="flex justify-end items-center md:table-cell px-2 md:px-6 py-4 md:py-4 text-sm font-medium border-b dark:border-slate-700 md:border-none">
                    <div className="flex justify-end items-center gap-2">
                      
                      <div className="relative group flex items-center justify-center">
                        <button 
                          onClick={() => handleResetPassword(u.id_personal, u.nombre)} 
                          className="text-orange-600 dark:text-orange-400 hover:text-orange-800 dark:hover:text-orange-300 hover:bg-orange-50 dark:hover:bg-orange-900/30 p-2 rounded-md transition-colors border border-orange-200 dark:border-orange-800 md:border-none flex items-center justify-center"
                        >
                          <KeyRound className="w-4 h-4 sm:w-5 sm:h-5" />
                        </button>
                        <div className="absolute bottom-full mb-2 hidden group-hover:block w-max bg-gray-800 text-white text-[10px] font-bold px-2 py-1 rounded shadow-md z-50">
                          Restaurar Contraseña
                          <div className="absolute top-full left-1/2 -translate-x-1/2 border-[4px] border-transparent border-t-gray-800"></div>
                        </div>
                      </div>
                      <div className="relative group flex items-center justify-center">
                        <button 
                          onClick={() => handleEditClick(u)} 
                          className="text-[var(--recal-blue)] dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 p-2 rounded-md transition-colors border border-blue-200 dark:border-blue-800 md:border-none flex items-center justify-center"
                        >
                          <Pencil className="w-4 h-4 sm:w-5 sm:h-5" />
                        </button>
                        <div className="absolute bottom-full mb-2 hidden group-hover:block w-max bg-gray-800 text-white text-[10px] font-bold px-2 py-1 rounded shadow-md z-50">
                          Editar Usuario
                          <div className="absolute top-full left-1/2 -translate-x-1/2 border-[4px] border-transparent border-t-gray-800"></div>
                        </div>
                      </div>

                    </div>
                  </td>

                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL DE REGISTRO / EDICIÓN */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-lg w-full border dark:border-slate-700">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700 flex justify-between items-center bg-[var(--recal-gray)] dark:bg-slate-900 rounded-t-lg">
              <h3 className="text-lg font-bold text-[var(--recal-blue)] dark:text-white">{isEditing ? 'Editar Accesos' : 'Nuevo Usuario'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 font-bold text-xl">&times;</button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nombre Completo *</label>
                <input required type="text" className="w-full bg-transparent border border-gray-300 dark:border-slate-600 dark:text-white rounded p-2 outline-none focus:ring-[var(--recal-blue)]" 
                  value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Cargo *</label>
                  <input required type="text" className="w-full bg-transparent border border-gray-300 dark:border-slate-600 dark:text-white rounded p-2 outline-none focus:ring-[var(--recal-blue)]" 
                    value={formData.cargo} onChange={e => setFormData({...formData, cargo: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Área *</label>
                  <select className="w-full bg-transparent border border-gray-300 dark:border-slate-600 dark:text-white rounded p-2 outline-none focus:ring-[var(--recal-blue)]" 
                    value={formData.area} onChange={e => setFormData({...formData, area: e.target.value})}>
                    <option value="Seguridad" className="dark:bg-slate-800">Seguridad</option>
                    <option value="Medio Ambiente" className="dark:bg-slate-800">Medio Ambiente</option>
                    <option value="Ambas" className="dark:bg-slate-800">Ambas</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Correo Electrónico (Usuario) *</label>
                <input required type="email" className="w-full bg-transparent border border-gray-300 dark:border-slate-600 dark:text-white rounded p-2 outline-none focus:ring-[var(--recal-blue)]" 
                  value={formData.correo} onChange={e => setFormData({...formData, correo: e.target.value})} />
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-200 dark:border-slate-700 mt-4">
                <div>
                  <label className="block text-sm font-bold text-purple-900 dark:text-purple-400 mb-1">Rol de Sistema *</label>
                  <select className="w-full bg-purple-50 dark:bg-purple-900/20 border border-gray-300 dark:border-purple-800/50 dark:text-white rounded p-2 outline-none focus:ring-[var(--recal-blue)]" 
                    value={formData.rol} onChange={e => setFormData({...formData, rol: e.target.value})}>
                    <option value="Gerencia" className="dark:bg-slate-800">Gerencia (Consulta)</option>
                    <option value="Usuario" className="dark:bg-slate-800">Usuario (Consulta/Edición)</option>
                    <option value="Admin" className="dark:bg-slate-800">Admin (Aprobaciones)</option>
                    <option value="Master" className="dark:bg-slate-800">Master (Control Total)</option>
                  </select>
                </div>

                {isEditing && (
                  <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Estatus *</label>
                    <select className="w-full bg-transparent border border-gray-300 dark:border-slate-600 dark:text-white rounded p-2 outline-none focus:ring-[var(--recal-blue)]" 
                      value={formData.activo} onChange={e => setFormData({...formData, activo: Number(e.target.value)})}>
                      <option value={1} className="dark:bg-slate-800">Activo (Con acceso)</option>
                      <option value={0} className="dark:bg-slate-800">Suspendido (Sin acceso)</option>
                    </select>
                  </div>
                )}
              </div>

              {!isEditing && (
                <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded mt-4 text-sm text-blue-800 dark:text-blue-300 border border-blue-100 dark:border-blue-800/50">
                  <span className="font-bold">Nota:</span> Al crear el usuario, se le asignará la contraseña genérica <strong>RecalHSE</strong>. El sistema le obligará a cambiarla la primera vez que ingrese.
                </div>
              )}

              <div className="pt-4 flex justify-end space-x-3 border-t border-gray-200 dark:border-slate-700 mt-6">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">Cancelar</button>
                <button type="submit" disabled={saving} className="px-4 py-2 bg-[var(--recal-blue)] text-white rounded-md hover:bg-[var(--recal-blue-hover)] font-medium">
                  {saving ? 'Guardando...' : (isEditing ? 'Actualizar Accesos' : 'Crear Usuario')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}