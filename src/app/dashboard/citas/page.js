"use client";

import { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, MapPin, CheckCircle2, AlertCircle, XCircle, Clock, Trash2, Info, User } from 'lucide-react';
import Swal from 'sweetalert2';

export default function CitasDossierPage() {
  // =====================================================================
  // 🔧 CONFIGURACIÓN DE DÍAS DE "REVISIÓN EN CORDINA"
  // Coloca los números de los días de la semana que requieran el badge:
  // 0 = Domingo, 1 = Lunes, 2 = Martes, 3 = Miércoles, 4 = Jueves, 5 = Viernes, 6 = Sábado
  // Ejemplo para Lunes y Martes: [1, 2]
  // =====================================================================
  const diasSemanalesRevision = [1, 2]; 
  // =====================================================================

  const [userRole, setUserRole] = useState(null);
  const [userArea, setUserArea] = useState(null);
  const [userName, setUserName] = useState('');
  const [loading, setLoading] = useState(true);

  const [currentDate, setCurrentDate] = useState(new Date());
  const [activeTab, setActiveTab] = useState('Seguridad'); 
  const [citas, setCitas] = useState([]); 

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Estados para el Modal de Información del Día
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  const [infoModalData, setInfoModalData] = useState({ fecha: '', citas: [], isDiaCordina: false });

  // Catálogos
  const [catSubcontratistas, setCatSubcontratistas] = useState([]);
  const [catUsuarios, setCatUsuarios] = useState([]); 

  const formInicial = {
    id_cita: null, fecha_cita: '', hora_cita: '09:00', id_subcontratista: '',
    area: '', dossiers_entregados: '', periodo_evaluado: '',
    num_revision: '1ra Revisión', revisor_nombre: '', estatus: 'Programada', comentarios_revisor: ''
  };
  const [formData, setFormData] = useState(formInicial);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setUserRole(data.user.rol);
          setUserArea(data.user.area);
          setUserName(data.user.nombre);
          if (data.user.area !== 'Ambas') {
            setActiveTab(data.user.area);
          }
        }
      });
      
    fetch('/api/catalogos/subcontratistas')
      .then(res => res.json())
      .then(data => {
        if (data.success) setCatSubcontratistas(data.principales);
      });

    fetch('/api/catalogos/revisores')
      .then(res => res.json())
      .then(data => {
        if (data.success) setCatUsuarios(data.data);
      });
  }, []);

  const fetchCitas = async () => {
    setLoading(true);
    const mes = currentDate.getMonth() + 1;
    const anio = currentDate.getFullYear();
    try {
      const res = await fetch(`/api/citas?mes=${mes}&anio=${anio}&area=${activeTab}`);
      const data = await res.json();
      if (data.success) setCitas(data.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCitas();
  }, [currentDate, activeTab]);

  const canManageCitas = userRole === 'Admin' || userRole === 'Master';
  const canEditResults = canManageCitas || formData.revisor_nombre === userName;

  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
  const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

  // --- FUNCIONES MODAL AGENDA ---
  const openModalNew = (dateStr = null) => {
    if (!canManageCitas) return; 
    setFormData({
      ...formInicial,
      fecha_cita: dateStr || '',
      area: activeTab === 'Ambas' ? 'Seguridad' : activeTab,
      revisor_nombre: '' 
    });
    setIsEditing(false);
    setIsModalOpen(true);
  };

  const openModalEdit = (cita, e) => {
    e.stopPropagation();
    const fechaInput = cita.fecha_cita ? cita.fecha_cita.split('T')[0] : '';
    setFormData({
      id_cita: cita.id_cita, fecha_cita: fechaInput, hora_cita: cita.hora_cita.substring(0, 5),
      id_subcontratista: cita.id_subcontratista, area: cita.area, dossiers_entregados: cita.dossiers_entregados || '',
      periodo_evaluado: cita.periodo_evaluado || '', num_revision: cita.num_revision || '1ra Revisión',
      revisor_nombre: cita.revisor_nombre || '', estatus: cita.estatus, comentarios_revisor: cita.comentarios_revisor || ''
    });
    setIsEditing(true);
    setIsModalOpen(true);
  };

  const closeModal = () => setIsModalOpen(false);

  // --- FUNCIÓN MODAL RESUMEN DEL DÍA ---
  const openInfoModal = (fecha, citasDelDia, isDiaCordina, e) => {
    e.stopPropagation();
    setInfoModalData({ fecha, citas: citasDelDia, isDiaCordina });
    setIsInfoModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const method = isEditing ? 'PUT' : 'POST';
    try {
      const res = await fetch('/api/citas', { method: method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formData) });
      const data = await res.json();
      if (data.success) {
        Swal.fire('¡Éxito!', data.mensaje, 'success');
        closeModal(); fetchCitas();
      } else Swal.fire('Error', data.error, 'error');
    } catch (error) { Swal.fire('Error', 'Error de conexión.', 'error'); }
  };

  const handleDelete = () => {
    Swal.fire({
      title: '¿Eliminar cita?', text: "Esta acción no se puede deshacer.", icon: 'warning',
      showCancelButton: true, confirmButtonColor: '#d33', cancelButtonColor: '#3085d6',
      confirmButtonText: 'Sí, eliminar', cancelButtonText: 'Cancelar'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          const res = await fetch(`/api/citas?id_cita=${formData.id_cita}`, { method: 'DELETE' });
          const data = await res.json();
          if (data.success) {
            Swal.fire('Eliminado', 'La cita fue borrada exitosamente.', 'success');
            closeModal(); fetchCitas();
          } else Swal.fire('Error', data.error, 'error');
        } catch (error) { Swal.fire('Error', 'Problemas de conexión al eliminar', 'error'); }
      }
    });
  };

  const getStatusStyles = (estatus, areaCita) => {
    if (activeTab === 'Ambas') {
        if(areaCita === 'Seguridad') return 'bg-blue-100 text-blue-800 border-l-2 border-blue-500';
        return 'bg-green-100 text-green-800 border-l-2 border-green-500';
    }
    switch(estatus) {
      case 'Liberado': return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300';
      case 'En observaciones': return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300';
      case 'No asistió': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      default: return 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300'; 
    }
  };

  const getStatusIcon = (estatus) => {
    switch(estatus) {
      case 'Liberado': return <CheckCircle2 className="w-3 h-3 inline mr-1" />;
      case 'En observaciones': return <AlertCircle className="w-3 h-3 inline mr-1" />;
      case 'No asistió': return <XCircle className="w-3 h-3 inline mr-1" />;
      default: return <Clock className="w-3 h-3 inline mr-1" />;
    }
  };

  const renderCalendarDays = () => {
    const days = [];
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(<div key={`empty-${i}`} className="h-24 md:h-32 border border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-900/20"></div>);
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const dateObj = new Date(currentDate.getFullYear(), currentDate.getMonth(), d);
      const dayOfWeek = dateObj.getDay(); // 0 a 6
      const dateString = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      
      const isDiaCordina = diasSemanalesRevision.includes(dayOfWeek);

      const citasDelDia = citas.filter(c => {
        const formatCita = c.fecha_cita.split('T')[0];
        return formatCita === dateString;
      });

      days.push(
        <div 
          key={d} 
          onClick={() => { if (canManageCitas) openModalNew(dateString); }}
          className={`h-24 md:h-32 border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-1 md:p-2 flex flex-col group relative overflow-hidden transition-colors ${canManageCitas ? 'cursor-pointer hover:bg-blue-50 dark:hover:bg-slate-700/50' : 'cursor-default'}`}
        >
          <div className="flex justify-between items-start">
            {/* IZQUIERDA: Info Icon */}
            <button 
              onClick={(e) => openInfoModal(dateString, citasDelDia, isDiaCordina, e)} 
              className="text-gray-400 hover:text-[var(--recal-blue)] transition-colors p-0.5 rounded-md hover:bg-blue-100 dark:hover:bg-slate-700"
              title="Resumen del Día"
            >
              <Info className="w-4 h-4 md:w-5 md:h-5" />
            </button>
            
            {/* DERECHA: Plus Icon (Admins) + Número de Día */}
            <div className="flex items-center gap-1">
              {canManageCitas && (
                <button className="hidden group-hover:block text-[var(--recal-blue)] text-xs mr-1"><Plus className="w-4 h-4" /></button>
              )}
              <span className={`text-xs md:text-sm font-bold ${citasDelDia.length > 0 ? 'text-[var(--recal-blue)]' : 'text-gray-700 dark:text-gray-300'}`}>{d}</span>
            </div>
          </div>

          {/* BADGE DE REVISIÓN EN CORDINA */}
          {isDiaCordina && (
            <div className="bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 text-[8px] md:text-[9px] font-extrabold px-1 py-0.5 rounded text-center mt-1 uppercase border border-purple-200 dark:border-purple-800/50 shadow-sm leading-tight truncate">
              Rev. Cordina
            </div>
          )}
          
          <div className="mt-1 flex-1 overflow-y-auto space-y-1 scrollbar-thin">
            {citasDelDia.map(c => {
              const isMiCita = c.revisor_nombre === userName;
              return (
                <div 
                  key={c.id_cita} 
                  onClick={(e) => openModalEdit(c, e)}
                  className={`text-[10px] md:text-xs truncate px-1 py-0.5 rounded font-medium cursor-pointer shadow-sm hover:opacity-80 transition-opacity ${getStatusStyles(c.estatus, c.area)}`}
                  title={`${c.contratista} - ${c.estatus} ${isMiCita ? '(Asignada a ti)' : ''}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="truncate flex items-center">
                      {activeTab === 'Ambas' ? (
                        <span className="font-bold mr-1">[{c.area === 'Seguridad' ? 'SEG' : 'AMB'}]</span>
                      ) : (
                        getStatusIcon(c.estatus)
                      )}
                      {c.hora_cita.substring(0, 5)} - {c.contratista || 'S/N'}
                    </div>
                    {isMiCita && (
                      <span className="bg-yellow-300 text-yellow-900 text-[8px] leading-tight px-1 py-0.5 rounded font-extrabold ml-1 flex-shrink-0 shadow-sm border border-yellow-400">
                        TÚ
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );
    }
    return days;
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-[var(--recal-blue)] dark:text-white flex items-center gap-2">
            <CalendarIcon className="w-6 h-6" /> Agenda de Dossiers
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Control de revisiones documentales para contratistas</p>
        </div>
        {canManageCitas && (
          <button onClick={() => openModalNew()} className="w-full sm:w-auto bg-[var(--recal-blue)] hover:bg-[var(--recal-blue-hover)] text-white px-4 py-3 sm:py-2 rounded-md font-medium shadow-sm">
            + Nueva Cita
          </button>
        )}
      </div>

      {/* PESTAÑAS Y CONTROL DE MES */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 flex flex-col md:flex-row justify-between items-center gap-4">
        
        {/* Switch de Áreas */}
        <div className="flex bg-gray-100 dark:bg-slate-900 p-1 rounded-lg w-full md:w-auto">
          {userArea === 'Ambas' ? (
            <>
              <button onClick={() => setActiveTab('Seguridad')} className={`flex-1 md:flex-none px-3 py-1.5 rounded-md text-sm font-bold transition-all ${activeTab === 'Seguridad' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}>🔵 Seguridad</button>
              <button onClick={() => setActiveTab('Medio Ambiente')} className={`flex-1 md:flex-none px-3 py-1.5 rounded-md text-sm font-bold transition-all ${activeTab === 'Medio Ambiente' ? 'bg-white dark:bg-slate-700 text-green-600 dark:text-green-400 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}>🟢 Ambiental</button>
              <button onClick={() => setActiveTab('Ambas')} className={`flex-1 md:flex-none px-3 py-1.5 rounded-md text-sm font-bold transition-all ${activeTab === 'Ambas' ? 'bg-white dark:bg-slate-700 text-purple-600 dark:text-purple-400 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}>🟣 Ver Ambas</button>
            </>
          ) : (
            <div className="px-4 py-2 text-sm font-bold text-gray-700 dark:text-gray-300">
              {activeTab === 'Seguridad' ? '🔵 Citas de Seguridad' : '🟢 Citas de Medio Ambiente'}
            </div>
          )}
        </div>

        {/* Controles del Mes */}
        <div className="flex items-center justify-between w-full md:w-auto gap-4">
          <button onClick={prevMonth} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-full transition-colors border border-gray-200 dark:border-slate-600"><ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" /></button>
          <div className="w-40 text-center">
            <h3 className="text-sm md:text-lg font-bold text-gray-800 dark:text-white uppercase tracking-wider">{monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}</h3>
          </div>
          <button onClick={nextMonth} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-full transition-colors border border-gray-200 dark:border-slate-600"><ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-300" /></button>
        </div>
      </div>

      {/* LEYENDA DE COLORES */}
      {activeTab !== 'Ambas' && (
        <div className="flex flex-wrap gap-4 px-2 text-xs font-bold text-gray-500 dark:text-gray-400">
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-blue-400"></span> Programada</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-emerald-400"></span> Liberado</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-amber-400"></span> En Observaciones</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-red-400"></span> No Asistió</span>
          <span className="flex items-center gap-1 ml-auto"><span className="bg-yellow-300 text-yellow-900 text-[8px] px-1 py-0.5 rounded font-extrabold border border-yellow-400">TÚ</span> Tus revisiones</span>
        </div>
      )}

      {/* EL CALENDARIO GRID */}
      {loading ? (
        <div className="bg-white dark:bg-slate-800 shadow-sm rounded-lg border border-gray-200 dark:border-slate-700 p-12 text-center text-gray-500 font-bold">Cargando calendario...</div>
      ) : (
        <div className="bg-white dark:bg-slate-800 shadow-sm rounded-lg border border-gray-200 dark:border-slate-700 overflow-hidden">
          <div className="grid grid-cols-7 bg-gray-50 dark:bg-slate-900 border-b border-gray-200 dark:border-slate-700">
            {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(day => (
              <div key={day} className="py-2 md:py-3 text-center text-[10px] md:text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider border-r border-gray-200 dark:border-slate-700 last:border-r-0">{day}</div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {renderCalendarDays()}
          </div>
        </div>
      )}

      {/* -------------------------------------------------- */}
      {/* MODAL 1: INFORMACIÓN Y RESUMEN DEL DÍA             */}
      {/* -------------------------------------------------- */}
      {isInfoModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-lg w-full border dark:border-slate-700 max-h-[90vh] overflow-y-auto flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700 flex justify-between items-center bg-gray-50 dark:bg-slate-900 rounded-t-xl sticky top-0 z-10">
              <h3 className="text-lg font-bold text-gray-800 dark:text-white flex items-center">
                <CalendarIcon className="w-5 h-5 mr-2 text-[var(--recal-blue)]" />
                Resumen: {infoModalData.fecha.split('-').reverse().join('/')}
              </h3>
              <button onClick={() => setIsInfoModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 font-bold text-2xl">&times;</button>
            </div>
            
            <div className="p-6 flex-1 overflow-y-auto">
              {infoModalData.isDiaCordina && (
                <div className="mb-4 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 p-3 rounded-lg border border-purple-200 dark:border-purple-800/50 flex items-center text-sm font-bold shadow-sm">
                  <MapPin className="w-5 h-5 mr-2" />
                  Día de &quot;Revisión en Cordina&quot;
                </div>
              )}

              {infoModalData.citas.length === 0 ? (
                <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                  <Clock className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">No hay citas programadas para este día.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {infoModalData.citas.map(c => {
                    const isMiCita = c.revisor_nombre === userName;
                    let borderClass = 'border-l-blue-500';
                    if (c.estatus === 'Liberado') borderClass = 'border-l-emerald-500';
                    else if (c.estatus === 'En observaciones') borderClass = 'border-l-amber-500';
                    else if (c.estatus === 'No asistió') borderClass = 'border-l-red-500';

                    return (
                      <div key={c.id_cita} className={`p-4 rounded-lg shadow-sm bg-white dark:bg-slate-800/80 border ${borderClass} border-t-gray-200 border-r-gray-200 border-b-gray-200 dark:border-t-slate-700 dark:border-r-slate-700 dark:border-b-slate-700 relative`}>
                        {isMiCita && (
                          <span className="absolute top-3 right-3 bg-yellow-300 text-yellow-900 text-[9px] px-1.5 py-0.5 rounded font-extrabold border border-yellow-400 shadow-sm">
                            TU CITA
                          </span>
                        )}
                        <div className="flex flex-col gap-1 pr-12">
                          <span className="font-black text-gray-800 dark:text-gray-200 text-base">{c.hora_cita.substring(0, 5)} hrs</span>
                          <span className="font-bold text-[var(--recal-blue)] dark:text-blue-400">{c.contratista || 'Contratista sin nombre'}</span>
                        </div>
                        
                        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                          <div className="flex items-center text-gray-600 dark:text-gray-400">
                            <User className="w-3.5 h-3.5 mr-1" /> 
                            <span className="font-semibold text-gray-800 dark:text-gray-300">{c.revisor_nombre || 'Sin asignar'}</span>
                          </div>
                          <div className="flex items-center text-gray-600 dark:text-gray-400">
                            <span className="font-bold uppercase px-2 py-0.5 rounded bg-gray-100 dark:bg-slate-700 w-fit">{c.estatus}</span>
                          </div>
                          <div className="flex items-center text-gray-600 dark:text-gray-400 col-span-2 mt-1">
                            <span className="font-bold mr-1">Área:</span> {c.area}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            
            <div className="px-6 py-4 border-t border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900 rounded-b-xl flex justify-end sticky bottom-0">
              <button onClick={() => setIsInfoModalOpen(false)} className="px-6 py-2 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors font-medium">Cerrar Detalle</button>
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------- */}
      {/* MODAL 2: CREACIÓN Y EDICIÓN DE CITAS               */}
      {/* -------------------------------------------------- */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-2xl w-full border dark:border-slate-700 max-h-[90vh] overflow-y-auto">
            <div className={`px-6 py-4 border-b border-gray-200 dark:border-slate-700 flex justify-between items-center rounded-t-xl ${formData.area === 'Seguridad' ? 'bg-blue-50 dark:bg-blue-900/20' : 'bg-green-50 dark:bg-green-900/20'}`}>
              <h3 className={`text-lg font-bold flex items-center ${formData.area === 'Seguridad' ? 'text-blue-800 dark:text-blue-300' : 'text-green-800 dark:text-green-300'}`}>
                {isEditing ? 'Detalles de la Cita' : 'Agendar Nueva Cita'} {formData.area ? `- ${formData.area}` : ''}
                {!canManageCitas && <span className="ml-3 text-[10px] font-bold text-gray-500 bg-gray-200 dark:bg-slate-700 px-2 py-1 rounded">MODO LECTURA</span>}
              </h3>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 font-bold text-2xl">&times;</button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Contratista a evaluar *</label>
                  <select required disabled={!canManageCitas || isEditing} className="w-full bg-transparent border border-gray-300 dark:border-slate-600 dark:text-white rounded p-2 outline-none focus:ring-[var(--recal-blue)] disabled:opacity-60 disabled:bg-gray-100 dark:disabled:bg-slate-900" value={formData.id_subcontratista} onChange={e => setFormData({...formData, id_subcontratista: e.target.value})}>
                    <option value="" className="dark:bg-slate-800">-- Seleccione Contratista --</option>
                    {catSubcontratistas.map(emp => <option key={emp.id_subcontratista} value={emp.id_subcontratista} className="dark:bg-slate-800">{emp.razon_social}</option>)}
                  </select>
                </div>

                {!isEditing && activeTab === 'Ambas' && (
                  <div className="md:col-span-2 p-3 bg-purple-50 dark:bg-purple-900/20 rounded border border-purple-200 dark:border-purple-800">
                    <label className="block text-sm font-bold text-purple-800 dark:text-purple-300 mb-1">¿A qué área corresponde esta cita? *</label>
                    <select required disabled={!canManageCitas} className="w-full bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 dark:text-white rounded p-2 outline-none focus:ring-purple-500 disabled:opacity-60" value={formData.area} onChange={e => setFormData({...formData, area: e.target.value})}>
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
                    value={formData.revisor_nombre} 
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
                  <input required disabled={!canManageCitas} type="date" className="w-full bg-transparent border border-gray-300 dark:border-slate-600 dark:text-white rounded p-2 outline-none focus:ring-[var(--recal-blue)] disabled:opacity-60 disabled:bg-gray-50 dark:disabled:bg-slate-900/50" value={formData.fecha_cita} onChange={e => setFormData({...formData, fecha_cita: e.target.value})} />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Hora Programada *</label>
                  <input required disabled={!canManageCitas} type="time" className="w-full bg-transparent border border-gray-300 dark:border-slate-600 dark:text-white rounded p-2 outline-none focus:ring-[var(--recal-blue)] disabled:opacity-60 disabled:bg-gray-50 dark:disabled:bg-slate-900/50" value={formData.hora_cita} onChange={e => setFormData({...formData, hora_cita: e.target.value})} />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Periodo</label>
                  <input disabled={!canManageCitas} type="text" placeholder="Ej. Marzo 2026" className="w-full bg-transparent border border-gray-300 dark:border-slate-600 dark:text-white rounded p-2 outline-none focus:ring-[var(--recal-blue)] uppercase disabled:opacity-60 disabled:bg-gray-50 dark:disabled:bg-slate-900/50" value={formData.periodo_evaluado} onChange={e => setFormData({...formData, periodo_evaluado: e.target.value.toUpperCase()})} />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Número de Revisión</label>
                  <select disabled={!canManageCitas} className="w-full bg-transparent border border-gray-300 dark:border-slate-600 dark:text-white rounded p-2 outline-none focus:ring-[var(--recal-blue)] disabled:opacity-60 disabled:bg-gray-50 dark:disabled:bg-slate-900/50" value={formData.num_revision} onChange={e => setFormData({...formData, num_revision: e.target.value})}>
                    <option value="1ra Revisión" className="dark:bg-slate-800">1ra Revisión</option>
                    <option value="2da Revisión" className="dark:bg-slate-800">2da Revisión</option>
                    <option value="3ra Revisión" className="dark:bg-slate-800">3ra Revisión</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Dossier a revisar</label>
                  <input disabled={!canManageCitas} type="text" placeholder="Ej. Dossier Ambiental/Seguridad" className="w-full bg-transparent border border-gray-300 dark:border-slate-600 dark:text-white rounded p-2 outline-none focus:ring-[var(--recal-blue)] uppercase disabled:opacity-60 disabled:bg-gray-50 dark:disabled:bg-slate-900/50" value={formData.dossiers_entregados} onChange={e => setFormData({...formData, dossiers_entregados: e.target.value.toUpperCase()})} />
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
                        <select disabled={!canEditResults} className="w-full bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 dark:text-white rounded p-2 outline-none focus:ring-[var(--recal-blue)] disabled:opacity-80 disabled:cursor-not-allowed" value={formData.estatus} onChange={e => setFormData({...formData, estatus: e.target.value})}>
                          <option value="Programada" className="dark:bg-slate-800">🕒 Programada (Pendiente)</option>
                          <option value="Liberado" className="dark:bg-slate-800">✅ Liberado (Todo OK)</option>
                          <option value="En observaciones" className="dark:bg-slate-800">⚠️ En observaciones</option>
                          <option value="No asistió" className="dark:bg-slate-800">❌ No asistió</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Comentarios del Revisor</label>
                        <textarea disabled={!canEditResults} rows="3" placeholder="Anota qué faltó, o por qué se liberó..." className="w-full bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 dark:text-white rounded p-2 outline-none focus:ring-[var(--recal-blue)] uppercase disabled:opacity-80 disabled:cursor-not-allowed" value={formData.comentarios_revisor} onChange={e => setFormData({...formData, comentarios_revisor: e.target.value.toUpperCase()})}></textarea>
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
                  <button type="button" onClick={closeModal} className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">Cerrar</button>
                  
                  {/* Solo mostramos el botón de guardar si el usuario tiene algún tipo de permiso para editar algo en el form */}
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
      )}
    </div>
  );
}