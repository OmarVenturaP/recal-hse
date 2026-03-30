"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import BotonTema from '@/components/BotonTema';

export default function DashboardLayout({ children }) {
  const router = useRouter();
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
        if (data.success) {
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

  return (
    <div className="flex h-screen bg-[var(--recal-gray)] dark:bg-slate-800 relative overflow-hidden">
      
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden" 
          onClick={closeSidebar}
        ></div>
      )}

      {/* 1. AGREGADO: "shrink-0" para evitar que el sidebar se encoja en pantallas de escritorio */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 shrink-0 bg-[var(--recal-blue)] dark:bg-slate-800 text-white flex flex-col shadow-xl 
        transform transition-transform duration-300 ease-in-out
        md:relative md:translate-x-0
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-6 text-center border-b border-blue-800 flex justify-between items-center md:block">
          <div>
            <img src="https://res.cloudinary.com/ddl8myqbt/image/upload/v1772806608/circle-logo-recal_ibfgo7.png" alt="Logo RECAL" className="w-12 h-12 inline-block rounded-full" />
          </div>
          <button onClick={closeSidebar} className="md:hidden text-blue-300 hover:text-white text-2xl font-bold">
            &times;
          </button>
        </div>
        
        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
        <div className='w-full items-center justify-center mb-4 flex'> 
          <BotonTema className="m-4 w-1.5 h-1.5 ms-auto me-0" /> 
        </div>
          <Link href="/dashboard" onClick={closeSidebar} className="block px-4 py-3 rounded-md hover:bg-[var(--recal-blue-hover)] transition-colors">
            📊 Resumen (Dashboard)
          </Link>
          <Link href="/dashboard/maquinaria" onClick={closeSidebar} className="block px-4 py-3 rounded-md hover:bg-[var(--recal-blue-hover)] transition-colors">
            🚜 Maquinaria y Equipo
          </Link>
          {(userArea === 'Seguridad' || userArea === 'Ambas') && (
          <Link href="/dashboard/fuerza-trabajo" onClick={closeSidebar} className="block px-4 py-3 rounded-md hover:bg-[var(--recal-blue-hover)] transition-colors">
            👷 Fuerza de Trabajo
          </Link>
          )}
          {(userArea === 'Seguridad' || userArea === 'Ambas') && (
          <Link href="/dashboard/actividades" onClick={closeSidebar} className="block px-4 py-3 rounded-md hover:bg-[var(--recal-blue-hover)] transition-colors">
            📋 Actividades
          </Link>
          )}
          {hasDc3Permission && (
            <Link href="/dashboard/catalogos" onClick={closeSidebar} className="block px-4 py-3 rounded-md hover:bg-[var(--recal-blue-hover)] transition-colors">
              📑 Catálogos
            </Link>
          )}
          <Link href="/dashboard/citas" onClick={closeSidebar} className="block px-4 py-3 rounded-md hover:bg-[var(--recal-blue-hover)] transition-colors">
            📅 Citas Dossier
          </Link>
          {userRol === 'Master' && (
            <Link href="/dashboard/usuarios" onClick={closeSidebar} className="block px-4 py-3 rounded-md hover:bg-[var(--recal-blue-hover)] transition-colors font-semibold text-purple-200">
              🛡️ Control de Accesos
            </Link>
          )}
        </nav>
      </aside>

      <div className="flex-1 flex flex-col w-full min-w-0">
        <header className="bg-white dark:bg-slate-800 shadow-sm border-b border-gray-200 z-10">
          <div className="flex justify-between items-center px-4 md:px-8 py-4">
            
            <div className="flex items-center">
              <button 
                onClick={() => setIsSidebarOpen(true)} 
                className="md:hidden mr-4 text-gray-600 hover:text-gray-900 focus:outline-none"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path>
                </svg>
              </button>
              
              <h1 className="text-lg md:text-xl font-semibold text-gray-700 dark:text-gray-300">
                {userName ? `Hola, ${userName.split(' ')[0]}` : 'Panel de Control'}
              </h1>
            </div>
            
            <button 
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="text-xs md:text-sm font-medium text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 px-3 md:px-4 py-2 rounded-md transition-colors"
            >
              {isLoggingOut ? 'Saliendo...' : 'Cerrar Sesión'}
            </button>
          </div>
        </header>

        {/* 2. MODIFICADO: Cambiamos "overflow-x-hidden" por "overflow-x-auto" */}
        <main className="flex-1 overflow-x-auto overflow-y-auto bg-[var(--recal-gray)] dark:bg-slate-700 p-4 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}