import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-slate-900 transition-colors duration-500">
      {/* Navbar con Glassmorphism */}
      <nav className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl shadow-lg shadow-gray-200/20 dark:shadow-black/50 w-full z-50 fixed top-0 border-b border-white/50 dark:border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            
            {/* Logo RECAL SVG */}
            <div className="flex-shrink-0 flex items-center pr-2">
              <a id="logo-header" className="flex items-center" href="/" target="_blank" rel="noopener noreferrer">
                <svg className="h-6 sm:h-8 w-auto" viewBox="0 0 133 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path 
                    fillRule="evenodd" 
                    clipRule="evenodd" 
                    d="M91.3026 23.6373L95.4886 14.5319L99.5524 23.6373H107.179L95.2564 0L83.5294 23.6373H91.3026ZM70.0258 8.42992C72.6168 8.42992 74.7923 9.50545 76.5584 11.6565V2.56337C75.3179 2.04394 74.1262 1.65895 73.0018 1.41451C71.8774 1.17007 70.7285 1.04785 69.5613 1.04785C67.5142 1.04785 65.5525 1.43284 63.6887 2.19672C61.8187 2.96059 60.181 4.0239 58.7693 5.38665C57.3577 6.74329 56.2333 8.36881 55.39 10.2449C54.5467 12.1271 54.125 14.1926 54.125 16.4475C54.125 18.7025 54.5528 20.7802 55.4083 22.6868C56.2638 24.5935 57.4005 26.2373 58.8121 27.6245C60.2299 29.0117 61.8615 30.0872 63.7131 30.8511C65.5648 31.615 67.5019 32 69.5247 32C70.5085 32 71.5107 31.9022 72.5191 31.7066C73.5274 31.5172 74.6151 31.2117 75.7823 30.7961L76.5584 30.5211V21.5013C74.6151 23.5729 72.4274 24.6118 69.9891 24.6118C68.8769 24.6118 67.838 24.404 66.8786 23.9885C65.9192 23.5729 65.0881 23.0046 64.3731 22.2774C63.6581 21.5502 63.102 20.6947 62.6987 19.7108C62.2954 18.7269 62.0937 17.6269 62.0937 16.4842C62.0937 15.3414 62.2954 14.2781 62.6987 13.2943C63.0959 12.3104 63.6459 11.461 64.3487 10.746C65.0453 10.031 65.8825 9.46878 66.8542 9.05324C67.8319 8.63769 68.883 8.42992 70.0258 8.42992ZM24.977 31.3783H24.9878L24.9817 31.3844L24.977 31.3783ZM15.5402 19.0708L24.977 31.3783H15.2652L7.89539 19.8224H7.81594V31.3783H0V1.33671H11.6781C17.618 1.33671 22.1156 4.1661 22.1156 10.5826C22.1156 14.7259 19.8057 18.313 15.5402 19.0708ZM8.5676 14.8053H7.80983V7.31325H8.5676C11.122 7.31325 13.988 7.78991 13.988 11.0593C13.988 14.3287 11.1159 14.8053 8.5676 14.8053ZM38.2689 7.9488V12.972H47.3437V19.5841H38.2689V24.7662H48.1504V31.3783H30.4591V1.33671H48.1504V7.9488H38.2689ZM132.088 24.7664H122.726V1.33691H114.916V31.3785H132.088V24.7664ZM79.6953 31.3829L82.4147 25.9014H108.319L111.094 31.3829H79.6953Z" 
                    fill="#145184"
                  ></path>
                </svg>
                <span className="sr-only">Logo RECAL</span>
              </a>
            </div>

            {/* Botón */}
            <div>
              <Link 
                href="/login" 
                className="bg-gradient-to-r from-[var(--recal-blue)] to-blue-600 hover:from-blue-600 hover:to-indigo-600 shadow-lg shadow-blue-500/30 text-white px-5 sm:px-8 py-2.5 rounded-full text-sm font-bold transition-all whitespace-nowrap transform hover:-translate-y-0.5"
              >
                Iniciar Sesión
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section con Bento Box Central */}
      <main className="flex-grow flex items-center justify-center relative overflow-hidden py-24 sm:py-0 mt-16 sm:mt-0">
        {/* Fondo y Overlay */}
        <div className="absolute inset-0 bg-slate-900 z-0"></div>
        <video
          className="absolute inset-0 w-full h-full object-cover opacity-60 z-[1] pointer-events-none"
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          src="https://player.vimeo.com/progressive_redirect/playback/875298048/rendition/720p/file.mp4?loc=external&amp;signature=7d01d05d64fd98a22f1829265aa70f7a2364d9e9f406f373683cf43b5b3b14e2"
        ></video>
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 via-blue-800/20 to-slate-900/90 z-[2] mix-blend-multiply"></div>
        
        {/* Contenedor Bento Central */}
        <div className="relative z-10 text-center px-4 sm:px-6 lg:px-8 max-w-4xl w-full animate-in fade-in zoom-in duration-700">
          <div className="bg-white/10 dark:bg-slate-900/40 backdrop-blur-2xl border border-white/20 p-8 md:p-12 lg:p-16 rounded-[2.5rem] shadow-2xl shadow-black/50">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-blue-200 text-xs font-bold tracking-widest mb-6 uppercase">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
              </span>
              Plataforma Administrativa
            </div>
            
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-blue-100 to-indigo-200 tracking-tight mb-6 leading-tight flex flex-col drop-shadow-sm">
              <span>Sistema de Gestión</span>
              <span>Seguridad y Medio Ambiente</span>
            </h1>
            
            <p className="mt-4 text-base sm:text-lg md:text-xl text-blue-100/80 max-w-2xl mx-auto font-light leading-relaxed">
              Ingresa para gestionar personal, maquinaria, subcontratistas y reportes.
            </p>
            
            <div className="mt-10 flex justify-center">
              <Link href="/login" className="bg-white text-[var(--recal-blue)] hover:bg-gray-100 px-8 py-3.5 rounded-full font-bold shadow-xl shadow-white/10 hover:shadow-white/20 transition-all flex items-center gap-2 group">
                Acceder al Sistema
                <span className="group-hover:translate-x-1 transition-transform">→</span>
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}