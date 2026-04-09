import { NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';

// =====================================================================
// POST: Subir foto para informe de seguridad a Cloudinary
// Recibe FormData con campo 'foto'
// Retorna la URL segura de Cloudinary
// =====================================================================

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('foto');

    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: 'No se envió ningún archivo válido' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const fileBase64 = `data:${file.type};base64,${buffer.toString('base64')}`;

    console.log("Subiendo foto de informe a Cloudinary...");
    const uploadResponse = await cloudinary.uploader.upload(fileBase64, { 
      folder: 'recal_hse_informes' 
    });

    // uploadResponse.secure_url es la ruta absoluta en la nube
    return NextResponse.json({ success: true, ruta: uploadResponse.secure_url });
  } catch (error) {
    console.error('Error al subir foto a Cloudinary:', error);
    return NextResponse.json({ error: 'Error al subir la foto a la nube' }, { status: 500 });
  }
}
