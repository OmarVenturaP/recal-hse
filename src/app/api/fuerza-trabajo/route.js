import { NextResponse } from 'next/server';
import pool from '../../../lib/db';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const idPrincipal = searchParams.get('subcontratista_principal');
    const fechaInicio = searchParams.get('fechaInicio');
    const fechaFin = searchParams.get('fechaFin');

    // Unimos la tabla principal (p) y la de cuadrillas (s) para tener toda la información
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

    // El filtro aplica directamente sobre el id_subcontratista_principal guardado
    if (idPrincipal) { 
      query += ` AND f.id_subcontratista_principal = ?`; 
      queryParams.push(idPrincipal); 
    }
    if (fechaInicio && fechaFin) { 
      query += ` AND f.fecha_ingreso_obra BETWEEN ? AND ?`; 
      queryParams.push(fechaInicio, fechaFin); 
    }
    query += ` ORDER BY f.fecha_ingreso_obra DESC`;

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

    const query = `
      INSERT INTO Fuerza_Trabajo 
      (numero_empleado, nombre_trabajador, puesto_categoria, nss, fecha_ingreso_obra, fecha_alta_imss, origen, id_subcontratista_ft, id_subcontratista_principal) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const [result] = await pool.query(query, [
      numero_empleado, nombre_trabajador, puesto_categoria, nss, fecha_ingreso_obra, fecha_alta_imss || null, origen, id_subcontratista_ft || null, id_subcontratista_principal || null
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

    const query = `
      UPDATE Fuerza_Trabajo 
      SET numero_empleado=?, nombre_trabajador=?, puesto_categoria=?, nss=?, fecha_ingreso_obra=?, fecha_alta_imss=?, origen=?, id_subcontratista_ft=?, id_subcontratista_principal=?
      WHERE id_trabajador=?
    `;
    await pool.query(query, [
      numero_empleado, nombre_trabajador, puesto_categoria, nss, fecha_ingreso_obra, fecha_alta_imss || null, origen, id_subcontratista_ft || null, id_subcontratista_principal || null, id_trabajador
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

    if (!id_trabajador || !fecha_baja) {
      return NextResponse.json({ error: "Faltan datos obligatorios" }, { status: 400 });
    }

    const query = `UPDATE Fuerza_Trabajo SET fecha_baja = ? WHERE id_trabajador = ?`;
    await pool.query(query, [fecha_baja, id_trabajador]);

    return NextResponse.json({ success: true, mensaje: "Trabajador dado de baja correctamente" });
  } catch (error) {
    console.error("Error al dar de baja:", error);
    return NextResponse.json({ success: false, error: "Error interno en BD" }, { status: 500 });
  }
}