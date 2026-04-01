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

export async function GET() {
  try {
    const query = `
      SELECT id_subcontratista, razon_social, rfc, nombre_fiscal, telefono, correo, representante_legal, 
      firma_representante_legal, representante_trabajadores, firma_representante_trabajadores, nombre_fiscal, logo_empresa
      FROM Subcontratistas 
      WHERE bActivo = 1
      ORDER BY razon_social ASC
    `;
    const [rows] = await pool.query(query);
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

    await connection.beginTransaction();

    const queryInsert = `
      INSERT INTO Subcontratistas 
      (razon_social, rfc, telefono, correo, representante_legal, representante_trabajadores, logo_empresa, firma_representante_legal, firma_representante_trabajadores, nombre_fiscal)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const [result] = await connection.query(queryInsert, [
      razon_social, rfc, telefono, correo, representante_legal, representante_trabajadores, 
      logo_empresa, firma_representante_legal, firma_representante_trabajadores, nombre_fiscal
    ]);
    
    const nuevoId = result.insertId;

    const cuadrillasRaw = formData.get('cuadrillas');
    if (cuadrillasRaw) {
      const cuadrillas = JSON.parse(cuadrillasRaw);
      for (const cuadrilla of cuadrillas) {
        await connection.query('INSERT INTO Subcontratistas_Fuerza_Trabajo (nombre, id_subcontratista_principal) VALUES (?, ?)', [cuadrilla.nombre, nuevoId]);
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
    
    if (!id_subcontratista) return NextResponse.json({ error: "Falta ID del contratista" }, { status: 400 });

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

    const queryUpdate = `
      UPDATE Subcontratistas SET 
        razon_social=?, rfc=?, telefono=?, correo=?, representante_legal=?, representante_trabajadores=?,
        logo_empresa=?, firma_representante_legal=?, firma_representante_trabajadores=?, nombre_fiscal=?
      WHERE id_subcontratista=?
    `;
    await connection.query(queryUpdate, [
      razon_social, rfc, telefono, correo, representante_legal, representante_trabajadores, 
      logo_empresa, firma_representante_legal, firma_representante_trabajadores, nombre_fiscal, id_subcontratista
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
          await connection.query('INSERT INTO Subcontratistas_Fuerza_Trabajo (nombre, id_subcontratista_principal) VALUES (?, ?)', [c.nombre, id_subcontratista]);
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
    if (!id) return NextResponse.json({ error: "Falta el ID del contratista." }, { status: 400 });

    await pool.query('UPDATE Subcontratistas SET bActivo = 0 WHERE id_subcontratista = ?', [id]);
    
    return NextResponse.json({ success: true, mensaje: "Contratista oculto correctamente." });
  } catch (error) {
    console.error("Error en DELETE Contratistas:", error);
    return NextResponse.json({ error: "Error al intentar eliminar el contratista." }, { status: 500 });
  }
}