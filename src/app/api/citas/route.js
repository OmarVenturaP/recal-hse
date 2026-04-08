import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(request) {
  try {
    const idEmpresa = Number(request.headers.get('x-empresa-id'));
    const userRol = request.headers.get('x-user-rol');

    if (userRol !== 'Master' && idEmpresa !== 1) {
      return NextResponse.json({ success: false, error: 'Acceso exclusivo para Recal Estructuras' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const mes = searchParams.get('mes');
    const anio = searchParams.get('anio');
    const area = searchParams.get('area');

    let query = `
      SELECT c.*, s.razon_social as contratista 
      FROM Citas_Dossier c
      LEFT JOIN Subcontratistas s ON c.id_subcontratista = s.id_subcontratista
      WHERE MONTH(c.fecha_cita) = ? AND YEAR(c.fecha_cita) = ?
    `;
    const params = [mes, anio];

    if (area && area !== 'Ambas') {
      query += ` AND c.area = ?`;
      params.push(area);
    }

    query += ` ORDER BY c.hora_cita ASC`;

    const [rows] = await pool.query(query, params);

    return NextResponse.json({ success: true, data: rows });
  } catch (error) {
    console.error("Error obteniendo citas:", error);
    return NextResponse.json({ success: false, error: 'Error al obtener las citas' }, { status: 500 });
  }
}

async function validateAppointmentTime(hora_cita, fecha_cita, revisor_nombre, id_cita_ignorar = null) {
  const horaMinima = '08:30';
  const horaMaxima = '13:00';
  if (hora_cita < horaMinima || hora_cita > horaMaxima) {
    return { success: false, error: '🚨 El horario permitido para revisiones es estrictamente de 08:30 am a 01:00 pm, por favor ajusta la cita al horario indicado.' };
  }

  if (revisor_nombre && revisor_nombre.trim() !== '') {
    let query = `SELECT id_cita, hora_cita FROM Citas_Dossier WHERE fecha_cita = ? AND revisor_nombre = ? AND estatus != 'No asistió'`;
    const params = [fecha_cita, revisor_nombre];
    
    if (id_cita_ignorar) {
       query += ` AND id_cita != ?`;
       params.push(id_cita_ignorar);
    }

    const [citasDia] = await pool.query(query, params);
    
    const [hNueva, mNueva] = hora_cita.split(':').map(Number);
    const minutosNueva = (hNueva * 60) + mNueva;

    for (let cita of citasDia) {
      const [hExistente, mExistente] = cita.hora_cita.split(':').map(Number);
      const minutosExistente = (hExistente * 60) + mExistente;

      if (Math.abs(minutosNueva - minutosExistente) < 240) {
        const horaChoque = cita.hora_cita.substring(0, 5);
        return { 
          success: false, 
          error: `🚨 Empalme de horario: El revisor ${revisor_nombre} ya tiene otra cita a las ${horaChoque}. Debe haber un desfase de 4 horas.` 
        };
      }
    }
  }
  return { success: true };
}

export async function POST(request) {
  try {
    const idEmpresa = Number(request.headers.get('x-empresa-id'));
    const userRol = request.headers.get('x-user-rol');

    if (userRol !== 'Master' && idEmpresa !== 1) {
      return NextResponse.json({ success: false, error: 'Acceso exclusivo para Recal Estructuras' }, { status: 403 });
    }

    const data = await request.json();
    const { fecha_cita, hora_cita, id_subcontratista, area, dossiers_entregados, periodo_evaluado, num_revision, revisor_nombre } = data;

    const validation = await validateAppointmentTime(hora_cita, fecha_cita, revisor_nombre);
    if (!validation.success) {
      return NextResponse.json({ success: false, error: validation.error }, { status: 400 });
    }

    const query = `
      INSERT INTO Citas_Dossier 
      (fecha_cita, hora_cita, id_subcontratista, area, dossiers_entregados, periodo_evaluado, num_revision, revisor_nombre, estatus) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Programada')
    `;
    
    await pool.query(query, [fecha_cita, hora_cita, id_subcontratista, area, dossiers_entregados, periodo_evaluado, num_revision, revisor_nombre]);

    return NextResponse.json({ success: true, mensaje: 'Cita agendada correctamente' });
  } catch (error) {
    console.error("Error agendando cita:", error);
    return NextResponse.json({ success: false, error: 'Error al agendar la cita' }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const idEmpresa = Number(request.headers.get('x-empresa-id'));
    const userRol = request.headers.get('x-user-rol');

    if (userRol !== 'Master' && idEmpresa !== 1) {
      return NextResponse.json({ success: false, error: 'Acceso exclusivo para Recal Estructuras' }, { status: 403 });
    }

    const data = await request.json();
    const { id_cita, fecha_cita, hora_cita, dossiers_entregados, periodo_evaluado, num_revision, estatus, comentarios_revisor, revisor_nombre } = data;

    const validation = await validateAppointmentTime(hora_cita, fecha_cita, revisor_nombre, id_cita);
    if (!validation.success) {
      return NextResponse.json({ success: false, error: validation.error }, { status: 400 });
    }

    const query = `
      UPDATE Citas_Dossier 
      SET fecha_cita = ?, hora_cita = ?, dossiers_entregados = ?, periodo_evaluado = ?, num_revision = ?, estatus = ?, comentarios_revisor = ?, revisor_nombre = ?
      WHERE id_cita = ?
    `;
    
    await pool.query(query, [fecha_cita, hora_cita, dossiers_entregados, periodo_evaluado, num_revision, estatus, comentarios_revisor, revisor_nombre, id_cita]);

    return NextResponse.json({ success: true, mensaje: 'Cita actualizada correctamente' });
  } catch (error) {
    console.error("Error actualizando cita:", error);
    return NextResponse.json({ success: false, error: 'Error al actualizar la cita' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const idEmpresa = Number(request.headers.get('x-empresa-id'));
    const userRol = request.headers.get('x-user-rol');

    if (userRol !== 'Master' && idEmpresa !== 1) {
      return NextResponse.json({ success: false, error: 'Acceso exclusivo para Recal Estructuras' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id_cita = searchParams.get('id_cita');

    if (!id_cita) {
      return NextResponse.json({ success: false, error: 'ID de cita no proporcionado' }, { status: 400 });
    }

    await pool.query('DELETE FROM Citas_Dossier WHERE id_cita = ?', [id_cita]);

    return NextResponse.json({ success: true, mensaje: 'Cita eliminada correctamente' });
  } catch (error) {
    console.error("Error eliminando cita:", error);
    return NextResponse.json({ success: false, error: 'Error interno al eliminar la cita' }, { status: 500 });
  }
}