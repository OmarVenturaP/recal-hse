export default function DashboardHome() {
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-gray-800">Panel de Control HSE</h1>
      <p className="mt-2 text-gray-600">Bienvenido al sistema. Selecciona una opción del menú.</p>
      
      {/* Aquí irán las tarjetas de resumen (Liberaciones, Maquinaria, etc.) */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-700">Dossieres Revisados</h3>
          <p className="text-3xl font-bold text-blue-600 mt-2">0</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-700">Maquinaria Activa</h3>
          <p className="text-3xl font-bold text-green-600 mt-2">0</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-700">Personal en Obra</h3>
          <p className="text-3xl font-bold text-orange-600 mt-2">0</p>
        </div>
      </div>
    </div>
  );
}