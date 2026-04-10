"use client";

import NavbarPublic from '@/components/NavbarPublic';
import FooterPublic from '@/components/FooterPublic';
import { ShieldCheck, Lock, Eye, FileText, Users, Zap } from 'lucide-react';

export default function PrivacidadPage() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 font-sans selection:bg-blue-500/30">
      <NavbarPublic />

      <main className="flex-1 pt-32 pb-24 px-6">
        <div className="max-w-4xl mx-auto">
          {/* Header de la Página */}
          <div className="text-center mb-16 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-[#145184] dark:text-blue-400 text-[10px] font-black uppercase tracking-[0.3em] mb-6 border border-blue-200 dark:border-blue-800/30">
              <ShieldCheck className="w-3 h-3" /> Transparencia y Seguridad
            </div>
            <h1 className="text-4xl md:text-6xl font-black text-slate-900 dark:text-white tracking-tighter mb-6">
              Aviso de <span className="text-blue-600">Privacidad</span>
            </h1>
            <p className="text-lg text-slate-500 dark:text-slate-400 font-medium max-w-2xl mx-auto">
              En ObrasOS - DOCS, la protección de tus datos corporativos y la privacidad de tu personal es nuestra prioridad estratégica.
            </p>
          </div>

          {/* Contenido Legal */}
          <div className="bg-white dark:bg-slate-900/50 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 p-8 md:p-12 shadow-xl shadow-slate-200/50 dark:shadow-none space-y-12 text-slate-700 dark:text-slate-300">
            
            {/* Sección 1 */}
            <section className="space-y-4">
              <div className="flex items-center gap-3 text-slate-900 dark:text-white mb-4">
                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600">
                  <FileText className="w-5 h-5" />
                </div>
                <h2 className="text-2xl font-black tracking-tighter">Identidad y Domicilio del Responsable</h2>
              </div>
              <p className="leading-relaxed font-medium">
                <strong className="text-slate-900 dark:text-white">SERVITEC TONALA</strong>, con domicilio en <strong className="text-slate-900 dark:text-white">Amapola #13, Tonalá, Chiapas, México</strong>, es responsable del tratamiento y protección de sus datos personales corporativos, y funge como "Encargado" de los datos personales de los trabajadores que el Cliente ingresa en la plataforma.
              </p>
            </section>

            {/* Sección 2 */}
            <section className="space-y-4">
              <div className="flex items-center gap-3 text-slate-900 dark:text-white mb-4">
                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600">
                  <Users className="w-5 h-5" />
                </div>
                <h2 className="text-2xl font-black tracking-tighter">Datos Personales Recabados</h2>
              </div>
              <p className="leading-relaxed font-medium mb-4">
                Para operar el sistema y brindar el servicio, recopilamos las siguientes categorías de datos:
              </p>
              <ul className="space-y-4 ml-4">
                <li className="flex gap-4 items-start">
                  <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0"></div>
                  <span><strong>Datos del Cliente (Administradores/Usuarios):</strong> Nombre, cargo, correo electrónico y área (ej. Seguridad, Medio Ambiente).</span>
                </li>
                <li className="flex gap-4 items-start">
                  <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0"></div>
                  <span><strong>Datos de Terceros (Fuerza de Trabajo):</strong> El Cliente ingresa bajo su propia responsabilidad datos de sus empleados o subcontratistas, tales como: Nombre completo, Número de Seguridad Social (NSS), CURP, fecha de ingreso, edad, puesto, origen y datos relacionados con su aptitud médica (certificados).</span>
                </li>
              </ul>
            </section>

            {/* Sección 3 */}
            <section className="space-y-4">
              <div className="flex items-center gap-3 text-slate-900 dark:text-white mb-4">
                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600">
                  <Zap className="w-5 h-5" />
                </div>
                <h2 className="text-2xl font-black tracking-tighter">Finalidad del Tratamiento de Datos</h2>
              </div>
              <p className="leading-relaxed font-medium">Los datos recabados se utilizan exclusivamente para:</p>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {['Permitir la operatividad del sistema de gestión de obra.', 
                  'Generar reportes, credenciales y certificados médicos automatizados requeridos por el Cliente.', 
                  'Controlar la vigencia de accesos a la obra y la trazabilidad de altas/bajas.', 
                  'Brindar soporte técnico y mantenimiento a la plataforma.'].map((item, idx) => (
                  <li key={idx} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 text-sm font-bold">
                    {item}
                  </li>
                ))}
              </ul>
            </section>

            {/* Sección 4 */}
            <section className="space-y-4 p-8 rounded-[2rem] bg-blue-600 text-white shadow-xl shadow-blue-500/20">
              <div className="flex items-center gap-3 mb-4">
                <Lock className="w-6 h-6" />
                <h2 className="text-2xl font-black tracking-tighter">Protección y Aislamiento de Datos</h2>
              </div>
              <p className="leading-relaxed font-medium opacity-90">
                Implementamos medidas de seguridad administrativas, técnicas y físicas para proteger sus datos contra daño, pérdida, alteración, destrucción o el uso, acceso o tratamiento no autorizado. Al operar bajo un modelo <strong>Multi-tenant</strong>, garantizamos que los datos de la fuerza de trabajo de un Cliente son invisibles e inaccesibles para otros clientes de la Plataforma.
              </p>
            </section>

            {/* Sección 5 */}
            <section className="space-y-4">
                <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter">Transferencia de Datos</h2>
                <p className="leading-relaxed font-medium">
                  La Plataforma <strong>no vende, alquila ni transfiere</strong> los datos personales a terceros, a excepción de proveedores de infraestructura (servidores en la nube) que actúan bajo nuestras estrictas instrucciones de confidencialidad, o cuando sea requerido por mandamiento de una autoridad competente.
                </p>
            </section>

            {/* Sección 6 */}
            <section className="space-y-4">
              <div className="flex items-center gap-3 text-slate-900 dark:text-white mb-4">
                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600">
                  <Eye className="w-5 h-5" />
                </div>
                <h2 className="text-2xl font-black tracking-tighter">Derechos ARCO</h2>
              </div>
              <p className="leading-relaxed font-medium">
                Dado que la Plataforma opera como un servicio B2B, si un trabajador desea ejercer sus derechos ARCO respecto a sus datos (NSS, CURP, etc.), deberá dirigirse directamente al Cliente (la empresa constructora que lo contrató), quien tiene las herramientas dentro del sistema para editar o dar de baja dicha información. Para los usuarios administradores de la cuenta, pueden ejercer sus derechos ARCO enviando un correo a <a href="mailto:servitectonala@gmail.com" className="text-blue-600 font-black underline-offset-4 hover:underline">servitectonala@gmail.com</a>.
              </p>
            </section>

            {/* Sección 7 */}
            <section className="space-y-4">
                <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter">Uso de Cookies</h2>
                <p className="leading-relaxed font-medium">
                  Utilizamos cookies y tecnologías similares únicamente para mantener la sesión de usuario activa (autenticación) y por cuestiones de seguridad de la aplicación.
                </p>
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
