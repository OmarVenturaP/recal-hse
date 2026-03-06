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
    <div className="min-h-screen flex items-center justify-center bg-[var(--recal-gray)] p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-xl overflow-hidden border border-gray-200">
        
        {/* Cabecera Azul */}
        <div className="bg-[var(--recal-blue)] p-6 text-center">
          <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner">
            <ShieldCheck className="w-8 h-8 text-[var(--recal-blue)]" />
          </div>
          <h2 className="text-2xl font-bold text-white">Actualiza tu Acceso</h2>
          <p className="text-blue-200 text-sm mt-1">Por seguridad, debes cambiar tu contraseña inicial</p>
        </div>

        {/* Formulario */}
        <div className="p-8">
          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 mb-6 text-sm" role="alert">
              <p className="font-bold">Error</p>
              <p>{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nueva Contraseña</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <KeyRound className="h-5 w-5 text-gray-400" />
                </div>
                <input 
                  type="password" 
                  required 
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--recal-blue)] focus:border-transparent transition-all"
                  placeholder="Mínimo 8 caracteres"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar Contraseña</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <KeyRound className="h-5 w-5 text-gray-400" />
                </div>
                <input 
                  type="password" 
                  required 
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--recal-blue)] focus:border-transparent transition-all"
                  placeholder="Repite tu contraseña"
                  value={confirmar}
                  onChange={(e) => setConfirmar(e.target.value)}
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-[var(--recal-blue)] hover:bg-[var(--recal-blue-hover)] text-white font-bold py-3 px-4 rounded-lg focus:outline-none focus:shadow-outline transition-colors disabled:bg-gray-400"
            >
              {loading ? 'Guardando...' : 'Guardar y Entrar al Sistema'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}