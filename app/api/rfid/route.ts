
import { NextResponse } from 'next/server';
import { createAuthServerClient } from '@/lib/supabase/auth-server';
import { supabaseServer } from '@/lib/supabase/server';

type MotivoReporte = 'PERDIDA' | 'ROBO' | 'DANADA';

const MOTIVOS_VALIDOS: MotivoReporte[] = [
  'PERDIDA',
  'ROBO',
  'DANADA',
];

// =====================================================
// HISTORIAL DE MOVIMIENTOS RFID
// =====================================================

type EventoRFID = {
  rfid_id: number;
  usuario_id: number;
  accion: string;
  estado_anterior: string | null;
  estado_nuevo: string | null;
  motivo?: string | null;
  observacion?: string | null;
  autorizado_por_empresa?: string | null;
  referencia_autorizacion?: string | null;
  registrado_por: number | null;
};

async function registrarHistorialRFID(evento: EventoRFID): Promise<boolean> {
  const { error } = await supabaseServer
    .from('historial_rfid')
    .insert({
      rfid_id: evento.rfid_id,
      usuario_id: evento.usuario_id,
      accion: evento.accion,
      estado_anterior: evento.estado_anterior,
      estado_nuevo: evento.estado_nuevo,
      motivo: evento.motivo ?? null,
      observacion: evento.observacion ?? null,
      autorizado_por_empresa: evento.autorizado_por_empresa ?? null,
      referencia_autorizacion: evento.referencia_autorizacion ?? null,
      registrado_por: evento.registrado_por,
    });

  if (error) {
    console.error('Error registrando historial RFID:', error.message);
    return false;
  }

  return true;
}

async function obtenerPerfil() {
  const authClient = await createAuthServerClient();

  const {
    data: { user },
    error: authError,
  } = await authClient.auth.getUser();

  if (authError || !user) {
    return {
      error: 'Debes iniciar sesión para realizar esta operación.',
      status: 401,
    } as const;
  }

  const { data: perfil, error } = await supabaseServer
    .from('usuarios')
    .select('id, nombre, rol, estado')
    .eq('auth_user_id', user.id)
    .maybeSingle();

  if (error || !perfil || perfil.estado !== 'ACTIVO') {
    return {
      error: 'No se encontró un perfil SPING activo.',
      status: 403,
    } as const;
  }

  return { perfil } as const;
}

// =====================================================
// GET: CONSULTAR TARJETAS RFID
// =====================================================

export async function GET() {
  try {
    const autorizacion = await obtenerPerfil();

    if ('error' in autorizacion) {
      return NextResponse.json(
        { error: autorizacion.error },
        { status: autorizacion.status }
      );
    }

    const { perfil } = autorizacion;
    const esAdmin = perfil.rol === 'admin';

    let consultaTarjetas = supabaseServer
      .from('rfid')
      .select('id, uid, usuario_id, estado, fecha_asignacion')
      .order('fecha_asignacion', { ascending: false });

    // Los usuarios normales y mantenimiento solo consultan sus tarjetas.
    if (!esAdmin) {
      consultaTarjetas = consultaTarjetas.eq('usuario_id', perfil.id);
    }

    const { data: tarjetas, error: tarjetasError } =
      await consultaTarjetas;

    if (tarjetasError) {
      console.error('Error consultando tarjetas:', tarjetasError.message);

      return NextResponse.json(
        { error: 'No fue posible consultar las tarjetas RFID.' },
        { status: 500 }
      );
    }

    const tarjetasConsultadas = tarjetas ?? [];
    const idsUsuarios = [
      ...new Set(
        tarjetasConsultadas
          .map((tarjeta) => tarjeta.usuario_id)
          .filter((id): id is number => id !== null)
      ),
    ];

    let usuarios: {
      id: number;
      codigo_usuario: string;
      nombre: string;
      rol: string;
      estado: string;
    }[] = [];

    if (idsUsuarios.length > 0) {
      const { data, error: usuariosError } = await supabaseServer
        .from('usuarios')
        .select('id, codigo_usuario, nombre, rol, estado')
        .in('id', idsUsuarios);

      if (usuariosError) {
        throw usuariosError;
      }

      usuarios = data ?? [];
    }

    const tarjetasConUsuario = tarjetasConsultadas.map((tarjeta) => {
      const propietario = usuarios.find(
        (usuario) => usuario.id === tarjeta.usuario_id
      );

      return {
        ...tarjeta,
        usuario: propietario ?? null,
      };
    });

    // Las solicitudes de reposición solo son visibles para administradores.
    let solicitudes: {
      id: number;
      usuario_id: number;
      rfid_id: number;
      motivo: string;
      detalle: string | null;
      estado_solicitud: string;
      fecha_solicitud: string;
      fecha_resolucion: string | null;
      resuelto_por: number | null;
      observacion_admin: string | null;
    }[] = [];

    if (esAdmin) {
      const { data, error: solicitudesError } = await supabaseServer
        .from('solicitudes_reposicion_rfid')
        .select(
          'id, usuario_id, rfid_id, motivo, detalle, estado_solicitud, fecha_solicitud, fecha_resolucion, resuelto_por, observacion_admin'
        )
        .order('fecha_solicitud', { ascending: false });

      if (solicitudesError) {
        throw solicitudesError;
      }

      solicitudes = data ?? [];
    }

    let historial: Record<string, unknown>[] = [];

    if (esAdmin) {
      const { data: eventos, error: historialError } = await supabaseServer
        .from('historial_rfid')
        .select('id, rfid_id, usuario_id, accion, estado_anterior, estado_nuevo, motivo, observacion, autorizado_por_empresa, referencia_autorizacion, registrado_por, fecha_evento')
        .order('fecha_evento', { ascending: false })
        .limit(300);

      if (historialError) {
        throw historialError;
      }

      historial = eventos ?? [];
    }

    return NextResponse.json({
      tarjetas: tarjetasConUsuario,
      solicitudes,
      historial,
    });
  } catch (error) {
    console.error('Error en consulta RFID:', error);

    return NextResponse.json(
      { error: 'No fue posible consultar la información RFID.' },
      { status: 500 }
    );
  }
}

// =====================================================
// POST: OPERACIONES RFID
// =====================================================

export async function POST(request: Request) {
  try {
    const autorizacion = await obtenerPerfil();

    if ('error' in autorizacion) {
      return NextResponse.json(
        { error: autorizacion.error },
        { status: autorizacion.status }
      );
    }

    const { perfil } = autorizacion;
    const esAdmin = perfil.rol === 'admin';

    const body = await request.json();
    const accion = String(body.accion ?? 'registrar').toLowerCase();

    // =====================================================
    // 1. APROBAR O RECHAZAR SOLICITUDES DE REPOSICIÓN (ADMIN)
    // =====================================================

    if (accion === 'aprobar_reposicion' || accion === 'rechazar_reposicion') {
      if (!esAdmin) {
        return NextResponse.json(
          { error: 'Solo un administrador puede resolver solicitudes de reposición.' },
          { status: 403 }
        );
      }

      const solicitudId = Number(body.solicitudId);

      if (!Number.isInteger(solicitudId) || solicitudId <= 0) {
        return NextResponse.json(
          { error: 'El identificador de la solicitud no es válido.' },
          { status: 400 }
        );
      }

      const estadoDestino = accion === 'aprobar_reposicion' ? 'APROBADA' : 'RECHAZADA';
      const observacion = String(body.observacion ?? '').trim();

      if (observacion.length > 1000) {
        return NextResponse.json(
          { error: 'La observación no puede superar los 1000 caracteres.' },
          { status: 400 }
        );
      }

      if (estadoDestino === 'RECHAZADA' && !observacion) {
        return NextResponse.json(
          { error: 'Debes indicar el motivo del rechazo.' },
          { status: 400 }
        );
      }

      const { data: solicitudPendiente, error: consultaSolicitudError } =
        await supabaseServer
          .from('solicitudes_reposicion_rfid')
          .select('id, usuario_id, rfid_id, motivo, detalle, estado_solicitud')
          .eq('id', solicitudId)
          .maybeSingle();

      if (consultaSolicitudError || !solicitudPendiente) {
        return NextResponse.json(
          { error: 'No se encontró la solicitud de reposición.' },
          { status: 404 }
        );
      }

      if (solicitudPendiente.estado_solicitud !== 'PENDIENTE') {
        return NextResponse.json(
          { error: 'Esta solicitud ya fue resuelta anteriormente.' },
          { status: 409 }
        );
      }

      // La tarjeta reportada se conserva en el historial; nunca se elimina ni reactiva.
      const { data: tarjetaReportada, error: tarjetaReportadaError } =
        await supabaseServer
          .from('rfid')
          .select('id, estado, usuario_id')
          .eq('id', solicitudPendiente.rfid_id)
          .eq('usuario_id', solicitudPendiente.usuario_id)
          .maybeSingle();

      if (tarjetaReportadaError || !tarjetaReportada || tarjetaReportada.estado !== 'REPORTADA') {
        return NextResponse.json(
          { error: 'La tarjeta asociada no existe o ya no está en estado REPORTADA.' },
          { status: 409 }
        );
      }

      const { data: solicitudActualizada, error: actualizacionSolicitudError } =
        await supabaseServer
          .from('solicitudes_reposicion_rfid')
          .update({
            estado_solicitud: estadoDestino,
            fecha_resolucion: new Date().toISOString(),
            resuelto_por: perfil.id,
            observacion_admin: observacion || null,
          })
          .eq('id', solicitudId)
          .eq('estado_solicitud', 'PENDIENTE')
          .select('id, usuario_id, rfid_id, estado_solicitud, fecha_resolucion, resuelto_por, observacion_admin')
          .maybeSingle();

      if (actualizacionSolicitudError || !solicitudActualizada) {
        console.error('Error resolviendo solicitud RFID:', actualizacionSolicitudError?.message);
        return NextResponse.json(
          { error: 'No se pudo actualizar la solicitud. Puede que ya haya sido resuelta.' },
          { status: 409 }
        );
      }

      const historialGuardado = await registrarHistorialRFID({
        rfid_id: solicitudActualizada.rfid_id,
        usuario_id: solicitudActualizada.usuario_id,
        accion: estadoDestino === 'APROBADA' ? 'REPOSICION_APROBADA' : 'REPOSICION_RECHAZADA',
        estado_anterior: 'REPORTADA',
        estado_nuevo: 'REPORTADA',
        motivo: solicitudPendiente.motivo,
        observacion: observacion || null,
        registrado_por: perfil.id,
      });

      return NextResponse.json({
        exitoso: true,
        historialRegistrado: historialGuardado,
        mensaje: estadoDestino === 'APROBADA'
          ? 'Solicitud aprobada. La tarjeta anterior permanece REPORTADA; ahora puedes registrar una nueva tarjeta para este usuario.'
          : 'Solicitud rechazada. La tarjeta anterior permanece REPORTADA.',
        solicitud: solicitudActualizada,
      });
    }

    // =====================================================
    // 2. REACTIVAR TARJETA REPORTADA (ADMINISTRADOR)
    // =====================================================

    if (accion === 'reactivar') {
      if (!esAdmin) {
        return NextResponse.json(
          { error: 'Solo un administrador puede reactivar tarjetas RFID.' },
          { status: 403 }
        );
      }

      const tarjetaId = Number(body.tarjetaId);
      const autorizadoPorEmpresa = String(body.autorizadoPorEmpresa ?? '').trim();
      const referenciaAutorizacion = String(body.referenciaAutorizacion ?? '').trim();
      const motivo = String(body.motivo ?? '').trim();
      const observacion = String(body.observacion ?? '').trim();

      if (!Number.isInteger(tarjetaId) || tarjetaId <= 0) {
        return NextResponse.json(
          { error: 'El identificador de la tarjeta no es válido.' },
          { status: 400 }
        );
      }

      if (!autorizadoPorEmpresa || !referenciaAutorizacion || !motivo) {
        return NextResponse.json(
          { error: 'Debes indicar la empresa que autoriza, la referencia de autorización y el motivo.' },
          { status: 400 }
        );
      }

      if ([autorizadoPorEmpresa, referenciaAutorizacion, motivo, observacion].some((valor) => valor.length > 1000)) {
        return NextResponse.json(
          { error: 'Los campos de autorización no pueden superar los 1000 caracteres.' },
          { status: 400 }
        );
      }

      const { data: tarjetaReportada, error: consultaTarjetaError } = await supabaseServer
        .from('rfid')
        .select('id, uid, usuario_id, estado, fecha_asignacion')
        .eq('id', tarjetaId)
        .maybeSingle();

      if (consultaTarjetaError || !tarjetaReportada) {
        return NextResponse.json(
          { error: 'No se encontró la tarjeta RFID.' },
          { status: 404 }
        );
      }

      if (!tarjetaReportada.usuario_id || tarjetaReportada.estado !== 'REPORTADA') {
        return NextResponse.json(
          { error: 'Solo se pueden reactivar tarjetas asignadas que estén en estado REPORTADA.' },
          { status: 409 }
        );
      }

      const { data: otraTarjeta, error: otraTarjetaError } = await supabaseServer
        .from('rfid')
        .select('id')
        .eq('usuario_id', tarjetaReportada.usuario_id)
        .eq('estado', 'ACTIVA')
        .neq('id', tarjetaReportada.id)
        .maybeSingle();

      if (otraTarjetaError) {
        return NextResponse.json(
          { error: 'No se pudo verificar si el usuario tiene otra tarjeta activa.' },
          { status: 500 }
        );
      }

      if (otraTarjeta) {
        return NextResponse.json(
          { error: 'El usuario ya tiene otra tarjeta activa. Debes resolver esa asignación antes de reactivar esta tarjeta.' },
          { status: 409 }
        );
      }

      const { data: tarjetaReactivada, error: reactivacionError } = await supabaseServer
        .from('rfid')
        .update({ estado: 'ACTIVA' })
        .eq('id', tarjetaReportada.id)
        .eq('estado', 'REPORTADA')
        .select('id, uid, usuario_id, estado, fecha_asignacion')
        .maybeSingle();

      if (reactivacionError || !tarjetaReactivada) {
        return NextResponse.json(
          { error: 'No se pudo reactivar la tarjeta. Verifica que continúe en estado REPORTADA.' },
          { status: 409 }
        );
      }

      const historialGuardado = await registrarHistorialRFID({
        rfid_id: tarjetaReactivada.id,
        usuario_id: tarjetaReactivada.usuario_id!,
        accion: 'REACTIVACION',
        estado_anterior: 'REPORTADA',
        estado_nuevo: 'ACTIVA',
        motivo,
        observacion: observacion || null,
        autorizado_por_empresa: autorizadoPorEmpresa,
        referencia_autorizacion: referenciaAutorizacion,
        registrado_por: perfil.id,
      });

      return NextResponse.json({
        exitoso: true,
        historialRegistrado: historialGuardado,
        mensaje: historialGuardado
          ? 'Tarjeta reactivada correctamente con autorización empresarial.'
          : 'Tarjeta reactivada, pero no fue posible guardar el evento en el historial. Revisa los registros del servidor.',
        rfid: tarjetaReactivada,
      });
    }

    // =====================================================
    // 3. BLOQUEAR, DESBLOQUEAR, REPORTAR O SOLICITAR
    // =====================================================

    if (
      [
        'bloquear',
        'desbloquear',
        'reportar',
        'solicitar_reposicion',
      ].includes(accion)
    ) {
      const tarjetaId = Number(body.tarjetaId);

      if (!Number.isInteger(tarjetaId) || tarjetaId <= 0) {
        return NextResponse.json(
          { error: 'El identificador de la tarjeta no es válido.' },
          { status: 400 }
        );
      }

      // El administrador puede consultar cualquier tarjeta.
      // Los demás roles solamente pueden operar sobre sus propias tarjetas.
      let consultaTarjeta = supabaseServer
        .from('rfid')
        .select('id, uid, usuario_id, estado')
        .eq('id', tarjetaId);

      if (!esAdmin) {
        consultaTarjeta = consultaTarjeta.eq('usuario_id', perfil.id);
      }

      const { data: tarjeta, error: tarjetaError } =
        await consultaTarjeta.maybeSingle();

      if (tarjetaError || !tarjeta) {
        return NextResponse.json(
          {
            error: esAdmin
              ? 'No se encontró la tarjeta RFID.'
              : 'No se encontró una tarjeta asociada a tu cuenta.',
          },
          { status: 404 }
        );
      }

      if (!tarjeta.usuario_id) {
        return NextResponse.json(
          { error: 'La tarjeta no tiene un usuario asignado.' },
          { status: 409 }
        );
      }

      // REPORTAR Y SOLICITAR REPOSICIÓN SON OPERACIONES DEL PROPIETARIO.
      if (
        esAdmin &&
        ['reportar', 'solicitar_reposicion'].includes(accion)
      ) {
        return NextResponse.json(
          {
            error:
              'El administrador no puede reportar tarjetas en nombre del usuario.',
          },
          { status: 403 }
        );
      }

      // BLOQUEAR
      if (accion === 'bloquear') {
        if (tarjeta.estado !== 'ACTIVA') {
          return NextResponse.json(
            { error: 'Solamente se pueden bloquear tarjetas activas.' },
            { status: 409 }
          );
        }

        let actualizacion = supabaseServer
          .from('rfid')
          .update({ estado: 'BLOQUEADA' })
          .eq('id', tarjeta.id)
          .eq('estado', 'ACTIVA');

        if (!esAdmin) {
          actualizacion = actualizacion.eq('usuario_id', perfil.id);
        }

        const { data: tarjetaActualizada, error } = await actualizacion
          .select('id, uid, usuario_id, estado, fecha_asignacion')
          .maybeSingle();

        if (error || !tarjetaActualizada) {
          return NextResponse.json(
            { error: 'No se pudo bloquear la tarjeta.' },
            { status: 500 }
          );
        }

        const historialGuardado = await registrarHistorialRFID({
          rfid_id: tarjetaActualizada.id,
          usuario_id: tarjetaActualizada.usuario_id!,
          accion: 'BLOQUEO',
          estado_anterior: 'ACTIVA',
          estado_nuevo: 'BLOQUEADA',
          registrado_por: perfil.id,
        });

        return NextResponse.json({
          exitoso: true,
          historialRegistrado: historialGuardado,
          mensaje: esAdmin
            ? 'Tarjeta bloqueada correctamente por el administrador.'
            : 'Tu tarjeta SPING ha sido bloqueada correctamente.',
          rfid: tarjetaActualizada,
        });
      }

      // DESBLOQUEAR
      if (accion === 'desbloquear') {
        if (tarjeta.estado !== 'BLOQUEADA') {
          return NextResponse.json(
            {
              error: 'Solamente se pueden desbloquear tarjetas bloqueadas.',
            },
            { status: 409 }
          );
        }

        // Verificar que el propietario no tenga otra tarjeta activa.
        const { data: otraTarjeta, error: otraTarjetaError } =
          await supabaseServer
            .from('rfid')
            .select('id')
            .eq('usuario_id', tarjeta.usuario_id)
            .eq('estado', 'ACTIVA')
            .neq('id', tarjeta.id)
            .maybeSingle();

        if (otraTarjetaError) {
          return NextResponse.json(
            { error: 'No se pudo verificar el estado de las tarjetas.' },
            { status: 500 }
          );
        }

        if (otraTarjeta) {
          return NextResponse.json(
            {
              error:
                'El usuario ya tiene otra tarjeta activa. No es posible desbloquear esta tarjeta.',
            },
            { status: 409 }
          );
        }

        let actualizacion = supabaseServer
          .from('rfid')
          .update({ estado: 'ACTIVA' })
          .eq('id', tarjeta.id)
          .eq('estado', 'BLOQUEADA');

        if (!esAdmin) {
          actualizacion = actualizacion.eq('usuario_id', perfil.id);
        }

        const { data: tarjetaActualizada, error } = await actualizacion
          .select('id, uid, usuario_id, estado, fecha_asignacion')
          .maybeSingle();

        if (error || !tarjetaActualizada) {
          return NextResponse.json(
            { error: 'No se pudo desbloquear la tarjeta.' },
            { status: 500 }
          );
        }

        const historialGuardado = await registrarHistorialRFID({
          rfid_id: tarjetaActualizada.id,
          usuario_id: tarjetaActualizada.usuario_id!,
          accion: 'DESBLOQUEO',
          estado_anterior: 'BLOQUEADA',
          estado_nuevo: 'ACTIVA',
          registrado_por: perfil.id,
        });

        return NextResponse.json({
          exitoso: true,
          historialRegistrado: historialGuardado,
          mensaje: esAdmin
            ? 'Tarjeta desbloqueada correctamente por el administrador.'
            : 'Tu tarjeta SPING ha sido desbloqueada correctamente.',
          rfid: tarjetaActualizada,
        });
      }

      // REPORTAR PÉRDIDA, ROBO O DAÑO
      if (accion === 'reportar') {
        if (!['ACTIVA', 'BLOQUEADA'].includes(tarjeta.estado)) {
          return NextResponse.json(
            {
              error:
                'Esta tarjeta ya no se encuentra disponible para reportar.',
            },
            { status: 409 }
          );
        }

        const motivo = String(body.motivo ?? '').toUpperCase();

        if (!MOTIVOS_VALIDOS.includes(motivo as MotivoReporte)) {
          return NextResponse.json(
            {
              error:
                'Selecciona un motivo válido: pérdida, robo o daño.',
            },
            { status: 400 }
          );
        }

        const detalle = String(body.detalle ?? '').trim();

        if (detalle.length > 1000) {
          return NextResponse.json(
            { error: 'El detalle no puede superar los 1000 caracteres.' },
            { status: 400 }
          );
        }

        const { data: solicitud, error: solicitudError } =
          await supabaseServer
            .from('solicitudes_reposicion_rfid')
            .insert({
              usuario_id: perfil.id,
              rfid_id: tarjeta.id,
              motivo,
              detalle: detalle || null,
              estado_solicitud: 'PENDIENTE',
            })
            .select('id, motivo, estado_solicitud, fecha_solicitud')
            .single();

        if (solicitudError) {
          if (solicitudError.code === '23505') {
            return NextResponse.json(
              {
                error: 'Ya tienes una solicitud de reposición pendiente.',
              },
              { status: 409 }
            );
          }

          console.error(
            'Error creando solicitud RFID:',
            solicitudError.message
          );

          return NextResponse.json(
            { error: 'No se pudo crear la solicitud de reposición.' },
            { status: 500 }
          );
        }

        // Deshabilitar la tarjeta reportada.
        const { data: tarjetaActualizada, error: actualizacionError } =
          await supabaseServer
            .from('rfid')
            .update({ estado: 'REPORTADA' })
            .eq('id', tarjeta.id)
            .eq('usuario_id', perfil.id)
            .in('estado', ['ACTIVA', 'BLOQUEADA'])
            .select('id, uid, usuario_id, estado, fecha_asignacion')
            .maybeSingle();

        if (actualizacionError || !tarjetaActualizada) {
          await supabaseServer
            .from('solicitudes_reposicion_rfid')
            .delete()
            .eq('id', solicitud.id)
            .eq('usuario_id', perfil.id);

          return NextResponse.json(
            { error: 'No se pudo actualizar el estado de la tarjeta.' },
            { status: 500 }
          );
        }

        const historialGuardado = await registrarHistorialRFID({
          rfid_id: tarjetaActualizada.id,
          usuario_id: perfil.id,
          accion: 'REPORTE',
          estado_anterior: tarjeta.estado,
          estado_nuevo: 'REPORTADA',
          motivo,
          observacion: detalle || null,
          registrado_por: perfil.id,
        });

        return NextResponse.json({
          exitoso: true,
          historialRegistrado: historialGuardado,
          mensaje:
            'Tarjeta reportada correctamente. Tu solicitud de reposición fue enviada al administrador.',
          rfid: tarjetaActualizada,
          solicitud,
        });
      }

      // SOLICITAR REPOSICIÓN DE UNA TARJETA YA REPORTADA
      if (accion === 'solicitar_reposicion') {
        if (tarjeta.estado !== 'REPORTADA') {
          return NextResponse.json(
            {
              error:
                'Primero debes reportar tu tarjeta para solicitar una reposición.',
            },
            { status: 409 }
          );
        }

        const motivo = String(body.motivo ?? '').toUpperCase();

        if (!MOTIVOS_VALIDOS.includes(motivo as MotivoReporte)) {
          return NextResponse.json(
            {
              error:
                'Selecciona un motivo válido: pérdida, robo o daño.',
            },
            { status: 400 }
          );
        }

        const detalle = String(body.detalle ?? '').trim();

        if (detalle.length > 1000) {
          return NextResponse.json(
            { error: 'El detalle no puede superar los 1000 caracteres.' },
            { status: 400 }
          );
        }

        const { data: solicitud, error: solicitudError } =
          await supabaseServer
            .from('solicitudes_reposicion_rfid')
            .insert({
              usuario_id: perfil.id,
              rfid_id: tarjeta.id,
              motivo,
              detalle: detalle || null,
              estado_solicitud: 'PENDIENTE',
            })
            .select('id, motivo, estado_solicitud, fecha_solicitud')
            .single();

        if (solicitudError) {
          if (solicitudError.code === '23505') {
            return NextResponse.json(
              {
                error: 'Ya tienes una solicitud de reposición pendiente.',
              },
              { status: 409 }
            );
          }

          return NextResponse.json(
            { error: 'No se pudo crear la solicitud de reposición.' },
            { status: 500 }
          );
        }

        const historialGuardado = await registrarHistorialRFID({
          rfid_id: tarjeta.id,
          usuario_id: perfil.id,
          accion: 'SOLICITUD_REPOSICION',
          estado_anterior: 'REPORTADA',
          estado_nuevo: 'REPORTADA',
          motivo,
          observacion: detalle || null,
          registrado_por: perfil.id,
        });

        return NextResponse.json({
          exitoso: true,
          historialRegistrado: historialGuardado,
          mensaje: 'Solicitud de reposición enviada correctamente.',
          solicitud,
        });
      }
    }

    // =====================================================
    // 3. REGISTRAR TARJETA
    // =====================================================

    if (accion !== 'registrar') {
      return NextResponse.json(
        { error: 'La operación solicitada no es válida.' },
        { status: 400 }
      );
    }

    const uid = String(body.uid ?? '')
      .trim()
      .replace(/[\s:-]/g, '')
      .toUpperCase();

    if (!uid || uid.length > 64) {
      return NextResponse.json(
        { error: 'El UID de la tarjeta no es válido.' },
        { status: 400 }
      );
    }

    let usuarioDestinoId = perfil.id;

    if (esAdmin && body.usuarioId !== undefined) {
      const idSolicitado = Number(body.usuarioId);

      if (!Number.isInteger(idSolicitado) || idSolicitado <= 0) {
        return NextResponse.json(
          { error: 'El usuario seleccionado no es válido.' },
          { status: 400 }
        );
      }

      usuarioDestinoId = idSolicitado;
    } else if (
      !esAdmin &&
      body.usuarioId !== undefined &&
      Number(body.usuarioId) !== perfil.id
    ) {
      return NextResponse.json(
        {
          error:
            'Solo puedes registrar una tarjeta para tu propia cuenta.',
        },
        { status: 403 }
      );
    }

    const { data: usuarioDestino, error: usuarioError } =
      await supabaseServer
        .from('usuarios')
        .select('id, codigo_usuario, nombre, rol, estado')
        .eq('id', usuarioDestinoId)
        .maybeSingle();

    if (
      usuarioError ||
      !usuarioDestino ||
      usuarioDestino.estado !== 'ACTIVO'
    ) {
      return NextResponse.json(
        {
          error:
            'El usuario seleccionado no existe o está inactivo.',
        },
        { status: 404 }
      );
    }

    // Un usuario solamente puede tener una tarjeta activa.
    const { data: tarjetaActual, error: tarjetaActualError } =
      await supabaseServer
        .from('rfid')
        .select('id, uid, estado, fecha_asignacion')
        .eq('usuario_id', usuarioDestinoId)
        .eq('estado', 'ACTIVA')
        .maybeSingle();

    if (tarjetaActualError) {
      return NextResponse.json(
        { error: 'No se pudo consultar la tarjeta actual.' },
        { status: 500 }
      );
    }

    if (tarjetaActual) {
      return NextResponse.json(
        {
          error: 'Este usuario ya tiene una tarjeta RFID activa.',
          yaTieneTarjeta: true,
          tarjeta: tarjetaActual,
        },
        { status: 409 }
      );
    }

    // Verificar que el UID no esté registrado.
    const { data: rfidExistente, error: busquedaError } =
      await supabaseServer
        .from('rfid')
        .select('id, uid, usuario_id, estado')
        .eq('uid', uid)
        .maybeSingle();

    if (busquedaError) {
      return NextResponse.json(
        { error: 'No se pudo verificar la tarjeta.' },
        { status: 500 }
      );
    }

    if (rfidExistente) {
      return NextResponse.json(
        {
          error: 'Esta tarjeta RFID ya se encuentra registrada.',
          yaRegistrada: true,
        },
        { status: 409 }
      );
    }

    const { data: nuevaTarjeta, error: registroError } =
      await supabaseServer
        .from('rfid')
        .insert({
          uid,
          usuario_id: usuarioDestinoId,
          estado: 'ACTIVA',
        })
        .select('id, uid, usuario_id, estado, fecha_asignacion')
        .single();

    if (registroError) {
      if (registroError.code === '23505') {
        return NextResponse.json(
          {
            error:
              'El usuario ya tiene una tarjeta activa o el UID ya está registrado.',
          },
          { status: 409 }
        );
      }

      console.error('Error registrando tarjeta:', registroError.message);

      return NextResponse.json(
        { error: 'No se pudo registrar la tarjeta.' },
        { status: 500 }
      );
    }

    const historialGuardado = await registrarHistorialRFID({
      rfid_id: nuevaTarjeta.id,
      usuario_id: usuarioDestinoId,
      accion: 'REGISTRO',
      estado_anterior: null,
      estado_nuevo: 'ACTIVA',
      motivo: 'Asignación inicial o reposición de tarjeta',
      registrado_por: perfil.id,
    });

    return NextResponse.json(
      {
        exitoso: true,
        historialRegistrado: historialGuardado,
        mensaje: 'Tarjeta RFID registrada correctamente.',
        usuario: usuarioDestino,
        rfid: nuevaTarjeta,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error en API RFID:', error);

    return NextResponse.json(
      { error: 'No se pudo procesar la solicitud.' },
      { status: 500 }
    );
  }
}
