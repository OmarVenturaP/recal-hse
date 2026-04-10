import { NextResponse } from 'next/server';
import pool from '@/lib/db'; 
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const isFile = (value) => value && typeof value === 'object' && value.size !== undefined;

const uploadImage = async (file, folder) => {
  if (!isFile(file) || file.size === 0) return null; 
  try {
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const fileBase64 = `data:${file.type};base64,${buffer.toString('base64')}`;
    const uploadResponse = await cloudinary.uploader.upload(fileBase64, { folder });
    return uploadResponse.secure_url;
  } catch (error) {
    console.error(`Error subiendo imagen a ${folder}:`, error);
    return null;
  }
};

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
        id_agente, 
        nombre_agente, 
        registro_stps, 
        firma_agente,
        logo_agente 
      FROM Agentes_Capacitadores
      WHERE ${whereClause}
      ORDER BY nombre_agente ASC
    `;
    const [rows] = await pool.query(query, queryParams);
    
    return NextResponse.json(rows);
  } catch (error) {
    console.error("Error al cargar agentes para el catálogo:", error);
    return NextResponse.json({ error: "Error de base de datos" }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const idEmpresa = request.headers.get('x-empresa-id');
    const formData = await request.formData();
    
    const nombre_agente = formData.get('nombre_agente');
    const registro_stps = formData.get('registro_stps');

    if (!nombre_agente || !registro_stps) {
      return NextResponse.json({ error: "El nombre y el registro STPS son obligatorios." }, { status: 400 });
    }

    const logo_agente = await uploadImage(formData.get('logo_agente'), 'recal_hse_logos');
    const firma_agente = await uploadImage(formData.get('firma_agente'), 'recal_hse_firmas');

    const queryInsert = `
      INSERT INTO Agentes_Capacitadores (nombre_agente, registro_stps, logo_agente, firma_agente, id_empresa)
      VALUES (?, ?, ?, ?, ?)
    `;
    
    const [result] = await pool.query(queryInsert, [nombre_agente, registro_stps, logo_agente, firma_agente, idEmpresa || 1]);

    return NextResponse.json({ success: true, id: result.insertId });

  } catch (error) {
    console.error("Error en POST Agentes:", error);
    return NextResponse.json({ error: "Error al guardar el agente capacitador." }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const idEmpresa = request.headers.get('x-empresa-id');
    const userRol = request.headers.get('x-user-rol');
    const formData = await request.formData();
    const id_agente = formData.get('id_agente');
    
    if (!id_agente) {
      return NextResponse.json({ error: "Falta el ID del agente." }, { status: 400 });
    }

    // Validar propiedad
    if (userRol !== 'Master' && idEmpresa) {
      const [verif] = await pool.query('SELECT 1 FROM Agentes_Capacitadores WHERE id_agente = ? AND id_empresa = ?', [id_agente, idEmpresa]);
      if (verif.length === 0) return NextResponse.json({ error: "No tienes permisos para modificar este agente." }, { status: 403 });
    }

    const nombre_agente = formData.get('nombre_agente');
    const registro_stps = formData.get('registro_stps');

    let logo_agente = formData.get('logo_agente');
    if (isFile(logo_agente)) {
      logo_agente = await uploadImage(logo_agente, 'recal_hse_logos');
    } else {
      logo_agente = (typeof logo_agente === 'string' && logo_agente !== 'null') ? logo_agente : null;
    }

    let firma_agente = formData.get('firma_agente');
    if (isFile(firma_agente)) {
      firma_agente = await uploadImage(firma_agente, 'recal_hse_firmas');
    } else {
      firma_agente = (typeof firma_agente === 'string' && firma_agente !== 'null') ? firma_agente : null;
    }

    const queryUpdate = `
      UPDATE Agentes_Capacitadores 
      SET nombre_agente = ?, registro_stps = ?, logo_agente = ?, firma_agente = ?
      WHERE id_agente = ?
    `;
    
    await pool.query(queryUpdate, [nombre_agente, registro_stps, logo_agente, firma_agente, id_agente]);

    return NextResponse.json({ success: true, mensaje: "Actualizado correctamente" });

  } catch (error) {
    console.error("Error en PUT Agentes:", error);
    return NextResponse.json({ error: "Error al actualizar el agente capacitador." }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { id } = await request.json();
    const idEmpresa = request.headers.get('x-empresa-id');
    const userRol = request.headers.get('x-user-rol');

    if (!id) return NextResponse.json({ error: "Falta el ID del agente." }, { status: 400 });

    let authFilter = '';
    const authParams = [id];
    if (userRol !== 'Master' && idEmpresa) {
      authFilter = ' AND id_empresa = ?';
      authParams.push(idEmpresa);
    }

    await pool.query(`UPDATE Agentes_Capacitadores SET bActivo = 0 WHERE id_agente = ?${authFilter}`, authParams);
    
    return NextResponse.json({ success: true, mensaje: "Agente oculto correctamente." });
  } catch (error) {
    console.error("Error en DELETE Agentes:", error);
    return NextResponse.json({ error: "Error al intentar eliminar el agente." }, { status: 500 });
  }
}