
import { NextResponse } from 'next/server';
import { createAuthServerClient } from '@/lib/supabase/auth-server';
import { supabaseServer } from '@/lib/supabase/server';

async function verificarAdministrador() {
  const authClient = await createAuthServerClient();

  const {
    data: { user },
    error: authError,
  } = await authClient.auth.getUser();

  if (authError || !user) {
    return { error: 'No has iniciado sesión.', status: 401 as const };
  }

  const { data: perfil, error } = await supabaseServer
    .from('usuarios')
    .select('id, rol, estado')
    .eq('auth_user_id', user.id)
    .maybeSingle();

  if (
    error ||
    !perfil ||
    perfil.rol !== 'admin' ||
    perfil.estado !== 'ACTIVO'
  ) {
    return {
      error: 'No tienes permisos para realizar esta operación.',
      status: 403 as const,
    };
  }

  return { perfil };
}

// GET: consultar usuarios y sus tarjetas RFID asociadas
export async function GET() {
  try {
    const autorizacion = await verificarAdministrador();

    if ('error' in autorizacion) {
      return NextResponse.json(
        { error: autorizacion.error },
        { status: autorizacion.status }
      );
    }

    const { data: usuarios, error: usuariosError } = await supabaseServer
      .from('usuarios')
      .select(
        'id, codigo_usuario, nombre, puntos_totales, rol, estado, fecha_registro'
      )
      .order('fecha_registro', { ascending: false });

    if (usuariosError) {
      throw usuariosError;
    }

    const usuariosConsultados = usuarios ?? [];

    if (usuariosConsultados.length === 0) {
      return NextResponse.json({ usuarios: [] });
    }

    const idsUsuarios = usuariosConsultados.map((usuario) => usuario.id);

    const { data: tarjetas, error: tarjetasError } = await supabaseServer
      .from('rfid')
      .select('id, uid, usuario_id, estado, fecha_asignacion')
      .in('usuario_id', idsUsuarios)
      .order('fecha_asignacion', { ascending: false });

    if (tarjetasError) {
      throw tarjetasError;
    }

    const tarjetasPorUsuario = new Map<number, typeof tarjetas>();

    for (const tarjeta of tarjetas ?? []) {
      if (tarjeta.usuario_id === null) continue;

      const tarjetasUsuario = tarjetasPorUsuario.get(tarjeta.usuario_id) ?? [];
      tarjetasUsuario.push(tarjeta);
      tarjetasPorUsuario.set(tarjeta.usuario_id, tarjetasUsuario);
    }

    const usuariosConRfid = usuariosConsultados.map((usuario) => ({
      ...usuario,
      rfid: tarjetasPorUsuario.get(usuario.id) ?? [],
    }));

    return NextResponse.json({ usuarios: usuariosConRfid });
  } catch (error) {
    console.error('Error consultando usuarios:', error);

    return NextResponse.json(
      { error: 'No fue posible consultar los usuarios.' },
      { status: 500 }
    );
  }
}

// POST: crear usuarios
export async function POST(request: Request) {
  let nuevoUsuarioId: string | null = null;

  try {
    const autorizacion = await verificarAdministrador();

    if ('error' in autorizacion) {
      return NextResponse.json(
        { error: autorizacion.error },
        { status: autorizacion.status }
      );
    }

    const body = await request.json();

    const nombre = String(body.nombre ?? '').trim();
    const email = String(body.email ?? '').trim().toLowerCase();
    const password = String(body.password ?? '');
    const rol = body.rol;

    if (!nombre || !email || !password || !rol) {
      return NextResponse.json(
        { error: 'Todos los campos son obligatorios.' },
        { status: 400 }
      );
    }

    if (!['user', 'maintenance'].includes(rol)) {
      return NextResponse.json(
        { error: 'El rol seleccionado no es válido.' },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'La contraseña debe tener al menos 8 caracteres.' },
        { status: 400 }
      );
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: 'El correo electrónico no es válido.' },
        { status: 400 }
      );
    }

    const { data: authData, error: createError } =
      await supabaseServer.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: nombre,
        },
      });

    if (createError || !authData.user) {
      return NextResponse.json(
        {
          error: createError?.message ?? 'No fue posible crear el usuario.',
        },
        { status: 400 }
      );
    }

    nuevoUsuarioId = authData.user.id;

    // El trigger de Supabase debe crear el perfil automáticamente.
    const { data: perfil, error: buscarError } = await supabaseServer
      .from('usuarios')
      .select('id, codigo_usuario, nombre, rol, estado')
      .eq('auth_user_id', nuevoUsuarioId)
      .maybeSingle();

    if (buscarError || !perfil) {
      throw new Error(
        'No se encontró el perfil generado automáticamente.'
      );
    }

    const { data: perfilActualizado, error: actualizarError } =
      await supabaseServer
        .from('usuarios')
        .update({ rol })
        .eq('id', perfil.id)
        .select('id, codigo_usuario, nombre, rol, estado')
        .single();

    if (actualizarError || !perfilActualizado) {
      throw new Error(
        actualizarError?.message ?? 'No fue posible asignar el rol.'
      );
    }

    nuevoUsuarioId = null;

    return NextResponse.json(
      {
        mensaje: 'Usuario creado correctamente.',
        usuario: {
          ...perfilActualizado,
          email,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    if (nuevoUsuarioId) {
      const { error: deleteError } =
        await supabaseServer.auth.admin.deleteUser(nuevoUsuarioId);

      if (deleteError) {
        console.error(
          'Error al revertir la creación:',
          deleteError.message
        );
      }
    }

    console.error('Error al crear usuario:', error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Error interno al crear el usuario.',
      },
      { status: 500 }
    );
  }
}
