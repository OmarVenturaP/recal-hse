import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Navbar */}
      <nav className="bg-white shadow-md w-full z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex-shrink-0 flex items-center">
              <span className="text-2xl font-bold text-blue-900">RECAL HSE</span>
            </div>
            <div>
              <Link 
                href="/login" 
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Iniciar Sesión
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="flex-grow flex items-center justify-center relative overflow-hidden">
        {/* Aquí iría tu imagen de fondo real más adelante */}
        <div className="absolute inset-0 bg-slate-800 opacity-90 z-0"></div>
        [Image of construction site worker with safety helmet and vest on a bridge construction]
        
        <div className="relative z-10 text-center px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight mb-4">
            Sistema de Gestión de Seguridad y Medio Ambiente
          </h1>
          <p className="mt-4 text-xl text-gray-300 max-w-3xl mx-auto">
            Control de liberaciones, gestión de maquinaria y fuerza de trabajo para el proyecto de la Línea K.
          </p>
        </div>
      </main>
    </div>
  );
}