import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function GET() {
    try {
        const salt = await bcrypt.genSalt(10);
        const password = await bcrypt.hash("demoObrasOS", salt);
        
        // 1. Asegurar que existe la empresa demo
        await pool.query(`
            INSERT INTO cat_empresas (id_empresa, nombre_comercial, plan_suscripcion, rfc)
            VALUES (0, 'OBRASOS DEMO (SANDBOX)', 'Empresa', 'DEMO990101XYZ')
            ON DUPLICATE KEY UPDATE nombre_comercial = 'OBRASOS DEMO (SANDBOX)';
        `);

        // 2. Crear/Actualizar usuario demo
        // Se usa 'Visitante' para evitar errores de ENUM y se asegura id_empresa = 0
        const query = `
            INSERT INTO Personal_Area (
                nombre, cargo, correo, password, area, rol, activo, debe_cambiar_password, id_empresa,
                permisos_ft, permisos_certificados, permisos_maquinaria, permisos_dc3, permisos_informe, permisos_citas
            ) 
            VALUES ('Demo User', 'Visitante', 'demo@obrasos.com', ?, 'Ambas', 'Visitante', 1, 0, 0, 1, 1, 1, 1, 1, 1)
            ON DUPLICATE KEY UPDATE password = ?, activo = 1, id_empresa = 0;
        `;
        
        await pool.query(query, [password, password]);

        return NextResponse.json({ success: true, message: "Demo v2.0 Provisionada (Pass: demoObrasOS)" });
    } catch (error) {
        console.error("Error en setup demo v2:", error);
        return NextResponse.json({ success: false, error: error.message });
    }
}
