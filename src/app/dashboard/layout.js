"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import BotonTema from '@/components/BotonTema';
import { 
  LayoutDashboard, Tractor, Users, ClipboardList, 
  BookOpen, CalendarDays, ShieldCheck, LogOut, Menu, X, FileBarChart,
  ChevronLeft, ChevronRight, Building, Lock, History, Sprout
} from 'lucide-react';
import ModalPlanDetalles from '@/components/ModalPlanDetalles';
import DemoSystem from '@/components/DemoSystem';
import AIChatWidget from '@/components/ai/AIChatWidget';

export default function DashboardLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  
  // Evita hydration mismatch: se aplica el estado dinámico solo tras el montaje
  const [hasMounted, setHasMounted] = useState(false);
  // Móvil: el drawer se abre/cierra
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  // Desktop/tablet: el sidebar puede estar colapsado (solo íconos)
  const [isCollapsed, setIsCollapsed] = useState(false);

  const [userRol, setUserRol] = useState(null);
  const [userEmail, setUserEmail] = useState('');
  const [userArea, setUserArea] = useState(null);
  const [userName, setUserName] = useState('');
  const [userIdEmpresa, setUserIdEmpresa] = useState(null); // <-- NUEVO: Guardar Empresa
  const [userEmpresaNombre, setUserEmpresaNombre] = useState('RECAL ESTRUCTURAS'); // <-- NUEVO: Nombre
  const [userPlan, setUserPlan] = useState('Free'); 
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);

  const [userDcPermission, setUserDcPermission] = useState(0);
  const [userFtPermission, setUserFtPermission] = useState(0);
  const [userPermisoInforme, setUserPermisoInforme] = useState(0);
  const [userPermisoIA, setUserPermisoIA] = useState(0);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      const res = await fetch('/api/auth/logout', { method: 'POST' });
      if (res.ok) {
        localStorage.removeItem('hse_demo_virtual_storage'); // Limpieza senior de datos demo
        router.push('/login');
      }
    } catch (error) {
      console.error("Error al cerrar sesión", error);
    }
  };

  useEffect(() => {
    // Marcar como montado y leer preferencia guardada
    setHasMounted(true);
    const savedCollapsed = localStorage.getItem('sidebar-collapsed');
    if (savedCollapsed !== null) {
      setIsCollapsed(savedCollapsed === 'true');
    }

    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setUserRol(data.user.rol);
          setUserEmail(data.user.correo || '');
          setUserArea(data.user.area);
          setUserName(data.user.nombre);
          setUserIdEmpresa(data.user.id_empresa || 1); // <-- NUEVO: Leer id_empresa del token
          setUserEmpresaNombre(data.user.empresa_nombre || 'RECAL ESTRUCTURAS');
          setUserPlan(data.user.plan_suscripcion || 'Free');
        }
      });

      fetch('/api/usuarios/me')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.data && data.data.length > 0) {
          setUserDcPermission(data.data[0].permisos_dc3);
          setUserFtPermission(data.data[0].permisos_ft);
          setUserPermisoInforme(data.data[0].permisos_informe || 0);
          setUserPermisoIA(data.data[0].permisos_ia || 0);
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

  const isDemo = userEmail === 'demo@obrasos.com';
  const isAdmin = userRol === 'Admin' || userRol === 'Master' || isDemo;
  const isMaster = userRol === 'Master' || isDemo;
  
  const isTotal = userPlan?.toLowerCase() === 'total' || isDemo;
  const isIntermedio = userPlan?.toLowerCase() === 'intermedio' || isDemo;

  // Disponibilidad por Plan (Techo de permisos)
  const planAllowsFT = true; // En todos los planes
  const planAllowsMaquinaria = true; // En todos los planes
  const planAllowsCertificados = isIntermedio || isTotal || isMaster;
  const planAllowsInformes = isTotal || isMaster;
  const planAllowsDC3 = isTotal || isMaster;

  // Permisos Combinados (Plan && Usuario)
  const hasDc3Permission = planAllowsDC3 && (userDcPermission === 1 || isAdmin);
  const hasFtPermission  = planAllowsFT && (userFtPermission  === 1 || isAdmin);
  const canSeeCatalogos  = isAdmin || hasFtPermission || hasDc3Permission || (planAllowsCertificados && isAdmin);
  const canSeeInformes   = planAllowsInformes && (isMaster || userPermisoInforme === 1);
  const canSeeCitas      = isMaster || (userIdEmpresa === 1); // RECAL bypass

  const canSeeSeguridad = userArea?.toLowerCase().includes('seguridad') || userArea?.toLowerCase().includes('ambas') || isAdmin;
  const canSeeAmbiental = userArea?.toLowerCase().includes('ambiental') || userArea?.toLowerCase().includes('ambiente') || userArea?.toLowerCase().includes('ambas') || isAdmin;

  const closeSidebar = () => setIsSidebarOpen(false);
  const toggleCollapse = () => {
    const next = !isCollapsed;
    setIsCollapsed(next);
    localStorage.setItem('sidebar-collapsed', String(next));
  };

  // Componente de cada link del sidebar
  const NavItem = ({ href, icon: Icon, label, isPurple = false, isLocked = false }) => {
    const isActive = href === '/dashboard' ? pathname === href : pathname.startsWith(href);
    
    const handleClick = (e) => {
      if (isLocked) {
        e.preventDefault();
        setIsPlanModalOpen(true);
      } else {
        closeSidebar();
      }
    };

    return (
      <div className="relative group/nav">
        <Link 
          href={isLocked ? '#' : href}
          onClick={handleClick}
          title={isCollapsed ? label : undefined}
          className={`
            flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all duration-300 group relative overflow-hidden
            ${isCollapsed ? 'md:px-0 md:justify-center' : ''}
            ${isLocked ? 'opacity-50 grayscale cursor-pointer' : ''}
            ${isActive && !isLocked
              ? (isPurple 
                  ? 'bg-purple-600/20 text-purple-300 shadow-[0_4px_20px_rgba(168,85,247,0.15)] border border-purple-500/30' 
                  : 'bg-white/10 text-white shadow-[0_4px_20px_rgba(255,255,255,0.08)] border border-white/20')
              : 'text-blue-100/60 hover:text-white hover:bg-white/5 border border-transparent'
            }
          `}
        >
          <div className={`absolute inset-0 bg-gradient-to-r from-white/0 to-white/5 opacity-0 group-hover:opacity-100 transition-opacity ${isActive && !isLocked ? 'opacity-100' : ''}`}></div>
          <Icon className={`w-5 h-5 relative z-10 flex-shrink-0 transition-transform duration-300 ${isActive && !isLocked ? 'scale-110' : 'group-hover:scale-110 group-hover:rotate-3'} ${isPurple && isActive ? 'text-purple-400' : ''}`} />
          
          <span className={`font-medium relative z-10 tracking-wide text-sm whitespace-nowrap overflow-hidden transition-all duration-300 ${isActive && !isLocked ? 'font-bold' : ''} ${isCollapsed ? 'md:w-0 md:opacity-0' : 'w-auto opacity-100'}`}>
            {label}
          </span>
          
          {isLocked && !isCollapsed && (
            <Lock className="w-3.5 h-3.5 ml-auto relative z-10 text-blue-300/50" />
          )}

          {isLocked && isCollapsed && (
            <div className="absolute top-1 right-1">
              <Lock className="w-2.5 h-2.5 text-blue-300/70" />
            </div>
          )}

          {/* Indicador activo */}
          {isActive && !isLocked && (
            <div className={`absolute top-1/2 -translate-y-1/2 w-1.5 h-8 ${isTotal ? 'bg-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.6)]' : 'bg-blue-400 shadow-[0_0_10px_rgba(96,165,250,0.8)]'} rounded-l-full animate-pulse ${isCollapsed ? 'right-0 md:hidden' : 'right-0'}`}></div>
          )}
          {isActive && !isLocked && isCollapsed && (
            <div className={`hidden md:block absolute bottom-0 left-1/2 -translate-x-1/2 h-1 w-6 ${isTotal ? 'bg-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.6)]' : 'bg-blue-400 shadow-[0_0_10px_rgba(96,165,250,0.8)]'} rounded-t-full animate-pulse`}></div>
          )}
        </Link>
      </div>
    );
  };

  return (
    <DemoSystem userEmail={userEmail} onUpgradeClick={() => setIsPlanModalOpen(true)}>
      <div className="flex h-screen bg-[#f5f7fa] dark:bg-slate-900 relative overflow-hidden font-sans">
      
      {/* Overlay clickeable móvil */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden transition-opacity" 
          onClick={closeSidebar}
        ></div>
      )}

      {/* SIDEBAR */}
      <aside
        style={hasMounted ? { width: isSidebarOpen || !isCollapsed ? '288px' : '72px' } : { width: '288px' }}
        className={`
          fixed inset-y-0 left-0 z-50 shrink-0
          ${isTotal 
            ? 'bg-gradient-to-b from-[#2a1e12] via-[#0f0d0b] to-[#050403] border-r border-amber-900/20' 
            : 'bg-gradient-to-b from-[#145184] via-blue-900 to-indigo-950 border-r border-indigo-800/50'}
          text-white flex flex-col shadow-2xl
          transition-all duration-300 ease-[cubic-bezier(0.25,1,0.5,1)]
          md:relative
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
      >
        {/* Textura sutil */}
        <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-[0.03] pointer-events-none"></div>

        {/* Header del sidebar */}
        <div className={`flex items-center relative z-10 transition-all duration-300 justify-between p-6 md:p-8 ${isCollapsed ? 'md:justify-center md:p-4 md:pt-6' : 'md:justify-center'}`}>
          <div className="flex flex-col items-center">
            <div className="relative group cursor-pointer">
              <div className={`absolute -inset-1 ${isTotal ? 'bg-gradient-to-r from-amber-400 to-orange-400' : 'bg-gradient-to-r from-blue-400 to-indigo-400'} rounded-full blur opacity-20 group-hover:opacity-60 transition duration-500`}></div>
              <img
                src="https://res.cloudinary.com/ddl8myqbt/image/upload/q_auto/f_auto/v1775844681/logo-obras-os-docs_rkur0u.png"
                alt="ObrasOS - DOCS"
                className={`relative object-contain transform transition-all duration-300 group-hover:scale-105 ${isCollapsed ? 'w-10 h-10' : 'w-48 h-12 mb-2'}`}
              />
            </div>
            {/* Texto siempre visible en móvil, se oculta en desktop colapsado */}
            <span className={`text-[10px] text-center font-black tracking-[0.2em] ${isTotal ? 'text-amber-200/50' : 'text-blue-200/50'} mt-4 hidden md:block uppercase ${isCollapsed ? 'md:hidden' : ''}`}>{userEmpresaNombre}</span>
          </div>
          {/* Botón cerrar (solo móvil) */}
          <button onClick={closeSidebar} className={`md:hidden ${isTotal ? 'text-amber-200' : 'text-blue-300'} hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors`}>
            <X className="w-6 h-6" />
          </button>
        </div>
        
        {/* NAV */}
        <nav className={`flex-1 py-2 space-y-2.5 overflow-y-auto overflow-x-hidden w-full relative z-10 custom-scrollbar transition-all duration-300 px-4 ${isCollapsed ? 'md:px-2' : ''}`}>
          {/* BotonTema alineado */}
          <div className={`w-full flex mb-6 px-2 ${isCollapsed ? 'md:justify-center justify-end' : 'justify-end'}`}>
            <BotonTema className="w-8 h-8 opacity-70 hover:opacity-100 transition-opacity" />
          </div>
          
          <NavItem href="/dashboard" icon={LayoutDashboard} label="Resumen Central" />
          
          {/* SECCIÓN: ADMINISTRACIÓN / GENERAL */}
          <div className={`pt-4 ${isCollapsed ? 'pt-2' : ''}`}>
             {!isCollapsed && <span className="px-4 text-[10px] font-black tracking-[0.2em] text-blue-300/40 uppercase mb-2 block">Administración</span>}
             <NavItem href="/dashboard/maquinaria" icon={Tractor} label="Maquinaria y Equipo" isLocked={!planAllowsMaquinaria} />
          </div>

          {/* SECCIÓN: SEGURIDAD */}
          {canSeeSeguridad && (
            <div className={`pt-4 ${isCollapsed ? 'pt-2' : ''}`}>
               {!isCollapsed && <span className="px-4 text-[10px] font-black tracking-[0.2em] text-blue-300/40 uppercase mb-2 block">Seguridad</span>}
               <NavItem href="/dashboard/fuerza-trabajo" 
               icon={Users} 
               label="Fuerza de Trabajo" 
               isLocked={!planAllowsFT} />
               <NavItem 
                href="/dashboard/informes-seguridad" 
                icon={FileBarChart} 
                label="Informes Seguridad" 
                isLocked={!planAllowsInformes || !(isAdmin || userPermisoInforme === 1)} 
                isPurple={isTotal} 
               />
               <NavItem 
                href="/dashboard/actividades" 
                icon={ClipboardList} 
                label="Actividades"
               />
            </div>
          )}

          {/* SECCIÓN: AMBIENTAL */}
          {canSeeAmbiental && (
            <div className={`pt-4 ${isCollapsed ? 'pt-2' : ''}`}>
               {!isCollapsed && <span className="px-4 text-[10px] font-black tracking-[0.2em] text-emerald-400/40 uppercase mb-2 block">Ambiental</span>}
               <NavItem 
                href="/dashboard/informes-ambiental" 
                icon={Sprout} 
                label="Reportes Ambiental" 
                isPurple={true}
               />
            </div>
          )}

          {/* CATÁLOGOS Y CITAS (Solo Recal Estructuras ID:1) */}
          {userIdEmpresa === 1 && (
            <div className={`pt-4 ${isCollapsed ? 'pt-2' : ''}`}>
              {!isCollapsed && <span className="px-4 text-[10px] font-black tracking-[0.2em] text-amber-400/40 uppercase mb-2 block">Módulo Recal</span>}
              <NavItem 
                href="/dashboard/catalogos" 
                icon={BookOpen} 
                label="Catálogos" 
                isLocked={!canSeeCatalogos}
              />
              {!isDemo && (
                <NavItem 
                  href="/dashboard/citas" 
                  icon={CalendarDays} 
                  label="Citas Dossier" 
                />
              )}
            </div>
          )}
          
          {userRol === 'Master' && (
             <div className={`pt-6 mt-6 border-t border-white/10 ${isCollapsed ? 'border-t-0 pt-2 mt-2' : ''}`}>
               {/* Texto siempre en móvil, oculto en desktop colapsado */}
               <span className={`px-4 text-[10px] font-black tracking-widest text-indigo-300/50 uppercase mb-2 block ${isCollapsed ? 'md:hidden' : ''}`}>Administración Global</span>
               {/* Separador solo en desktop colapsado */}
               {isCollapsed && <div className="hidden md:block border-t border-white/10 mb-2"></div>}
               <NavItem href="/dashboard/usuarios" icon={ShieldCheck} label="Control de Accesos" isPurple={true} />
               <NavItem href="/dashboard/empresas" icon={Building} label="Control de Empresas" isPurple={true} />
               <NavItem href="/dashboard/trazabilidad" icon={History} label="Trazabilidad" isPurple={true} />
             </div>
          )}
        </nav>

        {/* Footer del sidebar: siempre completo en móvil, avatar en desktop colapsado */}
        <div className={`border-t border-white/5 relative z-10 bg-black/10 transition-all duration-300 p-4 ${isCollapsed ? 'md:p-3' : ''}`}>
          {/* Vista completa: siempre en móvil, también en desktop expandido */}
          <div className={`flex items-center gap-3 px-2 ${isCollapsed ? 'md:hidden' : ''}`}>
            <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center border border-blue-400/30 text-blue-200 font-bold text-xs uppercase">
              {userName ? userName[0] : 'U'}
            </div>
            <div className="flex flex-col overflow-hidden">
              <span className="text-sm font-semibold text-white truncate">{userName || 'Usuario'}</span>
              <span className="text-[10px] text-blue-300/70 truncate uppercase tracking-wider">{userRol || 'Cargando...'}</span>
            </div>
          </div>
          {/* Avatar solo en desktop colapsado */}
          {isCollapsed && (
            <div className="hidden md:flex justify-center">
              <div title={userName || 'Usuario'} className={`w-9 h-9 rounded-full ${isTotal ? 'bg-amber-500/20 border-amber-400/30 text-amber-200' : 'bg-blue-500/20 border-blue-400/30 text-blue-200'} flex items-center justify-center font-bold text-sm uppercase cursor-default`}>
                {userName ? userName[0] : 'U'}
              </div>
            </div>
          )}
        </div>

        {/* Créditos discretos */}
        <div className={`px-6 pb-2 transition-all duration-300 ${isCollapsed ? 'opacity-0 h-0 overflow-hidden' : 'opacity-100'}`}>
          <a 
            href="https://servitec-tonala.es/" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="text-[8px] font-black text-white/20 hover:text-[#4CFDFD] hover:drop-shadow-[0_0_5px_rgba(76,253,253,0.4)] transition-all duration-300 tracking-[0.3em] uppercase block text-center"
          >
            Powered by SERVITEC
          </a>
        </div>

        {/* Botón de colapsar/expandir — solo desktop/tablet */}
        <button
          onClick={toggleCollapse}
          className={`hidden md:flex absolute -right-3.5 top-20 w-7 h-7 rounded-full bg-gradient-to-br ${isTotal ? 'from-amber-500 to-orange-600 border-amber-800/60' : 'from-blue-500 to-indigo-600 border-indigo-800/60'} border-2 items-center justify-center text-white shadow-lg ${isTotal ? 'hover:from-amber-400 hover:to-orange-500' : 'hover:from-blue-400 hover:to-indigo-500'} transition-all duration-200 z-[60]`}
          aria-label={isCollapsed ? 'Expandir sidebar' : 'Colapsar sidebar'}
        >
          {isCollapsed
            ? <ChevronRight className="w-3.5 h-3.5" />
            : <ChevronLeft className="w-3.5 h-3.5" />
          }
        </button>
      </aside>

      {/* ÁREA PRINCIPAL DERECHA */}
      <div className="flex-1 flex flex-col w-full min-w-0 transition-all duration-300">
        
        <header className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border-b border-gray-200/50 dark:border-slate-800 z-30 sticky top-0 transition-colors shadow-sm">
          <div className="flex justify-between items-center px-4 md:px-8 py-3.5">
            
            <div className="flex items-center">
              {/* Botón hamburguesa móvil */}
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

        {/* CONTAINER DEL CHILDREN */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gradient-to-br from-transparent to-blue-50/50 dark:to-slate-900/50">
          {children}
        </main>
      </div>

      <ModalPlanDetalles 
        isOpen={isPlanModalOpen} 
        onClose={() => setIsPlanModalOpen(false)} 
        currentPlan={{ name: userPlan, empresaNombre: userEmpresaNombre }}
      />
      
      {/* WIDGET RECALITO */}
      {(userPermisoIA === 1 || userRol === 'Master') && (
        <AIChatWidget />
      )}
    </div>
    </DemoSystem>
  );
}