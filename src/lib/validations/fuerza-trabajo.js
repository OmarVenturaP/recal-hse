import { z } from 'zod';

export const trabajadorSchema = z.object({
  id_trabajador: z.number().optional(),
  numero_empleado: z.string().min(1, "Número de empleado es obligatorio"),
  nombre_trabajador: z.string().min(1, "Nombre es obligatorio"),
  apellido_trabajador: z.string().optional().nullable(),
  puesto_categoria: z.string().min(1, "Puesto/Categoría es obligatorio"),
  nss: z.string().min(1, "NSS es obligatorio"),
  curp: z.string().optional().nullable(),
  fecha_ingreso_obra: z.string().min(1, "Fecha de ingreso es obligatoria"),
  fecha_alta_imss: z.string().optional().nullable(),
  origen: z.string().optional().nullable(),
  id_subcontratista_ft: z.union([z.number(), z.string()]).optional().nullable(),
  id_subcontratista_principal: z.union([z.number(), z.string()]).optional().nullable(),
  tiene_baja: z.boolean().optional(),
  fecha_baja: z.string().optional().nullable(),
});

export const patchTrabajadorSchema = z.object({
  id_trabajador: z.number().int().positive("ID de trabajador es obligatorio"),
  fecha_baja: z.string().optional().nullable(),
  bActivo: z.union([z.boolean(), z.number()]).optional(),
});
