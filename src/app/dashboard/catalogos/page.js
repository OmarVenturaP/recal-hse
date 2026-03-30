"use client";

import { useState, useEffect } from 'react';
import { Building2, UserCheck, GraduationCap, Plus, Search, Edit, Trash2, Loader2, Image as ImageIcon, X, Pencil, Users } from 'lucide-react';
import Swal from 'sweetalert2';

export default function CatalogosPage() {
  const [activeTab, setActiveTab] = useState('contratistas');
  const [searchTerm, setSearchTerm] = useState('');
  
  const [userRole, setUserRole] = useState(null);
  const [userDcPermission, setUserDcPermission] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [contratistas, setContratistas] = useState([]);
  const [agentes, setAgentes] = useState([]);
  const [cursos, setCursos] = useState([]);
  const [loading, setLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState(''); 
  const [editMode, setEditMode] = useState(false);
  
  const [formData, setFormData] = useState({});
  const [imagePreviews, setImagePreviews] = useState({});
  const [filesToUpload, setFilesToUpload] = useState({});

  const [cuadrillasList, setCuadrillasList] = useState([]);
  const [nuevaCuadrilla, setNuevaCuadrilla] = useState('');

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const [resAuth, resUser] = await Promise.all([
          fetch('/api/auth/me').then(r => r.json()),
          fetch('/api/usuarios/me').then(r => r.json())
        ]);
        
        if (resAuth.success) setUserRole(resAuth.user.rol);
        if (resUser.success && resUser.data.length > 0) {
          setUserDcPermission(resUser.data[0].permisos_dc3);
        }
      } catch (error) {
        console.error("Error verificando permisos:", error);
      } finally {
        setAuthLoading(false);
      }
    };
    checkAuth();
  }, []);

  const isAdmin = userRole === 'Admin' || userRole === 'Master';
  const hasDc3Permission = userDcPermission === 1 || userRole === 'Master';

  useEffect(() => {
    if (!authLoading) {
      if (!isAdmin && hasDc3Permission) {
        setActiveTab('agentes'); 
      }
      if (hasDc3Permission || isAdmin) {
        cargarDatos();
      }
    }
  }, [authLoading, isAdmin, hasDc3Permission]);

  useEffect(() => {
    setSearchTerm('');
  }, [activeTab]);

  const cargarDatos = async () => {
    setLoading(true);
    try {
      const [resC, resA, resCu] = await Promise.all([
        fetch('/api/catalogos/contratistas'),
        fetch('/api/catalogos/agentes'),
        fetch('/api/catalogos/cursos')
      ]);
      if (resC.ok) setContratistas(await resC.json());
      if (resA.ok) setAgentes(await resA.json());
      if (resCu.ok) setCursos(await resCu.json());
    } catch (error) {
      console.error("Error cargando catálogos:", error);
    } finally {
      setLoading(false);
    }
  };

  const openModal = async (type, data = null) => {
    setModalType(type);
    setEditMode(!!data);
    setFormData(data || {});
    setImagePreviews({});
    setFilesToUpload({});
    setCuadrillasList([]);
    setNuevaCuadrilla('');

    if (type === 'contratista' && data) {
      try {
        const res = await fetch(`/api/catalogos/cuadrillas?id_subcontratista=${data.id_subcontratista}`);
        if (res.ok) {
          const cuadrillas = await res.json();
          setCuadrillasList(cuadrillas);
        }
      } catch (error) {
        console.error("Error al cargar cuadrillas:", error);
      }
    }

    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setFormData({});
    setImagePreviews({});
    setFilesToUpload({});
    setCuadrillasList([]);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e, fieldName) => {
    const file = e.target.files[0];
    if (file) {
      setFilesToUpload(prev => ({ ...prev, [fieldName]: file }));
      const previewUrl = URL.createObjectURL(file);
      setImagePreviews(prev => ({ ...prev, [fieldName]: previewUrl }));
    }
  };

  const agregarCuadrilla = () => {
    if (nuevaCuadrilla.trim() === '') return;
    setCuadrillasList([...cuadrillasList, { 
      id_subcontratista_ft: `temp_${Date.now()}`, 
      nombre: nuevaCuadrilla.toUpperCase(),
      isNew: true 
    }]);
    setNuevaCuadrilla('');
  };

  const eliminarCuadrilla = (id) => {
    setCuadrillasList(cuadrillasList.filter(c => c.id_subcontratista_ft !== id));
  };

  const actualizarNombreCuadrilla = (id, nuevoNombre) => {
    setCuadrillasList(cuadrillasList.map(c => 
      c.id_subcontratista_ft === id ? { ...c, nombre: nuevoNombre.toUpperCase(), isEdited: true } : c
    ));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    Swal.fire({
      title: 'Guardando...',
      text: 'Procesando información y subiendo imágenes...',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

    try {
      const formDataToSend = new FormData();
      
      Object.keys(formData).forEach(key => {
        if (formData[key] !== null && formData[key] !== undefined) {
          formDataToSend.append(key, formData[key]);
        }
      });

      Object.keys(filesToUpload).forEach(key => {
        formDataToSend.set(key, filesToUpload[key]);
      });

      if (modalType === 'contratista') {
        formDataToSend.append('cuadrillas', JSON.stringify(cuadrillasList));
      }

      const method = editMode ? 'PUT' : 'POST';
      const endpoint = `/api/catalogos/${modalType}s`; 
      
      const response = await fetch(endpoint, {
        method,
        body: formDataToSend 
      });

      if (response.ok) {
        Swal.fire('¡Éxito!', 'Los datos se han guardado correctamente.', 'success');
        closeModal();
        cargarDatos(); 
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || "Error al guardar en la base de datos");
      }

    } catch (error) {
      console.error(error);
      Swal.fire('Error', error.message, 'error');
    }
  };

  const handleDelete = async (type, id) => {
    Swal.fire({
      title: '¿Estás seguro?',
      text: "El registro dejará de estar disponible en los formularios, pero se mantendrá en el historial para no afectar los DC-3 o personal existente.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Sí, ocultar registro',
      cancelButtonText: 'Cancelar'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          const response = await fetch(`/api/catalogos/${type}s`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id })
          });

          if (response.ok) {
            Swal.fire('Eliminado', 'El registro se ocultó exitosamente.', 'success');
            cargarDatos(); 
          } else {
            throw new Error("No se pudo eliminar el registro");
          }
        } catch (error) {
          console.error(error);
          Swal.fire('Error', 'Hubo un problema al intentar eliminar el registro.', 'error');
        }
      }
    });
  };

  const ImagePicker = ({ label, fieldName }) => {
    const currentImage = imagePreviews[fieldName] || formData[fieldName];
    return (
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>
        <div className="relative w-32 h-32 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden group bg-gray-50 dark:bg-gray-800 flex items-center justify-center transition-colors">
          {currentImage ? (
            <img src={currentImage} alt={label} className="w-full h-full object-contain bg-white dark:bg-gray-900" />
          ) : (
            <span className="text-gray-400 text-xs text-center px-2">Sin imagen</span>
          )}
          <label className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center cursor-pointer transition-opacity duration-200">
            <Pencil className="h-6 w-6 text-white mb-1" />
            <span className="text-white text-xs font-medium">Editar</span>
            <input type="file" className="hidden" accept="image/png, image/jpeg, image/webp" onChange={(e) => handleImageChange(e, fieldName)} />
          </label>
        </div>
      </div>
    );
  };

  const renderModalForm = () => {
    if (modalType === 'contratista') {
      return (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="col-span-1 md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nombre Fiscal *</label>
              <input required type="text" name="nombre_fiscal" value={formData.nombre_fiscal || ''} placeholder="Nombre fiscal" onChange={handleInputChange} className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white uppercase" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nombre comercial *</label>
              <input required type="text" name="razon_social" value={formData.razon_social || ''} placeholder="Nombre comercial" onChange={handleInputChange} className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white uppercase" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">RFC</label>
              <input type="text" name="rfc" value={formData.rfc || ''} placeholder="Ingresa el RFC de la empresa" onChange={handleInputChange} className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white uppercase" maxLength="15" />
            </div>
            
            <div className="col-span-1 md:col-span-2 border-t border-gray-200 dark:border-gray-700 pt-4 mt-2">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Firmas y Representantes (DC-3)</h3>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nombre Representante Legal</label>
              <input type="text" name="representante_legal" placeholder="Representante Legal de la empresa" value={formData.representante_legal || ''} onChange={handleInputChange} className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white uppercase" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nombre Rep. Trabajadores</label>
              <input type="text" name="representante_trabajadores" placeholder="Representante de los Trabajadores" value={formData.representante_trabajadores || ''} onChange={handleInputChange} className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white uppercase" />
            </div>
          </div>

          <div className="flex flex-wrap gap-6 justify-center md:justify-start bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
            <ImagePicker label="Logo Empresa" fieldName="logo_empresa" />
            <ImagePicker label="Firma Rep. Legal" fieldName="firma_representante_legal" />
            <ImagePicker label="Firma Rep. Trabajadores" fieldName="firma_representante_trabajadores" />
          </div>

          <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
            <div className="flex items-center gap-2 mb-4">
              <Users className="h-5 w-5 text-[var(--recal-blue)] dark:text-blue-400" />
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Cuadrillas / Equipos de Trabajo</h3>
            </div>
            
            <div className="flex gap-2 mb-4">
              <input 
                type="text" 
                placeholder="Ej. Cuadrilla Soldadores A" 
                value={nuevaCuadrilla}
                onChange={(e) => setNuevaCuadrilla(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), agregarCuadrilla())}
                className="flex-1 px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white uppercase" 
              />
              <button type="button" onClick={agregarCuadrilla} className="bg-blue-100 text-[var(--recal-blue)] hover:bg-blue-200 dark:bg-blue-900/50 dark:text-blue-300 dark:hover:bg-blue-800/50 px-4 py-2 rounded-lg font-medium transition-colors">
                Agregar
              </button>
            </div>

            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 dark:bg-gray-700/50">
                  <tr>
                    <th className="p-3 font-medium text-gray-500 dark:text-gray-400">Nombre de la Cuadrilla</th>
                    <th className="p-3 w-16 text-center">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {cuadrillasList.length === 0 ? (
                    <tr><td colSpan="2" className="p-4 text-center text-gray-500">No hay cuadrillas registradas.</td></tr>
                  ) : (
                    cuadrillasList.map((cuadrilla) => (
                      <tr key={cuadrilla.id_subcontratista_ft} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="p-1">
                          <input 
                            type="text" 
                            value={cuadrilla.nombre}
                            onChange={(e) => actualizarNombreCuadrilla(cuadrilla.id_subcontratista_ft, e.target.value)}
                            className="w-full px-2 py-1.5 bg-transparent border border-transparent focus:border-blue-500 rounded text-gray-700 dark:text-gray-300 font-medium outline-none transition-colors uppercase"
                          />
                        </td>
                        <td className="p-3 text-center">
                          <button type="button" onClick={() => eliminarCuadrilla(cuadrilla.id_subcontratista_ft)} className="text-red-500 hover:text-red-700 transition-colors p-1">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700 mt-6">
            <button type="button" onClick={closeModal} className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">Cancelar</button>
            <button type="submit" className="px-4 py-2 text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors">Guardar Contratista</button>
          </div>
        </form>
      );
    }

    if (modalType === 'agente') {
      return (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nombre del Agente Capacitador *</label>
              <input required type="text" name="nombre_agente" value={formData.nombre_agente || ''} onChange={handleInputChange} className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white uppercase" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Registro STPS *</label>
              <input required type="text" name="registro_stps" value={formData.registro_stps || ''} onChange={handleInputChange} className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white uppercase" />
            </div>
          </div>
          <div className="flex gap-6 bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl border border-gray-200 dark:border-gray-700 justify-center md:justify-start">
            <ImagePicker label="Logo del Agente" fieldName="logo_agente" />
            <ImagePicker label="Firma del Agente" fieldName="firma_agente" />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700 mt-6">
            <button type="button" onClick={closeModal} className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">Cancelar</button>
            <button type="submit" className="px-4 py-2 text-white bg-green-600 hover:bg-green-700 rounded-md transition-colors">Guardar Agente</button>
          </div>
        </form>
      );
    }

    if (modalType === 'curso') {
      return (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nombre del Curso *</label>
              <input required type="text" name="nombre_curso" value={formData.nombre_curso || ''} onChange={handleInputChange} className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white uppercase" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Área Temática</label>
                <input type="text" name="area_tematica" value={formData.area_tematica || '6000 Seguridad'} onChange={handleInputChange} className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white uppercase" placeholder="Ej. 6000 Seguridad" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Duración (Horas) *</label>
                <input required type="number" min="1" name="duracion_horas" value={formData.duracion_horas || ''} onChange={handleInputChange} className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Agente Capacitador Asignado</label>
              <select name="id_agente" value={formData.id_agente || ''} onChange={handleInputChange} className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                <option value="">-- Seleccionar Agente --</option>
                {agentes.map(agente => (
                  <option key={agente.id_agente} value={agente.id_agente}>{agente.nombre_agente} ({agente.registro_stps})</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700 mt-6">
            <button type="button" onClick={closeModal} className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">Cancelar</button>
            <button type="submit" className="px-4 py-2 text-white bg-purple-600 hover:bg-purple-700 rounded-md transition-colors">Guardar Curso</button>
          </div>
        </form>
      );
    }
  };

  const renderContratistas = () => {
    const filtered = contratistas.filter(c => 
      (c.razon_social?.toLowerCase() || '').includes(searchTerm.toLowerCase()) || 
      (c.rfc?.toLowerCase() || '').includes(searchTerm.toLowerCase())
    );

    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden transition-colors border border-gray-200 dark:border-gray-700">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input 
              type="text" 
              placeholder="Buscar contratista por nombre o RFC..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700/50 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 outline-none" 
            />
          </div>
          <button onClick={() => openModal('contratista')} className="w-full sm:w-auto flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm">
            <Plus className="h-5 w-5" /> Nuevo Contratista
          </button>
        </div>
        
        <div className="overflow-x-auto p-4 md:p-0">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
            <thead className="bg-gray-50 dark:bg-slate-900 hidden md:table-header-group">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Razón Social</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">RFC</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Representantes</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Recursos</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-slate-800 divide-y md:divide-y-0 md:divide-gray-200 dark:md:divide-slate-700 block md:table-row-group">
              {filtered.length === 0 ? (
                <tr className="block md:table-row">
                  <td colSpan="5" className="p-8 text-center text-gray-500 block md:table-cell">No se encontraron resultados.</td>
                </tr>
              ) : (
                filtered.map((empresa) => (
                  <tr key={empresa.id_subcontratista} className="block md:table-row border border-gray-200 dark:border-slate-700 md:border-none mb-4 md:mb-0 rounded-lg shadow-sm md:shadow-none p-4 md:p-0 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
                    
                    <td className="flex justify-between items-center md:table-cell px-2 md:px-6 py-2 md:py-4 text-sm font-bold md:font-medium text-[var(--recal-blue)] md:text-gray-900 dark:text-white border-b dark:border-slate-700 md:border-none">
                      <span className="md:hidden font-bold text-gray-500 dark:text-gray-400 text-xs uppercase">Razón Social:</span>
                      {empresa.razon_social}
                    </td>
                    
                    <td className="flex justify-between items-center md:table-cell px-2 md:px-6 py-2 md:py-4 text-sm text-gray-600 dark:text-gray-300 border-b dark:border-slate-700 md:border-none">
                      <span className="md:hidden font-bold text-gray-500 dark:text-gray-400 text-xs uppercase">RFC:</span>
                      {empresa.rfc || 'N/A'}
                    </td>
                    
                    <td className="flex flex-col md:table-cell px-2 md:px-6 py-3 md:py-4 text-sm border-b dark:border-slate-700 md:border-none">
                      <span className="md:hidden font-bold text-gray-500 dark:text-gray-400 text-xs uppercase mb-1">Representantes:</span>
                      <div className="flex flex-col text-right md:text-left text-xs md:text-sm">
                        <div className="text-gray-900 dark:text-gray-200"><span className="font-semibold text-gray-500">Legal:</span> {empresa.representante_legal || 'N/A'}</div>
                        <div className="text-gray-500 dark:text-gray-400"><span className="font-semibold text-gray-500">Trab:</span> {empresa.representante_trabajadores || 'N/A'}</div>
                      </div>
                    </td>
                    
                    <td className="flex justify-between items-center md:table-cell px-2 md:px-6 py-3 md:py-4 text-sm border-b dark:border-slate-700 md:border-none">
                      <span className="md:hidden font-bold text-gray-500 dark:text-gray-400 text-xs uppercase">Recursos:</span>
                      <div className="flex justify-end md:justify-center gap-2">
                        <div className="relative group flex items-center justify-center">
                          <span className={`p-2 rounded-full ${empresa.logo_empresa ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400' : 'bg-gray-100 text-gray-400 dark:bg-gray-800'}`}>
                            <Building2 className="h-4 w-4" />
                          </span>
                          <div className="absolute bottom-full mb-2 hidden group-hover:block w-max bg-gray-800 text-white text-[10px] font-bold px-2 py-1 rounded shadow-md z-50">Logo Empresa<div className="absolute top-full left-1/2 -translate-x-1/2 border-[4px] border-transparent border-t-gray-800"></div></div>
                        </div>
                        <div className="relative group flex items-center justify-center">
                          <span className={`p-2 rounded-full ${empresa.firma_representante_legal ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400' : 'bg-gray-100 text-gray-400 dark:bg-gray-800'}`}>
                            <ImageIcon className="h-4 w-4" />
                          </span>
                          <div className="absolute bottom-full mb-2 hidden group-hover:block w-max bg-gray-800 text-white text-[10px] font-bold px-2 py-1 rounded shadow-md z-50">Firma Legal<div className="absolute top-full left-1/2 -translate-x-1/2 border-[4px] border-transparent border-t-gray-800"></div></div>
                        </div>
                        <div className="relative group flex items-center justify-center">
                          <span className={`p-2 rounded-full ${empresa.firma_representante_trabajadores ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400' : 'bg-gray-100 text-gray-400 dark:bg-gray-800'}`}>
                            <ImageIcon className="h-4 w-4" />
                          </span>
                          <div className="absolute bottom-full mb-2 hidden group-hover:block w-max bg-gray-800 text-white text-[10px] font-bold px-2 py-1 rounded shadow-md z-50">Firma Trab.<div className="absolute top-full left-1/2 -translate-x-1/2 border-[4px] border-transparent border-t-gray-800"></div></div>
                        </div>
                      </div>
                    </td>
                    
                    <td className="flex justify-between items-center md:table-cell px-2 md:px-6 py-3 md:py-4 text-sm md:text-right border-none">
                      <span className="md:hidden font-bold text-gray-500 dark:text-gray-400 text-xs uppercase">Acciones:</span>
                      <div className="flex justify-end gap-2">
                        <button onClick={() => openModal('contratista', empresa)} className="text-blue-600 dark:text-blue-400 hover:text-blue-800 hover:bg-blue-50 dark:hover:bg-blue-900/30 p-2 rounded-md transition-colors"><Edit className="h-5 w-5" /></button>
                        <button onClick={() => handleDelete('contratista', empresa.id_subcontratista)} className="text-red-500 dark:text-red-400 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/30 p-2 rounded-md transition-colors"><Trash2 className="h-5 w-5" /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderAgentes = () => {
    const filtered = agentes.filter(a => 
      (a.nombre_agente?.toLowerCase() || '').includes(searchTerm.toLowerCase()) || 
      (a.registro_stps?.toLowerCase() || '').includes(searchTerm.toLowerCase())
    );

    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden transition-colors border border-gray-200 dark:border-gray-700">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input type="text" placeholder="Buscar agente o registro STPS..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700/50 text-gray-900 dark:text-gray-100 outline-none" />
          </div>
          <button onClick={() => openModal('agente')} className="w-full sm:w-auto flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm">
            <Plus className="h-5 w-5" /> Nuevo Agente
          </button>
        </div>

        <div className="overflow-x-auto p-4 md:p-0">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
            <thead className="bg-gray-50 dark:bg-slate-900 hidden md:table-header-group">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Nombre del Agente</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Registro STPS</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Recursos</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-slate-800 divide-y md:divide-y-0 md:divide-gray-200 dark:md:divide-slate-700 block md:table-row-group">
              {filtered.length === 0 ? (
                <tr className="block md:table-row">
                  <td colSpan="4" className="p-8 text-center text-gray-500 block md:table-cell">No se encontraron resultados.</td>
                </tr>
              ) : (
                filtered.map((agente) => (
                  <tr key={agente.id_agente} className="block md:table-row border border-gray-200 dark:border-slate-700 md:border-none mb-4 md:mb-0 rounded-lg shadow-sm md:shadow-none p-4 md:p-0 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
                    <td className="flex justify-between items-center md:table-cell px-2 md:px-6 py-2 md:py-4 text-sm font-bold md:font-medium text-green-700 dark:text-green-400 md:text-gray-900 md:dark:text-white border-b dark:border-slate-700 md:border-none">
                      <span className="md:hidden font-bold text-gray-500 dark:text-gray-400 text-xs uppercase">Nombre:</span>{agente.nombre_agente}
                    </td>
                    <td className="flex justify-between items-center md:table-cell px-2 md:px-6 py-2 md:py-4 text-sm text-gray-600 dark:text-gray-300 border-b dark:border-slate-700 md:border-none">
                      <span className="md:hidden font-bold text-gray-500 dark:text-gray-400 text-xs uppercase">Registro STPS:</span>{agente.registro_stps}
                    </td>
                    <td className="flex justify-between items-center md:table-cell px-2 md:px-6 py-3 md:py-4 text-sm border-b dark:border-slate-700 md:border-none">
                      <span className="md:hidden font-bold text-gray-500 dark:text-gray-400 text-xs uppercase">Recursos:</span>
                      <div className="flex justify-end md:justify-center gap-2">
                        <div className="relative group flex items-center justify-center">
                          <span className={`p-2 rounded-full ${agente.firma_agente ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400' : 'bg-gray-100 text-gray-400 dark:bg-gray-800'}`}><ImageIcon className="h-4 w-4" /></span>
                          <div className="absolute bottom-full mb-2 hidden group-hover:block w-max bg-gray-800 text-white text-[10px] font-bold px-2 py-1 rounded shadow-md z-50">Firma Agente<div className="absolute top-full left-1/2 -translate-x-1/2 border-[4px] border-transparent border-t-gray-800"></div></div>
                        </div>
                        <div className="relative group flex items-center justify-center">
                          <span className={`p-2 rounded-full ${agente.logo_agente ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400' : 'bg-gray-100 text-gray-400 dark:bg-gray-800'}`}><UserCheck className="h-4 w-4" /></span>
                          <div className="absolute bottom-full mb-2 hidden group-hover:block w-max bg-gray-800 text-white text-[10px] font-bold px-2 py-1 rounded shadow-md z-50">Logo Agente<div className="absolute top-full left-1/2 -translate-x-1/2 border-[4px] border-transparent border-t-gray-800"></div></div>
                        </div>
                      </div>
                    </td>
                    <td className="flex justify-between items-center md:table-cell px-2 md:px-6 py-3 md:py-4 text-sm md:text-right border-none">
                      <span className="md:hidden font-bold text-gray-500 dark:text-gray-400 text-xs uppercase">Acciones:</span>
                      <div className="flex justify-end gap-2">
                        <button onClick={() => openModal('agente', agente)} className="text-blue-600 dark:text-blue-400 hover:text-blue-800 hover:bg-blue-50 dark:hover:bg-blue-900/30 p-2 rounded-md transition-colors"><Edit className="h-5 w-5" /></button>
                        <button onClick={() => handleDelete('agente', agente.id_agente)} className="text-red-500 dark:text-red-400 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/30 p-2 rounded-md transition-colors"><Trash2 className="h-5 w-5" /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderCursos = () => {
    const filtered = cursos.filter(c => 
      (c.nombre_curso?.toLowerCase() || '').includes(searchTerm.toLowerCase()) || 
      (c.area_tematica?.toLowerCase() || '').includes(searchTerm.toLowerCase())
    );

    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden transition-colors border border-gray-200 dark:border-gray-700">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input type="text" placeholder="Buscar curso por nombre o área..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700/50 text-gray-900 dark:text-gray-100 outline-none" />
          </div>
          <button onClick={() => openModal('curso')} className="w-full sm:w-auto flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm">
            <Plus className="h-5 w-5" /> Nuevo Curso
          </button>
        </div>

        <div className="overflow-x-auto p-4 md:p-0">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
            <thead className="bg-gray-50 dark:bg-slate-900 hidden md:table-header-group">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Nombre del Curso</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Área Temática</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Duración</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Agente</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-slate-800 divide-y md:divide-y-0 md:divide-gray-200 dark:md:divide-slate-700 block md:table-row-group">
              {filtered.length === 0 ? (
                <tr className="block md:table-row">
                  <td colSpan="5" className="p-8 text-center text-gray-500 block md:table-cell">No se encontraron resultados.</td>
                </tr>
              ) : (
                filtered.map((curso) => (
                  <tr key={curso.id_curso} className="block md:table-row border border-gray-200 dark:border-slate-700 md:border-none mb-4 md:mb-0 rounded-lg shadow-sm md:shadow-none p-4 md:p-0 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
                    <td className="flex justify-between items-center md:table-cell px-2 md:px-6 py-2 md:py-4 text-sm font-bold md:font-medium text-purple-700 dark:text-purple-400 md:text-gray-900 md:dark:text-white border-b dark:border-slate-700 md:border-none">
                      <span className="md:hidden font-bold text-gray-500 dark:text-gray-400 text-xs uppercase">Curso:</span>{curso.nombre_curso}
                    </td>
                    <td className="flex justify-between items-center md:table-cell px-2 md:px-6 py-2 md:py-4 text-sm text-gray-600 dark:text-gray-300 border-b dark:border-slate-700 md:border-none">
                      <span className="md:hidden font-bold text-gray-500 dark:text-gray-400 text-xs uppercase">Área:</span>{curso.area_tematica}
                    </td>
                    <td className="flex justify-between items-center md:table-cell px-2 md:px-6 py-2 md:py-4 text-sm text-gray-600 dark:text-gray-300 border-b dark:border-slate-700 md:border-none md:text-center">
                      <span className="md:hidden font-bold text-gray-500 dark:text-gray-400 text-xs uppercase">Duración:</span>
                      <span className="bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-gray-300 px-2 py-1 rounded font-medium text-xs">{curso.duracion_horas} hrs</span>
                    </td>
                    <td className="flex justify-between items-center md:table-cell px-2 md:px-6 py-2 md:py-4 text-sm text-gray-600 dark:text-gray-300 border-b dark:border-slate-700 md:border-none">
                      <span className="md:hidden font-bold text-gray-500 dark:text-gray-400 text-xs uppercase">Agente:</span>{curso.nombre_agente || 'Sin agente'}
                    </td>
                    <td className="flex justify-between items-center md:table-cell px-2 md:px-6 py-3 md:py-4 text-sm md:text-right border-none">
                      <span className="md:hidden font-bold text-gray-500 dark:text-gray-400 text-xs uppercase">Acciones:</span>
                      <div className="flex justify-end gap-2">
                        <button onClick={() => openModal('curso', curso)} className="text-blue-600 dark:text-blue-400 hover:text-blue-800 hover:bg-blue-50 dark:hover:bg-blue-900/30 p-2 rounded-md transition-colors"><Edit className="h-5 w-5" /></button>
                        <button onClick={() => handleDelete('curso', curso.id_curso)} className="text-red-500 dark:text-red-400 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/30 p-2 rounded-md transition-colors"><Trash2 className="h-5 w-5" /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  if (authLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <Loader2 className="h-10 w-10 text-blue-600 animate-spin dark:text-blue-400" />
        <p className="mt-4 text-gray-500 dark:text-gray-400 font-medium">Verificando permisos...</p>
      </div>
    );
  }

  if (!isAdmin && !hasDc3Permission) {
    return (
      <div className="p-6 max-w-7xl mx-auto min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col items-center justify-center">
        <div className="text-6xl mb-4">🔒</div>
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Acceso Denegado</h2>
        <p className="text-gray-500 dark:text-gray-400 mt-2">No tienes los permisos necesarios para ver o modificar los catálogos.</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
      <div className="mb-6 md:mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">Catálogos del Sistema</h1>
        <p className="text-sm md:text-base text-gray-600 dark:text-gray-400 mt-1">Administra la información general de la plataforma.</p>
      </div>

      <div className="flex space-x-2 border-b border-gray-200 dark:border-gray-700 mb-6 overflow-x-auto pb-2">
        {isAdmin && (
          <button onClick={() => setActiveTab('contratistas')} className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors whitespace-nowrap ${activeTab === 'contratistas' ? 'border-b-2 border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}><Building2 className="h-5 w-5" /> Contratistas</button>
        )}
        
        {hasDc3Permission && (
          <button onClick={() => setActiveTab('agentes')} className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors whitespace-nowrap ${activeTab === 'agentes' ? 'border-b-2 border-green-600 text-green-600 dark:border-green-400 dark:text-green-400' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}><UserCheck className="h-5 w-5" /> Agentes Capacitadores</button>
        )}

        {hasDc3Permission && (
          <button onClick={() => setActiveTab('cursos')} className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors whitespace-nowrap ${activeTab === 'cursos' ? 'border-b-2 border-purple-600 text-purple-600 dark:border-purple-400 dark:text-purple-400' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}><GraduationCap className="h-5 w-5" /> Cursos DC3</button>
        )}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20"><Loader2 className="h-10 w-10 text-blue-600 animate-spin dark:text-blue-400" /></div>
      ) : (
        <div className="animate-in fade-in duration-300">
          {activeTab === 'contratistas' && isAdmin && renderContratistas()}
          {activeTab === 'agentes' && hasDc3Permission && renderAgentes()}
          {activeTab === 'cursos' && hasDc3Permission && renderCursos()}
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-3xl my-8">
            <div className="flex justify-between items-center p-4 md:p-6 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-900 z-10 rounded-t-2xl">
              <h2 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white">
                {editMode ? 'Editar' : 'Nuevo'} {modalType === 'contratista' ? 'Contratista' : modalType === 'agente' ? 'Agente Capacitador' : 'Curso'}
              </h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800">
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="p-4 md:p-6 max-h-[70vh] overflow-y-auto">
              {renderModalForm()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}