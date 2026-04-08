import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';

// =====================================================================
// POST: Subir foto para informe de seguridad
// Recibe FormData con campo 'foto'
// Guarda en public/uploads/informes/ y retorna la ruta
// =====================================================================
export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('foto');

    if (!file) {
      return NextResponse.json({ error: 'No se envió ningún archivo' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Crear directorio si no existe
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'informes');
    await mkdir(uploadDir, { recursive: true });

    // Nombre único para evitar colisiones
    const ext = path.extname(file.name || '.jpg').toLowerCase();
    const fileName = `${randomUUID()}${ext}`;
    const filePath = path.join(uploadDir, fileName);

    await writeFile(filePath, buffer);

    const ruta = `/uploads/informes/${fileName}`;

    return NextResponse.json({ success: true, ruta });
  } catch (error) {
    console.error('Error al subir foto:', error);
    return NextResponse.json({ error: 'Error al subir la foto' }, { status: 500 });
  }
}
