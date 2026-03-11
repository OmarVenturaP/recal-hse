import { NextResponse } from 'next/server';
import pool from '../../../lib/db';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const contratista = searchParams.get('contratista') || '';
  const pk = searchParams.get('pk') || '';
  const mes = searchParams.get('mes') || '';

  try {
    let query = 'SELECT * FROM actividades_diarias WHERE 1=1';
    const values = [];

    if (contratista) {
      query += ' AND contratista LIKE ?';
      values.push(`%${contratista}%`);
    }
    if (pk) {
      query += ' AND pk LIKE ?';
      values.push(`%${pk}%`);
    }
    if (mes) {
      // AQUÍ ESTABA EL ERROR: Usar comillas simples para '%Y-%m'
      query += " AND DATE_FORMAT(fecha, '%Y-%m') = ?";
      values.push(mes);
    }

    query += ' ORDER BY fecha DESC';

    const connection = await pool.getConnection();
    const [rows] = await connection.execute(query, values);
    connection.release();

    return NextResponse.json(rows);
  } catch (error) {
    console.error("Error ejecutando la consulta SQL:", error);
    // Agregamos el mensaje de error para que sea visible en la consola del navegador si vuelve a fallar
    return NextResponse.json({ error: "Error al obtener datos", detalle: error.message }, { status: 500 });
  }
}