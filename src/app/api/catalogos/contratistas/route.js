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

    let whereClause = "bActivo = 1";
    const queryParams = [];

    if (userRol !== 'Master' && idEmpresa) {
      whereClause += " AND id_empresa = ?";
      queryParams.push(idEmpresa);
    }

    // --- MIGRACIÓN SILENCIOSA ---
    try {
      await pool.query(`ALTER TABLE Subcontratistas ADD COLUMN fecha_corte DATE DEFAULT NULL AFTER logo_empresa`);
    } catch(e) {}

    const query = `
      SELECT id_subcontratista, razon_social, rfc, nombre_fiscal, telefono, correo, representante_legal, 
      firma_representante_legal, representante_trabajadores, firma_representante_trabajadores, nombre_fiscal, logo_empresa, fecha_corte
      FROM Subcontratistas 
      WHERE ${whereClause}
      ORDER BY razon_social ASC
    `;
    const [rows] = await pool.query(query, queryParams);
    return NextResponse.json(rows);
  } catch (error) {
    console.error("Error al cargar contratistas:", error);
    return NextResponse.json({ error: "Error de BD" }, { status: 500 });
  }
}

export async function POST(request) {
  const connection = await pool.getConnection();
  try {
    const formData = await request.formData();
    
    // Obtenemos los headers de seguridad
    const idEmpresa = request.headers.get('x-empresa-id');
    
    const razon_social = formData.get('razon_social');
    if (!razon_social) return NextResponse.json({ error: "La Razón Social es obligatoria." }, { status: 400 });

    const rfc = formData.get('rfc') || null;
    const telefono = formData.get('telefono') || null;
    const correo = formData.get('correo') || null;
    const representante_legal = formData.get('representante_legal') || null;
    const representante_trabajadores = formData.get('representante_trabajadores') || null;
    const nombre_fiscal = formData.get('nombre_fiscal') || null;

    const logo_empresa = await uploadImage(formData.get('logo_empresa'), 'recal_hse_logos');
    const firma_representante_legal = await uploadImage(formData.get('firma_representante_legal'), 'recal_hse_firmas');
    const firma_representante_trabajadores = await uploadImage(formData.get('firma_representante_trabajadores'), 'recal_hse_firmas');
    const fecha_corte = formData.get('fecha_corte') || null;

    await connection.beginTransaction();

    const queryInsert = `
      INSERT INTO Subcontratistas 
      (razon_social, rfc, telefono, correo, representante_legal, representante_trabajadores, logo_empresa, firma_representante_legal, firma_representante_trabajadores, nombre_fiscal, id_empresa, fecha_corte)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const [result] = await connection.query(queryInsert, [
      razon_social, rfc, telefono, correo, representante_legal, representante_trabajadores, 
      logo_empresa, firma_representante_legal, firma_representante_trabajadores, nombre_fiscal, idEmpresa || 1, fecha_corte
    ]);
    
    const nuevoId = result.insertId;

    const cuadrillasRaw = formData.get('cuadrillas');
    if (cuadrillasRaw) {
      const cuadrillas = JSON.parse(cuadrillasRaw);
      for (const cuadrilla of cuadrillas) {
        await connection.query('INSERT INTO Subcontratistas_Fuerza_Trabajo (nombre, id_subcontratista_principal, id_empresa) VALUES (?, ?, ?)', [cuadrilla.nombre, nuevoId, idEmpresa || 1]);
      }
    }

    await connection.commit();
    return NextResponse.json({ success: true, id: nuevoId });

  } catch (error) {
    await connection.rollback();
    console.error("Error en POST Contratistas:", error);
    return NextResponse.json({ error: "Error al guardar el contratista." }, { status: 500 });
  } finally {
    connection.release();
  }
}

export async function PUT(request) {
  const connection = await pool.getConnection();
  try {
    const formData = await request.formData();
    const id_subcontratista = formData.get('id_subcontratista');
    
    // Obtenemos los headers de seguridad
    const idEmpresa = request.headers.get('x-empresa-id');
    const userRol = request.headers.get('x-user-rol');
    
    if (!id_subcontratista) return NextResponse.json({ error: "Falta ID del contratista" }, { status: 400 });

    // Validar propiedad del subcontratista antes de actualizar
    if (userRol !== 'Master' && idEmpresa) {
      const [verif] = await connection.query('SELECT 1 FROM Subcontratistas WHERE id_subcontratista = ? AND id_empresa = ?', [id_subcontratista, idEmpresa]);
      if (verif.length === 0) return NextResponse.json({ error: "No tienes permisos para modificar este subcontratista." }, { status: 403 });
    }

    const razon_social = formData.get('razon_social');
    const rfc = formData.get('rfc') || null;
    const telefono = formData.get('telefono') || null;
    const correo = formData.get('correo') || null;
    const representante_legal = formData.get('representante_legal') || null;
    const representante_trabajadores = formData.get('representante_trabajadores') || null;
    const nombre_fiscal = formData.get('nombre_fiscal') || null;

    let logo_empresa = formData.get('logo_empresa');
    if (isFile(logo_empresa)) logo_empresa = await uploadImage(logo_empresa, 'recal_hse_logos');
    else logo_empresa = (typeof logo_empresa === 'string' && logo_empresa !== 'null') ? logo_empresa : null;

    let firma_representante_legal = formData.get('firma_representante_legal');
    if (isFile(firma_representante_legal)) firma_representante_legal = await uploadImage(firma_representante_legal, 'recal_hse_firmas');
    else firma_representante_legal = (typeof firma_representante_legal === 'string' && firma_representante_legal !== 'null') ? firma_representante_legal : null;

    let firma_representante_trabajadores = formData.get('firma_representante_trabajadores');
    if (isFile(firma_representante_trabajadores)) firma_representante_trabajadores = await uploadImage(firma_representante_trabajadores, 'recal_hse_firmas');
    else firma_representante_trabajadores = (typeof firma_representante_trabajadores === 'string' && firma_representante_trabajadores !== 'null') ? firma_representante_trabajadores : null;

    await connection.beginTransaction();

    const fecha_corte = formData.get('fecha_corte') || null;

    const queryUpdate = `
      UPDATE Subcontratistas SET 
        razon_social=?, rfc=?, telefono=?, correo=?, representante_legal=?, representante_trabajadores=?,
        logo_empresa=?, firma_representante_legal=?, firma_representante_trabajadores=?, nombre_fiscal=?, fecha_corte=?
      WHERE id_subcontratista=?
    `;
    await connection.query(queryUpdate, [
      razon_social, rfc, telefono, correo, representante_legal, representante_trabajadores, 
      logo_empresa, firma_representante_legal, firma_representante_trabajadores, nombre_fiscal, fecha_corte, id_subcontratista
    ]);

    const cuadrillasRaw = formData.get('cuadrillas');
    if (cuadrillasRaw) {
      const cuadrillas = JSON.parse(cuadrillasRaw);
      
      const idsActuales = cuadrillas.filter(c => !String(c.id_subcontratista_ft).startsWith('temp_')).map(c => c.id_subcontratista_ft);
      if (idsActuales.length > 0) {
        console.log("IDs actuales de cuadrillas:", idsActuales);
        // CORRECCIÓN: Filtrar por id_subcontratista_principal para NO afectar a otras empresas
        await connection.query('UPDATE Fuerza_Trabajo SET id_subcontratista_ft = NULL WHERE id_subcontratista_principal = ? AND id_subcontratista_ft NOT IN (?)', [id_subcontratista, idsActuales]);
        await connection.query('DELETE FROM Subcontratistas_Fuerza_Trabajo WHERE id_subcontratista_principal = ? AND id_subcontratista_ft NOT IN (?)', [id_subcontratista, idsActuales]);
      } else {
        // CORRECCIÓN: Si se eliminan todas, solo afectar a los de ESTA empresa
        await connection.query('UPDATE Fuerza_Trabajo SET id_subcontratista_ft = NULL WHERE id_subcontratista_principal = ?', [id_subcontratista]);
        await connection.query('DELETE FROM Subcontratistas_Fuerza_Trabajo WHERE id_subcontratista_principal = ?', [id_subcontratista]);
      }

      for (const c of cuadrillas) {
        if (String(c.id_subcontratista_ft).startsWith('temp_')) {
          await connection.query('INSERT INTO Subcontratistas_Fuerza_Trabajo (nombre, id_subcontratista_principal, id_empresa) VALUES (?, ?, ?)', [c.nombre, id_subcontratista, idEmpresa || 1]);
        } else if (c.isEdited) {
          await connection.query('UPDATE Subcontratistas_Fuerza_Trabajo SET nombre = ? WHERE id_subcontratista_ft = ?', [c.nombre, c.id_subcontratista_ft]);
        }
      }
    }

    await connection.commit();
    return NextResponse.json({ success: true, mensaje: "Actualizado correctamente" });

  } catch (error) {
    await connection.rollback();
    console.error("Error en PUT Contratistas:", error);
    return NextResponse.json({ error: "Error al actualizar." }, { status: 500 });
  } finally {
    connection.release();
  }
}

export async function DELETE(request) {
  try {
    const { id } = await request.json();
    const idEmpresa = request.headers.get('x-empresa-id');
    const userRol = request.headers.get('x-user-rol');

    if (!id) return NextResponse.json({ error: "Falta el ID del contratista." }, { status: 400 });

    let authFilter = "";
    const authParams = [];
    if (userRol !== 'Master' && idEmpresa) {
      authFilter = " AND id_empresa = ?";
      authParams.push(idEmpresa);
    }

    await pool.query(`UPDATE Subcontratistas SET bActivo = 0 WHERE id_subcontratista = ?${authFilter}`, [id, ...authParams]);
    
    return NextResponse.json({ success: true, mensaje: "Contratista oculto correctamente." });
  } catch (error) {
    console.error("Error en DELETE Contratistas:", error);
    return NextResponse.json({ error: "Error al intentar eliminar el contratista." }, { status: 500 });
  }
}