"use client";

import { useState, useEffect } from 'react';
import { Pencil, KeyRound, Shield } from 'lucide-react';

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
      } else {
        alert(data.error);
      }
    } catch (error) {
      alert("Error de conexión al guardar");
    } finally {
      setSaving(false);
    }
  };

  const handleResetPassword = async (id, nombre) => {
    const confirmar = window.confirm(`¿Estás seguro de restaurar la contraseña de ${nombre} a "RecalHSE"?\nEl sistema le pedirá cambiarla en su próximo ingreso.`);
    
    if (confirmar) {
      try {
        const res = await fetch('/api/usuarios', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id_personal: id })
        });
        const data = await res.json();
        
        if (data.success) {
          alert(`Contraseña de ${nombre} restaurada con éxito.`);
          fetchUsuarios();
        } else {
          alert(data.error);
        }
      } catch (error) {
        alert("Error al restaurar contraseña.");
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-[var(--recal-blue)] flex items-center gap-2">
            <Shield className="w-6 h-6" /> Control de Accesos
          </h2>
          <p className="text-sm text-gray-500 mt-1">Gestión de usuarios y permisos del sistema RECAL</p>
        </div>
        <button onClick={handleNewClick} className="w-full sm:w-auto bg-[var(--recal-blue)] hover:bg-[var(--recal-blue-hover)] text-white px-4 py-3 sm:py-2 rounded-md font-medium shadow-sm">
          + Nuevo Usuario
        </button>
      </div>

      {/* TABLA RESPONSIVA TABLE-TO-CARDS */}
      <div className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 hidden md:table-header-group">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Personal</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Área / Rol</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Estatus</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y md:divide-y-0 md:divide-gray-200 block md:table-row-group">
              {loading ? (
                <tr className="block md:table-row"><td colSpan="4" className="px-6 py-8 text-center text-sm text-gray-500 block md:table-cell">Cargando usuarios...</td></tr>
              ) : usuarios.map((u) => (
                <tr key={u.id_personal} className="block md:table-row border border-gray-200 md:border-none mb-4 md:mb-0 rounded-lg shadow-sm md:shadow-none p-4 md:p-0 hover:bg-gray-50">
                  
                  <td className="flex justify-between md:table-cell px-2 md:px-6 py-2 md:py-4 border-b md:border-none">
                    <span className="md:hidden font-bold text-gray-500 text-sm">Personal:</span>
                    <div className="text-right md:text-left">
                      <div className="text-sm font-bold text-gray-900">{u.nombre}</div>
                      <div className="text-xs text-gray-500">{u.cargo}</div>
                      <div className="text-xs text-blue-600">{u.correo}</div>
                    </div>
                  </td>

                  <td className="flex justify-between items-center md:table-cell px-2 md:px-6 py-2 md:py-4 border-b md:border-none">
                    <span className="md:hidden font-bold text-gray-500 text-sm">Área/Rol:</span>
                    <div className="text-right md:text-left">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-bold rounded-full shadow-sm mb-1 ${u.rol === 'Master' ? 'bg-purple-100 text-purple-800' : u.rol === 'Admin' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>
                        {u.rol}
                      </span>
                      <div className="text-xs text-gray-500">{u.area}</div>
                    </div>
                  </td>

                  <td className="flex justify-between items-center md:table-cell px-2 md:px-6 py-2 md:py-4 text-center border-b md:border-none">
                    <span className="md:hidden font-bold text-gray-500 text-sm">Estatus:</span>
                    <div>
                      {u.activo ? (
                        <span className="px-2 inline-flex text-xs font-semibold rounded-full bg-green-100 text-green-800">Activo</span>
                      ) : (
                        <span className="px-2 inline-flex text-xs font-semibold rounded-full bg-red-100 text-red-800">Suspendido</span>
                      )}
                      {u.debe_cambiar_password === 1 && (
                         <div className="text-[10px] text-orange-500 font-bold mt-1 tracking-wider">PENDIENTE DE CAMBIO</div>
                      )}
                    </div>
                  </td>

                  <td className="flex justify-end items-center md:table-cell px-2 md:px-6 py-4 md:py-4 text-sm font-medium border-b md:border-none">
                    <div className="flex justify-end items-center gap-2">
                      <button 
                        onClick={() => handleResetPassword(u.id_personal, u.nombre)} 
                        title="Restaurar Contraseña"
                        className="text-orange-600 hover:text-orange-800 hover:bg-orange-50 p-2 rounded-md transition-colors border border-orange-200 md:border-none flex items-center justify-center"
                      >
                        <KeyRound className="w-4 h-4 sm:w-5 sm:h-5" />
                      </button>
                      <button 
                        onClick={() => handleEditClick(u)} 
                        title="Editar Usuario"
                        className="text-[var(--recal-blue)] hover:text-blue-800 hover:bg-blue-50 p-2 rounded-md transition-colors border border-blue-200 md:border-none flex items-center justify-center"
                      >
                        <Pencil className="w-4 h-4 sm:w-5 sm:h-5" />
                      </button>
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-[var(--recal-gray)] rounded-t-lg">
              <h3 className="text-lg font-bold text-[var(--recal-blue)]">{isEditing ? 'Editar Accesos' : 'Nuevo Usuario'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 font-bold text-xl">&times;</button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre Completo *</label>
                <input required type="text" className="w-full border border-gray-300 rounded p-2 outline-none focus:ring-[var(--recal-blue)]" 
                  value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cargo *</label>
                  <input required type="text" className="w-full border border-gray-300 rounded p-2 outline-none focus:ring-[var(--recal-blue)]" 
                    value={formData.cargo} onChange={e => setFormData({...formData, cargo: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Área *</label>
                  <select className="w-full border border-gray-300 rounded p-2 outline-none focus:ring-[var(--recal-blue)]" 
                    value={formData.area} onChange={e => setFormData({...formData, area: e.target.value})}>
                    <option value="Seguridad">Seguridad</option>
                    <option value="Medio Ambiente">Medio Ambiente</option>
                    <option value="Ambas">Ambas</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Correo Electrónico (Usuario) *</label>
                <input required type="email" className="w-full border border-gray-300 rounded p-2 outline-none focus:ring-[var(--recal-blue)]" 
                  value={formData.correo} onChange={e => setFormData({...formData, correo: e.target.value})} />
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2 border-t mt-4">
                <div>
                  <label className="block text-sm font-bold text-purple-900 mb-1">Rol de Sistema *</label>
                  <select className="w-full border border-gray-300 rounded p-2 bg-purple-50 outline-none focus:ring-[var(--recal-blue)]" 
                    value={formData.rol} onChange={e => setFormData({...formData, rol: e.target.value})}>
                    <option value="Gerencia">Gerencia (Consulta)</option>
                    <option value="Usuario">Usuario (Consulta/Edición)</option>
                    <option value="Admin">Admin (Aprobaciones)</option>
                    <option value="Master">Master (Control Total)</option>
                  </select>
                </div>

                {isEditing && (
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Estatus *</label>
                    <select className="w-full border border-gray-300 rounded p-2 outline-none focus:ring-[var(--recal-blue)]" 
                      value={formData.activo} onChange={e => setFormData({...formData, activo: Number(e.target.value)})}>
                      <option value={1}>Activo (Con acceso)</option>
                      <option value={0}>Suspendido (Sin acceso)</option>
                    </select>
                  </div>
                )}
              </div>

              {!isEditing && (
                <div className="bg-blue-50 p-3 rounded mt-4 text-sm text-blue-800">
                  <span className="font-bold">Nota:</span> Al crear el usuario, se le asignará la contraseña genérica <strong>RecalHSE</strong>. El sistema le obligará a cambiarla la primera vez que ingrese.
                </div>
              )}

              <div className="pt-4 flex justify-end space-x-3 border-t mt-6">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">Cancelar</button>
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