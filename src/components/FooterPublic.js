"use client";

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function FooterPublic() {
  const [year, setYear] = useState(new Date().getFullYear());

  useEffect(() => {
    setYear(new Date().getFullYear());
  }, []);
  return (
    <footer className="bg-white dark:bg-slate-950 pt-32 pb-16 border-t border-slate-200 dark:border-slate-900">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-16 mb-24">
          <div className="max-w-xl">
            <div className="flex items-center gap-3 mb-10">
              <img 
                src="https://res.cloudinary.com/ddl8myqbt/image/upload/q_auto/f_auto/v1775844681/logo-obras-os-docs_rkur0u.png" 
                alt="ObrasOS - DOCS" 
                className="h-12 w-auto"
              />
              <span className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter leading-none whitespace-nowrap">ObrasOS <span className="text-blue-500">- DOCS</span></span>
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-lg font-bold leading-relaxed mb-10">Digitalización estratégica y cumplimiento normativo para los estándares de RECAL ESTRUCTURAS.</p>
            <div className="flex gap-4">
              <Link href="/login" className="px-8 py-3 rounded-2xl bg-[#145184] text-white text-sm font-black uppercase tracking-widest shadow-xl shadow-blue-900/20 hover:-translate-y-1 transition-all">Acceso Plataforma</Link>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-x-16 gap-y-10">
            <div>
              <h6 className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-[0.3em] mb-6 border-b border-slate-200 dark:border-slate-800 pb-2">Soluciones</h6>
              <ul className="space-y-4">
                <li><Link href="/login" className="text-slate-400 hover:text-blue-500 font-bold text-xs uppercase tracking-widest transition-colors">Fuerza de Trabajo</Link></li>
                <li><Link href="/login" className="text-slate-400 hover:text-blue-500 font-bold text-xs uppercase tracking-widest transition-colors">Maquinaria</Link></li>
                <li><Link href="/login" className="text-slate-400 hover:text-blue-500 font-bold text-xs uppercase tracking-widest transition-colors">Reportes HSE</Link></li>
              </ul>
            </div>
            <div>
              <h6 className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-[0.3em] mb-6 border-b border-slate-200 dark:border-slate-800 pb-2">Entorno</h6>
              <ul className="space-y-4">
                <li><Link href="/terminos" className="text-slate-400 hover:text-blue-500 font-bold text-xs uppercase tracking-widest transition-colors">Términos</Link></li>
                <li><Link href="/privacidad" className="text-slate-400 hover:text-blue-500 font-bold text-xs uppercase tracking-widest transition-colors">Privacidad</Link></li>
                <li>
                  <a href="https://wa.me/529619326182" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-blue-500 font-bold text-xs uppercase tracking-widest group text-left">
                    Soporte
                    <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>
        <div className="border-t border-slate-100 dark:border-slate-900 pt-16 flex flex-col md:flex-row justify-between items-center gap-8 text-center md:text-left">
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.4em] font-sans" suppressHydrationWarning>© {year} ObrasOS</span>
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] flex items-center gap-2">
            CREADO POR 
            <a href="https://servitec-tonala.es" target="_blank" rel="noopener noreferrer" className="text-[10px] font-black text-slate-500 dark:text-slate-300 hover:text-[#4CFDFD] hover:drop-shadow-[0_0_8px_rgba(76,253,253,0.5)] transition-all duration-300 tracking-[0.4em]">
              SERVITEC
            </a>
          </span>
          <div className="flex gap-10">
            <span className="text-[9px] font-black text-blue-500/50 uppercase tracking-[0.3em]"><a href="https://docs.obras-os.com">ObrasOS</a></span>
            <span className="text-[9px] font-black text-slate-400/50 uppercase tracking-[0.3em]">CONTROL DOCUMENTAL</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
