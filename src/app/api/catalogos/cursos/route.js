import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(request) {
  try {
    const idEmpresa = request.headers.get('x-empresa-id');
    const userRol = request.headers.get('x-user-rol');

    let whereClause = 'c.bActivo = 1';
    const queryParams = [];

    if (userRol !== 'Master' && idEmpresa) {
      whereClause += ' AND c.id_empresa = ?';
      queryParams.push(idEmpresa);
    }

    const query = `
      SELECT 
        c.id_curso, 
        c.nombre_curso, 
        c.duracion_horas, 
        c.area_tematica,
        a.id_agente,
        a.nombre_agente 
      FROM Cursos_Capacitacion c
      LEFT JOIN Agentes_Capacitadores a ON c.id_agente = a.id_agente
      WHERE ${whereClause}
      ORDER BY c.nombre_curso ASC
    `;

    const [rows] = await pool.query(query, queryParams);

    return NextResponse.json(rows);
  } catch (error) {
    console.error("Error al obtener el catálogo de cursos:", error);
    return NextResponse.json({ error: "Error interno al consultar los cursos" }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const idEmpresa = request.headers.get('x-empresa-id');
    const formData = await request.formData();
    
    const nombre_curso = formData.get('nombre_curso');
    const duracion_horas = formData.get('duracion_horas');
    
    let id_agente = formData.get('id_agente');
    id_agente = (!id_agente || id_agente.trim() === '') ? null : id_agente;

    const area_tematica = formData.get('area_tematica') || '6000 Seguridad'; 

    if (!nombre_curso || !duracion_horas) {
      return NextResponse.json({ error: "El nombre del curso y la duración son obligatorios." }, { status: 400 });
    }

    const queryInsert = `
      INSERT INTO Cursos_Capacitacion (nombre_curso, duracion_horas, area_tematica, id_agente, bActivo, id_empresa)
      VALUES (?, ?, ?, ?, 1, ?)
    `;
    
    const [result] = await pool.query(queryInsert, [nombre_curso, duracion_horas, area_tematica, id_agente, idEmpresa || 1]);

    return NextResponse.json({ success: true, id: result.insertId });

  } catch (error) {
    console.error("Error en POST Cursos:", error);
    return NextResponse.json({ error: "Error al guardar el curso." }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const idEmpresa = request.headers.get('x-empresa-id');
    const userRol = request.headers.get('x-user-rol');
    const formData = await request.formData();
    const id_curso = formData.get('id_curso');
    
    if (!id_curso) {
      return NextResponse.json({ error: "Falta el ID del curso." }, { status: 400 });
    }

    // Validar propiedad
    if (userRol !== 'Master' && idEmpresa) {
      const [verif] = await pool.query('SELECT 1 FROM Cursos_Capacitacion WHERE id_curso = ? AND id_empresa = ?', [id_curso, idEmpresa]);
      if (verif.length === 0) return NextResponse.json({ error: "No tienes permisos para modificar este curso." }, { status: 403 });
    }

    const nombre_curso = formData.get('nombre_curso');
    const duracion_horas = formData.get('duracion_horas');
    
    let id_agente = formData.get('id_agente');
    id_agente = (!id_agente || id_agente.trim() === '') ? null : id_agente;
    
    const area_tematica = formData.get('area_tematica') || '6000 Seguridad';

    if (!nombre_curso || !duracion_horas) {
      return NextResponse.json({ error: "El nombre del curso y la duración son obligatorios." }, { status: 400 });
    }

    const queryUpdate = `
      UPDATE Cursos_Capacitacion 
      SET nombre_curso = ?, duracion_horas = ?, area_tematica = ?, id_agente = ?
      WHERE id_curso = ?
    `;
    
    await pool.query(queryUpdate, [nombre_curso, duracion_horas, area_tematica, id_agente, id_curso]);

    return NextResponse.json({ success: true, mensaje: "Curso actualizado correctamente" });

  } catch (error) {
    console.error("Error en PUT Cursos:", error);
    return NextResponse.json({ error: "Error al actualizar el curso." }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { id } = await request.json();
    const idEmpresa = request.headers.get('x-empresa-id');
    const userRol = request.headers.get('x-user-rol');

    if (!id) return NextResponse.json({ error: "Falta el ID del curso." }, { status: 400 });

    let authFilter = '';
    const authParams = [id];
    if (userRol !== 'Master' && idEmpresa) {
      authFilter = ' AND id_empresa = ?';
      authParams.push(idEmpresa);
    }

    await pool.query(`UPDATE Cursos_Capacitacion SET bActivo = 0 WHERE id_curso = ?${authFilter}`, authParams);
    
    return NextResponse.json({ success: true, mensaje: "Curso oculto correctamente." });
  } catch (error) {
    console.error("Error en DELETE Cursos:", error);
    return NextResponse.json({ error: "Error al intentar eliminar el curso." }, { status: 500 });
  }
}