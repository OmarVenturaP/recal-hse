"use client";

import React from 'react';
import { X, Check, Zap, ShieldCheck, Crown, MessageCircle } from 'lucide-react';

const ModalPlanDetalles = ({ isOpen, onClose, currentPlan }) => {
  if (!isOpen) return null;

  const plans = [
    {
      name: 'Free',
      price: 'Gratis',
      color: 'bg-slate-100 text-slate-600 border-slate-200',
      badge: 'bg-slate-200 text-slate-700',
      icon: <Zap className="w-5 h-5" />,
      features: ['Funciones Demo', 'Visualización limitada', 'Soporte base']
    },
    {
      name: 'Basico',
      price: '$499',
      oldPrice: '$999',
      color: 'bg-blue-50 text-blue-700 border-blue-200',
      badge: 'bg-blue-100 text-blue-800',
      icon: <Zap className="w-5 h-5" />,
      features: ['Ingreso FT', 'Gestión Maquinaria', 'Exportar Datos', 'Soporte vía correo']
    },
    {
      name: 'Intermedio',
      price: '$1199',
      oldPrice: '$1,999',
      color: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      badge: 'bg-indigo-100 text-indigo-800',
      icon: <ShieldCheck className="w-5 h-5" />,
      features: ['Todo lo Básico', 'Certificados Médicos', 'Usuario Ambiental', 'Backup Semanal']
    },
    {
      name: 'Total',
      price: '$1999',
      oldPrice: '$2,999',
      color: 'bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 text-amber-900 border-amber-200 shadow-xl shadow-amber-900/10',
      badge: 'bg-gradient-to-r from-amber-400 to-yellow-500 text-white shadow-md shadow-amber-500/20',
      icon: <Crown className="w-5 h-5" />,
      features: ['Todo lo Intermedio', 'Informes de Seguridad', 'Gestión DC3', 'Soporte Prioritario', 'Backup Diario'],
      isGold: true
    }
  ];

  const handleUpgrade = (planName) => {
    const message = `Hola! Me gustaría solicitar información para subir mi plan a: ${planName}. Mi empresa es ${currentPlan.empresaNombre}.`;
    window.open(`https://wa.me/5213317135835?text=${encodeURIComponent(message)}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Overlay */}
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300"
        onClick={onClose}
      />
      
      {/* Modal Content */}
      <div className="relative w-full max-w-4xl bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-300">
        
        {/* Header */}
        <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-start bg-slate-50/50 dark:bg-slate-800/50">
          <div>
            <h2 className="text-3xl font-black text-slate-800 dark:text-white mb-2">Planes y Funcionalidades</h2>
            <p className="text-slate-500 dark:text-slate-400 font-medium">Gestiona tu nivel de acceso y descubre nuevas herramientas para tu empresa.</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors text-slate-400 hover:text-slate-600 dark:hover:text-white"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Planes Grid */}
        <div className="p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {plans.map((plan) => {
            const isCurrent = currentPlan.name.toLowerCase() === plan.name.toLowerCase();
            
            return (
              <div 
                key={plan.name}
                className={`relative flex flex-col p-6 rounded-3xl border transition-all duration-300 ${plan.color} ${isCurrent ? `ring-2 ${plan.isGold ? 'ring-amber-500' : 'ring-blue-500'} ring-offset-2 dark:ring-offset-slate-900 scale-105 z-10` : 'opacity-80 hover:opacity-100 hover:scale-[1.02]'}`}
              >
                {isCurrent && (
                  <div className={`absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 ${plan.isGold ? 'bg-gradient-to-r from-amber-200 via-amber-500 to-amber-700 text-amber-950 border border-amber-400/50' : 'bg-blue-600 text-white'} text-[10px] font-black uppercase tracking-wider rounded-full shadow-lg`}>
                    Plan Actual
                  </div>
                )}

                <div className="flex items-center gap-2 mb-4">
                  <div className={`p-2 rounded-xl ${plan.badge}`}>
                    {plan.icon}
                  </div>
                  <h3 className="font-black text-lg">{plan.name}</h3>
                </div>

                {/* Precios */}
                <div className="mb-6">
                  {plan.oldPrice && (
                    <div className="text-[10px] text-slate-400 line-through mb-1 ml-1">{plan.oldPrice}</div>
                  )}
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-black">{plan.price}</span>
                    {plan.oldPrice && <span className="text-[10px] font-black text-rose-500 uppercase animate-pulse">OFERTA!</span>}
                    {plan.price !== 'Gratis' && <span className="text-[10px] text-slate-400 font-medium lowercase">/ mes</span>}
                  </div>
                </div>

                <ul className="space-y-3 mb-8 flex-1">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs font-medium">
                      <Check className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${plan.isGold ? 'text-amber-600' : 'text-slate-400'}`} />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                {!isCurrent && (
                  <button 
                    onClick={() => handleUpgrade(plan.name)}
                    className={`w-full py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all duration-300 flex items-center justify-center gap-2 ${
                      plan.isGold 
                        ? 'bg-gradient-to-r from-amber-200 via-amber-500 to-amber-700 text-amber-950 hover:shadow-lg hover:shadow-amber-500/40 border border-amber-400/50' 
                        : 'bg-white/50 dark:bg-slate-800/50 hover:bg-white dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <MessageCircle className="w-4 h-4" />
                    Mejorar
                  </button>
                )}
                {isCurrent && (
                  <div className={`w-full py-3 text-center text-xs font-black uppercase tracking-widest ${plan.isGold ? 'text-amber-700 bg-amber-50/70 border-amber-300/50' : 'text-blue-600 bg-blue-50/50 border-blue-200/50'} dark:bg-slate-900/30 rounded-2xl border`}>
                    Activo
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer info */}
        <div className="px-8 py-6 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-100 dark:border-slate-800 text-center">
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            ¿Necesitas una solución a medida? <span className="text-blue-600 dark:text-blue-400 cursor-pointer font-bold hover:underline" onClick={() => handleUpgrade('Personalizada')}>Contáctanos para una asesoría empresarial.</span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ModalPlanDetalles;
