"use client";

import { useState, useEffect } from 'react';
import { Tractor, Users, CalendarDays, BookOpen, Clock, Activity, Zap, ShieldCheck, FileBarChart, Crown, Lock } from 'lucide-react';
import Link from 'next/link';
import ModalPlanDetalles from '@/components/ModalPlanDetalles';

export default function DashboardHome() {
  const [stats, setStats] = useState({ maquinaria: 0, personal: 0 });
  const [loading, setLoading] = useState(true);
  const [userAuth, setUserAuth] = useState(null);
  const [userPerms, setUserPerms] = useState({ ft: 0, dc3: 0, informe: 0 });
  const [greeting, setGreeting] = useState('');
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);

  useEffect(() => {
    // Generar saludo basado en la hora local
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Buenos días');
    else if (hour < 19) setGreeting('Buenas tardes');
    else setGreeting('Buenas noches');

    // 1. Obtener datos del usuario logueado
    const fetchUser = async () => {
      try {
        const res = await fetch('/api/auth/me');
        const data = await res.json();
        if (data.success) {
          setUserAuth(data.user);
        }
      } catch (error) {
        console.error("Error cargando usuario", error);
      }
    };

    const fetchPerms = async () => {
      try {
        const res = await fetch('/api/usuarios/me');
        const data = await res.json();
        if (data.success && data.data?.length > 0) {
          setUserPerms({
            ft: data.data[0].permisos_ft,
            dc3: data.data[0].permisos_dc3,
            informe: data.data[0].permisos_informe || 0,
          });
        }
      } catch (e) { /* silencioso */ }
    };

    // 2. Obtener estadísticas globales
    const fetchStats = async () => {
      try {
        const res = await fetch('/api/dashboard/stats');
        const data = await res.json();
        if (data.success) {
          setStats({
            maquinaria: data.maquinariaActiva,
            personal: data.personalActivo
          });
        }
      } catch (error) {
        console.error("Error cargando estadísticas", error);
      } finally {
        setLoading(false);
      }
    };

    Promise.all([fetchUser(), fetchPerms(), fetchStats()]);
  }, []);

  // Extrae iniciales (Ej: "Juan Perez" -> "JP")
  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  // ---- LOGICA DE PLANES ----
  const isMasterDash = userAuth?.rol === 'Master';
  const isAdminDash = userAuth?.rol === 'Admin' || isMasterDash;
  const currentPlan = (userAuth?.plan_suscripcion || 'Free').toLowerCase();
  const isTotalDash = currentPlan === 'total';
  const isIntermedioDash = currentPlan === 'intermedio';

  const planAllowsFTDash = true;
  const planAllowsMaquinariaDash = true;
  const planAllowsCertificadosDash = isIntermedioDash || isTotalDash || isMasterDash;
  const planAllowsInformesDash = isTotalDash || isMasterDash;
  const planAllowsDC3Dash = isTotalDash || isMasterDash;

  // ---- PERMISOS INDIVIDUALES ----
  const canSeeCatalogosDash = isAdminDash || userPerms.ft === 1 || userPerms.dc3 === 1 || (planAllowsCertificadosDash && isAdminDash);
  const canSeeInformesDash  = isMasterDash || userPerms.informe === 1;
  const canSeeCitasDash     = isMasterDash || userAuth?.id_empresa === 1;

  const ModuleCard = ({ href, icon: Icon, title, desc, isLocked, isVisible, statsVal, statsLabel, colorClass, shadowColor }) => {
    if (!isVisible) return null;

    const cardContent = (
      <div className={`h-full flex flex-col relative overflow-hidden bg-white/90 dark:bg-slate-800/70 backdrop-blur-xl border border-white/80 dark:border-slate-700/50 rounded-[2rem] p-8 transition-all duration-500 shadow-xl shadow-gray-200/50 ${isLocked ? 'grayscale-[0.5] opacity-70 cursor-not-allowed' : `hover:-translate-y-2 hover:shadow-2xl hover:shadow-${shadowColor}/10 dark:shadow-none dark:hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.6)]`}`}>
        
        {/* Locked Badge */}
        {isLocked && (
          <div className="absolute top-6 right-6 z-20 bg-slate-900/80 text-white px-3 py-1 rounded-full backdrop-blur-md flex items-center gap-1.5 border border-white/10 shadow-lg">
            <Lock className="w-3 h-3 text-amber-400" />
            <span className="text-[10px] font-black uppercase tracking-widest">Plan Superior</span>
          </div>
        )}

        <div className={`absolute -right-10 -top-10 w-40 h-40 rounded-full blur-3xl transition-colors duration-500 ${isLocked ? 'bg-gray-200 dark:bg-gray-900/40' : colorClass + '/20'}`}></div>
        
        <div className="relative z-10 flex-grow">
          <div className={`w-16 h-16 rounded-2xl shadow-lg flex items-center justify-center text-white mb-6 transition-transform duration-300 ${isLocked ? 'bg-gray-400 dark:bg-slate-700' : 'bg-gradient-to-br ' + colorClass + ' group-hover:scale-110 group-hover:rotate-3 shadow-' + shadowColor + '/30'}`}>
            <Icon className="w-8 h-8" />
          </div>
          <h3 className="text-2xl font-black text-gray-800 dark:text-white tracking-tight mb-3">{title}</h3>
          <p className="text-gray-500 dark:text-gray-400 text-sm font-medium mb-8 leading-relaxed">
            {desc}
          </p>
        </div>

        <div className="mt-auto flex items-center justify-between border-t border-gray-200/60 dark:border-slate-700 pt-5">
          <span className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
            <Activity className="w-3 h-3"/> {statsLabel}
          </span>
          {loading ? (
            <div className="w-12 h-8 bg-gray-200 dark:bg-slate-700 rounded-lg animate-pulse"></div>
          ) : (
            <span className={`text-3xl font-black ${isLocked ? 'text-gray-400' : ''}`}>{statsVal}</span>
          )}
        </div>
      </div>
    );

    if (isLocked) {
      return (
        <div className="group h-full" onClick={() => setIsPlanModalOpen(true)}>
          {cardContent}
        </div>
      );
    }

    return (
      <Link href={href} className="group h-full">
        {cardContent}
      </Link>
    );
  };

  // Fecha capitalizada y legible en español
  const currentDate = new Date().toLocaleDateString('es-MX', { 
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
  });

  return (
    <div className="min-h-screen bg-[#f5f7fa] dark:bg-[#0f172a] p-4 sm:p-6 lg:p-10 space-y-8 font-sans transition-colors duration-300">
      
      {/* 1. HERO SECTION INTUITIVO (Glassmorphism & Gradients) */}
      <div className={`relative overflow-hidden rounded-[2.5rem] ${isTotalDash ? 'bg-gradient-to-br from-[#1a1c2c] via-[#0f172a] to-slate-950 border-amber-900/20' : 'bg-gradient-to-br from-[var(--recal-blue)] via-blue-700 to-indigo-900'} dark:from-slate-800 dark:via-slate-800 dark:to-slate-900 shadow-2xl border border-white/10 p-8 md:p-12 transition-all`}>
        {/* Abstract Geometry Effects & Golden Bridge */}
        <div className={`absolute top-0 left-0 w-full h-full pointer-events-none transition-opacity duration-700 ${isTotalDash ? 'opacity-100' : 'opacity-0'}`}>
          <div className="absolute top-0 left-0 w-96 h-96 bg-amber-500/10 rounded-full blur-[100px] -translate-x-1/2 -translate-y-1/2"></div>
          <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-gradient-radial from-amber-500/5 to-transparent -translate-x-1/3 -translate-y-1/3"></div>
        </div>

        <div className={`absolute top-0 right-0 -mt-16 -mr-16 w-80 h-80 ${isTotalDash ? 'bg-amber-400/10' : 'bg-white/10'} rounded-full blur-3xl pointer-events-none`}></div>
        <div className={`absolute bottom-0 left-0 -mb-24 -ml-24 w-80 h-80 ${isTotalDash ? 'bg-orange-950/20' : 'bg-blue-400/20'} rounded-full blur-3xl pointer-events-none`}></div>
        
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
          <div className="flex-1">
            <div className={`inline-flex items-center gap-2 px-4 py-1.5 mb-6 rounded-full ${isTotalDash ? 'bg-amber-950/40 border-amber-500/30 text-amber-100' : 'bg-white/10 border-white/20 text-blue-50'} backdrop-blur-md border text-sm font-medium tracking-wide shadow-sm`}>
              <Clock className="w-4 h-4" />
              <span className="capitalize">{currentDate}</span>
            </div>
            
            {loading ? (
               <div className="w-64 h-12 bg-white/20 rounded-xl animate-pulse mb-3"></div>
            ) : (
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-white tracking-tight leading-tight mb-2">
                {greeting}, <br className="hidden md:block lg:hidden" />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-200 to-blue-50">
                  {userAuth?.nombre?.split(' ')[0] || 'Ingeniero'}
                </span>
              </h1>
            )}
            
            <p className="mt-4 text-blue-100/90 text-lg md:text-xl max-w-xl font-light leading-relaxed">
               Bienvenido al Dashboard de Seguridad y Medio Ambiente. Selecciona un módulo para comenzar.
            </p>
          </div>
          
          {/* User Profile Card within Hero */}
          {userAuth && (
            <div className="hidden md:flex flex-col items-center justify-center p-6 bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl shrink-0 shadow-2xl transition-transform hover:scale-105">
               <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-blue-100 to-white flex items-center justify-center text-[var(--recal-blue)] text-3xl font-black mb-3 shadow-[0_0_20px_rgba(255,255,255,0.3)] border-4 border-white/30">
                 {getInitials(userAuth.nombre)}
               </div>
               <span className="text-white font-bold text-lg">{userAuth.rol}</span>
               
               <div className="flex flex-col gap-2 mt-2 w-full">
                 <span className="bg-blue-900/50 text-blue-100 px-3 py-1 rounded-full text-[10px] text-center font-black uppercase tracking-widest border border-blue-400/30">
                   {userAuth.area}
                 </span>
                 
                 {/* BADGE DE PLAN */}
                 <button 
                  onClick={() => setIsPlanModalOpen(true)}
                  className={`px-3 py-1.5 rounded-xl text-[10px] text-center font-black uppercase tracking-widest border transition-all duration-300 flex items-center justify-center gap-1.5 ${
                     isTotalDash
                      ? 'bg-gradient-to-r from-amber-200 via-amber-500 to-amber-700 text-amber-950 border-amber-400/50 shadow-[0_5px_15px_rgba(212,175,55,0.3)] hover:scale-105 active:scale-95 ring-1 ring-white/20'
                      : 'bg-white/10 text-blue-100 border-white/20 hover:bg-white/20'
                  }`}
                 >
                    {isTotalDash ? <Crown className="w-3 h-3" /> : <Zap className="w-3 h-3" />}
                   Plan {userAuth.plan_suscripcion || 'Free'}
                 </button>
               </div>
            </div>
          )}
        </div>
      </div>

      <ModalPlanDetalles 
        isOpen={isPlanModalOpen} 
        onClose={() => setIsPlanModalOpen(false)} 
        currentPlan={{
          name: userAuth?.plan_suscripcion || 'Free',
          empresaNombre: userAuth?.empresa_nombre || 'Mi Empresa'
        }}
      />

      {/* 2. BENTO GRID - TARJETAS DE ACCESO RÁPIDO */}
      <div className="mt-12 animate-in fade-in slide-in-from-bottom-8 duration-700">
        <div className="flex items-center gap-3 mb-8 px-2">
          <Activity className={`w-7 h-7 ${isTotalDash ? 'text-amber-600' : 'text-[var(--recal-blue)]'} dark:text-blue-400`} />
          <h2 className="text-2xl font-black text-gray-800 dark:text-white tracking-tight">Módulos Activos</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">

          <ModuleCard
            href="/dashboard/maquinaria"
            icon={Tractor}
            title="Maquinaria"
            desc="Control interno, inventario, administración, programas de utilización y mantenimiento de maquinaria y equipo."
            isLocked={!planAllowsMaquinariaDash}
            isVisible={true}
            statsVal={stats.maquinaria}
            statsLabel="Activas Hoy"
            colorClass="from-orange-400 to-orange-600"
            shadowColor="orange-900"
          />

          <ModuleCard
            href="/dashboard/fuerza-trabajo"
            icon={Users}
            title="Fuerza de Trabajo"
            desc="Administración de personal, certificados, constancias DC-3 e ingreso a obra."
            isLocked={!planAllowsFTDash}
            isVisible={true}
            statsVal={stats.personal}
            statsLabel="Plantilla"
            colorClass={isTotalDash ? "from-[#2a1e12] to-[#0f0d0b]" : "from-blue-600 to-blue-500"}
            shadowColor={isTotalDash ? "amber-900" : "blue-900"}
          />

          <ModuleCard
            href="/dashboard/informes-seguridad"
            icon={FileBarChart}
            title="Informes de Seguridad"
            desc="Control semanal de reportes, horas hombre y fuerza de trabajo por subcontratista."
            isLocked={!planAllowsInformesDash || !canSeeInformesDash}
            isVisible={true}
            statsVal=""
            statsLabel="Reportes Semanales"
            colorClass="from-red-600 to-red-700"
            shadowColor="red-900"
          />

          <ModuleCard
            href="/dashboard/actividades"
            icon={Activity}
            title="Actividades"
            desc="Seguimiento de actividades diarias, checklists y cumplimiento en campo."
            isLocked={!(userAuth?.area === 'Seguridad' || userAuth?.area === 'Ambas')}
            isVisible={userAuth?.id_empresa === 1}
            statsVal=""
            statsLabel="Gestión de Campo"
            colorClass="from-blue-400 to-blue-600"
            shadowColor="blue-900"
          />

          <ModuleCard
            href="/dashboard/catalogos"
            icon={BookOpen}
            title="Administración"
            desc="Catálogos del sistema: Gestiona Altas, Bajas y Cambios de Subcontratistas, Agentes y Cursos STPS."
            isLocked={!canSeeCatalogosDash}
            isVisible={true}
            statsVal=""
            statsLabel="Ajustes Generales"
            colorClass="from-purple-500 to-purple-700"
            shadowColor="purple-900"
          />

          <ModuleCard
            href="/dashboard/citas"
            icon={CalendarDays}
            title="Citas Dossier"
            desc="Agenda de citas, control de revisiones para contratistas."
            isLocked={!canSeeCitasDash}
            isVisible={true}
            statsVal=""
            statsLabel="Agenda de Citas"
            colorClass="from-emerald-500 to-emerald-700"
            shadowColor="emerald-900"
          />

        </div>
      </div>
    </div>
  );
}