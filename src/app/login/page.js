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
    <div className="min-h-screen flex items-center justify-center bg-[var(--recal-gray)] px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-xl p-8 border-t-4 border-[var(--recal-blue)]">
        
        <div className="text-center mb-8">
          {/* Título con el azul corporativo */}
          <h2 className="text-3xl font-extrabold text-[var(--recal-blue)]">
            <img src="https://res.cloudinary.com/ddl8myqbt/image/upload/v1772806384/recal-logo_ja7x2g.png" alt="Logo RECAL" className="w-25 h-08 inline-block mr-2" />
          </h2>
          <p className="text-gray-500 mt-2">Ingresa tus credenciales del sistema</p>
        </div>

        {/* Mostramos la caja de error si las credenciales fallan */}
        {error && (
          <div className="mb-4 bg-red-50 border-l-4 border-red-500 p-4 rounded">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700">Correo</label>
            <input 
              type="email" 
              required
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[var(--recal-blue)] focus:ring-[var(--recal-blue)] px-4 py-2 border outline-none transition-colors"
              placeholder="correo@recalhse.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Contraseña</label>
            <input 
              type="password" 
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[var(--recal-blue)] focus:ring-[var(--recal-blue)] px-4 py-2 border outline-none transition-colors"
              placeholder="••••••••"
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            // Aplicamos el azul de RECAL al botón
            className={`w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-bold text-white transition-colors
              ${loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-[var(--recal-blue)] hover:bg-[var(--recal-blue-hover)]'}`}
          >
            {loading ? 'Verificando...' : 'Entrar al Dashboard'}
          </button>
        </form>

      </div>
    </div>
  );
}