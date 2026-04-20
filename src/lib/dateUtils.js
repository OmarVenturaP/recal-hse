/**
 * Retorna la fecha y hora actual en zona horaria CDMX (UTC-6)
 * formateada como string 'YYYY-MM-DD HH:MM:SS' para insertar
 * directamente en consultas MySQL.
 *
 * Usar esta función en lugar de NOW() de MySQL garantiza horario
 * consistente independientemente del servidor de base de datos.
 */
export function fechaCDMX() {
  const fecha = new Date(Date.now() - 6 * 60 * 60 * 1000);
  return fecha.toISOString().slice(0, 19).replace('T', ' ');
}
