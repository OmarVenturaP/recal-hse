import { NextResponse } from 'next/server';
import pool from '../../../lib/db';
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// --- GET: Listar Maquinaria ---
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const idSubcontratista = searchParams.get('subcontratista');
    const mes = searchParams.get('mes');
    const anio = searchParams.get('anio');
    const busqueda = searchParams.get('busqueda'); // NUEVO: Capturamos el texto a buscar

    let whereClause = "WHERE 1=1";
    const queryParams = [];

    // Filtro de periodo
    if (mes && anio) {
      const lastDay = new Date(anio, mes, 0).getDate();
      const startDate = `${anio}-${mes}-01`;
      const endDate = `${anio}-${mes}-${lastDay}`;
      whereClause += ` AND DATE(m.fecha_ingreso_obra) <= ? AND (m.fecha_baja IS NULL OR DATE(m.fecha_baja) >= ?)`;
      queryParams.push(endDate, startDate);
    } else {
      whereClause += ` AND m.fecha_baja IS NULL`;
    }

    // Filtro por Subcontratista
    if (idSubcontratista) { 
      whereClause += ` AND m.id_subcontratista = ?`; 
      queryParams.push(idSubcontratista); 
    }

    // NUEVO: Buscador Global Multiparámetro
    if (busqueda) {
      // Usamos LIKE con comodines (%) para que busque coincidencias parciales en cualquier parte del texto
      whereClause += ` AND (m.num_economico LIKE ? OR m.tipo LIKE ? OR m.marca LIKE ? OR m.modelo LIKE ? OR m.serie LIKE ? OR m.placa LIKE ?)`;
      
      const textoBuscado = `%${busqueda}%`;
      // Como tenemos 6 signos de interrogación en el OR, inyectamos el mismo texto 6 veces
      queryParams.push(textoBuscado, textoBuscado, textoBuscado, textoBuscado, textoBuscado, textoBuscado);
    }

    const query = `
      SELECT 
        m.id_maquinaria, m.num_economico, m.tipo, m.marca, m.anio, m.modelo, m.color, m.serie, m.placa,
        m.horometro AS horometro_actual, m.intervalo_mantenimiento, m.fecha_ingreso_obra, m.fecha_baja, m.imagen_url,
        m.id_subcontratista,
        s.razon_social AS nombre_subcontratista,
        (SELECT MAX(fecha_mantenimiento) FROM Historial_Mantenimiento WHERE id_maquinaria = m.id_maquinaria) AS ultima_fecha_mantenimiento,
        (SELECT horometro_mantenimiento FROM Historial_Mantenimiento WHERE id_maquinaria = m.id_maquinaria ORDER BY fecha_mantenimiento DESC, id_mantenimiento DESC LIMIT 1) AS ultimo_horometro_mantenimiento
      FROM Maquinaria_Equipo m
      LEFT JOIN Subcontratistas s ON m.id_subcontratista = s.id_subcontratista
      ${whereClause}
      ORDER BY m.fecha_ingreso_obra DESC
    `;
    
    const [rows] = await pool.query(query, queryParams);

    const dataConCalculos = rows.map(maquina => {
      let horasRestantes = null;
      let estadoMantenimiento = 'N/A';

      if (maquina.intervalo_mantenimiento && maquina.horometro_actual !== null) {
        const horometroBase = maquina.ultimo_horometro_mantenimiento || 0; 
        const horasUsadas = maquina.horometro_actual - horometroBase;
        horasRestantes = maquina.intervalo_mantenimiento - horasUsadas;

        if (horasRestantes <= 0) estadoMantenimiento = 'Vencido';
        else if (horasRestantes <= 50) estadoMantenimiento = 'Próximo';
        else estadoMantenimiento = 'Óptimo';
      }

      return { ...maquina, horas_restantes: horasRestantes, estado_mantenimiento: estadoMantenimiento };
    });

    return NextResponse.json({ success: true, data: dataConCalculos });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Error de BD" }, { status: 500 });
  }
}

// --- POST: Nueva Maquinaria ---
export async function POST(request) {
  try {
    const formData = await request.formData();
    const num_economico = formData.get('num_economico'); const tipo = formData.get('tipo');
    const marca = formData.get('marca'); const anio = formData.get('anio'); const modelo = formData.get('modelo');
    const color = formData.get('color'); const serie = formData.get('serie'); const placa = formData.get('placa');
    const horometro = formData.get('horometro'); const intervalo_mantenimiento = formData.get('intervalo_mantenimiento');
    const fecha_ingreso_obra = formData.get('fecha_ingreso_obra'); const id_subcontratista = formData.get('id_subcontratista');

    if (serie && serie.trim() !== '') {
      const queryBusqueda = `SELECT tipo, marca FROM Maquinaria_Equipo WHERE serie = ? AND id_maquinaria != ? LIMIT 1`;
      const [existeSerie] = await pool.query(queryBusqueda, [serie]);
      
      if (existeSerie.length > 0) {
        return NextResponse.json({ 
          success: false, 
          error: `Ese número de serie ya pertenece al equipo: ${existeSerie[0].marca} / ${existeSerie[0].modelo}. No puedes duplicarlo.` 
        }, { status: 400 });
      }
    }

    const file = formData.get('imagen'); 
    let imagen_url = null;

    if (file && file !== 'null' && file.size > 0) {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const fileBase64 = `data:${file.type};base64,${buffer.toString('base64')}`;
      const uploadResponse = await cloudinary.uploader.upload(fileBase64, { folder: 'recal_hse_maquinaria' });
      imagen_url = uploadResponse.secure_url; 
    }

    const id_usuario_actual = request.headers.get('x-user-id');

    if (!id_usuario_actual) {
      return NextResponse.json({ error: "Usuario no identificado" }, { status: 401 });
    }

    const query = `
      INSERT INTO Maquinaria_Equipo 
      (num_economico, tipo, marca, anio, modelo, color, serie, placa, horometro, intervalo_mantenimiento, fecha_ingreso_obra, id_subcontratista, imagen_url, usuario_registro) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const [result] = await pool.query(query, [
      num_economico, tipo, marca, anio || null, modelo, color || null, serie || null, placa || null, horometro || null, intervalo_mantenimiento || null, fecha_ingreso_obra, id_subcontratista || null, imagen_url, id_usuario_actual
    ]);

    return NextResponse.json({ success: true, id: result.insertId, imagen_url });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Error al guardar" }, { status: 500 });
  }
}

// --- PUT: Editar Maquinaria ---
export async function PUT(request) {
  try {
    const formData = await request.formData();
    const id_maquinaria = formData.get('id_maquinaria');
    const num_economico = formData.get('num_economico'); const tipo = formData.get('tipo');
    const marca = formData.get('marca'); const anio = formData.get('anio'); const modelo = formData.get('modelo');
    const color = formData.get('color'); const serie = formData.get('serie'); const placa = formData.get('placa');
    const horometro = formData.get('horometro'); const intervalo_mantenimiento = formData.get('intervalo_mantenimiento');
    const fecha_ingreso_obra = formData.get('fecha_ingreso_obra'); const id_subcontratista = formData.get('id_subcontratista');
    
    if (serie && serie.trim() !== '') {
      const queryBusqueda = `SELECT tipo, marca FROM Maquinaria_Equipo WHERE serie = ? AND id_maquinaria != ? LIMIT 1`;
      const [existeSerie] = await pool.query(queryBusqueda, [serie, id_maquinaria]);
      
      if (existeSerie.length > 0) {
        return NextResponse.json({ 
          success: false, 
          error: `Ese número de serie ya pertenece al equipo: ${existeSerie[0].tipo} / ${existeSerie[0].marca}. No puedes duplicarlo.` 
        }, { status: 400 });
      }
    }

    const file = formData.get('imagen'); 
    let imagen_url = formData.get('imagen_url_actual'); // Mantenemos la foto actual por defecto

    // Si el usuario subió una nueva foto al editar, la subimos a Cloudinary y reemplazamos la URL
    if (file && file !== 'null' && file.size > 0) {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const fileBase64 = `data:${file.type};base64,${buffer.toString('base64')}`;
      const uploadResponse = await cloudinary.uploader.upload(fileBase64, { folder: 'recal_hse_maquinaria' });
      imagen_url = uploadResponse.secure_url; 
    }

    const id_usuario_actual = request.headers.get('x-user-id');

    if (!id_usuario_actual) {
      return NextResponse.json({ error: "Usuario no identificado" }, { status: 401 });
    }

    const query = `
      UPDATE Maquinaria_Equipo 
      SET num_economico=?, tipo=?, marca=?, anio=?, modelo=?, color=?, serie=?, placa=?, horometro=?, intervalo_mantenimiento=?, fecha_ingreso_obra=?, id_subcontratista=?, imagen_url=?, usuario_actualizacion=?
      WHERE id_maquinaria=?
    `;
    await pool.query(query, [
      num_economico, tipo, marca, anio || null, modelo, color || null, serie || null, placa || null, horometro || null, intervalo_mantenimiento || null, fecha_ingreso_obra, id_subcontratista || null, imagen_url, id_usuario_actual, id_maquinaria
    ]);

    return NextResponse.json({ success: true, mensaje: "Actualizado correctamente" });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Error al actualizar" }, { status: 500 });
  }
}

// --- PATCH: Dar de Baja ---
export async function PATCH(request) {
  try {
    const { id_maquinaria, fecha_baja } = await request.json();
    const id_usuario_actual = request.headers.get('x-user-id');

    if (!id_usuario_actual) {
      return NextResponse.json({ error: "Usuario no identificado" }, { status: 401 });
    }
    
    // Al actualizar el usuario_actualizacion, el Trigger se dará cuenta y guardará quién lo dio de baja
    await pool.query(`UPDATE Maquinaria_Equipo SET fecha_baja = ?, usuario_actualizacion = ? WHERE id_maquinaria = ?`, [fecha_baja, id_usuario_actual, id_maquinaria]);
    if (!id_maquinaria || !fecha_baja) return NextResponse.json({ error: "Faltan datos" }, { status: 400 });

    await pool.query(`UPDATE Maquinaria_Equipo SET fecha_baja = ? WHERE id_maquinaria = ?`, [fecha_baja, id_maquinaria]);
    return NextResponse.json({ success: true, mensaje: "Equipo dado de baja" });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Error en BD" }, { status: 500 });
  }
}