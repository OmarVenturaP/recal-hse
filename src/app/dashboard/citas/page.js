"use client";

import { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, CheckCircle2, AlertCircle, XCircle, Clock, Info } from 'lucide-react';
import Swal from 'sweetalert2';
import DaySummaryModal from '@/components/citas/DaySummaryModal';
import CitaModalForm from '@/components/citas/CitaModalForm';

// Importaciones de React Big Calendar
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { es } from 'date-fns/locale/es';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css';

const DnDCalendar = withDragAndDrop(Calendar);

// Configuración de Localizador para el Calendario (Español)
const locales = {
  'es': es,
}

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
})

export default function CitasDossierPage() {
  // =====================================================================
  // 🔧 CONFIGURACIÓN DE DÍAS DE "REVISIÓN EN CORDINA"
  const diasSemanalesRevision = [1, 2]; 
  // =====================================================================

  const [userRole, setUserRole] = useState(null);
  const [userArea, setUserArea] = useState(null);
  const [userName, setUserName] = useState('');
  const [userPermisoCitas, setUserPermisoCitas] = useState(0);
  const [loading, setLoading] = useState(true);

  // Big Calendar Views
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentView, setCurrentView] = useState('month'); 
  const [activeTab, setActiveTab] = useState('Seguridad'); 
  const [citas, setCitas] = useState([]); 
  const [events, setEvents] = useState([]); // Arreglo procesado para react-big-calendar

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
          setUserPermisoCitas(data.user.permisos_citas);
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
      if (data.success) {
        setCitas(data.data);
        
        // Transformar citas a "Events" para react-big-calendar
        const calendarEvents = data.data.map(cita => {
          // Extraer fecha yyyy-MM-dd y combinarla con hh:mm
          const fechaStr = cita.fecha_cita.split('T')[0];
          const [yyyy, mm, dd] = fechaStr.split('-');
          const [hh, min] = cita.hora_cita.split(':');
          
          const startDate = new Date(yyyy, mm - 1, dd, hh, min);
          // DURACIÓN 4 HORAS según requerimiento
          const endDate = new Date(startDate.getTime() + (4 * 60 * 60 * 1000));
          
          return {
            id: cita.id_cita,
            title: `${cita.revisor_nombre === userName ? '[TÚ] ' : ''}${cita.area === 'Seguridad' ? 'SEG' : 'AMB'} - ${cita.contratista || 'S/N'}`,
            start: startDate,
            end: endDate,
            resource: cita // guardamos toda la info original para usarla en modals
          };
        });
        
        setEvents(calendarEvents);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCitas();
  }, [currentDate, activeTab]);

  const canManageCitas = userRole === 'Admin' || userRole === 'Master' || userPermisoCitas === 1;
  const canEditResults = canManageCitas || formData.revisor_nombre === userName;

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
    if(e) e.stopPropagation();
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
  const openInfoModal = (fecha, citasDelDia, isDiaCordina) => {
    setInfoModalData({ fecha, citas: citasDelDia, isDiaCordina });
    setIsInfoModalOpen(true);
  };

  const handleSelectSlot = ({ start }) => {
     // react-big-calendar action when clicking an empty space or day
     const defaultDate = format(start, 'yyyy-MM-dd');
     if (canManageCitas) {
         openModalNew(defaultDate);
     }
  };

   const handleSelectEvent = (event) => {
     // Dando clic directo a un evento abrimos edición
     openModalEdit(event.resource, null);
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

  // Asignar colores corporativos a React Big Calendar
  const eventPropGetter = (event) => {
    const { estatus, area, revisor_nombre } = event.resource;
    let backgroundColor = area === 'Seguridad' ? '#3b82f6' : '#22c55e'; // Azul para Seg, Verde para Amb (Programada base)

    if (activeTab === 'Ambas') {
        if(area === 'Seguridad') backgroundColor = '#3b82f6';
        if(area === 'Medio Ambiente') backgroundColor = '#10b981';
    } else {
        if (estatus === 'Liberado') backgroundColor = '#10b981'; // Emerald
        if (estatus === 'En observaciones') backgroundColor = '#f59e0b'; // Amber
        if (estatus === 'No asistió') backgroundColor = '#ef4444'; // Red
    }
    
    // Borde amarillo si es del propio usuario
    const border = revisor_nombre === userName ? '2px solid #facc15' : 'none';

    return {
      style: {
        backgroundColor,
        border,
        color: 'white',
        fontWeight: 'bold',
        fontSize: '11px',
        borderRadius: '5px'
      }
    };
  };

  // Componente personalizado para el encabezado de cada día
  const CustomDateHeader = ({ label, date }) => {
    const dateString = format(date, 'yyyy-MM-dd');
    const isDiaCordina = diasSemanalesRevision.includes(date.getDay());
    const citasDelDia = citas.filter(c => c.fecha_cita.split('T')[0] === dateString);

    return (
      <>
        {/* VISTA MOBILE: Número a la derecha, iconos justo debajo en bloque separado */}
        <div className="md:hidden flex flex-col items-end w-full px-1 pt-1 group">
          <div className="flex items-center gap-1">
            {citasDelDia.length > 0 && (
              <span className="bg-[var(--recal-blue)] text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full shadow-sm animate-pulse-once">
                {citasDelDia.length}
              </span>
            )}
            <span className={`text-[11px] font-bold ${citasDelDia.length > 0 ? 'text-[var(--recal-blue)]' : 'text-gray-700 dark:text-gray-300'}`}>
              {label}
            </span>
          </div>
          <div className="flex justify-between w-full mt-0.5">
            <button 
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); openInfoModal(dateString, citasDelDia, isDiaCordina); }} 
              className="text-gray-400 hover:text-[var(--recal-blue)] p-0.5"
            >
              <Info className="w-[14px] h-[14px]" />
            </button>
            {canManageCitas && (
              <button 
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); openModalNew(dateString); }}
                className="text-[var(--recal-blue)] p-0.5"
              >
                <Plus className="w-[14px] h-[14px]" />
              </button>
            )}
          </div>
        </div>

        {/* VISTA DESKTOP: Iconos a la izquierda, número a la derecha (junto en barra) */}
        <div className="hidden md:flex justify-between items-start w-full px-1 pt-1 group">
          <button 
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); openInfoModal(dateString, citasDelDia, isDiaCordina); }} 
            className="text-gray-400 hover:text-[var(--recal-blue)] transition-colors p-0.5 rounded-md hover:bg-blue-100 dark:hover:bg-slate-700"
            title="Resumen del Día"
          >
            <Info className="w-4 h-4 lg:w-5 lg:h-5" />
          </button>
          <div className="flex items-center gap-1">
            {canManageCitas && (
              <button 
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); openModalNew(dateString); }}
                className="text-[var(--recal-blue)] text-xs mr-1 opacity-0 group-hover:opacity-100 transition-opacity"
                title="Añadir Cita"
              >
                <Plus className="w-4 h-4" />
              </button>
            )}
            <span className={`text-xs md:text-sm font-bold ${citasDelDia.length > 0 ? 'text-[var(--recal-blue)]' : 'text-gray-700 dark:text-gray-300'}`}>
              {label}
            </span>
          </div>
        </div>
      </>
    );
  };

  const onEventDrop = async ({ event, start, end }) => {
    if (!canManageCitas && event.resource.revisor_nombre !== userName) {
      Swal.fire('Denegado', 'Solo puedes mover citas que te pertenezcan o si eres administrador.', 'error');
      return;
    }

    const fechaInput = format(start, 'yyyy-MM-dd');
    const horaInput = format(start, 'HH:mm');
    const { id_cita, id_subcontratista, area, dossiers_entregados, periodo_evaluado, num_revision, revisor_nombre, estatus, comentarios_revisor } = event.resource;

    const updatedCita = {
      id_cita, fecha_cita: fechaInput, hora_cita: horaInput, id_subcontratista, area, 
      dossiers_entregados, periodo_evaluado, num_revision, revisor_nombre, estatus, comentarios_revisor
    };

    try {
      const res = await fetch('/api/citas', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updatedCita) });
      const data = await res.json();
      if (data.success) {
        Swal.fire({ title: 'Re-agendada', text: data.mensaje, icon: 'success', toast: true, position: 'top-end', timer: 2000, showConfirmButton: false });
        fetchCitas(); 
      } else {
        Swal.fire('Empalme o Error', data.error, 'error');
      }
    } catch (e) {
      Swal.fire('Error', 'No se pudo mover la cita por un error de conexión.', 'error');
    }
  };

  return (
    <>
    <div className="max-w-[100rem] mx-auto p-4 md:p-6 lg:p-8 space-y-6 animate-in fade-in duration-500">
      <div className="bg-white/90 dark:bg-slate-800/80 backdrop-blur-xl rounded-[2.5rem] p-6 lg:p-8 shadow-xl shadow-gray-200/50 dark:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.6)] border border-white/80 dark:border-slate-700/50">
        
        {/* HERO BENTO HEADER */}
        <div className="flex flex-col md:flex-row items-start md:items-center gap-6 mb-8 border-b border-gray-100 dark:border-slate-700/50 pb-6">
           <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-2xl shadow-lg shadow-indigo-500/30 flex items-center justify-center text-white shrink-0">
             <CalendarIcon className="w-8 h-8" />
           </div>
           <div>
             <h1 className="text-3xl font-black text-gray-800 dark:text-white tracking-tight leading-none mb-2">Agenda de Revisiones</h1>
             <p className="text-gray-500 dark:text-gray-400 font-medium text-sm md:text-base">Calendario de citas para contratistas.</p>
           </div>
           
           {/* Botón flotante a la derecha en Desktop */}
           <div className="md:ml-auto w-full md:w-auto mt-4 md:mt-0">
              {canManageCitas && (
                <button onClick={() => openModalNew()} className="w-full sm:w-auto bg-[var(--recal-blue)] hover:bg-[var(--recal-blue-hover)] text-white px-4 py-3 sm:py-2 rounded-md font-medium shadow-sm flex justify-center items-center gap-2">
                  <Plus className="w-5 h-5"/> Nueva Cita
                </button>
              )}
           </div>
        </div>

        <div className="space-y-6">

      {/* PESTAÑAS */}
      <div className="bg-white dark:bg-slate-800 p-2 sm:p-4 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 flex flex-col md:flex-row justify-between items-center gap-2 sm:gap-4 overflow-x-auto">
        
        {/* Switch de Áreas */}
        <div className="flex bg-gray-100 dark:bg-slate-900 p-1 rounded-lg w-full md:w-auto overflow-x-auto min-w-max">
          {userArea === 'Ambas' ? (
            <>
              <button onClick={() => setActiveTab('Seguridad')} className={`flex-1 md:flex-none px-2 sm:px-3 py-1.5 rounded-md text-xs sm:text-sm font-bold transition-all ${activeTab === 'Seguridad' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}>🔵 Seg.</button>
              <button onClick={() => setActiveTab('Medio Ambiente')} className={`flex-1 md:flex-none px-2 sm:px-3 py-1.5 rounded-md text-xs sm:text-sm font-bold transition-all ${activeTab === 'Medio Ambiente' ? 'bg-white dark:bg-slate-700 text-green-600 dark:text-green-400 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}>🟢 Amb.</button>
              <button onClick={() => setActiveTab('Ambas')} className={`flex-1 md:flex-none px-2 sm:px-3 py-1.5 rounded-md text-xs sm:text-sm font-bold transition-all ${activeTab === 'Ambas' ? 'bg-white dark:bg-slate-700 text-purple-600 dark:text-purple-400 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}>🟣 Ambas</button>
            </>
          ) : (
            <div className="px-2 sm:px-4 py-2 text-xs sm:text-sm font-bold text-gray-700 dark:text-gray-300 whitespace-nowrap">
              {activeTab === 'Seguridad' ? '🔵 Citas Seguridad' : '🟢 Citas Medio Ambiente'}
            </div>
          )}
        </div>
      </div>

      {/* LEYENDA DE COLORES */}
      {activeTab !== 'Ambas' && (
        <div className="flex flex-wrap gap-4 px-2 text-xs font-bold text-gray-500 dark:text-gray-400">
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-blue-400"></span> Programada</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-[#10b981]"></span> Liberado</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-[#f59e0b]"></span> En Observaciones</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-[#ef4444]"></span> No Asistió</span>
          <span className="flex items-center gap-1 ml-auto"><span className="bg-yellow-300 text-yellow-900 text-[8px] px-1 py-0.5 rounded font-extrabold border border-yellow-400">TÚ</span> Tus revisiones</span>
        </div>
      )}

      {/* REACT BIG CALENDAR COMPONENT */}
      {loading ? (
        <div className="bg-white dark:bg-slate-800 shadow-sm rounded-lg border border-gray-200 dark:border-slate-700 p-12 text-center text-gray-500 font-bold">Cargando calendario interactivo...</div>
      ) : (
        <div className="bg-white dark:bg-slate-800 shadow-sm rounded-lg border border-gray-200 dark:border-slate-700 overflow-hidden p-2 sm:p-4 h-[60vh] md:h-[75vh] min-h-[500px] md:min-h-[600px] reset-calendar-styles text-[10px] sm:text-xs md:text-sm">
           <DnDCalendar
            localizer={localizer}
            events={events}
            startAccessor="start"
            endAccessor="end"
            culture="es"
            messages={{
              next: "Sig",
              previous: "Ant",
              today: "Hoy",
              month: "Mes",
              agenda: "Agenda",
              date: "Fecha",
              time: "Hora",
              event: "Cita",
              noEventsInRange: "No hay citas en este rango de tiempo.",
              showMore: total => `+ Ver más (${total})`
            }}
            views={['month', 'agenda']}
            defaultView="month"
            view={currentView}
            onView={(newView) => setCurrentView(newView)}
            date={currentDate}
            onNavigate={(date) => setCurrentDate(date)}
            style={{ height: '100%' }}
            selectable={true}
            onSelectSlot={handleSelectSlot}
            onSelectEvent={handleSelectEvent}
            eventPropGetter={eventPropGetter}
            onEventDrop={onEventDrop}
            resizable={false}
            components={{
              month: {
                dateHeader: CustomDateHeader
              }
            }}
             popup={true}
             className="dark:text-white pb-4 min-w-full"
          />
        </div>
      )}
      </div>
      </div>
    </div>

      <DaySummaryModal 
        isOpen={isInfoModalOpen} 
        onClose={() => setIsInfoModalOpen(false)}
        fecha={infoModalData.fecha}
        citas={infoModalData.citas}
        isDiaCordina={infoModalData.isDiaCordina}
        userName={userName}
        onEditClick={(cita) => {
          setIsInfoModalOpen(false);
          openModalEdit(cita, null);
        }}
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
    </>
  );
}