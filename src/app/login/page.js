"use client"; // Esencial para usar interactividad (useState, useRouter) en Next.js

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  
  // Estados para capturar la información del formulario
  const [correo, setCorreo] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Función que se ejecuta al darle clic al botón de entrar
  const handleSubmit = async (e) => {
    e.preventDefault(); // Evita que la página recargue
    setError('');
    setLoading(true);

    try {
      // Hacemos la petición POST a nuestra API de autenticación
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ correo, password })
      });

      const data = await res.json();

      if (!res.ok) {
        // Si el backend nos responde con error (ej. credenciales incorrectas)
        setError(data.error || "Ocurrió un error al iniciar sesión.");
        setLoading(false);
      } else {
        // Si todo es correcto, la API ya guardó la cookie. Solo nos falta redirigir al dashboard.
        router.push(data.redirectUrl);
      }
    } catch (err) {
      setError('Problema de conexión con el servidor.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900 px-4 transition-colors duration-500 relative overflow-hidden">
      
      {/* Background Decorativo Estilo Bento */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-[10%] -right-[5%] w-[40%] h-[40%] rounded-full bg-gradient-to-br from-blue-400/20 to-purple-500/20 blur-3xl dark:from-blue-600/20 dark:to-purple-900/20"></div>
        <div className="absolute -bottom-[10%] -left-[5%] w-[50%] h-[50%] rounded-full bg-gradient-to-tr from-indigo-400/20 to-cyan-400/20 blur-3xl dark:from-indigo-900/20 dark:to-cyan-900/20"></div>
      </div>

      <div className="max-w-md w-full relative z-10">
        <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-[2rem] shadow-2xl shadow-gray-200/50 dark:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.6)] border border-white/50 dark:border-slate-700/50 p-8 sm:p-10 animate-in slide-in-from-bottom-8 fade-in duration-700">
        
        <div className="text-center mb-8">
          <h2 className="flex flex-col items-center gap-4 mb-2">
            <a id="logo-header" href="/" className="flex flex-col items-center gap-2 group">
              <img 
                src="https://res.cloudinary.com/ddl8myqbt/image/upload/q_auto/f_auto/v1775844681/logo-obras-os-docs_rkur0u.png" 
                alt="ObrasOS - DOCS" 
                className="h-16 w-auto transition-transform group-hover:scale-105 duration-300"
              />
              <div className="flex flex-col items-center">
                <span className="text-2xl font-black text-[var(--recal-blue)] dark:text-blue-400 tracking-tighter leading-none">ObrasOS <span className="text-blue-500">- DOCS</span></span>
                <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-blue-600/50 dark:text-blue-300/50 mt-1">HSE Compliance</span>
              </div>
            </a>
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mt-2">Ingresa tus credenciales del sistema</p>
        </div>

        {/* Mostramos la caja de error si las credenciales fallan */}
        {error && (
          <div className="mb-4 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 text-red-700 dark:text-red-400 p-4 rounded">
            <p className="text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-1">
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 ml-1">Correo Electrónico</label>
            <input 
              type="email" 
              required
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              className="w-full bg-gray-50/50 dark:bg-slate-900/50 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 text-gray-900 dark:text-white placeholder-gray-400 px-4 py-3 outline-none transition-all"
              placeholder="tu@correo.com"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 ml-1">Contraseña</label>
            <input 
              type="password" 
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-gray-50/50 dark:bg-slate-900/50 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 text-gray-900 dark:text-white placeholder-gray-400 px-4 py-3 outline-none transition-all"
              placeholder="••••••••"
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className={`w-full flex justify-center py-3.5 px-4 border border-transparent rounded-xl shadow-lg text-sm font-black text-white transition-all transform hover:-translate-y-0.5
              ${loading ? 'bg-gray-400 dark:bg-slate-600 shadow-none cursor-not-allowed' : 'bg-gradient-to-r from-[var(--recal-blue)] to-blue-600 hover:from-blue-600 hover:to-indigo-600 shadow-blue-500/30 dark:shadow-blue-900/50'}`}
          >
            {loading ? 'INGRESANDO...' : 'ENTRAR AL SISTEMA'}
          </button>
        </form>

        {/* MODO DEMO HELPER */}
        <div className="mt-10 p-4 bg-indigo-50/50 dark:bg-indigo-900/20 rounded-2xl border border-indigo-100 dark:border-indigo-800/30 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
            <svg className="w-12 h-12 text-indigo-600" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14.5v-9l6 4.5-6 4.5z"/></svg>
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600 dark:text-indigo-400 mb-3 ml-1">Acceso Demo Gratuito</p>
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs bg-white/50 dark:bg-slate-900/50 p-2 rounded-lg border border-white dark:border-slate-800">
              <span className="text-gray-500 font-bold uppercase tracking-tighter">Usuario:</span>
              <span className="font-mono font-bold text-indigo-700 dark:text-indigo-300">demo@obrasos.com</span>
            </div>
            <div className="flex items-center justify-between text-xs bg-white/50 dark:bg-slate-900/50 p-2 rounded-lg border border-white dark:border-slate-800">
              <span className="text-gray-500 font-bold uppercase tracking-tighter">Password:</span>
              <span className="font-mono font-bold text-indigo-700 dark:text-indigo-300">demoObrasOS</span>
            </div>
          </div>
          <p className="mt-3 text-[10px] text-indigo-500/60 font-medium italic text-center">Navega y prueba todas las funciones del sistema.</p>
        </div>

      </div>
      </div>
    </div>
  );
}