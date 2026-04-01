"use client";

import { useState, useEffect } from 'react';
import { Tractor, Users, CalendarDays, BookOpen, Clock, Activity, Zap, ShieldCheck } from 'lucide-react';
import Link from 'next/link';

export default function DashboardHome() {
  const [stats, setStats] = useState({ maquinaria: 0, personal: 0 });
  const [loading, setLoading] = useState(true);
  const [userAuth, setUserAuth] = useState(null);
  const [greeting, setGreeting] = useState('');

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

    Promise.all([fetchUser(), fetchStats()]);
  }, []);

  // Extrae iniciales (Ej: "Juan Perez" -> "JP")
  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  // Fecha capitalizada y legible en español
  const currentDate = new Date().toLocaleDateString('es-MX', { 
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
  });

  return (
    <div className="min-h-screen bg-[#f5f7fa] dark:bg-[#0f172a] p-4 sm:p-6 lg:p-10 space-y-8 font-sans transition-colors duration-300">
      
      {/* 1. HERO SECTION INTUITIVO (Glassmorphism & Gradients) */}
      <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-[var(--recal-blue)] via-blue-700 to-indigo-900 dark:from-slate-800 dark:via-slate-800 dark:to-slate-900 shadow-2xl border border-white/10 p-8 md:p-12 transition-all">
        {/* Abstract Geometry Effects */}
        <div className="absolute top-0 right-0 -mt-16 -mr-16 w-80 h-80 bg-white/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 -mb-24 -ml-24 w-80 h-80 bg-blue-400/20 rounded-full blur-3xl pointer-events-none"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
          <div className="flex-1">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 mb-6 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-blue-50 text-sm font-medium tracking-wide shadow-sm">
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
               <span className="bg-blue-900/50 text-blue-100 px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest mt-2 border border-blue-400/30">
                 {userAuth.area}
               </span>
            </div>
          )}
        </div>
      </div>

      {/* 2. BENTO GRID - TARJETAS DE ACCESO RÁPIDO */}
      <div className="mt-12 animate-in fade-in slide-in-from-bottom-8 duration-700">
        <div className="flex items-center gap-3 mb-8 px-2">
          <Activity className="w-7 h-7 text-[var(--recal-blue)] dark:text-blue-400" />
          <h2 className="text-2xl font-black text-gray-800 dark:text-white tracking-tight">Módulos Activos</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">

          {/* TARJETA MAQUINARIA (Visible para todos) */}
          <Link href="/dashboard/maquinaria" className="group h-full">
            <div className="h-full flex flex-col relative overflow-hidden bg-white/90 dark:bg-slate-800/70 backdrop-blur-xl border border-white/80 dark:border-slate-700/50 rounded-[2rem] p-8 transition-all duration-500 hover:-translate-y-2 shadow-xl shadow-gray-200/50 hover:shadow-2xl hover:shadow-blue-900/10 dark:shadow-none dark:hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.6)]">
              <div className="absolute -right-10 -top-10 w-40 h-40 bg-orange-100 dark:bg-orange-900/20 rounded-full blur-3xl group-hover:bg-orange-200 dark:group-hover:bg-orange-900/40 transition-colors duration-500"></div>
              
              <div className="relative z-10 flex-grow">
                <div className="w-16 h-16 bg-gradient-to-br from-orange-400 to-orange-600 rounded-2xl shadow-lg shadow-orange-500/30 flex items-center justify-center text-white mb-6 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300">
                  <Tractor className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-black text-gray-800 dark:text-white tracking-tight mb-3">Maquinaria</h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm font-medium mb-8 leading-relaxed">
                  Control interno, inventario, administración, programas de utilización y mantenimiento de maquinaria y equipo.
                </p>
              </div>

              <div className="mt-auto flex items-center justify-between border-t border-gray-200/60 dark:border-slate-700 pt-5">
                <span className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest flex items-center gap-1.5"><Activity className="w-3 h-3"/> Activas Hoy</span>
                {loading ? (
                  <div className="w-12 h-8 bg-gray-200 dark:bg-slate-700 rounded-lg animate-pulse"></div>
                ) : (
                  <span className="text-3xl font-black text-orange-600 dark:text-orange-400">{stats.maquinaria}</span>
                )}
              </div>
            </div>
          </Link>

          {/* TARJETA FUERZA DE TRABAJO (Solo Seguridad o Ambas) */}
          {userAuth && (userAuth.area === 'Seguridad' || userAuth.area === 'Ambas') && (
            <Link href="/dashboard/fuerza-trabajo" className="group h-full">
              <div className="h-full flex flex-col relative overflow-hidden bg-white/90 dark:bg-slate-800/70 backdrop-blur-xl border border-white/80 dark:border-slate-700/50 rounded-[2rem] p-8 transition-all duration-500 hover:-translate-y-2 shadow-xl shadow-gray-200/50 hover:shadow-2xl hover:shadow-blue-900/10 dark:shadow-none dark:hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.6)]">
                <div className="absolute -right-10 -top-10 w-40 h-40 bg-blue-100 dark:bg-blue-900/20 rounded-full blur-3xl group-hover:bg-blue-200 dark:group-hover:bg-blue-900/40 transition-colors duration-500"></div>
                
                <div className="relative z-10 flex-grow">
                  <div className="w-16 h-16 bg-gradient-to-br from-[var(--recal-blue)] to-blue-500 rounded-2xl shadow-lg shadow-blue-500/30 flex items-center justify-center text-white mb-6 group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-300">
                    <Users className="w-8 h-8" />
                  </div>
                  <h3 className="text-2xl font-black text-gray-800 dark:text-white tracking-tight mb-3">Fuerza de Trabajo</h3>
                  <p className="text-gray-500 dark:text-gray-400 text-sm font-medium mb-8 leading-relaxed">
                    Administración de personal, certificados, constancias DC-3 e ingreso a obra.
                  </p>
                </div>

                <div className="mt-auto flex items-center justify-between border-t border-gray-200/60 dark:border-slate-700 pt-5">
                  <span className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest flex items-center gap-1.5"><Activity className="w-3 h-3"/> Plantilla</span>
                  {loading ? (
                    <div className="w-12 h-8 bg-gray-200 dark:bg-slate-700 rounded-lg animate-pulse"></div>
                  ) : (
                    <span className="text-3xl font-black text-[var(--recal-blue)] dark:text-blue-400">{stats.personal}</span>
                  )}
                </div>
              </div>
            </Link>
          )}

          {/* TARJETA CITAS DOSSIER (Adaptada a Light / Dark Mode) */}
          <Link href="/dashboard/citas" className="group h-full lg:col-span-1 md:col-span-2 lg:col-auto">
             <div className="h-full flex flex-col relative overflow-hidden bg-white/90 dark:bg-gradient-to-bl dark:from-[#18181b] dark:to-indigo-950 backdrop-blur-xl rounded-[2rem] p-8 transition-all duration-500 hover:-translate-y-2 shadow-xl shadow-gray-200/50 hover:shadow-2xl hover:shadow-indigo-900/10 dark:shadow-none dark:hover:shadow-[0_20px_40px_-15px_rgba(79,70,229,0.5)] border border-white/80 dark:border-indigo-700/50">
                {/* Textura sutil y Brillos */}
                <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5 dark:opacity-10 pointer-events-none"></div>
                <div className="absolute -bottom-16 -right-16 w-56 h-56 bg-indigo-100 dark:bg-indigo-500/40 rounded-full blur-[3rem] group-hover:bg-indigo-200 dark:group-hover:bg-indigo-400/50 transition-colors duration-500 ease-in-out"></div>
                
                <div className="relative z-10 flex flex-col h-full flex-grow">
                  <div className="flex justify-between items-start mb-6">
                    <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-indigo-700 dark:bg-white/10 dark:backdrop-blur-md rounded-2xl shadow-lg shadow-indigo-500/30 flex items-center justify-center text-white dark:text-indigo-200 mb-6 group-hover:scale-110 transition-all duration-300">
                      <CalendarDays className="w-8 h-8" />
                    </div>
                  </div>
                  
                  <h3 className="text-2xl font-black text-gray-800 dark:text-white tracking-tight mb-3">Citas Dossier</h3>
                  <p className="text-gray-500 dark:text-indigo-200/70 text-sm font-medium leading-relaxed mb-8 flex-grow">
                    Agenda de citas, control de revisiones para contratistas.
                  </p>
                  
                  <div className="flex items-center text-gray-400 dark:text-indigo-300 group-hover:text-indigo-600 dark:group-hover:text-white transition-colors mt-auto pt-5 border-t border-gray-200/60 dark:border-indigo-800/60">
                     <span className="text-sm font-extrabold uppercase tracking-widest flex items-center gap-2">Abrir Citas <span className="text-xl leading-none">&rarr;</span></span>
                  </div>
                </div>
             </div>
          </Link>
          
          {/* TARJETA CATÁLOGOS */}
          <Link href="/dashboard/catalogos" className="group h-full">
             <div className="h-full flex flex-col relative overflow-hidden bg-white/90 dark:bg-slate-800/70 backdrop-blur-xl border border-white/80 dark:border-slate-700/50 rounded-[2rem] p-8 transition-all duration-500 hover:-translate-y-2 shadow-xl shadow-gray-200/50 hover:shadow-2xl hover:shadow-blue-900/10 dark:shadow-none dark:hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.6)]">
                <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-purple-100 dark:bg-purple-900/20 rounded-full blur-3xl group-hover:bg-purple-200 dark:group-hover:bg-purple-900/40 transition-colors duration-500"></div>
                
                <div className="relative z-10 flex flex-col h-full flex-grow">
                  <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-700 rounded-2xl shadow-lg shadow-purple-500/30 flex items-center justify-center text-white mb-6 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300">
                    <BookOpen className="w-8 h-8" />
                  </div>
                  <h3 className="text-2xl font-black text-gray-800 dark:text-white tracking-tight mb-3">Administración</h3>
                  <p className="text-gray-500 dark:text-gray-400 text-sm font-medium mb-8 leading-relaxed">
                    Catálogos del sistema: Gestiona Altas, Bajas y Cambios de Subcontratistas, Agentes y Cursos STPS.
                  </p>
                  
                  <div className="flex items-center text-gray-400 dark:text-gray-500 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors mt-auto pt-5 border-t border-gray-200/60 dark:border-slate-700">
                     <ShieldCheck className="w-4 h-4 mr-2" />
                     <span className="text-xs font-bold uppercase tracking-widest">Ajustes Generales</span>
                  </div>
                </div>
             </div>
          </Link>

        </div>
      </div>
    </div>
  );
}