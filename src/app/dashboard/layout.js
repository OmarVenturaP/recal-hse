"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import BotonTema from '@/components/BotonTema';

export default function DashboardLayout({ children }) {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  
  // NUEVO ESTADO: Controla si el menú lateral está abierto en celulares
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [userRol, setUserRol] = useState(null);
  const [userName, setUserName] = useState('');

  // Función para cerrar sesión (manual o por inactividad)
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

  // Temporizador de inactividad (15 minutos)
useEffect(() => {
    // NUEVO: Preguntamos quién está logeado
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setUserRol(data.user.rol);
          setUserName(data.user.nombre);
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

  // Función auxiliar para cerrar el menú en celular al hacer clic en un enlace
  const closeSidebar = () => setIsSidebarOpen(false);

  return (
    <div className="flex h-screen bg-[var(--recal-gray)] dark:bg-slate-800 relative overflow-hidden">
      
      {/* CAPA OSCURA (Overlay): Aparece en celular cuando el menú está abierto */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden" 
          onClick={closeSidebar}
        ></div>
      )}

      {/* MENÚ LATERAL (Sidebar) */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-[var(--recal-blue)] dark:bg-slate-800 text-white flex flex-col shadow-xl 
        transform transition-transform duration-300 ease-in-out
        md:relative md:translate-x-0
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-6 text-center border-b border-blue-800 flex justify-between items-center md:block">
          <div>
            <img src="https://res.cloudinary.com/ddl8myqbt/image/upload/v1772806608/circle-logo-recal_ibfgo7.png" alt="Logo RECAL" className="w-12 h-12 inline-block rounded-full" />
          </div>
          {/* Botón para cerrar el menú (solo visible en celular) */}
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
          {/* 
          <Link href="/dashboard/agenda" onClick={closeSidebar} className="block px-4 py-3 rounded-md hover:bg-[var(--recal-blue-hover)] transition-colors">
            📅 Agenda de Citas
          </Link>
          <Link href="/dashboard/revisiones" onClick={closeSidebar} className="block px-4 py-3 rounded-md hover:bg-[var(--recal-blue-hover)] transition-colors">
            📑 Revisiones Dossier
          </Link>
        */}
          <Link href="/dashboard/maquinaria" onClick={closeSidebar} className="block px-4 py-3 rounded-md hover:bg-[var(--recal-blue-hover)] transition-colors">
            🚜 Maquinaria y Equipo
          </Link>
          <Link href="/dashboard/fuerza-trabajo" onClick={closeSidebar} className="block px-4 py-3 rounded-md hover:bg-[var(--recal-blue-hover)] transition-colors">
            👷 Fuerza de Trabajo
          </Link>
          <Link href="/dashboard/actividades" onClick={closeSidebar} className="block px-4 py-3 rounded-md hover:bg-[var(--recal-blue-hover)] transition-colors">
            � Actividades
          </Link>
          {userRol === 'Master' && (
            <Link href="/dashboard/usuarios" onClick={closeSidebar} className="block px-4 py-3 rounded-md hover:bg-[var(--recal-blue-hover)] transition-colors font-semibold text-purple-200">
              🛡️ Control de Accesos
            </Link>
          )}
        </nav>
      </aside>

      {/* CONTENIDO PRINCIPAL */}
      <div className="flex-1 flex flex-col w-full">
        {/* Barra Superior (Header) */}
        <header className="bg-white dark:bg-slate-800 shadow-sm border-b border-gray-200 z-10">
          <div className="flex justify-between items-center px-4 md:px-8 py-4">
            
            <div className="flex items-center">
              {/* BOTÓN HAMBURGUESA (Solo visible en celular) */}
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

        {/* CONTENEDOR DE LAS PÁGINAS */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-[var(--recal-gray)] dark:bg-slate-700 p-4 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}