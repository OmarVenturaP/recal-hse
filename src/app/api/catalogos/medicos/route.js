import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import fs from 'fs';
import path from 'path';

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

    // Migración robusta compatible con versiones antiguas de MySQL
    try {
      const [columns] = await pool.query(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'Medicos_Empresa' 
        AND COLUMN_NAME = 'binario_plantilla'
      `);
      
      if (columns.length === 0) {
        // No existe, intentamos crear ambas
        try {
          await pool.query(`ALTER TABLE Medicos_Empresa ADD COLUMN nombre_plantilla VARCHAR(255) DEFAULT 'CERTIFICADO_MEDICO.docx' AFTER ciudad`);
        } catch (e) {} // Ignorar si nombre_plantilla ya existía
        
        await pool.query(`ALTER TABLE Medicos_Empresa ADD COLUMN binario_plantilla LONGBLOB AFTER nombre_plantilla`);
      }
    } catch (e) {
      console.error("Error en migración de médicos:", e);
    }

    const query = `
      SELECT 
        id_medico, 
        cedula, 
        nombre, 
        especialidad, 
        universidad, 
        ciudad,
        nombre_plantilla,
        (binario_plantilla IS NOT NULL) as tiene_archivo
      FROM Medicos_Empresa
      WHERE ${whereClause}
      ORDER BY nombre ASC
    `;
    const [rows] = await pool.query(query, queryParams);
    
    return NextResponse.json(rows);
  } catch (error) {
    console.error("Error al cargar médicos para el catálogo:", error);
    return NextResponse.json({ error: "Error de base de datos" }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const idEmpresa = request.headers.get('x-empresa-id');
    const formData = await request.formData();
    
    const cedula = formData.get('cedula');
    const nombre = formData.get('nombre');
    const especialidad = formData.get('especialidad');
    const universidad = formData.get('universidad');
    const ciudad = formData.get('ciudad');
    const nombre_plantilla = formData.get('nombre_plantilla') || 'CERTIFICADO_MEDICO.docx';

    if (!cedula || !nombre) {
      return NextResponse.json({ error: "La cédula y el nombre son obligatorios." }, { status: 400 });
    }

    const queryInsert = `
      INSERT INTO Medicos_Empresa (cedula, nombre, especialidad, universidad, ciudad, nombre_plantilla, id_empresa, bActivo)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1)
    `;
    
    const [result] = await pool.query(queryInsert, [cedula, nombre, especialidad, universidad, ciudad, nombre_plantilla, idEmpresa || 1]);

    // --- MANEJO DE ARCHIVO (EN BASE DE DATOS) ---
    const archivo_plantilla = formData.get('archivo_plantilla');
    if (archivo_plantilla && typeof archivo_plantilla !== 'string') {
      try {
        const buffer = Buffer.from(await archivo_plantilla.arrayBuffer());
        const finalFilename = `plantilla_medico_${result.insertId}.docx`;
        
        // Guardar binario y nombre final en DB
        await pool.query(
          'UPDATE Medicos_Empresa SET binario_plantilla = ?, nombre_plantilla = ? WHERE id_medico = ?', 
          [buffer, finalFilename, result.insertId]
        );
      } catch (uploadError) {
        console.error("Error al guardar archivo en DB (POST):", uploadError);
      }
    }

    return NextResponse.json({ success: true, id: result.insertId });

  } catch (error) {
    console.error("Error en POST Médicos:", error);
    return NextResponse.json({ error: "Error al guardar el médico." }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const idEmpresa = request.headers.get('x-empresa-id');
    const userRol = request.headers.get('x-user-rol');
    const formData = await request.formData();

    const id_medico = formData.get('id_medico');
    const cedula = formData.get('cedula');
    const nombre = formData.get('nombre');
    const especialidad = formData.get('especialidad');
    const universidad = formData.get('universidad');
    const ciudad = formData.get('ciudad');
    const nombre_plantilla = formData.get('nombre_plantilla') || 'CERTIFICADO_MEDICO.docx';
    
    if (!id_medico) {
      return NextResponse.json({ error: "Falta el ID del médico." }, { status: 400 });
    }

    // Validar propiedad
    if (userRol !== 'Master' && idEmpresa) {
      const [verif] = await pool.query('SELECT 1 FROM Medicos_Empresa WHERE id_medico = ? AND id_empresa = ?', [id_medico, idEmpresa]);
      if (verif.length === 0) return NextResponse.json({ error: "No tienes permisos para modificar este registro." }, { status: 403 });
    }

    if (!cedula || !nombre) {
      return NextResponse.json({ error: "La cédula y el nombre son obligatorios." }, { status: 400 });
    }

    const queryUpdate = `
      UPDATE Medicos_Empresa 
      SET cedula = ?, nombre = ?, especialidad = ?, universidad = ?, ciudad = ?, nombre_plantilla = ?
      WHERE id_medico = ?
    `;
    
    await pool.query(queryUpdate, [cedula, nombre, especialidad, universidad, ciudad, nombre_plantilla, id_medico]);

    // --- MANEJO DE ARCHIVO (PUT EN BASE DE DATOS) ---
    const archivo_plantilla = formData.get('archivo_plantilla');
    if (archivo_plantilla && typeof archivo_plantilla !== 'string') {
      try {
        const buffer = Buffer.from(await archivo_plantilla.arrayBuffer());
        const finalFilename = `plantilla_medico_${id_medico}.docx`;
        
        await pool.query(
          'UPDATE Medicos_Empresa SET binario_plantilla = ?, nombre_plantilla = ? WHERE id_medico = ?', 
          [buffer, finalFilename, id_medico]
        );
      } catch (uploadError) {
        console.error("Error al guardar archivo en DB (PUT):", uploadError);
      }
    }

    return NextResponse.json({ success: true, mensaje: "Actualizado correctamente" });

  } catch (error) {
    console.error("Error en PUT Médicos:", error);
    return NextResponse.json({ error: "Error al actualizar the médico." }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { id } = await request.json();
    const idEmpresa = request.headers.get('x-empresa-id');
    const userRol = request.headers.get('x-user-rol');

    if (!id) return NextResponse.json({ error: "Falta el ID del médico." }, { status: 400 });

    let authFilter = '';
    const authParams = [id];
    if (userRol !== 'Master' && idEmpresa) {
      authFilter = ' AND id_empresa = ?';
      authParams.push(idEmpresa);
    }

    await pool.query(`UPDATE Medicos_Empresa SET bActivo = 0 WHERE id_medico = ?${authFilter}`, authParams);
    
    return NextResponse.json({ success: true, mensaje: "Médico oculto correctamente." });
  } catch (error) {
    console.error("Error en DELETE Médicos:", error);
    return NextResponse.json({ error: "Error al intentar eliminar el registro." }, { status: 500 });
  }
}
