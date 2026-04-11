"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowRight } from 'lucide-react';

export default function NavbarPublic() {
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const isHome = pathname === '/';

  return (
    <nav className={`fixed top-0 w-full z-50 transition-all duration-500 ${
      scrolled 
      ? 'bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl shadow-2xl shadow-blue-900/10 border-b border-white/20 dark:border-slate-800/50 py-3' 
      : 'bg-transparent py-5'
    }`}>
      <div className="max-w-7xl mx-auto px-6 flex justify-between items-center">
        {/* LOGO ObrasOS - DOCS */}
        <Link href="/" className="flex items-center gap-3 group">
          <img 
            src="https://res.cloudinary.com/ddl8myqbt/image/upload/q_auto/f_auto/v1775844681/logo-obras-os-docs_rkur0u.png" 
            alt="ObrasOS - DOCS" 
            className="h-10 w-auto transition-all"
          />
          <div className="flex flex-col text-left">
            <span className={`text-xl font-black tracking-tighter leading-none transition-colors ${scrolled ? 'text-[#145184] dark:text-white' : 'text-white'}`}>ObrasOS <span className="text-blue-500">- DOCS</span></span>
            <span className={`text-[9px] font-bold uppercase tracking-[0.3em] font-sans transition-colors ${scrolled ? 'text-blue-600' : 'text-blue-300'}`}>Control Documental</span>
          </div>
        </Link>
        
        {/* NAVEGACIÓN DIRECTA (Desktop) */}
        <div className="hidden md:flex items-center gap-8">
          {[
            { label: 'Módulos', href: '#modulos' },
            { label: 'SAAS', href: '#saas' },
            { label: 'Planes', href: '#precios' },
            { label: 'Demo', href: '#demo' },
          ].map((item) => (
            <Link 
              key={item.label}
              href={isHome ? item.href : `/${item.href}`}
              className={`text-xs font-black uppercase tracking-[0.2em] transition-all hover:text-blue-500 ${
                scrolled ? 'text-slate-600' : 'text-blue-100 hover:text-white'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-4">
          <Link 
            href="/login" 
            className="px-6 py-2.5 rounded-full bg-gradient-to-r from-[#145184] to-blue-600 text-white text-sm font-bold shadow-xl shadow-blue-500/20 hover:shadow-blue-500/50 hover:-translate-y-0.5 transition-all flex items-center gap-2 group border border-white/10"
          >
            <span className="hidden sm:inline">Acceso a Plataforma</span>
            <span className="sm:hidden">Acceso</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>
    </nav>
  );
}
