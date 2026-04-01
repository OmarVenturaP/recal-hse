"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, KeyRound } from 'lucide-react';

export default function CambiarPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validaciones front-end
    if (password.length < 8) {
      setError('La contraseña debe tener mínimo 8 caracteres.');
      return;
    }
    if (password !== confirmar) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/cambiar-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nueva_password: password })
      });
      
      const data = await res.json();

      if (data.success) {
        // En lugar de router.push, forzamos la recarga de la ventana para que el middleware lea la nueva cookie
        window.location.href = '/dashboard';
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Error de conexión con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900 px-4 transition-colors duration-500 relative overflow-hidden">
      
      {/* Background Decorativo Estilo Bento */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-[10%] -left-[5%] w-[40%] h-[40%] rounded-full bg-gradient-to-br from-indigo-400/20 to-blue-500/20 blur-3xl dark:from-indigo-600/20 dark:to-blue-900/20"></div>
        <div className="absolute -bottom-[10%] -right-[5%] w-[50%] h-[50%] rounded-full bg-gradient-to-tr from-purple-400/20 to-pink-400/20 blur-3xl dark:from-purple-900/20 dark:to-pink-900/20"></div>
      </div>

      <div className="max-w-md w-full relative z-10">
        <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-[2rem] shadow-2xl shadow-gray-200/50 dark:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.6)] border border-white/50 dark:border-slate-700/50 overflow-hidden animate-in slide-in-from-bottom-8 fade-in duration-700">
        
        {/* Cabecera Azul */}
        <div className="bg-gradient-to-br from-[var(--recal-blue)] to-blue-700 dark:from-slate-800 dark:to-slate-900 p-8 text-center border-b border-indigo-500/30 dark:border-slate-700/50">
          <div className="w-16 h-16 bg-white dark:bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-lg shadow-black/20">
            <ShieldCheck className="w-8 h-8 text-[var(--recal-blue)] dark:text-blue-400" />
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight">Actualiza tu Acceso</h2>
          <p className="text-blue-100/80 dark:text-gray-400 text-sm mt-2 font-medium">Por seguridad, debes cambiar tu contraseña inicial</p>
        </div>

        {/* Formulario */}
        <div className="p-8">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 text-red-700 dark:text-red-400 p-4 mb-6 text-sm" role="alert">
              <p className="font-bold">Error</p>
              <p>{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-1">
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 ml-1">Nueva Contraseña</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <KeyRound className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                </div>
                <input 
                  type="password" 
                  required 
                  className="w-full pl-12 pr-4 py-3 bg-gray-50/50 dark:bg-slate-900/50 border border-gray-200 dark:border-slate-700 dark:text-white rounded-xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all placeholder-gray-400 dark:placeholder-gray-500"
                  placeholder="Mínimo 8 caracteres"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 ml-1">Confirmar Contraseña</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <KeyRound className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                </div>
                <input 
                  type="password" 
                  required 
                  className="w-full pl-12 pr-4 py-3 bg-gray-50/50 dark:bg-slate-900/50 border border-gray-200 dark:border-slate-700 dark:text-white rounded-xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all placeholder-gray-400 dark:placeholder-gray-500"
                  placeholder="Repite tu contraseña"
                  value={confirmar}
                  onChange={(e) => setConfirmar(e.target.value)}
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className={`w-full flex justify-center py-3.5 px-4 mt-2 border border-transparent rounded-xl shadow-lg text-sm font-black text-white transition-all transform hover:-translate-y-0.5
              ${loading ? 'bg-gray-400 dark:bg-slate-600 shadow-none cursor-not-allowed' : 'bg-gradient-to-r from-[var(--recal-blue)] to-blue-600 hover:from-blue-600 hover:to-indigo-600 shadow-blue-500/30 dark:shadow-blue-900/50'}`}
            >
              {loading ? 'GUARDANDO...' : 'GUARDAR Y ENTRAR AL SISTEMA'}
            </button>
          </form>
        </div>
        </div>
      </div>
    </div>
  );
}