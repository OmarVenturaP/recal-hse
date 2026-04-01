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
          {/* Título con el azul corporativo */}
          <h2 className="text-3xl font-extrabold text-[var(--recal-blue)] dark:text-blue-400">
            <a id="logo-header" className="" href="/" target="_blank" rel="noopener noreferrer">
                <svg className="h-6 sm:h-8 mx-auto w-auto" viewBox="0 0 133 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path 
                    fillRule="evenodd" 
                    clipRule="evenodd" 
                    d="M91.3026 23.6373L95.4886 14.5319L99.5524 23.6373H107.179L95.2564 0L83.5294 23.6373H91.3026ZM70.0258 8.42992C72.6168 8.42992 74.7923 9.50545 76.5584 11.6565V2.56337C75.3179 2.04394 74.1262 1.65895 73.0018 1.41451C71.8774 1.17007 70.7285 1.04785 69.5613 1.04785C67.5142 1.04785 65.5525 1.43284 63.6887 2.19672C61.8187 2.96059 60.181 4.0239 58.7693 5.38665C57.3577 6.74329 56.2333 8.36881 55.39 10.2449C54.5467 12.1271 54.125 14.1926 54.125 16.4475C54.125 18.7025 54.5528 20.7802 55.4083 22.6868C56.2638 24.5935 57.4005 26.2373 58.8121 27.6245C60.2299 29.0117 61.8615 30.0872 63.7131 30.8511C65.5648 31.615 67.5019 32 69.5247 32C70.5085 32 71.5107 31.9022 72.5191 31.7066C73.5274 31.5172 74.6151 31.2117 75.7823 30.7961L76.5584 30.5211V21.5013C74.6151 23.5729 72.4274 24.6118 69.9891 24.6118C68.8769 24.6118 67.838 24.404 66.8786 23.9885C65.9192 23.5729 65.0881 23.0046 64.3731 22.2774C63.6581 21.5502 63.102 20.6947 62.6987 19.7108C62.2954 18.7269 62.0937 17.6269 62.0937 16.4842C62.0937 15.3414 62.2954 14.2781 62.6987 13.2943C63.0959 12.3104 63.6459 11.461 64.3487 10.746C65.0453 10.031 65.8825 9.46878 66.8542 9.05324C67.8319 8.63769 68.883 8.42992 70.0258 8.42992ZM24.977 31.3783H24.9878L24.9817 31.3844L24.977 31.3783ZM15.5402 19.0708L24.977 31.3783H15.2652L7.89539 19.8224H7.81594V31.3783H0V1.33671H11.6781C17.618 1.33671 22.1156 4.1661 22.1156 10.5826C22.1156 14.7259 19.8057 18.313 15.5402 19.0708ZM8.5676 14.8053H7.80983V7.31325H8.5676C11.122 7.31325 13.988 7.78991 13.988 11.0593C13.988 14.3287 11.1159 14.8053 8.5676 14.8053ZM38.2689 7.9488V12.972H47.3437V19.5841H38.2689V24.7662H48.1504V31.3783H30.4591V1.33671H48.1504V7.9488H38.2689ZM132.088 24.7664H122.726V1.33691H114.916V31.3785H132.088V24.7664ZM79.6953 31.3829L82.4147 25.9014H108.319L111.094 31.3829H79.6953Z" 
                    className="fill-[var(--recal-blue)] dark:fill-white"
                  ></path>
                </svg>
                <span className="sr-only">Logo RECAL</span>
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

      </div>
      </div>
    </div>
  );
}