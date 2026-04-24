import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { trabajadorSchema, patchTrabajadorSchema } from '@/lib/validations/fuerza-trabajo';
import { registrarAuditoria } from '@/lib/auditoria';
import { fechaCDMX } from '@/lib/dateUtils';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const subcontratista = searchParams.get('subcontratista');
    const fechaInicio = searchParams.get('fechaInicio');
    const fechaFin = searchParams.get('fechaFin');
    const busqueda = searchParams.get('busqueda');
    
    // BLINDAJE: Allowlist para evitar Inyección SQL en ORDER BY
    const allowedSortFields = ['fecha_ingreso_obra', 'nombre_trabajador', 'apellido_trabajador', 'nss', 'id_trabajador'];
    const ordenPor = allowedSortFields.includes(searchParams.get('ordenPor')) ? searchParams.get('ordenPor') : 'fecha_ingreso_obra';
    const ordenDireccion = ['ASC', 'DESC'].includes(searchParams.get('ordenDireccion')?.toUpperCase()) ? searchParams.get('ordenDireccion').toUpperCase() : 'DESC';

    const idEmpresa = request.headers.get('x-empresa-id');
    const userRol = request.headers.get('x-user-rol');

    // AISLAMIENTO: No permitir consultas sin ID de empresa si no es Master
    if (userRol !== 'Master' && !idEmpresa) {
        return NextResponse.json({ success: false, error: "Identificador de empresa faltante" }, { status: 400 });
    }

    // --- MIGRACIÓN SILENCIOSA DE FECHAS DE TRAZABILIDAD ---
    try {
      try { await pool.query(`ALTER TABLE Fuerza_Trabajo ADD COLUMN fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP`); } catch(e) {}
      try { await pool.query(`ALTER TABLE Fuerza_Trabajo ADD COLUMN ultima_modificacion DATETIME`); } catch(e) {}
    } catch (e) { /* Ignorar errores de migración */ }

    let whereClause = "WHERE 1=1";
    const queryParams = [];

    // Lógica Multi-Tenant estricta
    if (userRol !== 'Master') {
      whereClause += " AND f.id_empresa = ?";
      queryParams.push(idEmpresa);
    }

    if (subcontratista) {
      whereClause += ` AND f.id_subcontratista_principal = ?`;
      queryParams.push(subcontratista);
    }

    if (fechaInicio && fechaFin) {
      whereClause += ` AND DATE(f.fecha_ingreso_obra) <= ? AND (f.fecha_baja IS NULL OR DATE(f.fecha_baja) >= ?)`;
      queryParams.push(fechaFin, fechaInicio);
    } else {
      whereClause += ` AND f.fecha_baja IS NULL`;
    }

    if (busqueda) {
      whereClause += ` AND (f.nombre_trabajador LIKE ? OR f.apellido_trabajador LIKE ? OR f.nss LIKE ? OR f.puesto_categoria LIKE ?)`;
      const textoBuscado = `%${busqueda}%`;
      queryParams.push(textoBuscado, textoBuscado, textoBuscado, textoBuscado);
    }

    const query = `
      SELECT 
        f.*,
        u1.nombre AS creador, 
        u2.nombre AS modificador,
        s.razon_social AS nombre_subcontratista
      FROM Fuerza_Trabajo f
      LEFT JOIN Subcontratistas s ON f.id_subcontratista_principal = s.id_subcontratista
      LEFT JOIN Personal_Area u1 ON f.usuario_registro = u1.id_personal
      LEFT JOIN Personal_Area u2 ON f.usuario_actualizacion = u2.id_personal
      ${whereClause}
      ORDER BY ${ordenPor} ${ordenDireccion}
    `;

    const [rows] = await pool.query(query, queryParams);
    return NextResponse.json({ success: true, data: rows });

  } catch (error) {
    console.error("Error en GET Fuerza Trabajo:", error);
    return NextResponse.json({ success: false, error: "Error de base de datos" }, { status: 500 });
  }
}

// --- POST: Nuevo Trabajador ---
export async function POST(request) {
  try {
    const body = await request.json();
    
    // Validación con Zod
    const validation = trabajadorSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ success: false, error: validation.error.issues[0]?.message || "Error de validación" }, { status: 400 });
    }

    const { 
        numero_empleado, nombre_trabajador, apellido_trabajador, puesto_categoria, nss, curp, 
        fecha_ingreso_obra, fecha_alta_imss, origen, id_subcontratista_ft, id_subcontratista_principal 
    } = validation.data;

    const id_usuario_actual = request.headers.get('x-user-id');
    const idEmpresa = request.headers.get('x-empresa-id');

    if (!id_usuario_actual) return NextResponse.json({ error: "Usuario no identificado" }, { status: 401 });
    if (!idEmpresa) return NextResponse.json({ error: "Empresa no identificada" }, { status: 400 });

    // --- REGLA DE NEGOCIO: VALIDACIÓN DE SOLAPAMIENTO DE PERIODOS (NSS/CURP) ---
    if (nss || curp) {
      const [registros] = await pool.query(
        `SELECT id_trabajador, fecha_ingreso_obra, fecha_baja, nss, curp 
         FROM Fuerza_Trabajo 
         WHERE id_empresa = ? AND (nss = ? OR curp = ?)`,
        [idEmpresa, nss || 'N/A', curp || 'N/A']
      );

      const nIngreso = new Date(fecha_ingreso_obra);
      const nBaja = body.fecha_baja ? new Date(body.fecha_baja) : null;

      for (const reg of registros) {
        const eIngreso = new Date(reg.fecha_ingreso_obra);
        const eBaja = reg.fecha_baja ? new Date(reg.fecha_baja) : null;
        
        const fmtDate = (d) => d ? new Date(d).toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' }) : 'Actualidad';

        // 1. Validar si requiere baja obligatoria (si el nuevo ingreso es previo a uno existente)
        if (!nBaja && eIngreso > nIngreso) {
          return NextResponse.json({ 
            success: false, 
            error: `Este trabajador ya cuenta con un ingreso posterior el ${fmtDate(eIngreso)}. Para registrar este periodo anterior, es OBLIGATORIO ingresar una fecha de baja que no solape.` 
          }, { status: 400 });
        }

        // 2. Validar solapamiento estándar
        // (StartA <= EndB OR EndB is NULL) AND (EndA >= StartB OR EndA is NULL)
        const conflictIngreso = nIngreso <= (eBaja || new Date('2099-12-31'));
        const conflictBaja = (nBaja || new Date('2099-12-31')) >= eIngreso;

        if (conflictIngreso && conflictBaja) {
          return NextResponse.json({ 
            success: false, 
            error: `Solapamiento de fechas detectado. El trabajador ya tiene un registro del ${fmtDate(eIngreso)} al ${fmtDate(eBaja)}.` 
          }, { status: 400 });
        }
      }
    }

    const query = `
      INSERT INTO Fuerza_Trabajo 
      (numero_empleado, nombre_trabajador, apellido_trabajador, puesto_categoria, nss, curp, fecha_ingreso_obra, fecha_alta_imss, origen, id_subcontratista_ft, id_subcontratista_principal, usuario_registro, id_empresa, fecha_creacion) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const [result] = await pool.query(query, [
      numero_empleado, nombre_trabajador, apellido_trabajador || null, puesto_categoria, nss, curp || null, fecha_ingreso_obra, fecha_alta_imss || null, origen, id_subcontratista_ft || null, id_subcontratista_principal || null, id_usuario_actual, idEmpresa, fechaCDMX()
    ]);

    // AUDITORÍA (silenciosa)
    await registrarAuditoria({
      modulo: 'Fuerza de Trabajo',
      accion: 'INSERT',
      id_registro: result.insertId,
      descripcion: `Alta de trabajador: ${nombre_trabajador} ${apellido_trabajador || ''} | NSS: ${nss || 'N/D'}`,
      datos_nuevos: { nombre_trabajador, apellido_trabajador, nss, curp, puesto_categoria, fecha_ingreso_obra },
      id_usuario: id_usuario_actual,
      id_empresa: idEmpresa,
    });

    return NextResponse.json({ success: true, id: result.insertId });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, error: "Error al guardar" }, { status: 500 });
  }
}

// --- PUT: Actualizar Trabajador ---
export async function PUT(request) {
  try {
    const body = await request.json();
    
    // Validación con Zod
    const validation = trabajadorSchema.safeParse(body);
    if (!validation.success) {
        const firstError = validation.error.issues[0]?.message || "Error de validación en los campos";
        return NextResponse.json({ success: false, error: firstError }, { status: 400 });
    }

    const { 
        id_trabajador, numero_empleado, nombre_trabajador, apellido_trabajador, puesto_categoria, nss, curp, 
        fecha_ingreso_obra, fecha_alta_imss, origen, id_subcontratista_ft, id_subcontratista_principal 
    } = validation.data;

    const id_usuario_actual = request.headers.get('x-user-id');
    const idEmpresa = request.headers.get('x-empresa-id');
    const userRol = request.headers.get('x-user-rol');
    
    if (!id_usuario_actual) return NextResponse.json({ error: "Usuario no identificado" }, { status: 401 });
    if (!id_trabajador) return NextResponse.json({ error: "ID de trabajador faltante" }, { status: 400 });

    // --- REGLA DE NEGOCIO: VALIDACIÓN DE SOLAPAMIENTO AL ACTUALIZAR ---
    if (nss || curp) {
      const [registros] = await pool.query(
        `SELECT id_trabajador, fecha_ingreso_obra, fecha_baja, nss, curp 
         FROM Fuerza_Trabajo 
         WHERE id_empresa = ? AND id_trabajador != ? AND (nss = ? OR curp = ?)`,
        [idEmpresa, id_trabajador, nss || 'N/A', curp || 'N/A']
      );

      const nIngreso = new Date(fecha_ingreso_obra);
      const nBaja = body.tiene_baja && body.fecha_baja ? new Date(body.fecha_baja) : null;

      for (const reg of registros) {
        const eIngreso = new Date(reg.fecha_ingreso_obra);
        const eBaja = reg.fecha_baja ? new Date(reg.fecha_baja) : null;
        
        const fmtDate = (d) => d ? new Date(d).toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' }) : 'Actualidad';

        // 1. Validar si requiere baja obligatoria 
        if (!nBaja && eIngreso > nIngreso) {
          return NextResponse.json({ 
            success: false, 
            error: `El trabajador tiene un ingreso posterior el ${fmtDate(eIngreso)}. Este registro requiere una fecha de baja para evitar solapamientos.` 
          }, { status: 400 });
        }

        // 2. Validar solapamiento estándar
        const conflictIngreso = nIngreso <= (eBaja || new Date('2099-12-31'));
        const conflictBaja = (nBaja || new Date('2099-12-31')) >= eIngreso;

        if (conflictIngreso && conflictBaja) {
          return NextResponse.json({ 
            success: false, 
            error: `Solapamiento detectado. Ya existe un registro para este periodo (${fmtDate(eIngreso)} - ${fmtDate(eBaja)}).` 
          }, { status: 400 });
        }
      }
    }

    let updateFields = `numero_empleado=?, nombre_trabajador=?, apellido_trabajador=?, puesto_categoria=?, nss=?, curp=?, fecha_ingreso_obra=?, fecha_alta_imss=?, origen=?, id_subcontratista_ft=?, id_subcontratista_principal=?, usuario_actualizacion=?, ultima_modificacion=?`;
    let queryParams = [numero_empleado, nombre_trabajador, apellido_trabajador || null, puesto_categoria, nss, curp || null, fecha_ingreso_obra, fecha_alta_imss || null, origen, id_subcontratista_ft || null, id_subcontratista_principal || null, id_usuario_actual, fechaCDMX()];

    if (body.tiene_baja) {
      updateFields += `, fecha_baja=?`;
      queryParams.push(body.fecha_baja || null);
    }

    // OBTENER ESTADO ANTERIOR PARA AUDITORÍA
    const [oldRows] = await pool.query("SELECT * FROM Fuerza_Trabajo WHERE id_trabajador = ?", [id_trabajador]);
    const datos_anteriores = oldRows[0] || null;

    await pool.query(query, queryParams);

    // AUDITORÍA (silenciosa)
    await registrarAuditoria({
      modulo: 'Fuerza de Trabajo',
      accion: 'UPDATE',
      id_registro: id_trabajador,
      descripcion: `Edición de trabajador ID ${id_trabajador}: ${nombre_trabajador} ${apellido_trabajador || ''} | NSS: ${nss || 'N/D'}`,
      datos_anteriores,
      datos_nuevos: { 
        numero_empleado, nombre_trabajador, apellido_trabajador, puesto_categoria, nss, curp, 
        fecha_ingreso_obra, fecha_alta_imss, origen, id_subcontratista_ft, id_subcontratista_principal,
        fecha_baja: body.tiene_baja ? (body.fecha_baja || null) : (datos_anteriores?.fecha_baja)
      },
      id_usuario: id_usuario_actual,
      id_empresa: idEmpresa,
    });

    return NextResponse.json({ success: true, mensaje: 'Actualizado correctamente' });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, error: "Error al actualizar" }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const body = await request.json();
    
    // Validación con Zod
    const validation = patchTrabajadorSchema.safeParse(body);
    if (!validation.success) {
        return NextResponse.json({ success: false, error: validation.error.issues[0]?.message || "Error de validación" }, { status: 400 });
    }

    const { id_trabajador, fecha_baja, bActivo } = validation.data;
    const id_usuario_actual = request.headers.get('x-user-id');
    const idEmpresa = request.headers.get('x-empresa-id');
    const userRol = request.headers.get('x-user-rol');

    if (!id_usuario_actual) {
      return NextResponse.json({ error: "Usuario no identificado" }, { status: 401 });
    }

    let authFilter = "";
    const authParams = [];
    if (userRol !== 'Master' && idEmpresa) {
      authFilter = " AND id_empresa = ?";
      authParams.push(idEmpresa);
    }

    if (bActivo !== undefined) {
      // OBTENER ESTADO ANTERIOR
      const [oldRows] = await pool.query(`SELECT bActivo FROM Fuerza_Trabajo WHERE id_trabajador = ?${authFilter}`, [id_trabajador, ...authParams]);
      const datos_anteriores = oldRows[0] || null;

      const query = `UPDATE Fuerza_Trabajo SET bActivo = ?, usuario_actualizacion = ?, ultima_modificacion = ? WHERE id_trabajador = ?${authFilter}`;
      await pool.query(query, [bActivo, id_usuario_actual, fechaCDMX(), id_trabajador, ...authParams]);

      // AUDITORÍA (silenciosa)
      await registrarAuditoria({
        modulo: 'Fuerza de Trabajo',
        accion: 'UPDATE',
        id_registro: id_trabajador,
        descripcion: `Cambio de estado (bActivo=${bActivo}) al trabajador ID ${id_trabajador}`,
        datos_anteriores,
        datos_nuevos: { bActivo },
        id_usuario: id_usuario_actual,
        id_empresa: idEmpresa,
      });

      return NextResponse.json({ success: true, mensaje: "Estado actualizado" });
    } 
    // Lógica original de Baja
    else if (fecha_baja) {
      // OBTENER ESTADO ANTERIOR
      const [oldRows] = await pool.query(`SELECT fecha_baja FROM Fuerza_Trabajo WHERE id_trabajador = ?${authFilter}`, [id_trabajador, ...authParams]);
      const datos_anteriores = oldRows[0] || null;

      const query = `UPDATE Fuerza_Trabajo SET fecha_baja = ?, usuario_actualizacion = ?, ultima_modificacion = ? WHERE id_trabajador = ?${authFilter}`;
      await pool.query(query, [fecha_baja, id_usuario_actual, fechaCDMX(), id_trabajador, ...authParams]);

      // AUDITORÍA (silenciosa)
      await registrarAuditoria({
        modulo: 'Fuerza de Trabajo',
        accion: 'UPDATE',
        id_registro: id_trabajador,
        descripcion: `Baja de trabajador ID ${id_trabajador} con fecha ${fecha_baja}`,
        datos_anteriores,
        datos_nuevos: { fecha_baja },
        id_usuario: id_usuario_actual,
        id_empresa: idEmpresa,
      });

      return NextResponse.json({ success: true, mensaje: "Trabajador dado de baja correctamente" });
    } else {
      return NextResponse.json({ error: "No se envió acción válida" }, { status: 400 });
    }

  } catch (error) {
    console.error("Error en PATCH:", error);
    return NextResponse.json({ success: false, error: "Error interno en BD" }, { status: 500 });
  }
}

// --- DELETE: Eliminación Permanente ---
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id_trabajador = searchParams.get('id');
    const id_usuario_actual = request.headers.get('x-user-id');
    const idEmpresa = request.headers.get('x-empresa-id');
    const userRol = request.headers.get('x-user-rol');

    if (!id_usuario_actual) {
      return NextResponse.json({ error: "Usuario no identificado" }, { status: 401 });
    }

    if (!id_trabajador) {
      return NextResponse.json({ error: "Falta el ID del trabajador" }, { status: 400 });
    }

    // Validación estricta de Roles para Hard Delete
    if (userRol !== 'Master' && userRol !== 'Admin') {
      return NextResponse.json({ success: false, error: "Solo los administradores pueden eliminar registros permanentemente." }, { status: 403 });
    }

    // OBTENER DATOS DEL TRABAJADOR Y EMPRESA ANTES DE ELIMINAR PARA AUDITORÍA
    const [workerData] = await pool.query(`
      SELECT f.*, s.razon_social AS razon_social_empresa 
      FROM Fuerza_Trabajo f
      LEFT JOIN Subcontratistas s ON f.id_subcontratista_principal = s.id_subcontratista
      WHERE f.id_trabajador = ?
    `, [id_trabajador]);

    const datos_anteriores = workerData[0] || null;

    const [result] = await pool.query(query, queryParams);

    if (result.affectedRows === 0) {
      return NextResponse.json({ success: false, error: "No se encontró el registro o no tienes permisos para eliminarlo." }, { status: 404 });
    }

    // AUDITORÍA (silenciosa)
    await registrarAuditoria({
      modulo: 'Fuerza de Trabajo',
      accion: 'DELETE',
      id_registro: id_trabajador,
      descripcion: `Eliminación permanente de trabajador ID ${id_trabajador} | ${datos_anteriores?.nombre_trabajador} ${datos_anteriores?.apellido_trabajador || ''}`,
      datos_anteriores,
      id_usuario: id_usuario_actual,
      id_empresa: idEmpresa,
    });

    return NextResponse.json({ success: true, mensaje: "Registro eliminado permanentemente de la base de datos." });

  } catch (error) {
    console.error("Error en DELETE (Hard Delete):", error);
    
    // Si mysql retorna un error de foreign key
    if (error.code === 'ER_ROW_IS_REFERENCED_2') {
      return NextResponse.json({ 
        success: false, 
        error: "No se puede eliminar porque este trabajador ya está vinculado a reportes o inspecciones. Use la baja lógica en su lugar." 
      }, { status: 400 });
    }

    return NextResponse.json({ success: false, error: "Error al eliminar en la base de datos." }, { status: 500 });
  }
}