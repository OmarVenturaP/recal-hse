"use client";

import NavbarPublic from '@/components/NavbarPublic';
import FooterPublic from '@/components/FooterPublic';
import { Gavel, Globe, UserCheck, ShieldAlert, Cpu, Database, AlertTriangle } from 'lucide-react';

export default function TerminosPage() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 font-sans selection:bg-blue-500/30">
      <NavbarPublic />

      <main className="flex-1 pt-32 pb-24 px-6">
        <div className="max-w-4xl mx-auto">
          {/* Header de la Página */}
          <div className="text-center mb-16 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-[#145184] dark:text-blue-400 text-[10px] font-black uppercase tracking-[0.3em] mb-6 border border-blue-200 dark:border-blue-800/30">
              <Gavel className="w-3 h-3" /> Marco Legal del Servicio
            </div>
            <h1 className="text-4xl md:text-6xl font-black text-slate-900 dark:text-white tracking-tighter mb-6">
              Términos y <span className="text-blue-600">Condiciones</span>
            </h1>
            <p className="text-lg text-slate-500 dark:text-slate-400 font-medium max-w-2xl mx-auto">
              Regulamos nuestra relación para garantizar un entorno seguro, profesional y eficiente en la gestión de tus proyectos.
            </p>
          </div>

          {/* Contenido Legal */}
          <div className="bg-white dark:bg-slate-900/50 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 p-8 md:p-12 shadow-xl shadow-slate-200/50 dark:shadow-none space-y-12 text-slate-700 dark:text-slate-300">
            
            {/* 1. Aceptación */}
            <section className="space-y-4">
              <div className="flex items-center gap-3 text-slate-900 dark:text-white mb-4">
                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600">
                  <UserCheck className="w-5 h-5" />
                </div>
                <h2 className="text-2xl font-black tracking-tighter uppercase">1. Aceptación de los Términos</h2>
              </div>
              <p className="leading-relaxed font-medium">
                Al acceder y utilizar <strong className="text-slate-900 dark:text-white">ObrasOS-DOC</strong> (en adelante, "la Plataforma"), usted (en adelante, "el Cliente" o "Usuario") acepta estar sujeto a los presentes Términos y Condiciones. Si no está de acuerdo con estos términos, no debe utilizar la Plataforma.
              </p>
            </section>

            {/* 2. Naturaleza */}
            <section className="space-y-4">
              <div className="flex items-center gap-3 text-slate-900 dark:text-white mb-4">
                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600">
                  <Globe className="w-5 h-5" />
                </div>
                <h2 className="text-2xl font-black tracking-tighter uppercase">2. Naturaleza del Servicio</h2>
              </div>
              <p className="leading-relaxed font-medium">
                La Plataforma es un Software como Servicio (SaaS) diseñado para la administración de fuerza de trabajo, maquinaria, revisión de dossiers y gestión documental de Seguridad, Salud y Medio Ambiente (HSE) en proyectos de construcción. La arquitectura del sistema garantiza que la información ingresada por el Cliente se mantenga en entornos lógicos aislados; ningún otro cliente de la Plataforma tendrá acceso a sus datos.
              </p>
            </section>

            {/* 3. Cuentas */}
            <section className="space-y-4">
              <div className="flex items-center gap-3 text-slate-900 dark:text-white mb-4">
                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <h2 className="text-2xl font-black tracking-tighter uppercase">3. Cuentas y Responsabilidad de Accesos</h2>
              </div>
              <ul className="space-y-4 ml-4 font-medium">
                <li className="flex gap-4 items-start">
                  <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0"></div>
                  <span>El Cliente es el único responsable de mantener la confidencialidad de las contraseñas y cuentas (niveles Master, Admin, Usuario, Gerencia) creadas en su espacio de trabajo.</span>
                </li>
                <li className="flex gap-4 items-start">
                  <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0"></div>
                  <span>La Plataforma no se hace responsable por la pérdida o alteración de datos derivada del mal uso de las credenciales o la asignación incorrecta de permisos por parte de los administradores del Cliente.</span>
                </li>
              </ul>
            </section>

            {/* 4. Propiedad de Datos */}
            <section className="space-y-4">
              <div className="flex items-center gap-3 text-slate-900 dark:text-white mb-4">
                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600">
                  <Database className="w-5 h-5" />
                </div>
                <h2 className="text-2xl font-black tracking-tighter uppercase">4. Propiedad y Control de los Datos</h2>
              </div>
              <p className="leading-relaxed font-medium">
                Toda la información, registros (incluyendo datos de fuerza de trabajo, NSS, CURP, expedientes), certificados y documentos cargados por el Cliente son de su exclusiva propiedad. La Plataforma actúa únicamente como un "Encargado" del tratamiento de datos, proveyendo la infraestructura para su almacenamiento y gestión. Al cancelar el servicio, el Cliente tendrá derecho a exportar su información.
              </p>
            </section>

            {/* 5. Propiedad Intelectual */}
            <section className="space-y-4 bg-slate-50 dark:bg-slate-800/50 p-8 rounded-[2rem] border border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3 text-slate-900 dark:text-white mb-4">
                <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white">
                  <Cpu className="w-5 h-5" />
                </div>
                <h2 className="text-2xl font-black tracking-tighter uppercase">5. Propiedad Intelectual</h2>
              </div>
              <p className="leading-relaxed font-medium">
                El código fuente, diseño, bases de datos subyacentes, logotipos y algoritmos de la Plataforma son propiedad exclusiva de <strong className="text-slate-900 dark:text-white">SERVITEC TONALA</strong>. Se prohíbe estrictamente la copia, ingeniería inversa, distribución o modificación del software subyacente.
              </p>
            </section>

            {/* 6. Disponibilidad */}
            <section className="space-y-4">
                <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter uppercase">6. Disponibilidad y Respaldos</h2>
                <p className="leading-relaxed font-medium text-slate-500">
                  La Plataforma se esfuerza por mantener un tiempo de actividad (uptime) óptimo. Se realizan copias de seguridad (backups) automatizadas de manera periódica. Sin embargo, el servicio se proporciona "tal cual" (as is) y no se garantiza que sea ininterrumpido o libre de errores derivados de fallos en servidores de terceros o causas de fuerza mayor.
                </p>
            </section>

            {/* 7. Limitación de Responsabilidad (Crítica) */}
            <section className="space-y-6 border-2 border-red-500/20 dark:border-red-500/10 p-8 rounded-[2rem] bg-red-50/50 dark:bg-red-950/10">
              <div className="flex items-center gap-3 text-red-600 dark:text-red-400 mb-2">
                <AlertTriangle className="w-6 h-6 animate-pulse" />
                <h2 className="text-2xl font-black tracking-tighter uppercase leading-none">7. Limitación de Responsabilidad</h2>
              </div>
              <div className="space-y-4">
                <p className="leading-relaxed font-medium">
                  La Plataforma es una herramienta administrativa y de gestión documental. El uso de la Plataforma <strong>no exime al Cliente de su responsabilidad legal, civil, penal o laboral</strong> respecto a la seguridad física, salud, cumplimiento ambiental o prevención de riesgos y accidentes en sus sitios de obra. La Plataforma no sustituye la supervisión física y humana en campo.
                </p>
              </div>
            </section>

          </div>

          <div className="mt-12 text-center text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">
            Última actualización: Abril 2026
          </div>
        </div>
      </main>

      <FooterPublic />
    </div>
  );
}
