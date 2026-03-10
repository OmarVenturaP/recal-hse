import { NextResponse } from 'next/server';
import pool from '../../../lib/db';

// --- GET: Listar Trabajadores (Para la tabla del Dashboard) ---
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const subcontratista = searchParams.get('subcontratista');
    const fechaInicio = searchParams.get('fechaInicio');
    const fechaFin = searchParams.get('fechaFin');
    const busqueda = searchParams.get('busqueda');
    const ordenPor = searchParams.get('ordenPor') || 'fecha_ingreso_obra';
    const ordenDireccion = searchParams.get('ordenDireccion') || 'DESC';

    let whereClause = "WHERE 1=1";
    const queryParams = [];

    // 1. Filtro por Contratista
    if (subcontratista) {
      whereClause += ` AND f.id_subcontratista_principal = ?`;
      queryParams.push(subcontratista);
    }

    // 2. Filtro de Fechas (La Regla Matemática Correcta)
    if (fechaInicio && fechaFin) {
      // Entró a la obra antes o durante la fecha límite
      // Y (Sigue activo, o su baja fue después de la fecha de inicio)
      whereClause += ` AND DATE(f.fecha_ingreso_obra) <= ? AND (f.fecha_baja IS NULL OR DATE(f.fecha_baja) >= ?)`;
      
      // ¡El orden de estos parámetros es vital para que la ecuación funcione!
      queryParams.push(fechaFin, fechaInicio);
    } else {
      // Si el usuario limpia los filtros, mostramos solo al personal activo actual
      whereClause += ` AND f.fecha_baja IS NULL`;
    }

    // 3. Filtro de Búsqueda de Texto
    if (busqueda) {
      whereClause += ` AND (f.nombre_trabajador LIKE ? OR f.nss LIKE ? OR f.puesto_categoria LIKE ?)`;
      const textoBuscado = `%${busqueda}%`;
      queryParams.push(textoBuscado, textoBuscado, textoBuscado);
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

export async function POST(request) {
  try {
    const body = await request.json();
    const { numero_empleado, nombre_trabajador, puesto_categoria, nss, fecha_ingreso_obra, fecha_alta_imss, origen, id_subcontratista_ft, id_subcontratista_principal } = body;
    const id_usuario_actual = request.headers.get('x-user-id');

    if (!id_usuario_actual) {
      return NextResponse.json({ error: "Usuario no identificado" }, { status: 401 });
    }

    const query = `
      INSERT INTO Fuerza_Trabajo 
      (numero_empleado, nombre_trabajador, puesto_categoria, nss, fecha_ingreso_obra, fecha_alta_imss, origen, id_subcontratista_ft, id_subcontratista_principal, usuario_registro) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const [result] = await pool.query(query, [
      numero_empleado, nombre_trabajador, puesto_categoria, nss, fecha_ingreso_obra, fecha_alta_imss || null, origen, id_subcontratista_ft || null, id_subcontratista_principal || null, id_usuario_actual 
    ]);

    return NextResponse.json({ success: true, id: result.insertId });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, error: "Error al guardar" }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const body = await request.json();
    const { id_trabajador, numero_empleado, nombre_trabajador, puesto_categoria, nss, fecha_ingreso_obra, fecha_alta_imss, origen, id_subcontratista_ft, id_subcontratista_principal } = body;
    const id_usuario_actual = request.headers.get('x-user-id');
    if (!id_usuario_actual) return NextResponse.json({ error: "Usuario no identificado" }, { status: 401 });

    const query = `
      UPDATE Fuerza_Trabajo 
      SET numero_empleado=?, nombre_trabajador=?, puesto_categoria=?, nss=?, fecha_ingreso_obra=?, fecha_alta_imss=?, origen=?, id_subcontratista_ft=?, id_subcontratista_principal=?, usuario_actualizacion=?
      WHERE id_trabajador=?
    `;
    await pool.query(query, [
      numero_empleado, nombre_trabajador, puesto_categoria, nss, fecha_ingreso_obra, fecha_alta_imss || null, origen, id_subcontratista_ft || null, id_subcontratista_principal || null, id_usuario_actual, id_trabajador
    ]);

    return NextResponse.json({ success: true, mensaje: "Actualizado correctamente" });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, error: "Error al actualizar" }, { status: 500 });
  }
}

// --- PATCH: Dar de Baja a un trabajador ---
export async function PATCH(request) {
  try {
    const body = await request.json();
    const { id_trabajador, fecha_baja } = body;
    const id_usuario_actual = request.headers.get('x-user-id');

    if (!id_usuario_actual) {
      return NextResponse.json({ error: "Usuario no identificado" }, { status: 401 });
    }

    if (!id_trabajador || !fecha_baja) {
      return NextResponse.json({ error: "Faltan datos obligatorios" }, { status: 400 });
    }

    // NUEVO: Agregamos usuario_actualizacion = ? para que el Trigger lo detecte y registre en bitácora
    const query = `UPDATE Fuerza_Trabajo SET fecha_baja = ?, usuario_actualizacion = ? WHERE id_trabajador = ?`;
    await pool.query(query, [fecha_baja, id_usuario_actual, id_trabajador]);

    return NextResponse.json({ success: true, mensaje: "Trabajador dado de baja correctamente" });
  } catch (error) {
    console.error("Error al dar de baja:", error);
    return NextResponse.json({ success: false, error: "Error interno en BD" }, { status: 500 });
  }
}