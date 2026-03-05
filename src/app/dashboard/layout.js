"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function DashboardLayout({ children }) {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

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

  // Temporizador de inactividad (15 minutos = 900,000 milisegundos)
  useEffect(() => {
    let timeoutId;

    const resetTimer = () => {
      clearTimeout(timeoutId);
      // Configuramos el cierre automático a los 15 minutos de no tocar nada
      timeoutId = setTimeout(handleLogout, 15 * 60 * 1000); 
    };

    // Escuchamos cualquier movimiento del usuario
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach(event => document.addEventListener(event, resetTimer));

    // Iniciamos el temporizador por primera vez
    resetTimer();

    // Limpiamos los eventos si el usuario sale del componente
    return () => {
      clearTimeout(timeoutId);
      events.forEach(event => document.removeEventListener(event, resetTimer));
    };
  }, []);

  return (
    <div className="flex h-screen bg-[var(--recal-gray)]">
      {/* Menú Lateral (Sidebar) con Azul RECAL */}
      <aside className="w-64 bg-[var(--recal-blue)] text-white flex flex-col shadow-xl">
        <div className="p-6 text-center border-b border-blue-800">
          <h2 className="text-2xl font-bold tracking-wider">RECAL HSE</h2>
          <p className="text-xs text-blue-300 mt-1">Línea K - Interoceánico</p>
        </div>
        
        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          <Link href="/dashboard" className="block px-4 py-3 rounded-md hover:bg-[var(--recal-blue-hover)] transition-colors">
            📊 Resumen (Dashboard)
          </Link>
          <Link href="/dashboard/agenda" className="block px-4 py-3 rounded-md hover:bg-[var(--recal-blue-hover)] transition-colors">
            📅 Agenda de Citas
          </Link>
          <Link href="/dashboard/revisiones" className="block px-4 py-3 rounded-md hover:bg-[var(--recal-blue-hover)] transition-colors">
            📑 Revisiones Dossier
          </Link>
          <Link href="/dashboard/maquinaria" className="block px-4 py-3 rounded-md hover:bg-[var(--recal-blue-hover)] transition-colors">
            🚜 Maquinaria y Equipo
          </Link>
          <Link href="/dashboard/fuerza-trabajo" className="block px-4 py-3 rounded-md hover:bg-[var(--recal-blue-hover)] transition-colors">
            👷 Fuerza de Trabajo
          </Link>
        </nav>
      </aside>

      {/* Contenido Principal */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Barra Superior (Header) */}
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="flex justify-between items-center px-8 py-4">
            <h1 className="text-xl font-semibold text-gray-700">Panel de Control</h1>
            
            <button 
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="text-sm font-medium text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 px-4 py-2 rounded-md transition-colors"
            >
              {isLoggingOut ? 'Saliendo...' : 'Cerrar Sesión'}
            </button>
          </div>
        </header>

        {/* Aquí es donde se inyectará el contenido de cada página (page.js) */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-[var(--recal-gray)] p-8">
          {children}
        </main>
      </div>
    </div>
  );
}