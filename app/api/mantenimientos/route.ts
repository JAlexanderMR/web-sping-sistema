
import { NextResponse } from 'next/server';
import { createAuthServerClient } from '@/lib/supabase/auth-server';
import { supabaseServer } from '@/lib/supabase/server';

async function verificarUsuario() {
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
    .select('id, nombre, rol, estado')
    .eq('auth_user_id', user.id)
    .maybeSingle();

  if (error || !perfil || perfil.estado !== 'ACTIVO') {
    return {
      error: 'No se encontró un perfil activo para esta cuenta.',
      status: 403 as const,
    };
  }

  return { perfil };
}

async function verificarAdministrador() {
  const autorizacion = await verificarUsuario();

  if ('error' in autorizacion) return autorizacion;

  if (autorizacion.perfil.rol !== 'admin') {
    return {
      error: 'No tienes permisos para realizar esta operación.',
      status: 403 as const,
    };
  }

  return autorizacion;
}

// GET: información para administrador o trabajador
export async function GET() {
  try {
    const autorizacion = await verificarUsuario();

    if ('error' in autorizacion) {
      return NextResponse.json(
        { error: autorizacion.error },
        { status: autorizacion.status }
      );
    }

    const perfil = autorizacion.perfil;

    if (perfil.rol === 'admin') {
      const [
        dispositivosResult,
        trabajadoresResult,
        reportesResult,
        alertasResult,
      ] = await Promise.all([
        supabaseServer
          .from('dispositivos')
          .select('id, codigo_dispositivo, nombre, ubicacion, estado')
          .order('id', { ascending: true }),

        supabaseServer
          .from('usuarios')
          .select('id, codigo_usuario, nombre, rol, estado')
          .eq('rol', 'maintenance')
          .eq('estado', 'ACTIVO')
          .order('nombre', { ascending: true }),

        supabaseServer
          .from('mantenimientos')
          .select(`
            id,
            dispositivo_id,
            usuario_mantenimiento_id,
            motivo,
            descripcion_trabajo,
            estado,
            fecha_inicio,
            fecha_fin,
            observaciones,
            resultado,
            fecha_registro,
            estado_revision,
            revisado_por,
            fecha_revision,
            observacion_revision
          `)
          .eq('estado', 'FINALIZADO')
          .eq('estado_revision', 'PENDIENTE')
          .order('fecha_fin', { ascending: false }),

        supabaseServer
          .from('reportes_dispositivo')
          .select('id, dispositivo_id, tipo_reporte, severidad, descripcion, datos_adicionales, estado_reporte, fecha_reporte')
          .eq('tipo_reporte', 'RECHAZOS_REITERADOS')
          .in('estado_reporte', ['ABIERTO', 'EN_REVISION'])
          .order('fecha_reporte', { ascending: false }),
      ]);

      if (dispositivosResult.error) throw dispositivosResult.error;
      if (trabajadoresResult.error) throw trabajadoresResult.error;
      if (reportesResult.error) throw reportesResult.error;
      if (alertasResult.error) throw alertasResult.error;

      const reportes = reportesResult.data ?? [];
      const alertas = alertasResult.data ?? [];
      const idsDispositivosAlertas = [...new Set(alertas.map((a) => a.dispositivo_id))];
      const dispositivosAlertasResult = idsDispositivosAlertas.length
        ? await supabaseServer
            .from('dispositivos')
            .select('id, codigo_dispositivo, nombre, ubicacion, estado, limite_rechazos_revision, ventana_rechazos_minutos')
            .in('id', idsDispositivosAlertas)
        : { data: [], error: null };

      if (dispositivosAlertasResult.error) throw dispositivosAlertasResult.error;

      const alertasCompletas = alertas.map((alerta) => ({
        ...alerta,
        dispositivo: dispositivosAlertasResult.data?.find((d) => d.id === alerta.dispositivo_id) ?? null,
      }));

      const dispositivoIds = [
        ...new Set(reportes.map((r) => r.dispositivo_id)),
      ];

      const trabajadorIds = [
        ...new Set(reportes.map((r) => r.usuario_mantenimiento_id)),
      ];

      const [dispositivosReporte, trabajadoresReporte] =
        await Promise.all([
          dispositivoIds.length
            ? supabaseServer
                .from('dispositivos')
                .select('id, codigo_dispositivo, nombre, ubicacion, estado')
                .in('id', dispositivoIds)
            : Promise.resolve({ data: [], error: null }),

          trabajadorIds.length
            ? supabaseServer
                .from('usuarios')
                .select('id, nombre, codigo_usuario')
                .in('id', trabajadorIds)
            : Promise.resolve({ data: [], error: null }),
        ]);

      if (dispositivosReporte.error) throw dispositivosReporte.error;
      if (trabajadoresReporte.error) throw trabajadoresReporte.error;

      const reportesCompletos = reportes.map((reporte) => ({
        ...reporte,
        dispositivo:
          dispositivosReporte.data?.find(
            (d) => d.id === reporte.dispositivo_id
          ) ?? null,
        trabajador:
          trabajadoresReporte.data?.find(
            (t) => t.id === reporte.usuario_mantenimiento_id
          ) ?? null,
      }));

      return NextResponse.json({
        dispositivos: dispositivosResult.data ?? [],
        trabajadores: trabajadoresResult.data ?? [],
        reportesPendientes: reportesCompletos,
        alertasRechazo: alertasCompletas,
      });
    }

    if (perfil.rol === 'maintenance') {
      const { data: mantenimientos, error } = await supabaseServer
        .from('mantenimientos')
        .select(`
          id,
          dispositivo_id,
          usuario_mantenimiento_id,
          autorizado_por,
          motivo,
          descripcion_trabajo,
          estado,
          fecha_inicio,
          fecha_fin,
          observaciones,
          resultado,
          fecha_registro,
          estado_revision,
          observacion_revision
        `)
        .eq('usuario_mantenimiento_id', perfil.id)
        .order('fecha_registro', { ascending: false });

      if (error) throw error;

      const dispositivoIds = [
        ...new Set((mantenimientos ?? []).map((m) => m.dispositivo_id)),
      ];

      let dispositivos: any[] = [];

      if (dispositivoIds.length) {
        const { data, error: dispositivosError } = await supabaseServer
          .from('dispositivos')
          .select('id, codigo_dispositivo, nombre, ubicacion, estado')
          .in('id', dispositivoIds);

        if (dispositivosError) throw dispositivosError;
        dispositivos = data ?? [];
      }

      const tareasConDispositivo = (mantenimientos ?? []).map((m) => ({
        ...m,
        dispositivo:
          dispositivos.find((d) => d.id === m.dispositivo_id) ?? null,
      }));

      return NextResponse.json({
        mantenimientos: tareasConDispositivo,
      });
    }

    return NextResponse.json(
      { error: 'No tienes permisos para consultar este módulo.' },
      { status: 403 }
    );
  } catch (error) {
    console.error('Error consultando mantenimientos:', error);

    return NextResponse.json(
      { error: 'No fue posible consultar los datos de mantenimiento.' },
      { status: 500 }
    );
  }
}

// POST: asignar mantenimiento
export async function POST(request: Request) {
  try {
    const autorizacion = await verificarAdministrador();

    if ('error' in autorizacion) {
      return NextResponse.json(
        { error: autorizacion.error },
        { status: autorizacion.status }
      );
    }

    const body = await request.json();

    const dispositivoId = Number(body.dispositivo_id);
    const trabajadorId = Number(body.usuario_mantenimiento_id);
    const motivo = String(body.motivo ?? '').trim();
    const descripcion = String(body.descripcion_trabajo ?? '').trim();
    const reporteDispositivoId = body.reporte_dispositivo_id == null
      ? null
      : Number(body.reporte_dispositivo_id);

    if (reporteDispositivoId !== null && (!Number.isInteger(reporteDispositivoId) || reporteDispositivoId <= 0)) {
      return NextResponse.json({ error: 'La alerta seleccionada no es válida.' }, { status: 400 });
    }

    if (
      !Number.isInteger(dispositivoId) ||
      dispositivoId <= 0 ||
      !Number.isInteger(trabajadorId) ||
      trabajadorId <= 0 ||
      !motivo ||
      !descripcion
    ) {
      return NextResponse.json(
        {
          error:
            'Debes seleccionar el dispositivo, el trabajador y completar el motivo y la descripción.',
        },
        { status: 400 }
      );
    }

    if (motivo.length > 150 || descripcion.length > 2000) {
      return NextResponse.json(
        { error: 'El motivo o la descripción superan la longitud permitida.' },
        { status: 400 }
      );
    }

    const { data: trabajador, error: trabajadorError } =
      await supabaseServer
        .from('usuarios')
        .select('id, nombre, codigo_usuario, rol, estado')
        .eq('id', trabajadorId)
        .maybeSingle();

    if (
      trabajadorError ||
      !trabajador ||
      trabajador.rol !== 'maintenance' ||
      trabajador.estado !== 'ACTIVO'
    ) {
      return NextResponse.json(
        {
          error:
            'El trabajador seleccionado no existe, no está activo o no tiene el rol de mantenimiento.',
        },
        { status: 400 }
      );
    }

    const { data: dispositivo, error: dispositivoError } =
      await supabaseServer
        .from('dispositivos')
        .select('id, codigo_dispositivo, nombre, estado')
        .eq('id', dispositivoId)
        .maybeSingle();

    if (dispositivoError || !dispositivo) {
      return NextResponse.json(
        { error: 'El dispositivo seleccionado no existe.' },
        { status: 404 }
      );
    }

    let alertaRechazo: any = null;

    if (reporteDispositivoId !== null) {
      const { data: alerta, error: alertaError } = await supabaseServer
        .from('reportes_dispositivo')
        .select('id, dispositivo_id, tipo_reporte, estado_reporte')
        .eq('id', reporteDispositivoId)
        .maybeSingle();

      if (alertaError) throw alertaError;
      if (!alerta || alerta.tipo_reporte !== 'RECHAZOS_REITERADOS' || alerta.dispositivo_id !== dispositivoId) {
        return NextResponse.json({ error: 'La alerta no existe o no corresponde al dispositivo seleccionado.' }, { status: 404 });
      }
      if (!['ABIERTO', 'EN_REVISION'].includes(alerta.estado_reporte)) {
        return NextResponse.json({ error: 'Esta alerta ya fue atendida o cerrada.' }, { status: 409 });
      }

      const { data: mantenimientoVinculado, error: vinculoError } = await supabaseServer
        .from('mantenimientos')
        .select('id, estado')
        .eq('reporte_dispositivo_id', reporteDispositivoId)
        .in('estado', ['PROGRAMADO', 'EN_CURSO'])
        .limit(1)
        .maybeSingle();
      if (vinculoError) throw vinculoError;
      if (mantenimientoVinculado) {
        return NextResponse.json({ error: 'Esta alerta ya tiene un mantenimiento asociado.' }, { status: 409 });
      }
      alertaRechazo = alerta;
    }

    if (
      dispositivo.estado === 'FUERA_DE_SERVICIO' ||
      (dispositivo.estado === 'MANTENIMIENTO' && !alertaRechazo)
    ) {
      return NextResponse.json(
        {
          error:
            'El dispositivo está fuera de servicio o ya está en mantenimiento.',
        },
        { status: 409 }
      );
    }

    const { data: mantenimientoActivo, error: activoError } =
      await supabaseServer
        .from('mantenimientos')
        .select('id, estado')
        .eq('dispositivo_id', dispositivoId)
        .in('estado', ['PROGRAMADO', 'EN_CURSO'])
        .limit(1)
        .maybeSingle();

    if (activoError) throw activoError;

    if (mantenimientoActivo) {
      return NextResponse.json(
        {
          error:
            'Este dispositivo ya tiene un mantenimiento programado o en curso.',
        },
        { status: 409 }
      );
    }

    const { data: mantenimiento, error: crearError } =
      await supabaseServer
        .from('mantenimientos')
        .insert({
          dispositivo_id: dispositivoId,
          usuario_mantenimiento_id: trabajadorId,
          autorizado_por: autorizacion.perfil.id,
          motivo,
          descripcion_trabajo: descripcion,
          reporte_dispositivo_id: reporteDispositivoId,
          estado: 'PROGRAMADO',
          fecha_inicio: null,
          fecha_fin: null,
        })
        .select('*')
        .single();

    if (crearError || !mantenimiento) {
      throw crearError ?? new Error('No se pudo crear el mantenimiento.');
    }

    if (alertaRechazo) {
      const { error: actualizarAlertaError } = await supabaseServer
        .from('reportes_dispositivo')
        .update({ estado_reporte: 'EN_REVISION' })
        .eq('id', alertaRechazo.id)
        .in('estado_reporte', ['ABIERTO', 'EN_REVISION']);
      if (actualizarAlertaError) {
        await supabaseServer.from('mantenimientos').update({ estado: 'CANCELADO' }).eq('id', mantenimiento.id);
        throw actualizarAlertaError;
      }

      const { error: actualizarEstadoError } = await supabaseServer
        .from('dispositivos')
        .update({ estado: 'MANTENIMIENTO' })
        .eq('id', dispositivoId);
      if (actualizarEstadoError) {
        await supabaseServer.from('mantenimientos').update({ estado: 'CANCELADO' }).eq('id', mantenimiento.id);
        await supabaseServer.from('reportes_dispositivo').update({ estado_reporte: alertaRechazo.estado_reporte }).eq('id', alertaRechazo.id);
        throw actualizarEstadoError;
      }
    }

    const { error: eventoError } = await supabaseServer
      .from('eventos_dispositivo')
      .insert({
        dispositivo_id: dispositivoId,
        tipo_evento: 'MANTENIMIENTO_ASIGNADO',
        estado_anterior: dispositivo.estado,
        estado_nuevo: dispositivo.estado,
        usuario_id: autorizacion.perfil.id,
        descripcion: `Mantenimiento asignado a ${trabajador.nombre}. Motivo: ${motivo}`,
        datos_adicionales: {
          mantenimiento_id: mantenimiento.id,
          trabajador_id: trabajador.id,
          reporte_dispositivo_id: reporteDispositivoId,
        },
      });

    if (eventoError) {
      console.error('Error registrando evento:', eventoError.message);
    }

    return NextResponse.json(
      {
        mensaje: alertaRechazo
          ? 'Alerta asignada correctamente. El dispositivo pasó a estado MANTENIMIENTO.'
          : 'Mantenimiento asignado correctamente.',
        mantenimiento,
        trabajador: {
          id: trabajador.id,
          nombre: trabajador.nombre,
          codigo_usuario: trabajador.codigo_usuario,
        },
        dispositivo,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error asignando mantenimiento:', error);

    return NextResponse.json(
      { error: 'Ocurrió un error al asignar el mantenimiento.' },
      { status: 500 }
    );
  }
}

// PATCH: reporte del trabajador o decisión del administrador
export async function PATCH(request: Request) {
  try {
    const autorizacion = await verificarUsuario();

    if ('error' in autorizacion) {
      return NextResponse.json(
        { error: autorizacion.error },
        { status: autorizacion.status }
      );
    }

    const perfil = autorizacion.perfil;
    const body = await request.json();

    // ADMINISTRADOR: revisar reporte y decidir reactivación
    if (perfil.rol === 'admin') {
      const mantenimientoId = Number(body.mantenimiento_id);
      const accion = String(body.accion ?? '').trim();
      const observacionRevision = String(
        body.observacion_revision ?? ''
      ).trim();

      if (
        !Number.isInteger(mantenimientoId) ||
        mantenimientoId <= 0 ||
        !['APROBAR', 'RECHAZAR'].includes(accion)
      ) {
        return NextResponse.json(
          { error: 'La solicitud de revisión no es válida.' },
          { status: 400 }
        );
      }

      if (observacionRevision.length > 2000) {
        return NextResponse.json(
          { error: 'La observación supera los 2000 caracteres permitidos.' },
          { status: 400 }
        );
      }

      if (accion === 'RECHAZAR' && !observacionRevision) {
        return NextResponse.json(
          {
            error:
              'Debes explicar por qué no autorizas la reactivación.',
          },
          { status: 400 }
        );
      }

      const { data: mantenimiento, error: consultaError } =
        await supabaseServer
          .from('mantenimientos')
          .select('id, dispositivo_id, reporte_dispositivo_id, estado, resultado, estado_revision')
          .eq('id', mantenimientoId)
          .maybeSingle();

      if (consultaError) throw consultaError;

      if (!mantenimiento || mantenimiento.estado !== 'FINALIZADO') {
        return NextResponse.json(
          { error: 'No se encontró un reporte finalizado para revisar.' },
          { status: 404 }
        );
      }

      if (mantenimiento.estado_revision !== 'PENDIENTE') {
        return NextResponse.json(
          { error: 'Este reporte ya fue revisado.' },
          { status: 409 }
        );
      }

      const { data: dispositivo, error: dispositivoError } =
        await supabaseServer
          .from('dispositivos')
          .select('id, codigo_dispositivo, nombre, estado')
          .eq('id', mantenimiento.dispositivo_id)
          .maybeSingle();

      if (dispositivoError) throw dispositivoError;

      if (!dispositivo) {
        return NextResponse.json(
          { error: 'No se encontró el dispositivo asociado.' },
          { status: 404 }
        );
      }

      if (accion === 'APROBAR') {
        if (mantenimiento.resultado !== 'REPARADO') {
          return NextResponse.json(
            {
              error:
                'Solo se puede autorizar la reactivación cuando el resultado del trabajador sea REPARADO.',
            },
            { status: 409 }
          );
        }

        if (dispositivo.estado !== 'MANTENIMIENTO') {
          return NextResponse.json(
            {
              error:
                'El dispositivo no está en estado MANTENIMIENTO. Verifica su estado antes de autorizar.',
            },
            { status: 409 }
          );
        }

        // Cambiar el dispositivo a operativo
        const { data: dispositivoActualizado, error: actualizarDispositivoError } =
          await supabaseServer
            .from('dispositivos')
            .update({ estado: 'OPERATIVO' })
            .eq('id', dispositivo.id)
            .eq('estado', 'MANTENIMIENTO')
            .select('id')
            .maybeSingle();

        if (actualizarDispositivoError) {
          throw actualizarDispositivoError;
        }

        if (!dispositivoActualizado) {
          return NextResponse.json(
            {
              error:
                'El estado del dispositivo cambió. Actualiza la información antes de continuar.',
            },
            { status: 409 }
          );
        }
      } else {
        if (dispositivo.estado !== 'MANTENIMIENTO') {
          return NextResponse.json(
            {
              error:
                'El dispositivo no está en mantenimiento. No se puede rechazar la reactivación.',
            },
            { status: 409 }
          );
        }
      }

      const nuevoEstadoRevision =
        accion === 'APROBAR' ? 'APROBADO' : 'RECHAZADO';

      const { data: mantenimientoActualizado, error: actualizarError } =
        await supabaseServer
          .from('mantenimientos')
          .update({
            estado_revision: nuevoEstadoRevision,
            revisado_por: perfil.id,
            fecha_revision: new Date().toISOString(),
            observacion_revision: observacionRevision || null,
          })
          .eq('id', mantenimientoId)
          .eq('estado_revision', 'PENDIENTE')
          .select('id, estado_revision, revisado_por, fecha_revision')
          .maybeSingle();

      if (actualizarError) throw actualizarError;

      if (!mantenimientoActualizado) {
        return NextResponse.json(
          {
            error:
              'El reporte ya fue revisado o cambió durante la operación.',
          },
          { status: 409 }
        );
      }

      const estadoNuevo =
        accion === 'APROBAR' ? 'OPERATIVO' : 'MANTENIMIENTO';

      if (accion === 'APROBAR' && mantenimiento.reporte_dispositivo_id) {
        const { error: cerrarAlertaError } = await supabaseServer
          .from('reportes_dispositivo')
          .update({ estado_reporte: 'RESUELTO' })
          .eq('id', mantenimiento.reporte_dispositivo_id)
          .in('estado_reporte', ['ABIERTO', 'EN_REVISION']);

        if (cerrarAlertaError) {
          console.error('No se pudo cerrar la alerta de rechazos:', cerrarAlertaError.message);
          return NextResponse.json(
            { error: 'La intervención fue aprobada, pero no se pudo cerrar la alerta asociada. Actualiza y vuelve a revisar.' },
            { status: 500 }
          );
        }
      }

      if (accion === 'RECHAZAR' && mantenimiento.reporte_dispositivo_id) {
        const { error: reabrirAlertaError } = await supabaseServer
          .from('reportes_dispositivo')
          .update({ estado_reporte: 'ABIERTO' })
          .eq('id', mantenimiento.reporte_dispositivo_id)
          .eq('estado_reporte', 'EN_REVISION');

        if (reabrirAlertaError) {
          console.error('No se pudo reabrir la alerta de rechazos:', reabrirAlertaError.message);
        }
      }

      const { error: eventoError } = await supabaseServer
        .from('eventos_dispositivo')
        .insert({
          dispositivo_id: dispositivo.id,
          tipo_evento:
            accion === 'APROBAR'
              ? 'REACTIVACION_AUTORIZADA'
              : 'REACTIVACION_RECHAZADA',
          estado_anterior: 'MANTENIMIENTO',
          estado_nuevo: estadoNuevo,
          usuario_id: perfil.id,
          descripcion:
            accion === 'APROBAR'
              ? `El administrador ${perfil.nombre} autorizó la reactivación del dispositivo.`
              : `El administrador ${perfil.nombre} rechazó la reactivación. Motivo: ${observacionRevision}`,
          datos_adicionales: {
            mantenimiento_id: mantenimientoId,
            estado_revision: nuevoEstadoRevision,
            observacion: observacionRevision || null,
          },
        });

      if (eventoError) {
        console.error(
          'No se pudo registrar el evento de revisión:',
          eventoError.message
        );
      }

      return NextResponse.json({
        mensaje:
          accion === 'APROBAR'
            ? 'Reactivación autorizada. El dispositivo quedó OPERATIVO.'
            : 'Reactivación rechazada. El dispositivo continúa en MANTENIMIENTO.',
        mantenimiento: mantenimientoActualizado,
        dispositivo_estado: estadoNuevo,
      });
    }

    // TRABAJADOR: enviar reporte de intervención
    if (perfil.rol !== 'maintenance') {
      return NextResponse.json(
        { error: 'No tienes permisos para realizar esta operación.' },
        { status: 403 }
      );
    }

    const mantenimientoId = Number(body.mantenimiento_id);
    const actividades = String(body.actividades_realizadas ?? '').trim();
    const observaciones = String(body.observaciones ?? '').trim();
    const resultado = String(body.resultado ?? '').trim();

    const resultadosPermitidos = [
      'REPARADO',
      'REQUIERE_REPUESTOS',
      'NO_REPARADO',
    ];

    if (
      !Number.isInteger(mantenimientoId) ||
      mantenimientoId <= 0 ||
      !actividades ||
      !observaciones ||
      !resultadosPermitidos.includes(resultado)
    ) {
      return NextResponse.json(
        {
          error:
            'Debes completar las actividades, las observaciones y seleccionar un resultado válido.',
        },
        { status: 400 }
      );
    }

    if (actividades.length > 2000 || observaciones.length > 2000) {
      return NextResponse.json(
        {
          error:
            'Las actividades o las observaciones superan los 2000 caracteres permitidos.',
        },
        { status: 400 }
      );
    }

    const { data: mantenimiento, error: consultaError } =
      await supabaseServer
        .from('mantenimientos')
        .select('id, dispositivo_id, estado')
        .eq('id', mantenimientoId)
        .eq('usuario_mantenimiento_id', perfil.id)
        .maybeSingle();

    if (consultaError) throw consultaError;

    if (!mantenimiento) {
      return NextResponse.json(
        { error: 'No se encontró una tarea asignada a tu cuenta.' },
        { status: 404 }
      );
    }

    if (mantenimiento.estado !== 'EN_CURSO') {
      return NextResponse.json(
        {
          error:
            'Solo puedes enviar el reporte de una tarea que esté en curso.',
        },
        { status: 409 }
      );
    }

    const reporteCompleto =
      `ACTIVIDADES REALIZADAS:\n${actividades}\n\n` +
      `OBSERVACIONES:\n${observaciones}`;

    const fechaFin = new Date().toISOString();

    const { data: mantenimientoActualizado, error: actualizarError } =
      await supabaseServer
        .from('mantenimientos')
        .update({
          estado: 'FINALIZADO',
          fecha_fin: fechaFin,
          observaciones: reporteCompleto,
          resultado,
          estado_revision: 'PENDIENTE',
          revisado_por: null,
          fecha_revision: null,
          observacion_revision: null,
        })
        .eq('id', mantenimientoId)
        .eq('usuario_mantenimiento_id', perfil.id)
        .eq('estado', 'EN_CURSO')
        .select('id, dispositivo_id, estado, fecha_fin, observaciones, resultado, estado_revision')
        .maybeSingle();

    if (actualizarError) throw actualizarError;

    if (!mantenimientoActualizado) {
      return NextResponse.json(
        {
          error:
            'La tarea cambió de estado o ya fue reportada. Actualiza tus tareas e inténtalo nuevamente.',
        },
        { status: 409 }
      );
    }

    const { error: eventoError } = await supabaseServer
      .from('eventos_dispositivo')
      .insert({
        dispositivo_id: mantenimiento.dispositivo_id,
        tipo_evento: 'REPORTE_MANTENIMIENTO_ENVIADO',
        usuario_id: perfil.id,
        descripcion:
          `El trabajador ${perfil.nombre} envió el reporte del mantenimiento #${mantenimientoId}. Resultado: ${resultado}.`,
        datos_adicionales: {
          mantenimiento_id: mantenimientoId,
          resultado,
          fecha_fin: fechaFin,
        },
      });

    if (eventoError) {
      console.error('Error registrando el reporte:', eventoError.message);
    }

    return NextResponse.json({
      mensaje:
        'Reporte enviado correctamente. El administrador debe revisar la intervención.',
      mantenimiento: mantenimientoActualizado,
      dispositivo_reactivado: false,
    });
  } catch (error) {
    console.error('Error procesando mantenimiento:', error);

    return NextResponse.json(
      { error: 'Ocurrió un error al procesar el mantenimiento.' },
      { status: 500 }
    );
  }
}
