"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginDemoPage() {
  const router = useRouter();
  
  // PRE-LLENADO DE CREDENCIALES PARA MODO DEMO
  const [correo, setCorreo] = useState('demo@obrasos.com');
  const [password, setPassword] = useState('demoObrasOS');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ correo, password })
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Ocurrió un error al iniciar sesión.");
        setLoading(false);
      } else {
        router.push(data.redirectUrl);
      }
    } catch (err) {
      setError('Problema de conexión con el servidor.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 px-4 relative overflow-hidden font-sans">
      
      {/* Fondo Especial Modo Demo: Estética Premium con Gradientes Animados */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-indigo-600/20 blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-blue-600/20 blur-[120px] animate-pulse"></div>
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-10"></div>
      </div>

      <div className="max-w-md w-full relative z-10">
        <div className="bg-slate-800/60 backdrop-blur-2xl rounded-[3rem] shadow-[0_0_80px_rgba(37,99,235,0.15)] border border-white/10 p-8 sm:p-10 animate-in zoom-in-95 duration-700">
        
        {/* Badge de Modo Demo */}
        <div className="flex justify-center mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-[10px] font-black tracking-[0.2em] uppercase">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
            </span>
            Entorno de Prueba Activo
          </div>
        </div>

        <div className="text-center mb-8">
          <div className="flex flex-col items-center gap-4 mb-2">
            <a href="/" className="flex flex-col items-center gap-2 group">
              <img 
                src="https://res.cloudinary.com/ddl8myqbt/image/upload/q_auto/f_auto/v1775844681/logo-obras-os-docs_rkur0u.png" 
                alt="ObrasOS - DOCS" 
                className="h-20 w-auto drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]"
              />
              <div className="flex flex-col items-center">
                <span className="text-3xl font-black text-white tracking-tighter leading-none">ObrasOS <span className="text-blue-500">Demo</span></span>
                <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-blue-400 mt-2">Experiencia Completa</span>
              </div>
            </a>
          </div>
          <p className="text-slate-400 mt-4 text-sm font-medium">Hemos cargado las credenciales por ti.<br/>Bienvenido a la demostración interactiva.</p>
        </div>

        {error && (
          <div className="mb-6 bg-red-900/30 border-l-4 border-red-500 text-red-400 p-4 rounded-xl backdrop-blur-md animate-shake">
            <p className="text-xs font-bold">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">E-mail Demo</label>
            <div className="relative group">
              <input 
                type="email" 
                readOnly
                value={correo}
                className="w-full bg-slate-900/50 rounded-2xl border border-slate-700 text-white px-5 py-4 outline-none focus:border-blue-500 transition-all font-bold cursor-default"
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2">
                <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Password Demo</label>
            <div className="relative group">
              <input 
                type="password" 
                readOnly
                value={password}
                className="w-full bg-slate-900/50 rounded-2xl border border-slate-700 text-white px-5 py-4 outline-none focus:border-blue-500 transition-all font-bold cursor-default"
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2">
                <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
              </div>
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className={`w-full flex justify-center py-5 px-4 rounded-2xl shadow-[0_10px_30px_rgba(37,99,235,0.3)] text-xs font-black text-white transition-all transform hover:-translate-y-1 active:scale-95 uppercase tracking-[0.2em] relative overflow-hidden group
              ${loading ? 'bg-slate-700 cursor-not-allowed' : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-blue-500/40'}`}
          >
            <span className="relative z-10">{loading ? 'CONECTANDO...' : 'COMENZAR EXPERIENCIA DEMO'}</span>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-shimmer"></div>
          </button>
        </form>

        <div className="mt-8 text-center">
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
            ¿Buscas tu cuenta real? 
            <a href="https://docs.obras-os.com/login" className="ml-2 text-blue-400 hover:text-white transition-colors border-b border-blue-400/30">Acceso Estándar</a>
          </p>
        </div>

      </div>
      </div>
    </div>
  );
}
