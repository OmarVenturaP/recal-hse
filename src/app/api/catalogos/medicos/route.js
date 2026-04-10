import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(request) {
  try {
    const idEmpresa = request.headers.get('x-empresa-id');
    const userRol = request.headers.get('x-user-rol');

    let whereClause = 'bActivo = 1';
    const queryParams = [];

    if (userRol !== 'Master' && idEmpresa) {
      whereClause += ' AND id_empresa = ?';
      queryParams.push(idEmpresa);
    }

    const query = `
      SELECT 
        id_medico, 
        cedula, 
        nombre, 
        especialidad, 
        universidad, 
        ciudad
      FROM Medicos_Empresa
      WHERE ${whereClause}
      ORDER BY nombre ASC
    `;
    const [rows] = await pool.query(query, queryParams);
    
    return NextResponse.json(rows);
  } catch (error) {
    console.error("Error al cargar médicos para el catálogo:", error);
    return NextResponse.json({ error: "Error de base de datos" }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const idEmpresa = request.headers.get('x-empresa-id');
    const formData = await request.formData();
    
    const cedula = formData.get('cedula');
    const nombre = formData.get('nombre');
    const especialidad = formData.get('especialidad');
    const universidad = formData.get('universidad');
    const ciudad = formData.get('ciudad');

    if (!cedula || !nombre) {
      return NextResponse.json({ error: "La cédula y el nombre son obligatorios." }, { status: 400 });
    }

    const queryInsert = `
      INSERT INTO Medicos_Empresa (cedula, nombre, especialidad, universidad, ciudad, id_empresa, bActivo)
      VALUES (?, ?, ?, ?, ?, ?, 1)
    `;
    
    const [result] = await pool.query(queryInsert, [cedula, nombre, especialidad, universidad, ciudad, idEmpresa || 1]);

    return NextResponse.json({ success: true, id: result.insertId });

  } catch (error) {
    console.error("Error en POST Médicos:", error);
    return NextResponse.json({ error: "Error al guardar el médico." }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const idEmpresa = request.headers.get('x-empresa-id');
    const userRol = request.headers.get('x-user-rol');
    const formData = await request.formData();

    const id_medico = formData.get('id_medico');
    const cedula = formData.get('cedula');
    const nombre = formData.get('nombre');
    const especialidad = formData.get('especialidad');
    const universidad = formData.get('universidad');
    const ciudad = formData.get('ciudad');
    
    if (!id_medico) {
      return NextResponse.json({ error: "Falta el ID del médico." }, { status: 400 });
    }

    // Validar propiedad
    if (userRol !== 'Master' && idEmpresa) {
      const [verif] = await pool.query('SELECT 1 FROM Medicos_Empresa WHERE id_medico = ? AND id_empresa = ?', [id_medico, idEmpresa]);
      if (verif.length === 0) return NextResponse.json({ error: "No tienes permisos para modificar este registro." }, { status: 403 });
    }

    if (!cedula || !nombre) {
      return NextResponse.json({ error: "La cédula y el nombre son obligatorios." }, { status: 400 });
    }

    const queryUpdate = `
      UPDATE Medicos_Empresa 
      SET cedula = ?, nombre = ?, especialidad = ?, universidad = ?, ciudad = ?
      WHERE id_medico = ?
    `;
    
    await pool.query(queryUpdate, [cedula, nombre, especialidad, universidad, ciudad, id_medico]);

    return NextResponse.json({ success: true, mensaje: "Actualizado correctamente" });

  } catch (error) {
    console.error("Error en PUT Médicos:", error);
    return NextResponse.json({ error: "Error al actualizar the médico." }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { id } = await request.json();
    const idEmpresa = request.headers.get('x-empresa-id');
    const userRol = request.headers.get('x-user-rol');

    if (!id) return NextResponse.json({ error: "Falta el ID del médico." }, { status: 400 });

    let authFilter = '';
    const authParams = [id];
    if (userRol !== 'Master' && idEmpresa) {
      authFilter = ' AND id_empresa = ?';
      authParams.push(idEmpresa);
    }

    await pool.query(`UPDATE Medicos_Empresa SET bActivo = 0 WHERE id_medico = ?${authFilter}`, authParams);
    
    return NextResponse.json({ success: true, mensaje: "Médico oculto correctamente." });
  } catch (error) {
    console.error("Error en DELETE Médicos:", error);
    return NextResponse.json({ error: "Error al intentar eliminar el registro." }, { status: 500 });
  }
}
