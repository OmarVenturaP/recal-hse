// src/app/api/admin/backup/route.js
import { NextResponse } from 'next/server';
import { createZippedBackup } from '@/lib/backup';
import { sendEmail } from '@/lib/email';

export async function GET(request) {
  try {
    // 1. Protection Check
    const userRole = request.headers.get('x-user-rol');
    const authHeader = request.headers.get('Authorization');
    const cronSecret = request.nextUrl.searchParams.get('secret');
    
    // Allow if is Master OR if matches CRON_SECRET (for automatic backups)
    const isCronSub = cronSecret === process.env.CRON_SECRET;
    const isMaster = userRole === 'Master';

    if (!isMaster && !isCronSub) {
      return NextResponse.json(
        { success: false, error: 'No autorizado para realizar esta acción' },
        { status: 403 }
      );
    }

    // 2. Generate Backup
    console.log('Starting database backup...');
    const zipBuffer = await createZippedBackup();
    const filename = `respaldo_obras_os_docs_${new Date().toISOString().split('T')[0]}.zip`;

    // 3. Send Email
    console.log('Sending backup via email...');
    const emailResult = await sendEmail({
      to: process.env.BACKUP_EMAIL_TO,
      subject: `Respaldo Diario ObrasOS DOCS - ${new Date().toLocaleDateString()}`,
      text: `Se adjunta el respaldo automático de la base de datos correspondiente al día de hoy.`,
      html: `
        <div style="font-family: sans-serif; padding: 20px;">
          <h2 style="color: #2563eb;">Respaldo del Sistema ObrasOS DOCS</h2>
          <p>Se ha generado un nuevo respaldo de la base de datos.</p>
          <ul>
            <li><strong>Fecha:</strong> ${new Date().toLocaleString()}</li>
            <li><strong>Archivo:</strong> ${filename}</li>
            <li><strong>Tipo:</strong> SQL Dump (ZIP)</li>
          </ul>
          <p style="color: #64748b; font-size: 14px;">Este es un mensaje automático generado por el sistema.</p>
        </div>
      `,
      attachments: [
        {
          filename,
          content: zipBuffer,
        },
      ],
    });

    if (!emailResult.success) {
      throw new Error(emailResult.error);
    }

    return NextResponse.json({
      success: true,
      message: 'Respaldo generado y enviado con éxito',
      filename,
    });

  } catch (error) {
    console.error('Backup error:', error);
    return NextResponse.json(
      { success: false, error: 'Error al generar o enviar el respaldo: ' + error.message },
      { status: 500 }
    );
  }
}
