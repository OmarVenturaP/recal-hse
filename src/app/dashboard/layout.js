"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import BotonTema from '@/components/BotonTema';
import { 
  LayoutDashboard, Tractor, Users, ClipboardList, 
  BookOpen, CalendarDays, ShieldCheck, LogOut, Menu, X 
} from 'lucide-react';

export default function DashboardLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [userRol, setUserRol] = useState(null);
  const [userArea, setUserArea] = useState(null);
  const [userName, setUserName] = useState('');
  const [userDcPermission, setUserDcPermission] = useState(0);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      const res = await fetch('/api/auth/logout', { method: 'POST' });
      if (res.ok) {
        router.push('/login');
      }
    } catch (error) {
      console.error("Error al cerrar sesión", error);
    }
  };

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setUserRol(data.user.rol);
          setUserArea(data.user.area);
          setUserName(data.user.nombre);
        }
      });

      fetch('/api/usuarios/me')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.data && data.data.length > 0) {
          setUserDcPermission(data.data[0].permisos_dc3);
        }
      });

    let timeoutId;
    const resetTimer = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(handleLogout, 15 * 60 * 1000); 
    };

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach(event => document.addEventListener(event, resetTimer));
    resetTimer();

    return () => {
      clearTimeout(timeoutId);
      events.forEach(event => document.removeEventListener(event, resetTimer));
    };
  }, []);

  const isAdmin = userRol === 'Admin' || userRol === 'Master';
  const hasDc3Permission = userDcPermission === 1 || isAdmin;

  const closeSidebar = () => setIsSidebarOpen(false);

  // Componente interactivo para cada link del sidebar
  const NavItem = ({ href, icon: Icon, label, isPurple = false }) => {
    // Es activa si estamos exactamente en la ruta (para dashboard puro) o si empieza con la subruta
    const isActive = href === '/dashboard' ? pathname === href : pathname.startsWith(href);
    
    return (
      <Link 
        href={href}
        onClick={closeSidebar}
        className={`
          flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all duration-300 group relative overflow-hidden
          ${isActive 
            ? (isPurple 
                ? 'bg-purple-600/20 text-purple-300 shadow-[0_4px_20px_rgba(168,85,247,0.15)] border border-purple-500/30' 
                : 'bg-white/10 text-white shadow-[0_4px_20px_rgba(255,255,255,0.08)] border border-white/20')
            : 'text-blue-100/60 hover:text-white hover:bg-white/5 border border-transparent'
          }
        `}
      >
        <div className={`absolute inset-0 bg-gradient-to-r from-white/0 to-white/5 opacity-0 group-hover:opacity-100 transition-opacity ${isActive ? 'opacity-100' : ''}`}></div>
        <Icon className={`w-5 h-5 relative z-10 transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-110 group-hover:rotate-3'} ${isPurple && isActive ? 'text-purple-400' : ''}`} />
        <span className={`font-medium relative z-10 tracking-wide text-sm ${isActive ? 'font-bold' : ''}`}>{label}</span>
        
        {/* Luz indicadora lateral en item activo */}
        {isActive && (
          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-8 bg-blue-400 rounded-l-full animate-pulse shadow-[0_0_10px_rgba(96,165,250,0.8)]"></div>
        )}
      </Link>
    );
  };

  return (
    <div className="flex h-screen bg-[#f5f7fa] dark:bg-slate-900 relative overflow-hidden font-sans">
      
      {/* Overlay clickeable móvil */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden transition-opacity" 
          onClick={closeSidebar}
        ></div>
      )}

      {/* SIDEBAR REDISEÑADO: Estilo Premium, Gradientes, Glassmorphism */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-72 shrink-0 bg-gradient-to-b from-[#145184] via-blue-900 to-indigo-950 text-white flex flex-col shadow-2xl border-r border-indigo-800/50 
        transform transition-transform duration-500 ease-[cubic-bezier(0.25,1,0.5,1)]
        md:relative md:translate-x-0
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Textura sutil estelar interior del sidebar */}
        <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-[0.03] pointer-events-none"></div>

        <div className="p-6 md:p-8 flex justify-between items-center md:justify-center relative z-10">
          <div className="flex flex-col items-center">
            <div className="relative group cursor-pointer">
              <div className="absolute -inset-1 bg-gradient-to-r from-blue-400 to-indigo-400 rounded-full blur opacity-20 group-hover:opacity-60 transition duration-500"></div>
              <img src="https://res.cloudinary.com/ddl8myqbt/image/upload/v1772806608/circle-logo-recal_ibfgo7.png" alt="Logo RECAL" className="relative w-16 h-16 rounded-full border-2 border-white/20 shadow-2xl transform transition-transform group-hover:scale-105" />
            </div>
            <span className="hidden md:block text-xs font-black tracking-[0.2em] text-blue-200/50 mt-4">RECAL ESTRUCTURAS</span>
          </div>
          <button onClick={closeSidebar} className="md:hidden text-blue-300 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <nav className="flex-1 px-4 py-2 space-y-2.5 overflow-y-auto w-full relative z-10 custom-scrollbar">
          <div className='w-full items-center justify-end mb-6 flex px-2'> 
            <BotonTema className="w-8 h-8 opacity-70 hover:opacity-100 transition-opacity" /> 
          </div>
          
          <NavItem href="/dashboard" icon={LayoutDashboard} label="Resumen Central" />
          <NavItem href="/dashboard/maquinaria" icon={Tractor} label="Maquinaria y Equipo" />
          
          {(userArea === 'Seguridad' || userArea === 'Ambas') && (
            <NavItem href="/dashboard/fuerza-trabajo" icon={Users} label="Fuerza de Trabajo" />
          )}
          
          {(userArea === 'Seguridad' || userArea === 'Ambas') && (
            <NavItem href="/dashboard/actividades" icon={ClipboardList} label="Actividades" />
          )}
          
          {hasDc3Permission && (
            <NavItem href="/dashboard/catalogos" icon={BookOpen} label="Catálogos Globales" />
          )}
          
          <NavItem href="/dashboard/citas" icon={CalendarDays} label="Citas Dossier" />
          
          {userRol === 'Master' && (
             <div className="pt-6 mt-6 border-t border-white/10">
               <span className="px-4 text-[10px] font-black tracking-widest text-indigo-300/50 uppercase mb-2 block">Administración</span>
               <NavItem href="/dashboard/usuarios" icon={ShieldCheck} label="Control de Accesos" isPurple={true} />
             </div>
          )}
        </nav>

        {/* Footer miniatura en el Sidebar identificando la cuenta */}
        <div className="p-4 border-t border-white/5 relative z-10 bg-black/10">
           <div className="flex items-center gap-3 px-2">
             <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center border border-blue-400/30 text-blue-200 font-bold text-xs uppercase">
               {userName ? userName[0] : 'U'}
             </div>
             <div className="flex flex-col overflow-hidden">
               <span className="text-sm font-semibold text-white truncate">{userName || 'Usuario'}</span>
               <span className="text-[10px] text-blue-300/70 truncate uppercase tracking-wider">{userRol || 'Cargando...'}</span>
             </div>
           </div>
        </div>
      </aside>

      {/* ÁREA PRINCIPAL DERECHA */}
      <div className="flex-1 flex flex-col w-full min-w-0 transition-transform duration-300">
        
        {/* HEADER REDISEÑADO */}
        <header className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border-b border-gray-200/50 dark:border-slate-800 z-30 sticky top-0 transition-colors shadow-sm">
          <div className="flex justify-between items-center px-4 md:px-8 py-3.5">
            
            <div className="flex items-center">
              <button 
                onClick={() => setIsSidebarOpen(true)} 
                className="md:hidden mr-4 p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg focus:outline-none transition-colors"
              >
                <Menu className="w-6 h-6" />
              </button>
              
              <div className="flex flex-col">
                <h1 className="text-lg md:text-xl font-bold tracking-tight text-gray-800 dark:text-white">
                  {userName ? `¡Hola, ${userName.split(' ')[0]}!` : 'Cargando...'}
                </h1>
                <span className="hidden md:block text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest">{userArea}</span>
              </div>
            </div>
            
            <button 
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="group flex items-center gap-2 text-xs md:text-sm font-bold text-red-500 hover:text-white border-2 border-red-100 hover:border-red-500 hover:bg-red-500 dark:border-red-500/20 dark:hover:border-red-500 px-4 py-2 rounded-xl transition-all duration-300 shadow-sm"
            >
              <LogOut className="w-4 h-4 group-hover:scale-110 transition-transform" />
              <span className="hidden sm:inline">{isLoggingOut ? 'Cerrando...' : 'Cerrar Sesión'}</span>
            </button>
          </div>
        </header>

        {/* CONTAINER DEL CHILDREN (Tus módulos) */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-transparent relative z-0">
          <div className="absolute inset-0 bg-gradient-to-br from-transparent to-blue-50/50 dark:to-slate-900/50 pointer-events-none -z-10"></div>
          {children}
        </main>
      </div>
    </div>
  );
}