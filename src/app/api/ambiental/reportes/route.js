import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// --- GET: Obtener datos de un reporte específico para un mes/año ---
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const idEmpresa = request.headers.get('x-empresa-id');
    const userRol = request.headers.get('x-user-rol');
    const userArea = request.headers.get('x-user-area');

    // Validación de Autorización
    const isAuthorized = userRol === 'Admin' || 
                         userRol === 'Master' || 
                         (userArea && (userArea.toLowerCase().includes('ambiente') || userArea.toLowerCase().includes('ambiental')));

    if (!isAuthorized || !idEmpresa) {
      return NextResponse.json({ error: "No autorizado o empresa no identificada" }, { status: 403 });
    }

    const mes = searchParams.get('mes');
    const anio = searchParams.get('anio');
    const idCatReporte = searchParams.get('id_cat_reporte');

    if (!mes || !anio || !idCatReporte) {
      return NextResponse.json({ error: "Faltan parámetros" }, { status: 400 });
    }

    // 1. Buscar el dossier para este mes/año/empresa
    const [dossierRows] = await pool.query(
      'SELECT id_dossier FROM Ambiental_Dossier WHERE id_empresa = ? AND mes = ? AND anio = ?',
      [idEmpresa, mes, anio]
    );

    if (dossierRows.length === 0) {
      return NextResponse.json({ success: true, data: null });
    }

    const idDossier = dossierRows[0].id_dossier;

    // 2. Buscar el item del reporte específico
    const [itemRows] = await pool.query(
      'SELECT * FROM Ambiental_Reportes_Items WHERE id_dossier = ? AND id_cat_reporte = ?',
      [idDossier, idCatReporte]
    );

    if (itemRows.length === 0) {
      return NextResponse.json({ success: true, data: null });
    }

    const item = itemRows[0];

    // 3. Buscar las fotos
    const [fotoRows] = await pool.query(
      'SELECT * FROM Ambiental_Reportes_Fotos WHERE id_item = ?',
      [item.id_item]
    );

    return NextResponse.json({ 
      success: true, 
      data: {
        ...item,
        is_na: !!item.is_na,
        fotos: fotoRows
      }
    });

  } catch (error) {
    console.error("Error cargando reporte ambiental:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

// --- POST: Guardar o actualizar reporte con fotos ---
export async function POST(request) {
  try {
    const idUsuario = request.headers.get('x-user-id');
    const idEmpresa = request.headers.get('x-empresa-id');
    const userRol = request.headers.get('x-user-rol');
    const userArea = request.headers.get('x-user-area');

    // Validación de Autorización
    const isAuthorized = userRol === 'Admin' || 
                         userRol === 'Master' || 
                         (userArea && (userArea.toLowerCase().includes('ambiente') || userArea.toLowerCase().includes('ambiental')));

    if (!isAuthorized || !idUsuario || !idEmpresa) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const formData = await request.formData();
    const mes = formData.get('mes');
    const anio = formData.get('anio');
    const idCatReporte = formData.get('id_cat_reporte');
    const frenteTrabajo = formData.get('frente_trabajo');
    const observaciones = formData.get('observaciones');
    
    // Las fotos vienen como archivos
    const fotos = formData.getAll('fotos'); // Archivos
    const piesDeFoto = formData.getAll('pies_de_foto'); // Array de strings
    const isNa = formData.get('is_na') === 'true' ? 1 : 0;

    // 1. Asegurar que existe el dossier
    let [dossierRows] = await pool.query(
      'SELECT id_dossier FROM Ambiental_Dossier WHERE id_empresa = ? AND mes = ? AND anio = ?',
      [idEmpresa, mes, anio]
    );

    let idDossier;
    if (dossierRows.length === 0) {
      const [resDossier] = await pool.query(
        'INSERT INTO Ambiental_Dossier (id_empresa, mes, anio, usuario_registro) VALUES (?, ?, ?, ?)',
        [idEmpresa, mes, anio, idUsuario]
      );
      idDossier = resDossier.insertId;
    } else {
      idDossier = dossierRows[0].id_dossier;
    }

    // 2. Asegurar que existe el item (Ambiental_Reportes_Items)
    let [itemRows] = await pool.query(
      'SELECT id_item FROM Ambiental_Reportes_Items WHERE id_dossier = ? AND id_cat_reporte = ?',
      [idDossier, idCatReporte]
    );

    let idItem;
    if (itemRows.length === 0) {
      const [resItem] = await pool.query(
        'INSERT INTO Ambiental_Reportes_Items (id_dossier, id_cat_reporte, frente_trabajo, observaciones, is_na) VALUES (?, ?, ?, ?, ?)',
        [idDossier, idCatReporte, frenteTrabajo, observaciones, isNa]
      );
      idItem = resItem.insertId;
    } else {
      idItem = itemRows[0].id_item;
      await pool.query(
        'UPDATE Ambiental_Reportes_Items SET frente_trabajo = ?, observaciones = ?, is_na = ? WHERE id_item = ?',
        [frenteTrabajo, observaciones, isNa, idItem]
      );
    }

    // 3. Procesar Fotos (Solo si se subieron nuevas)
    if (fotos && fotos.length > 0) {
      for (let i = 0; i < fotos.length; i++) {
        const file = fotos[i];
        if (!file || typeof file === 'string') continue; 

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Subir a Cloudinary
        const uploadRes = await new Promise((resolve, reject) => {
          cloudinary.uploader.upload_stream({
            folder: `recal_hse/ambiental/${idEmpresa}/${anio}/${mes}`,
            resource_type: 'image'
          }, (err, result) => {
            if (err) reject(err);
            else resolve(result);
          }).end(buffer);
        });

        // Guardar en DB
        await pool.query(
          'INSERT INTO Ambiental_Reportes_Fotos (id_item, url_cloudinary, pie_de_foto) VALUES (?, ?, ?)',
          [idItem, uploadRes.secure_url, piesDeFoto[i] || '']
        );
      }
    }

    // 4. Actualizar pies de foto existentes (NUEVO)
    const piesExistentesRaw = formData.getAll('pies_de_foto_existentes');
    if (piesExistentesRaw && piesExistentesRaw.length > 0) {
      for (const raw of piesExistentesRaw) {
        try {
          const { id, pie } = JSON.parse(raw);
          if (id && pie !== undefined) {
            await pool.query(
              'UPDATE Ambiental_Reportes_Fotos SET pie_de_foto = ? WHERE id_foto = ? AND id_item = ?',
              [pie, id, idItem]
            );
          }
        } catch (e) {
          console.error("Error procesando pie existente:", e);
        }
      }
    }

    // 5. Registrar en Auditoría
    await pool.query(
      `INSERT INTO Historial_Auditoria (id_empresa, modulo, accion, id_registro, descripcion, datos_nuevos, id_usuario, fecha_cambio)
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
      [idEmpresa, 'HSE Ambiental', itemRows.length === 0 ? 'INSERT' : 'UPDATE', idItem, `Guardado de reporte: ${idCatReporte} para periodo ${mes}/${anio}`, JSON.stringify({ mes, anio, frenteTrabajo, observaciones, total_fotos: fotos.length }), idUsuario]
    );

    return NextResponse.json({ success: true, message: "Reporte guardado correctamente" });

  } catch (error) {
    console.error("Error guardando reporte ambiental:", error);
    return NextResponse.json({ error: "Error al guardar el reporte" }, { status: 500 });
  }
}

// --- DELETE: Eliminar una foto o un reporte completo ---
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const idUsuario = request.headers.get('x-user-id');
    const idEmpresa = request.headers.get('x-empresa-id');
    const userRol = request.headers.get('x-user-rol');
    const userArea = request.headers.get('x-user-area');

    // Validación de Autorización
    const isAuthorized = userRol === 'Admin' || 
                         userRol === 'Master' || 
                         (userArea && (userArea.toLowerCase().includes('ambiente') || userArea.toLowerCase().includes('ambiental')));

    if (!isAuthorized || !idUsuario || !idEmpresa) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const idFoto = searchParams.get('id_foto');
    const idItem = searchParams.get('id_item');

    if (idFoto) {
      // Eliminar foto individual
      await pool.query('DELETE FROM Ambiental_Reportes_Fotos WHERE id_foto = ?', [idFoto]);
      return NextResponse.json({ success: true });
    }

    if (idItem) {
      // Eliminar REPORTE COMPLETO (Item + Fotos)
      // Primero obtenemos info para auditoría
      const [itemRows] = await pool.query('SELECT * FROM Ambiental_Reportes_Items WHERE id_item = ?', [idItem]);
      if (itemRows.length > 0) {
        // Borrar fotos primero
        await pool.query('DELETE FROM Ambiental_Reportes_Fotos WHERE id_item = ?', [idItem]);
        // Borrar item
        await pool.query('DELETE FROM Ambiental_Reportes_Items WHERE id_item = ?', [idItem]);

        // Registrar en Auditoría
        await pool.query(
          `INSERT INTO Historial_Auditoria (id_empresa, modulo, accion, id_registro, descripcion, id_usuario, fecha_cambio)
           VALUES (?, ?, ?, ?, ?, ?, NOW())`,
          [idEmpresa, 'HSE Ambiental', 'DELETE', idItem, `Eliminación completa de reporte ID: ${idItem}`, idUsuario]
        );
      }
      return NextResponse.json({ success: true, message: "Reporte eliminado correctamente" });
    }

    return NextResponse.json({ error: "Parámetros insuficientes" }, { status: 400 });
  } catch (error) {
    console.error("Error en DELETE reporte ambiental:", error);
    return NextResponse.json({ error: "Error al eliminar" }, { status: 500 });
  }
}
