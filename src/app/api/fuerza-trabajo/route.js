import { NextResponse } from 'next/server';
import pool from '../../../lib/db';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Capturamos todos los parámetros del frontend
    const idPrincipal = searchParams.get('subcontratista'); // Ojo: en el frontend lo mandamos como 'subcontratista'
    const fechaInicio = searchParams.get('fechaInicio');
    const fechaFin = searchParams.get('fechaFin');
    const busqueda = searchParams.get('busqueda');
    const ordenPor = searchParams.get('ordenPor') || 'fecha_ingreso_obra';
    const ordenDireccion = searchParams.get('ordenDireccion') || 'DESC';

    let query = `
      SELECT 
        f.id_trabajador, f.numero_empleado, f.nombre_trabajador, f.puesto_categoria, 
        f.nss, f.fecha_ingreso_obra, f.fecha_alta_imss, f.fecha_baja, f.origen, 
        f.id_subcontratista_ft, 
        f.id_subcontratista_principal,
        s.nombre AS nombre_subcontratista_ft,
        p.razon_social AS nombre_subcontratista
      FROM Fuerza_Trabajo f
      LEFT JOIN Subcontratistas_Fuerza_Trabajo s ON f.id_subcontratista_ft = s.id_subcontratista_ft
      LEFT JOIN Subcontratistas p ON f.id_subcontratista_principal = p.id_subcontratista
      WHERE 1=1
    `;
    const queryParams = [];

    // 1. Filtro por Contratista Principal
    if (idPrincipal) { 
      query += ` AND f.id_subcontratista_principal = ?`; 
      queryParams.push(idPrincipal); 
    }

    // 2. Filtro por Fechas de Ingreso
    if (fechaInicio && fechaFin) { 
      query += ` AND f.fecha_ingreso_obra BETWEEN ? AND ?`; 
      queryParams.push(fechaInicio, fechaFin); 
    }

    // 3. Buscador Global por Texto
    if (busqueda) {
      query += ` AND (f.numero_empleado LIKE ? OR f.nombre_trabajador LIKE ? OR f.puesto_categoria LIKE ? OR f.nss LIKE ?)`;
      const textoBuscado = `%${busqueda}%`;
      queryParams.push(textoBuscado, textoBuscado, textoBuscado, textoBuscado);
    }

    // 4. Lógica Segura de Ordenamiento (Lista Blanca)
    const columnasPermitidas = {
      'numero_empleado': 'f.numero_empleado',
      'nombre_trabajador': 'f.nombre_trabajador',
      'puesto_categoria': 'f.puesto_categoria',
      'nss': 'f.nss',
      'fecha_ingreso_obra': 'f.fecha_ingreso_obra',
      'nombre_subcontratista': 'p.razon_social'
    };
    
    const columnaSegura = columnasPermitidas[ordenPor] || 'f.fecha_ingreso_obra';
    const direccionSegura = ordenDireccion.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    query += ` ORDER BY ${columnaSegura} ${direccionSegura}`;

    const [rows] = await pool.query(query, queryParams);
    return NextResponse.json({ success: true, data: rows });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, error: "Error en BD" }, { status: 500 });
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

    if (!id_usuario_actual) {
      return NextResponse.json({ error: "Usuario no identificado" }, { status: 401 });
    }

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