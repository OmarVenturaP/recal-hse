import { z } from 'zod';

export const usuarioSchema = z.object({
  id_personal: z.number().optional(),
  nombre: z.string().min(1, "El nombre es obligatorio"),
  cargo: z.string().min(1, "El cargo es obligatorio"),
  correo: z.string().email("Correo electrónico inválido"),
  area: z.string().min(1, "El área es obligatoria"),
  rol: z.enum(['Master', 'Usuario', 'Consultor', 'Auditor']), // Ajustar según roles reales
  id_empresa: z.number().int().positive("ID de empresa inválido"),
  activo: z.union([z.boolean(), z.number()]).optional(),
  permisos_ft: z.number().optional(),
  permisos_certificados: z.number().optional(),
  permisos_maquinaria: z.number().optional(),
  permisos_dc3: z.number().optional(),
  permisos_informe: z.number().optional(),
  permisos_citas: z.number().optional(),
});

export const patchPasswordSchema = z.object({
  id_personal: z.number().int().positive("ID de personal es obligatorio"),
});
