"use client";

import { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, CheckCircle2, AlertCircle, XCircle, Clock, Info } from 'lucide-react';
import Swal from 'sweetalert2';
import DaySummaryModal from '@/components/citas/DaySummaryModal';
import CitaModalForm from '@/components/citas/CitaModalForm';

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

      <DaySummaryModal 
        isOpen={isInfoModalOpen} 
        onClose={() => setIsInfoModalOpen(false)}
        fecha={infoModalData.fecha}
        citas={infoModalData.citas}
        isDiaCordina={infoModalData.isDiaCordina}
        userName={userName}
      />

      <CitaModalForm
        isOpen={isModalOpen}
        onClose={closeModal}
        isEditing={isEditing}
        formData={formData}
        setFormData={setFormData}
        handleSubmit={handleSubmit}
        handleDelete={handleDelete}
        canManageCitas={canManageCitas}
        canEditResults={canEditResults}
        catSubcontratistas={catSubcontratistas}
        catUsuarios={catUsuarios}
        activeTab={activeTab}
      />
    </div>
  );
}