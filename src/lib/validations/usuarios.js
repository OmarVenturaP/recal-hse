import { z } from 'zod';

export const usuarioSchema = z.object({
  id_personal: z.number().optional().nullable(),
  nombre: z.string().min(1, "El nombre es obligatorio"),
  cargo: z.string().min(1, "El cargo es obligatorio"),
  correo: z.string().email("Correo electrónico inválido"),
  area: z.string().min(1, "El área es obligatoria"),
  rol: z.enum(['Master', 'Admin', 'Usuario', 'Gerencia', 'Consultor', 'Auditor']),
  id_empresa: z.number().int().positive("ID de empresa inválido").nullable(),
  activo: z.union([z.boolean(), z.number()]).optional().nullable(),
  permisos_ft: z.number().optional().nullable(),
  permisos_certificados: z.number().optional().nullable(),
  permisos_maquinaria: z.number().optional().nullable(),
  permisos_dc3: z.number().optional().nullable(),
  permisos_informe: z.number().optional().nullable(),
  permisos_citas: z.number().optional().nullable(),
});

export const patchPasswordSchema = z.object({
  id_personal: z.number().int().positive("ID de personal es obligatorio"),
});
