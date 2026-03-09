"use client";

import { useState, useEffect } from 'react';
import { Tractor, HardHat, FileCheck } from 'lucide-react';

export default function DashboardHome() {
  const [stats, setStats] = useState({ maquinaria: 0, personal: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch('/api/dashboard/stats');
        const data = await res.json();
        if (data.success) {
          setStats({
            maquinaria: data.maquinariaActiva,
            personal: data.personalActivo
          });
        }
      } catch (error) {
        console.error("Error cargando estadísticas", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  return (
    <div className="p-4 sm:p-8">
      <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Panel de Control</h1>
      
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* TARJETA: MAQUINARIA */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center justify-center relative overflow-hidden group hover:shadow-md transition-shadow">
          <div className="absolute top-0 w-full h-1 bg-green-500"></div>
          <div className="bg-green-50 p-3 rounded-full mb-3 text-green-600">
            <Tractor className="w-8 h-8" />
          </div>
          <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider">Maquinaria Activa</h3>
          {loading ? (
            <div className="h-10 w-16 bg-gray-200 rounded animate-pulse mt-2"></div>
          ) : (
            <p className="text-4xl font-black text-gray-800 mt-2">{stats.maquinaria}</p>
          )}
        </div>

        {/* TARJETA: FUERZA DE TRABAJO */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center justify-center relative overflow-hidden group hover:shadow-md transition-shadow">
          <div className="absolute top-0 w-full h-1 bg-orange-500"></div>
          <div className="bg-orange-50 p-3 rounded-full mb-3 text-orange-600">
            <HardHat className="w-8 h-8" />
          </div>
          <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider">Personal en Obra</h3>
          {loading ? (
            <div className="h-10 w-16 bg-gray-200 rounded animate-pulse mt-2"></div>
          ) : (
            <p className="text-4xl font-black text-gray-800 mt-2">{stats.personal}</p>
          )}
        </div>

        {/* TARJETA: DOSSIER (Próximo Módulo) 
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center justify-center relative overflow-hidden opacity-60">
          <div className="absolute top-0 w-full h-1 bg-blue-500"></div>
          <div className="bg-blue-50 p-3 rounded-full mb-3 text-blue-600">
            <FileCheck className="w-8 h-8" />
          </div>
          <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider">Dossieres Revisados</h3>
          <p className="text-4xl font-black text-gray-400 mt-2">Próximamente</p>
        </div>
*/}
      </div>
    </div>
  );
}