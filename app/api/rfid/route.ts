import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const uid = body.uid?.trim();
    const nombre = body.nombre?.trim() || null;

    if (!uid) {
      return NextResponse.json(
        { error: 'El UID del RFID es obligatorio' },
        { status: 400 }
      );
    }

    // 1. Buscar si el RFID ya existe
    const { data: rfidExistente, error: errorBusqueda } =
      await supabaseServer
        .from('rfid')
        .select(`
          id,
          uid,
          usuario_id,
          estado,
          usuarios (
            id,
            codigo_usuario,
            nombre,
            puntos_totales,
            estado
          )
        `)
        .eq('uid', uid)
        .maybeSingle();

    if (errorBusqueda) {
      return NextResponse.json(
        { error: errorBusqueda.message },
        { status: 500 }
      );
    }

    // 2. Si ya existe, devolver el usuario asociado
    if (rfidExistente) {
      return NextResponse.json({
        nuevo: false,
        mensaje: 'RFID reconocido',
        rfid: rfidExistente,
      });
    }

    // 3. Crear un nuevo código de usuario
    const { count, error: errorConteo } = await supabaseServer
      .from('usuarios')
      .select('*', { count: 'exact', head: true });

    if (errorConteo) {
      return NextResponse.json(
        { error: errorConteo.message },
        { status: 500 }
      );
    }

    const codigoUsuario = `USR-${String((count || 0) + 1).padStart(3, '0')}`;

    // 4. Crear usuario
    const { data: nuevoUsuario, error: errorUsuario } =
      await supabaseServer
        .from('usuarios')
        .insert({
          codigo_usuario: codigoUsuario,
          nombre,
        })
        .select()
        .single();

    if (errorUsuario) {
      return NextResponse.json(
        { error: errorUsuario.message },
        { status: 500 }
      );
    }

    // 5. Asociar RFID al nuevo usuario
    const { data: nuevoRfid, error: errorRfid } =
      await supabaseServer
        .from('rfid')
        .insert({
          uid,
          usuario_id: nuevoUsuario.id,
        })
        .select()
        .single();

    if (errorRfid) {
      return NextResponse.json(
        { error: errorRfid.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      nuevo: true,
      mensaje: 'Nuevo RFID registrado',
      usuario: nuevoUsuario,
      rfid: nuevoRfid,
    });
  } catch {
    return NextResponse.json(
      { error: 'Solicitud inválida' },
      { status: 400 }
    );
  }
}