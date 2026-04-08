import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const subcontratista = searchParams.get('subcontratista');
    const fechaInicio = searchParams.get('fechaInicio');
    const fechaFin = searchParams.get('fechaFin');
    const busqueda = searchParams.get('busqueda');
    const ordenPor = searchParams.get('ordenPor') || 'fecha_ingreso_obra';
    const ordenDireccion = searchParams.get('ordenDireccion') || 'DESC';

    const idEmpresa = request.headers.get('x-empresa-id');
    const userRol = request.headers.get('x-user-rol');

    let whereClause = "WHERE 1=1";
    const queryParams = [];

    // Lógica Multi-Tenant: Si NO es Master, limitamos la vista a su propia empresa
    if (userRol !== 'Master' && idEmpresa) {
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
    const { numero_empleado, nombre_trabajador, apellido_trabajador, puesto_categoria, nss, curp, fecha_ingreso_obra, fecha_alta_imss, origen, id_subcontratista_ft, id_subcontratista_principal } = body;
    const id_usuario_actual = request.headers.get('x-user-id');
    const idEmpresa = request.headers.get('x-empresa-id');
    const userRol = request.headers.get('x-user-rol');

    if (!id_usuario_actual) return NextResponse.json({ error: "Usuario no identificado" }, { status: 401 });

    // --- REGLA DE NEGOCIO: VALIDACIÓN DE NSS ---
    if (nss) {
      // El NSS debe ser único pero ahora validamos que choque dentro de la misma empresa (o de forma global para evitar duplicados reales)
      // Como el NSS es nacional, no debería haber NSS duplicados en general, así que busquemos globalmente o por empresa según el caso.
      // Por consistencia, evaluaremos en general.
      const [duplicados] = await pool.query(
        `SELECT id_subcontratista_principal, fecha_baja FROM Fuerza_Trabajo WHERE nss = ?`,
        [nss]
      );

      if (duplicados.length > 0) {
        // 1. ¿Hay algún registro activo con este NSS?
        const activo = duplicados.some(d => d.fecha_baja === null);
        if (activo) {
          return NextResponse.json({ success: false, error: "El NSS ya se encuentra activo en la obra." }, { status: 400 });
        }
        
        // 2. ¿Se está intentando dar de alta con la MISMA empresa de la que se dio de baja?
        const mismaEmpresa = duplicados.some(d => d.id_subcontratista_principal === parseInt(id_subcontratista_principal));
        if (mismaEmpresa) {
          return NextResponse.json({ success: false, error: "Este trabajador ya estuvo en la obra con esta empresa. La única excepción para reingresar un NSS es hacerlo mediante una contratista distinta." }, { status: 400 });
        }
      }
    }
    // -------------------------------------------

    const query = `
      INSERT INTO Fuerza_Trabajo 
      (numero_empleado, nombre_trabajador, apellido_trabajador, puesto_categoria, nss, curp, fecha_ingreso_obra, fecha_alta_imss, origen, id_subcontratista_ft, id_subcontratista_principal, usuario_registro, id_empresa) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const [result] = await pool.query(query, [
      numero_empleado, nombre_trabajador, apellido_trabajador || null, puesto_categoria, nss, curp || null, fecha_ingreso_obra, fecha_alta_imss || null, origen, id_subcontratista_ft || null, id_subcontratista_principal || null, id_usuario_actual, idEmpresa || 1 
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
    const { id_trabajador, numero_empleado, nombre_trabajador, apellido_trabajador, puesto_categoria, nss, curp, fecha_ingreso_obra, fecha_alta_imss, origen, id_subcontratista_ft, id_subcontratista_principal } = body;
    const id_usuario_actual = request.headers.get('x-user-id');
    const idEmpresa = request.headers.get('x-empresa-id');
    const userRol = request.headers.get('x-user-rol');
    
    if (!id_usuario_actual) return NextResponse.json({ error: "Usuario no identificado" }, { status: 401 });

    // --- REGLA DE NEGOCIO: VALIDACIÓN DE NSS AL ACTUALIZAR ---
    if (nss) {
      // Excluimos el ID actual para que no marque error consigo mismo
      const [duplicados] = await pool.query(
        `SELECT id_subcontratista_principal, fecha_baja FROM Fuerza_Trabajo WHERE nss = ? AND id_trabajador != ?`,
        [nss, id_trabajador]
      );

      if (duplicados.length > 0) {
        const activo = duplicados.some(d => d.fecha_baja === null);
        if (activo) {
          return NextResponse.json({ success: false, error: "Este NSS ya se encuentra activo en otro registro de la obra." }, { status: 400 });
        }
        
        const mismaEmpresa = duplicados.some(d => d.id_subcontratista_principal === parseInt(id_subcontratista_principal));
        if (mismaEmpresa) {
          return NextResponse.json({ success: false, error: "Este NSS ya estuvo registrado con esta empresa anteriormente. Solo se permite el reingreso con una contratista distinta." }, { status: 400 });
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

    // Seguridad: Un usuario normal solo puede actualizar de su empresa
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
    const { id_trabajador, fecha_baja, bActivo } = body; // Añadido bActivo
    const id_usuario_actual = request.headers.get('x-user-id');
    const idEmpresa = request.headers.get('x-empresa-id');
    const userRol = request.headers.get('x-user-rol');

    if (!id_usuario_actual) {
      return NextResponse.json({ error: "Usuario no identificado" }, { status: 401 });
    }
    if (!id_trabajador) {
      return NextResponse.json({ error: "Falta ID de trabajador" }, { status: 400 });
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