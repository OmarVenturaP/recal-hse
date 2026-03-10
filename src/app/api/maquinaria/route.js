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
    const busqueda = searchParams.get('busqueda'); 
    const ordenPor = searchParams.get('ordenPor') || 'fecha_ingreso_obra';
    const ordenDireccion = searchParams.get('ordenDireccion') || 'DESC';

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

    // Buscador Global Multiparámetro
    if (busqueda) {
      whereClause += ` AND (m.num_economico LIKE ? OR m.tipo LIKE ? OR m.marca LIKE ? OR m.modelo LIKE ? OR m.serie LIKE ? OR m.placa LIKE ?)`;
      const textoBuscado = `%${busqueda}%`;
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
      ORDER BY ${ordenPor} ${ordenDireccion}
    `;
    
    const [rows] = await pool.query(query, queryParams);

    // Lógica de cálculo de estado de mantenimiento
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
    console.error("Error en GET Maquinaria:", error);
    return NextResponse.json({ success: false, error: "Error de BD" }, { status: 500 });
  }
}

// --- POST: Nueva Maquinaria ---
export async function POST(request) {
  try {
    const formData = await request.formData();
    
    // Extracción segura: Si viene vacío o dice "null", lo volvemos un null real de JavaScript
    const extractField = (key) => {
      const val = formData.get(key);
      return (!val || val.trim() === '' || val === 'null') ? null : val.trim();
    };

    const num_economico = extractField('num_economico'); 
    const tipo = extractField('tipo');
    const marca = extractField('marca'); 
    const anio = extractField('anio'); 
    const modelo = extractField('modelo');
    const color = extractField('color'); 
    const serie = extractField('serie'); 
    const placa = extractField('placa');
    const horometro = extractField('horometro'); 
    const intervalo_mantenimiento = extractField('intervalo_mantenimiento');
    const fecha_ingreso_obra = extractField('fecha_ingreso_obra'); 
    const id_subcontratista = extractField('id_subcontratista');

    // Validaciones de obligatoriedad (Tipo, Marca, Año, Fecha, Contratista)
    if (!tipo || !marca || !anio || !fecha_ingreso_obra || !id_subcontratista) {
      return NextResponse.json({ success: false, error: "Los campos Tipo, Marca, Año, Fecha de Ingreso y Contratista son obligatorios." }, { status: 400 });
    }

    // Validación de Serie duplicada (Solo si escribieron una serie)
    if (serie) {
      const queryBusqueda = `SELECT marca, modelo FROM Maquinaria_Equipo WHERE serie = ? LIMIT 1`;
      const [existeSerie] = await pool.query(queryBusqueda, [serie]);
      
      if (existeSerie.length > 0) {
        return NextResponse.json({ 
          success: false, 
          error: `Ese número de serie ya pertenece al equipo: ${existeSerie[0].marca} / ${existeSerie[0].modelo || 'S/N'}. No puedes duplicarlo.` 
        }, { status: 400 });
      }
    }

    const file = formData.get('imagen'); 
    let imagen_url = null;

    if (file && typeof file !== 'string' && file.size > 0) {
      try {
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const fileBase64 = `data:${file.type};base64,${buffer.toString('base64')}`;
        const uploadResponse = await cloudinary.uploader.upload(fileBase64, { folder: 'recal_hse_maquinaria' });
        imagen_url = uploadResponse.secure_url; 
      } catch (imgError) {
        console.error("Error subiendo imagen:", imgError);
        // Continuamos sin imagen si Cloudinary falla
      }
    }

    const id_usuario_actual = request.headers.get('x-user-id');
    if (!id_usuario_actual) return NextResponse.json({ error: "Usuario no identificado" }, { status: 401 });

    const query = `
      INSERT INTO Maquinaria_Equipo 
      (num_economico, tipo, marca, anio, modelo, color, serie, placa, horometro, intervalo_mantenimiento, fecha_ingreso_obra, id_subcontratista, imagen_url, usuario_registro) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const [result] = await pool.query(query, [
      num_economico, 
      tipo, 
      marca, 
      anio, 
      modelo, 
      color, 
      serie, 
      placa, 
      horometro, 
      intervalo_mantenimiento, 
      fecha_ingreso_obra, 
      id_subcontratista, 
      imagen_url, 
      id_usuario_actual
    ]);

    return NextResponse.json({ success: true, id: result.insertId, imagen_url });

  } catch (error) {
    console.error("Error en POST Maquinaria:", error);
    return NextResponse.json({ success: false, error: "Error al guardar en base de datos. Verifica los datos ingresados." }, { status: 500 });
  }
}

// --- PUT: Editar Maquinaria ---
export async function PUT(request) {
  try {
    const formData = await request.formData();
    
    const extractField = (key) => {
      const val = formData.get(key);
      return (!val || val.trim() === '' || val === 'null') ? null : val.trim();
    };

    const id_maquinaria = extractField('id_maquinaria');
    const num_economicoVal = formData.get('num_economico');
    const num_economico = (!num_economicoVal || num_economicoVal.trim() === '' || num_economicoVal === 'null') ? 'S/N' : num_economicoVal.trim();
    const tipo = extractField('tipo');
    const marca = extractField('marca'); 
    const anio = extractField('anio'); 
    const modelo = extractField('modelo');
    const color = extractField('color'); 
    const serie = extractField('serie'); 
    const placa = extractField('placa');
    const horometro = extractField('horometro'); 
    const intervalo_mantenimiento = extractField('intervalo_mantenimiento');
    const fecha_ingreso_obra = extractField('fecha_ingreso_obra'); 
    const id_subcontratista = extractField('id_subcontratista');

    if (!tipo || !marca || !anio || !fecha_ingreso_obra || !id_subcontratista) {
      return NextResponse.json({ success: false, error: "Los campos Tipo, Marca, Año, Fecha de Ingreso y Contratista son obligatorios." }, { status: 400 });
    }
    
    if (serie) {
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
    let imagen_url = extractField('imagen_url_actual');

    if (file && typeof file !== 'string' && file.size > 0) {
      try {
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const fileBase64 = `data:${file.type};base64,${buffer.toString('base64')}`;
        const uploadResponse = await cloudinary.uploader.upload(fileBase64, { folder: 'recal_hse_maquinaria' });
        imagen_url = uploadResponse.secure_url; 
      } catch (imgError) {
        console.error("Error subiendo imagen en Edición:", imgError);
      }
    }

    const id_usuario_actual = request.headers.get('x-user-id');
    if (!id_usuario_actual) return NextResponse.json({ error: "Usuario no identificado" }, { status: 401 });

    const query = `
      UPDATE Maquinaria_Equipo 
      SET num_economico=?, tipo=?, marca=?, anio=?, modelo=?, color=?, serie=?, placa=?, horometro=?, intervalo_mantenimiento=?, fecha_ingreso_obra=?, id_subcontratista=?, imagen_url=?, usuario_actualizacion=?
      WHERE id_maquinaria=?
    `;
    
    await pool.query(query, [
      num_economico, tipo, marca, anio, modelo, color, serie, placa, horometro, intervalo_mantenimiento, fecha_ingreso_obra, id_subcontratista, imagen_url, id_usuario_actual, id_maquinaria
    ]);

    return NextResponse.json({ success: true, mensaje: "Actualizado correctamente" });
  } catch (error) {
    console.error("Error en PUT Maquinaria:", error);
    return NextResponse.json({ success: false, error: "Error al actualizar la base de datos." }, { status: 500 });
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
    
    if (!id_maquinaria || !fecha_baja) return NextResponse.json({ error: "Faltan datos" }, { status: 400 });

    await pool.query(`UPDATE Maquinaria_Equipo SET fecha_baja = ?, usuario_actualizacion = ? WHERE id_maquinaria = ?`, [fecha_baja, id_usuario_actual, id_maquinaria]);
    return NextResponse.json({ success: true, mensaje: "Equipo dado de baja" });
  } catch (error) {
    console.error("Error en PATCH Maquinaria:", error);
    return NextResponse.json({ success: false, error: "Error en BD" }, { status: 500 });
  }
}