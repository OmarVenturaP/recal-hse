import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { trabajadorSchema, patchTrabajadorSchema } from '@/lib/validations/fuerza-trabajo';

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
      return NextResponse.json({ success: false, error: validation.error.errors[0].message }, { status: 400 });
    }

    const { 
        numero_empleado, nombre_trabajador, apellido_trabajador, puesto_categoria, nss, curp, 
        fecha_ingreso_obra, fecha_alta_imss, origen, id_subcontratista_ft, id_subcontratista_principal 
    } = validation.data;

    const id_usuario_actual = request.headers.get('x-user-id');
    const idEmpresa = request.headers.get('x-empresa-id');

    if (!id_usuario_actual) return NextResponse.json({ error: "Usuario no identificado" }, { status: 401 });
    if (!idEmpresa) return NextResponse.json({ error: "Empresa no identificada" }, { status: 400 });

    // --- REGLA DE NEGOCIO: VALIDACIÓN DE NSS Y CURP ---
    if (nss || curp) {
      let duplicateQuery = `SELECT id_subcontratista_principal, fecha_baja, nss, curp FROM Fuerza_Trabajo WHERE id_empresa = ? AND (1=0`;
      const duplicateParams = [idEmpresa];

      if (nss) {
        duplicateQuery += ` OR nss = ?`;
        duplicateParams.push(nss);
      }
      if (curp) {
        duplicateQuery += ` OR curp = ?`;
        duplicateParams.push(curp);
      }
      duplicateQuery += `)`;

      const [duplicados] = await pool.query(duplicateQuery, duplicateParams);

      if (duplicados.length > 0) {
        const activo = duplicados.some(d => d.fecha_baja === null);
        if (activo) {
          return NextResponse.json({ success: false, error: "El NSS o CURP ya se encuentra activo en esta empresa." }, { status: 400 });
        }
        
        const mismaEmpresa = duplicados.some(d => d.id_subcontratista_principal === parseInt(id_subcontratista_principal));
        if (mismaEmpresa) {
          return NextResponse.json({ success: false, error: "Este trabajador ya estuvo registrado con esta subcontratista en esta empresa." }, { status: 400 });
        }
      }
    }

    const query = `
      INSERT INTO Fuerza_Trabajo 
      (numero_empleado, nombre_trabajador, apellido_trabajador, puesto_categoria, nss, curp, fecha_ingreso_obra, fecha_alta_imss, origen, id_subcontratista_ft, id_subcontratista_principal, usuario_registro, id_empresa) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const [result] = await pool.query(query, [
      numero_empleado, nombre_trabajador, apellido_trabajador || null, puesto_categoria, nss, curp || null, fecha_ingreso_obra, fecha_alta_imss || null, origen, id_subcontratista_ft || null, id_subcontratista_principal || null, id_usuario_actual, idEmpresa 
    ]);

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
        return NextResponse.json({ success: false, error: validation.error.errors[0].message }, { status: 400 });
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

    // --- REGLA DE NEGOCIO: VALIDACIÓN DE NSS Y CURP AL ACTUALIZAR ---
    if (nss || curp) {
      let duplicateQuery = `SELECT id_subcontratista_principal, fecha_baja, nss, curp FROM Fuerza_Trabajo WHERE id_empresa = ? AND id_trabajador != ? AND (1=0`;
      const duplicateParams = [idEmpresa, id_trabajador];

      if (nss) {
        duplicateQuery += ` OR nss = ?`;
        duplicateParams.push(nss);
      }
      if (curp) {
        duplicateQuery += ` OR curp = ?`;
        duplicateParams.push(curp);
      }
      duplicateQuery += `)`;

      const [duplicados] = await pool.query(duplicateQuery, duplicateParams);

      if (duplicados.length > 0) {
        const activo = duplicados.some(d => d.fecha_baja === null);
        if (activo) {
          return NextResponse.json({ success: false, error: "Este NSS o CURP ya se encuentra activo en otro registro de esta empresa." }, { status: 400 });
        }
        
        const mismaEmpresa = duplicados.some(d => d.id_subcontratista_principal === parseInt(id_subcontratista_principal));
        if (mismaEmpresa) {
          return NextResponse.json({ success: false, error: "Este trabajador ya estuvo registrado con esta subcontratista anteriormente en esta empresa." }, { status: 400 });
        }
      }
    }

    let updateFields = `numero_empleado=?, nombre_trabajador=?, apellido_trabajador=?, puesto_categoria=?, nss=?, curp=?, fecha_ingreso_obra=?, fecha_alta_imss=?, origen=?, id_subcontratista_ft=?, id_subcontratista_principal=?, usuario_actualizacion=?`;
    let queryParams = [numero_empleado, nombre_trabajador, apellido_trabajador || null, puesto_categoria, nss, curp || null, fecha_ingreso_obra, fecha_alta_imss || null, origen, id_subcontratista_ft || null, id_subcontratista_principal || null, id_usuario_actual];

    if (body.tiene_baja) {
      updateFields += `, fecha_baja=?`;
      queryParams.push(body.fecha_baja || null);
    }

    let query = `UPDATE Fuerza_Trabajo SET ${updateFields} WHERE id_trabajador=?`;
    queryParams.push(id_trabajador);

    // AISLAMIENTO: Un usuario normal solo puede actualizar de su empresa
    if (userRol !== 'Master' && idEmpresa) {
      query += ` AND id_empresa=?`;
      queryParams.push(idEmpresa);
    }
    
    await pool.query(query, queryParams);

    return NextResponse.json({ success: true, mensaje: "Actualizado correctamente" });
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
        return NextResponse.json({ success: false, error: validation.error.errors[0].message }, { status: 400 });
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
      const query = `UPDATE Fuerza_Trabajo SET bActivo = ?, usuario_actualizacion = ? WHERE id_trabajador = ?${authFilter}`;
      await pool.query(query, [bActivo, id_usuario_actual, id_trabajador, ...authParams]);
      return NextResponse.json({ success: true, mensaje: "Estado actualizado" });
    } 
    // Lógica original de Baja
    else if (fecha_baja) {
      const query = `UPDATE Fuerza_Trabajo SET fecha_baja = ?, usuario_actualizacion = ? WHERE id_trabajador = ?${authFilter}`;
      await pool.query(query, [fecha_baja, id_usuario_actual, id_trabajador, ...authParams]);
      return NextResponse.json({ success: true, mensaje: "Trabajador dado de baja correctamente" });
    } else {
      return NextResponse.json({ error: "No se envió acción válida" }, { status: 400 });
    }

  } catch (error) {
    console.error("Error en PATCH:", error);
    return NextResponse.json({ success: false, error: "Error interno en BD" }, { status: 500 });
  }
}