import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Navbar */}
      <nav className="bg-white shadow-md w-full z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            {/* Logo */}
            <div className="flex-shrink-0 flex items-center pr-2">
              <span className="text-lg sm:text-xl md:text-2xl font-bold text-blue-900 leading-tight">
                RECAL ESTRUCTURAS
              </span>
            </div>
            {/* Botón */}
            <div>
              <Link 
                href="/login" 
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 sm:px-6 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap"
              >
                Iniciar Sesión
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="flex-grow flex items-center justify-center relative overflow-hidden py-16 sm:py-0">
        {/* Fondo y Overlay */}
        <div className="absolute inset-0 bg-slate-800 opacity-90 z-0"></div>
        <img 
          src="https://recalglobal.com/wp-content/uploads/2024/06/DJI_0547-Edit.jpg" 
          alt="Imagen de fondo" 
          className="absolute inset-0 w-full h-full object-cover opacity-20 z-0"
        />
        
        {/* Contenido Principal */}
        <div className="relative z-10 text-center px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white tracking-tight mb-4">
            Sistema de Gestión de Seguridad <br className="hidden sm:block" /> y Medio Ambiente
          </h1>
          <p className="mt-4 text-base sm:text-lg md:text-xl text-gray-300 max-w-3xl mx-auto">
            Gestión de maquinaria y fuerza de trabajo.
          </p>
        </div>
      </main>
    </div>
  );
}