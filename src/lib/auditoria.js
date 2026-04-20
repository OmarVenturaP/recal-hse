import pool from '@/lib/db';
import { fechaCDMX } from '@/lib/dateUtils';

/**
 * Registra una entrada en el historial de auditoría.
 * POLÍTICA: Siempre falla silenciosamente para no afectar la operación principal.
 *
 * @param {object} params
 * @param {string} params.modulo     - 'Fuerza de Trabajo' | 'Informes de Seguridad' | 'DC3' | 'Certificados Médicos' | 'Catálogos'
 * @param {string} params.accion     - 'INSERT' | 'UPDATE' | 'DELETE' | 'EXPORT'
 * @param {string|number} params.id_registro  - ID del registro afectado
 * @param {string} params.descripcion         - Resumen legible del cambio
 * @param {object|null} params.datos_anteriores - Estado previo (null en INSERT)
 * @param {object|null} params.datos_nuevos    - Estado nuevo (null en DELETE)
 * @param {string|number} params.id_usuario    - ID del usuario que realizó la acción
 * @param {string|number} params.id_empresa    - ID de la empresa (multi-tenant)
 */
export async function registrarAuditoria({
  modulo,
  accion,
  id_registro,
  descripcion,
  datos_anteriores = null,
  datos_nuevos = null,
  id_usuario,
  id_empresa,
}) {
  try {
    // Migración silenciosa: crear la tabla si no existe
    await pool.query(`
      CREATE TABLE IF NOT EXISTS Historial_Auditoria (
        id_auditoria    INT NOT NULL AUTO_INCREMENT,
        id_empresa      INT DEFAULT NULL,
        modulo          VARCHAR(50) NOT NULL,
        accion          VARCHAR(20) NOT NULL,
        id_registro     VARCHAR(100) DEFAULT NULL,
        descripcion     TEXT,
        datos_anteriores JSON DEFAULT NULL,
        datos_nuevos     JSON DEFAULT NULL,
        id_usuario      INT DEFAULT NULL,
        fecha_cambio    DATETIME NOT NULL,
        PRIMARY KEY (id_auditoria),
        KEY idx_auditoria_empresa  (id_empresa),
        KEY idx_auditoria_modulo   (modulo),
        KEY idx_auditoria_usuario  (id_usuario),
        KEY idx_auditoria_fecha    (fecha_cambio)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
    `);

    // Obtener la fecha en zona horaria CDMX (UTC-6)
    const fechaFormatted = fechaCDMX();

    await pool.query(
      `INSERT INTO Historial_Auditoria
        (id_empresa, modulo, accion, id_registro, descripcion, datos_anteriores, datos_nuevos, id_usuario, fecha_cambio)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id_empresa || null,
        modulo,
        accion,
        id_registro != null ? String(id_registro) : null,
        descripcion || null,
        datos_anteriores ? JSON.stringify(datos_anteriores) : null,
        datos_nuevos    ? JSON.stringify(datos_nuevos)    : null,
        id_usuario || null,
        fechaFormatted,
      ]
    );
  } catch (err) {
    // Falla silenciosa: el error de auditoría nunca bloquea la operación principal
    console.error('[AUDITORIA] Error al registrar (non-blocking):', err?.message || err);
  }
}
