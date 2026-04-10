"use client";

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import NavbarPublic from '@/components/NavbarPublic';
import FooterPublic from '@/components/FooterPublic';
import { 
  Tractor, 
  Users, 
  FileBarChart, 
  ChevronRight, 
  ArrowRight,
  ClipboardCheck,
  Stethoscope,
  Layers,
  LayoutDashboard,
  ShieldAlert,
  Zap,
  Phone,
  Check,
  ShieldCheck
} from 'lucide-react';

// ── COMPONENTE REVEAL (Estilo ObrasOS) ──
const Reveal = ({ children, delay = 0, className = "" }) => {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setTimeout(() => setIsVisible(true), delay);
      }
    }, { threshold: 0.1 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [delay]);

  return (
    <div 
      ref={ref} 
      className={`transition-all duration-1000 ease-out ${className} ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}
    >
      {children}
    </div>
  );
};

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);
  const videoRef = useRef(null);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    
    if (videoRef.current) {
      videoRef.current.playbackRate = 0.8;
    }

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToModules = (e) => {
    e.preventDefault();
    const element = document.getElementById('modulos');
    if (element) {
      const offset = 80;
      const bodyRect = document.body.getBoundingClientRect().top;
      const elementRect = element.getBoundingClientRect().top;
      const elementPosition = elementRect - bodyRect;
      const offsetPosition = elementPosition - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 transition-colors duration-500 font-sans selection:bg-blue-500/30 overflow-x-hidden">
      
      {/* ── Capa de Grano (Grain Overlay) ── */}
      <div className="fixed inset-0 pointer-events-none z-[100] opacity-[0.03] bg-[url('https://www.transparenttextures.com/patterns/stardust.png')]" />

      <NavbarPublic />

      {/* 2. HERO SECTION CON IMAGEN DINÁMICA */}
      <header className="relative h-screen flex items-center justify-center overflow-hidden group">
        {/* IMAGE BACKGROUND CON OVERLAY */}
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-slate-950/40 z-10 backdrop-grayscale-[0.2]"></div>
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-slate-950/80 z-[11]"></div>
          <div 
            className="w-full h-full bg-cover bg-center group-hover:scale-110 transition-transform duration-[15s] ease-out opacity-60 dark:opacity-40"
            style={{ backgroundImage: "url('https://res.cloudinary.com/ddl8myqbt/image/upload/q_auto/f_auto/v1775850375/hero_ut795r.png')" }}
          />
        </div>

        {/* Background Grid */}
        <div className="absolute inset-0 dark:bg-grid-white/[0.05] bg-grid-slate-900/[0.04] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] z-[12]" />
        
        {/* Accent Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-500/10 rounded-full blur-[120px] pointer-events-none z-[13]" />

        {/* HERO CONTENT - BENTO GLASS BOX */}
        <div className="relative z-20 text-center px-6 max-w-5xl">
          <Reveal>
            <div className="bg-white/10 dark:bg-black/20 backdrop-blur-2xl border border-white/20 p-8 md:p-16 lg:p-20 rounded-[3rem] shadow-[-10px_20px_60px_-15px_rgba(0,0,0,0.5)] border-t-white/30 border-l-white/30">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-blue-200 text-[10px] font-black tracking-[0.2em] mb-8 uppercase">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                </span>
                Gestión Documental y Cumplimiento Normativo RECAL
              </div>
              
              <h1 className="text-4xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white via-white to-blue-100 tracking-tighter leading-[0.9] mb-8 drop-shadow-2xl">
                Sistema de Gestión <br/> <span className="text-red-500/60 transition-opacity hover:opacity-100 duration-500">Seguridad</span> y <span className="text-emerald-400/60 transition-opacity hover:opacity-100 duration-500">Medio Ambiente</span>
              </h1>

              <p className="text-lg md:text-xl text-blue-100/70 max-w-2xl mx-auto font-medium leading-relaxed mb-12">
                Estandarización y control estratégico de fuerza de trabajo, maquinaria y reportes técnicos alineados a los requerimientos oficiales de RECAL.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <button 
                  onClick={scrollToModules}
                  className="w-full sm:w-auto px-10 py-4 rounded-2xl bg-white text-slate-900 text-lg font-black shadow-2xl hover:bg-blue-50 transition-all flex items-center justify-center gap-2 group transform active:scale-95"
                >
                  <span className="hidden md:inline">Explorar los </span> Módulos
                  <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>
          </Reveal>
        </div>

        {/* SCROLL INDICATOR */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-20 animate-bounce cursor-pointer opacity-50 hover:opacity-100 transition-opacity" onClick={scrollToModules}>
          <div className="w-6 h-10 rounded-full border border-white/30 flex items-start justify-center p-2">
            <div className="w-1 h-2 bg-white rounded-full"></div>
          </div>
        </div>
      </header>

      {/* ── MARQUEE INDUSTRIAL (Estilo ObrasOS) ── */}
      <div className="border-t border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 py-6 overflow-hidden relative group z-30">
        <div className="flex animate-marquee whitespace-nowrap min-w-full">
           {Array(4).fill([
             'Control de Fuerza de Trabajo', 'Gestión de Maquinaria', 
             'Gestion de Certificados Médicos', 'Reportes Automáticos', 'Aislamiento Multi-Empresa',
           ]).flat().map((t, i) => (
             <div key={i} className="flex items-center gap-4 px-12 text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 dark:text-slate-600">
               <span className="text-blue-500 text-[8px] animate-pulse">▼</span> {t}
             </div>
           ))}
        </div>
      </div>

      {/* 3. BENTO GRID SECCIÓN DE MÓDULOS */}
      <section id="modulos" className="py-24 px-6 max-w-7xl mx-auto w-full">
        <Reveal>
          <div className="text-center mb-20">
            <div className="inline-block px-4 py-1.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-[var(--recal-blue)] dark:text-blue-400 text-[10px] font-black uppercase tracking-[0.25em] mb-4 border border-blue-200 dark:border-blue-800/30">
              Ecosistema de Control
            </div>
            <h3 className="text-4xl md:text-6xl font-black text-slate-900 dark:text-white tracking-tighter mb-4">
              Automatización Integral <br/> de Procesos Críticos
            </h3>
          </div>
        </Reveal>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 lg:gap-8 auto-rows-[minmax(350px,auto)]">
          
          {/* TARJETA 1: FUERZA DE TRABAJO */}
          <Reveal className="md:col-span-12 lg:col-span-8">
            <div className="group relative overflow-hidden bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-200 dark:border-slate-800 p-10 lg:p-12 shadow-2xl shadow-slate-200/50 dark:shadow-none hover:shadow-blue-500/10 transition-all duration-500 hover:-translate-y-2 h-full">
               <div className="absolute -right-20 -top-20 p-20 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity">
                <Users className="w-96 h-96 text-[var(--recal-blue)]" />
              </div>
              <div className="relative z-10 flex flex-col h-full items-start justify-center">
                <div className="w-16 h-16 bg-blue-100 dark:bg-blue-950/50 rounded-2xl flex items-center justify-center text-[var(--recal-blue)] dark:text-blue-400 mb-8 shadow-sm border border-blue-200/50 dark:border-blue-800/50">
                  <Users className="w-8 h-8" />
                </div>
                <h4 className="text-4xl font-black text-slate-900 dark:text-white mb-4 tracking-tighter">Fuerza de Trabajo</h4>
                <p className="text-slate-500 dark:text-slate-400 text-lg max-w-lg leading-relaxed mb-10 font-medium">
                  Control estricto de accesos, gestión de programas DC-3 y monitoreo de altas para toda la plantilla de subcontratistas.
                </p>
                <div className="flex gap-4">
                  <div className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 text-xs font-black uppercase tracking-widest border border-blue-100 dark:border-blue-800">
                    <ClipboardCheck className="w-3 h-3" /> STPS - DC3
                  </div>
                  <div className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 text-xs font-black uppercase tracking-widest border border-blue-100 dark:border-blue-800">
                    <Zap className="w-3 h-3" /> Tiempo Real
                  </div>
                </div>
              </div>
            </div>
          </Reveal>

          {/* TARJETA 2: MAQUINARIA */}
          <Reveal className="md:col-span-6 lg:col-span-4" delay={100}>
            <div className="group relative overflow-hidden bg-gradient-to-br from-indigo-600 to-blue-800 dark:from-indigo-900 dark:to-slate-900 rounded-[3rem] p-10 lg:p-12 shadow-2xl hover:shadow-indigo-500/20 transition-all duration-500 hover:-translate-y-2 text-white border border-white/10 h-full">
              <div className="flex flex-col h-full justify-between items-start">
                <div className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center mb-8 border border-white/20">
                  <Tractor className="w-8 h-8" />
                </div>
                <div>
                  <h4 className="text-4xl font-black mb-4 tracking-tighter">Maquinaria</h4>
                  <p className="text-indigo-100/70 text-lg leading-relaxed font-medium">
                    Optimización de activos móviles mediante bitácoras y calendarios de mantenimiento preventivo.
                  </p>
                </div>
                <Link href="/login" className="flex items-center gap-2 text-sm font-black uppercase tracking-widest group/btn border-b-2 border-white/20 pb-1 hover:border-white transition-colors">
                  Mantenimientos <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                </Link>
              </div>
            </div>
          </Reveal>

          {/* TARJETA 3: SALUD LABORAL */}
          <Reveal className="md:col-span-6 lg:col-span-5" delay={200}>
            <div className="group relative overflow-hidden bg-slate-900 rounded-[3rem] border border-slate-800 p-10 lg:p-12 shadow-2xl hover:shadow-black/50 transition-all duration-500 hover:-translate-y-2 h-full">
              <div className="absolute inset-0 bg-gradient-to-tr from-blue-600/5 via-transparent to-transparent"></div>
              <div className="relative z-10 flex flex-col h-full justify-center">
                <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-500 mb-8 border border-blue-500/20">
                  <Stethoscope className="w-8 h-8" />
                </div>
                <h4 className="text-4xl font-black text-white mb-4 tracking-tighter uppercase">Salud Lab.</h4>
                <p className="text-slate-400 text-lg leading-relaxed font-medium">
                  Gestión de médicos certificados, aptitudes físicas y seguimiento clínico especializado para el personal de obra.
                </p>
              </div>
            </div>
          </Reveal>

          {/* TARJETA 4: INFORMES SEMANALES */}
          <Reveal className="md:col-span-12 lg:col-span-7" delay={300}>
            <div className="group relative overflow-hidden bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-200 dark:border-slate-800 p-10 lg:p-12 shadow-2xl shadow-slate-200/50 dark:shadow-none hover:shadow-blue-500/10 transition-all duration-500 hover:-translate-y-2 h-full">
              <div className="relative z-10 flex flex-col md:flex-row gap-10 items-center h-full">
                <div className="flex-1">
                  <div className="mb-2 text-blue-600 dark:text-blue-400 flex items-center gap-2">
                    <Zap className="w-5 h-5 animate-pulse" />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em]">Eficiencia en Reportes</span>
                  </div>
                  <h4 className="text-4xl font-black text-slate-900 dark:text-white mb-4 tracking-tighter">Informes HSE a Excel</h4>
                  <p className="text-slate-500 dark:text-slate-400 text-lg leading-relaxed font-medium mb-8">
                    Nuestra plataforma genera reportes semanales completos de seguridad en un solo clic, alineados a los formatos oficiales.
                  </p>
                  <div className="inline-flex items-center gap-3 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-2xl border border-blue-100 dark:border-blue-800/50 shadow-sm">
                    <FileBarChart className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                    <span className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase tracking-widest leading-none">Generación Automatizada</span>
                  </div>
                </div>
                <div className="hidden md:flex w-48 h-48 bg-blue-100/50 dark:bg-blue-900/20 rounded-[2rem] border-4 border-white dark:border-slate-800 shadow-xl items-center justify-center -rotate-6 group-hover:rotate-0 transition-transform duration-500">
                   <div className="relative">
                     <div className="absolute -inset-2 bg-blue-500/20 blur-xl rounded-full animate-pulse"></div>
                     <FileBarChart className="w-20 h-20 text-blue-600 dark:text-blue-500 relative z-10" />
                   </div>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* 4. SECCIÓN DE VALOR AGREGADO */}
      <section className="bg-slate-100 dark:bg-slate-900/50 py-24 border-y border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
          <Reveal>
            <div className="relative">
              <div className="absolute -inset-4 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-[3rem] blur-2xl opacity-10 dark:opacity-20 animate-pulse"></div>
              <div className="relative overflow-hidden rounded-[3rem] border border-white dark:border-slate-800 bg-white/50 dark:bg-slate-800/50 backdrop-blur-xl p-2 shadow-2xl">
                <img 
                  src="https://res.cloudinary.com/ddl8myqbt/image/upload/q_auto/f_auto/v1775845212/Captura_de_pantalla_2026-04-10_a_la_s_12.18.39_p.m._ct6ruo.png" 
                  alt="Panel de Control ObrasOS" 
                  className="rounded-[2.5rem] w-full shadow-inner object-cover"
                />
              </div>
            </div>
          </Reveal>
          <div className="order-1 lg:order-2">
            <Reveal delay={100}>
              <span className="inline-block px-4 py-1.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-[var(--recal-blue)] dark:text-blue-400 text-[10px] font-black uppercase tracking-[0.3em] mb-6 border border-blue-200 dark:border-blue-800/30">
                Arquitectura Estandarizada
              </span>
              <h3 className="text-4xl md:text-6xl font-black text-slate-900 dark:text-white leading-[0.9] mb-8 tracking-tighter">
                Aislamiento Inteligente <br/> <span className="text-blue-600">Multi-Empresa</span>
              </h3>
            </Reveal>
            <div className="space-y-10">
              <Reveal delay={200}>
                <div className="flex gap-6 group">
                  <div className="flex-shrink-0 w-14 h-14 bg-[var(--recal-blue)] rounded-2xl flex items-center justify-center text-white shadow-xl shadow-blue-900/20 group-hover:rotate-6 transition-transform">
                    <Layers className="w-7 h-7" />
                  </div>
                  <div>
                    <h5 className="text-2xl font-black text-slate-900 dark:text-white mb-2 tracking-tighter">Gestión por Subcontratista</h5>
                    <p className="text-slate-500 dark:text-slate-400 leading-relaxed font-bold text-lg">Control absoluto de la documentación solicitada por RECAL, permitiendo a cada empresa gestionar sus propios expedientes.</p>
                  </div>
                </div>
              </Reveal>
              <Reveal delay={300}>
                <div className="flex gap-6 group">
                  <div className="flex-shrink-0 w-14 h-14 bg-blue-500 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-blue-500/20 group-hover:-rotate-6 transition-transform">
                    <LayoutDashboard className="w-7 h-7" />
                  </div>
                  <div>
                    <h5 className="text-2xl font-black text-slate-900 dark:text-white mb-2 tracking-tighter">Cumplimiento Centralizado</h5>
                    <p className="text-slate-500 dark:text-slate-400 leading-relaxed font-bold text-lg">Consolidación estratégica para supervisores, con datos de seguridad y cumplimiento documental de todo el proyecto.</p>
                  </div>
                </div>
              </Reveal>
            </div>
          </div>
        </div>
      </section>
      {/* ── SECCIÓN DE PRECIOS ── */}
      <section id="precios" className="py-24 px-6 max-w-7xl mx-auto w-full overflow-hidden">
        <Reveal>
          <div className="text-center mb-16">
            <span className="inline-block px-4 py-1.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-[var(--recal-blue)] dark:text-blue-400 text-[10px] font-black uppercase tracking-[0.3em] mb-4 border border-blue-200 dark:border-blue-800/30">
              Inversión Estratégica
            </span>
            <h3 className="text-4xl md:text-6xl font-black text-slate-900 dark:text-white tracking-tighter mb-4">
              Planes que escalan <br/> con tu empresa
            </h3>
            <p className="text-slate-500 dark:text-slate-400 text-lg max-w-2xl mx-auto font-medium">
              Estrategia de lanzamiento para subcontratistas RECAL. Sin plazos forzosos.
            </p>
          </div>
        </Reveal>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
          
          {/* PLAN BÁSICO */}
          <Reveal delay={100} className="h-full">
            <div className="group relative bg-white dark:bg-slate-900 rounded-[2.5rem] p-10 border border-slate-200 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-800 transition-all duration-500 flex flex-col h-full shadow-lg hover:shadow-2xl">
              <div className="mb-8">
                <h4 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-widest mb-2">Básico</h4>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black text-slate-900 dark:text-white">$899</span>
                  <span className="text-slate-500 text-sm font-bold uppercase tracking-widest">MXN / Mes</span>
                </div>
              </div>
              
              <ul className="space-y-4 mb-10 flex-grow">
                {[
                  'Ingreso de Fuerza de Trabajo',
                  'Gestión de Maquinaria',
                  'Exportación de Datos (Excel)',
                  'Soporte básico'
                ].map((feature, i) => (
                  <li key={i} className="flex items-start gap-3 text-slate-600 dark:text-slate-400 font-medium">
                    <Check className="w-5 h-5 text-blue-500 mt-0.5 shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <a 
                href="https://wa.me/529619326182?text=Hola!%20Me%20interesa%20contratar%20el%20Plan%20Básico%20de%20ObrasOS%20($899)"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-4 px-6 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-black uppercase tracking-widest text-center hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                Contratar Básico
              </a>
            </div>
          </Reveal>

          {/* PLAN INTERMEDIO */}
          <Reveal delay={200} className="h-full">
            <div className="group relative bg-white dark:bg-slate-900 rounded-[2.5rem] p-10 border-2 border-blue-500 dark:border-blue-400 transition-all duration-500 flex flex-col h-full shadow-2xl scale-105 z-10">
              <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-blue-500 text-white px-6 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] shadow-xl">
                Más Popular
              </div>
              
              <div className="mb-8">
                <h4 className="text-xl font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-2">Intermedio</h4>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black text-slate-900 dark:text-white">$1,799</span>
                  <span className="text-slate-500 text-sm font-bold uppercase tracking-widest">MXN / Mes</span>
                </div>
              </div>

              <ul className="space-y-4 mb-10 flex-grow">
                {[
                  'Todo lo del plan Básico',
                  'Acceso a Certificados Médicos',
                  'Panel de Usuario Ambiental',
                  'Gestión de Inspecciones',
                  'Soporte via correo'
                ].map((feature, i) => (
                  <li key={i} className="flex items-start gap-3 text-slate-600 dark:text-slate-400 font-medium">
                    <Check className="w-5 h-5 text-blue-500 mt-0.5 shrink-0" />
                    <span className={i === 0 ? 'font-bold text-slate-900 dark:text-white' : ''}>{feature}</span>
                  </li>
                ))}
              </ul>

              <a 
                href="https://wa.me/529619326182?text=Hola!%20Me%20interesa%20contratar%20el%20Plan%20Intermedio%20de%20ObrasOS%20($1,799)"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-4 px-6 rounded-2xl bg-blue-600 text-white font-black uppercase tracking-widest text-center shadow-xl shadow-blue-500/20 hover:bg-blue-700 transition-colors"
              >
                Contratar Intermedio
              </a>
            </div>
          </Reveal>

          {/* PLAN TOTAL */}
          <Reveal delay={300} className="h-full">
            <div className="group relative bg-slate-900 dark:bg-black rounded-[2.5rem] p-10 border border-slate-800 transition-all duration-500 flex flex-col h-full shadow-xl hover:shadow-blue-500/10">
              <div className="mb-8">
                <div className="flex items-center gap-2 mb-2">
                  <h4 className="text-xl font-black text-white uppercase tracking-widest">Total</h4>
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black text-white">$2,499</span>
                  <span className="text-slate-400 text-sm font-bold uppercase tracking-widest">MXN / Mes</span>
                </div>
              </div>

              <ul className="space-y-4 mb-10 flex-grow">
                {[
                  'Todo lo del plan Intermedio',
                  'Informes de Seguridad',
                  'Gestión Automática DC3',
                  'Landing Page Gratis durante la membresia',
                  'Backup Diario de Datos',
                  'Soporte Prioritario'
                ].map((feature, i) => (
                  <li key={i} className="flex items-start gap-3 text-slate-400 font-medium">
                    <Check className="w-5 h-5 text-emerald-400 mt-0.5 shrink-0" />
                    <span className={i === 0 ? 'font-bold text-white' : ''}>{feature}</span>
                  </li>
                ))}
              </ul>

              <a 
                href="https://wa.me/529619326182?text=Hola!%20Me%20interesa%20contratar%20el%20Plan%20Total%20de%20ObrasOS%20($2,499)"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-4 px-6 rounded-2xl bg-white text-slate-900 font-black uppercase tracking-widest text-center hover:bg-blue-50 transition-colors"
              >
                Contratar Plan Total
              </a>
            </div>
          </Reveal>

        </div>
      </section>


      {/* 5. SECCIÓN CALL TO ACTION (CTA) CON VIDEO LOOP */}
      <section className="relative py-32 px-6 overflow-hidden min-h-[600px] flex items-center justify-center">
        {/* VIDEO BACKGROUND LOOP */}
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-blue-900/60 dark:bg-blue-950/80 z-10 backdrop-blur-sm"></div>
          <video
            ref={videoRef}
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-full object-cover"
            src="https://res.cloudinary.com/ddl8myqbt/video/upload/q_auto/f_auto/v1775844100/hero_bxizkt.mp4"
          ></video>
        </div>

        <div className="max-w-5xl mx-auto relative z-10 text-center">
          <Reveal>
            <div className="bg-white/10 backdrop-blur-3xl border border-white/20 rounded-[4rem] p-12 md:p-20 shadow-2xl border-t-white/30 border-l-white/30">
              <span className="inline-block px-4 py-1.5 rounded-full bg-blue-400/20 text-blue-100 text-[10px] font-black uppercase tracking-[0.4em] mb-8 border border-white/10">
                Prueba la Potencia Real
              </span>
              <h2 className="text-4xl md:text-7xl font-black text-white tracking-tighter mb-8 leading-[0.9]">
                ¿Listo para dar el siguiente paso? <br/> <span className="text-blue-200">Solicita tu DEMO</span>
              </h2>
              <p className="text-xl text-blue-100/70 mb-12 max-w-2xl mx-auto font-medium">
                Te mostramos cómo nuestra plataforma puede transformar la gestión documental de tu obra en minutos.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                <a 
                  href="https://wa.me/529619326182?text=Hola,%20me%20gustaría%20solicitar%20una%20DEMO%20de%20ObrasOS%20-%20DOCS" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto px-10 py-5 rounded-2xl bg-[#25D366] text-white text-lg font-black uppercase tracking-widest shadow-xl shadow-green-900/20 hover:-translate-y-1 transition-all flex items-center justify-center gap-3"
                >
                  <div className="bg-white/20 p-2 rounded-lg">
                    <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.049-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.399-4.385 9.814-9.784 9.814zM20.52 3.449C18.24 1.245 15.24 0 12.045 0c-7.21 0-13.08 5.87-13.084 13.09a13.048 13.048 0 001.781 6.588L0 24l4.411-1.157a13.066 13.066 0 006.331 1.638h.005c7.218 0 13.087-5.87 13.09-13.09a13.02 13.02 0 00-3.317-9.522z"/></svg>
                  </div>
                  WhatsApp
                </a>
                <a 
                  href="tel:9619326182" 
                  className="w-full sm:w-auto px-10 py-5 rounded-2xl bg-white text-slate-900 text-lg font-black uppercase tracking-widest shadow-xl hover:-translate-y-1 transition-all flex items-center justify-center gap-3"
                >
                  <div className="bg-slate-100 p-2 rounded-lg">
                    <Phone className="w-5 h-5" />
                  </div>
                  Llamar Ahora
                </a>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <FooterPublic />

      <style jsx global>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          display: flex;
          width: max-content;
          animation: marquee 35s linear infinite;
        }
      `}</style>
    </div>
  );
}