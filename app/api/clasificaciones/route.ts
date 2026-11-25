
import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const UID_RE = /^(?:[A-F0-9]{8}|[A-F0-9]{14}|[A-F0-9]{20})$/;

export async function POST(request: Request) {
  try {
    // 1. Autenticación del dispositivo.
    const deviceKey = request.headers.get('x-sping-device-key');
    const expectedKey = process.env.SPING_DEVICE_API_KEY;

    if (!expectedKey || deviceKey !== expectedKey) {
      return NextResponse.json(
        { error: 'Dispositivo no autorizado' },
        { status: 401 }
      );
    }

    const body = await request.json();

    // 2. Normalización de datos.
    const uidOriginal = typeof body.uid === 'string'
      ? body.uid.trim().replace(/[\s:-]/g, '').toUpperCase()
      : '';

    // Un UID ausente o inválido no impide el reciclaje.
    const uid = UID_RE.test(uidOriginal) ? uidOriginal : '';

    const tipoResiduo = typeof body.tipoResiduo === 'string'
      ? body.tipoResiduo.trim().toUpperCase()
      : '';

    const humedad = Number(body.humedad);
    const distancia = Number(body.distancia);

    const direccionMotor = typeof body.direccionMotor === 'string'
      ? body.direccionMotor.trim().toUpperCase()
      : '';

    const motivoRechazo = typeof body.motivoRechazo === 'string'
      ? body.motivoRechazo.trim().toUpperCase()
      : '';

    const codigoDispositivo = typeof body.codigoDispositivo === 'string'
      ? body.codigoDispositivo.trim()
      : '';

    const idempotencyKey =
      request.headers.get('x-idempotency-key') || body.idempotencyKey;

    // 3. Validaciones generales del evento.
    if (
      typeof idempotencyKey !== 'string' ||
      !UUID_RE.test(idempotencyKey)
    ) {
      return NextResponse.json(
        { error: 'Se requiere una clave UUID válida para identificar el evento' },
        { status: 400 }
      );
    }

    if (
      !['HUMEDO', 'SECO', 'RECHAZO'].includes(tipoResiduo) ||
      body.humedad == null ||
      body.distancia == null ||
      !Number.isFinite(humedad) ||
      !Number.isFinite(distancia) ||
      humedad < 0 ||
      distancia < 0
    ) {
      return NextResponse.json(
        { error: 'Tipo de residuo, humedad y distancia deben ser válidos' },
        { status: 400 }
      );
    }

    if (
      tipoResiduo === 'RECHAZO' &&
      !['PUNTO_INVALIDO', 'SIN_CONSENSO'].includes(motivoRechazo)
    ) {
      return NextResponse.json(
        { error: 'El rechazo requiere motivo PUNTO_INVALIDO o SIN_CONSENSO' },
        { status: 400 }
      );
    }

    if (!codigoDispositivo || codigoDispositivo.length > 48) {
      return NextResponse.json(
        { error: 'Código de dispositivo obligatorio o inválido' },
        { status: 400 }
      );
    }

    if (
      direccionMotor &&
      !['IZQUIERDA', 'DERECHA'].includes(direccionMotor)
    ) {
      return NextResponse.json(
        { error: 'La dirección debe ser IZQUIERDA o DERECHA' },
        { status: 400 }
      );
    }

    // 4. Recuperar la identidad original si el evento ya fue registrado.
    // Esto conserva la asociación original durante los reintentos.
    let usuarioId: number | null = null;
    let rfidId: number | null = null;

    const { data: clasificacionExistente, error: errorExistente } =
      await supabaseServer
        .from('clasificaciones')
        .select('usuario_id, rfid_id')
        .eq('idempotency_key', idempotencyKey)
        .maybeSingle();

    if (errorExistente) {
      console.error('Error consultando clasificación existente:', errorExistente);

      return NextResponse.json(
        { error: 'No fue posible verificar el evento existente' },
        { status: 500 }
      );
    }

    if (clasificacionExistente) {
      usuarioId = clasificacionExistente.usuario_id;
      rfidId = clasificacionExistente.rfid_id;
    } else if (uid) {
      // 5. Resolver la tarjeta RFID en el servidor.
      const { data: rfid, error: errorRfid } = await supabaseServer
        .from('rfid')
        .select('id, uid, usuario_id, estado')
        .eq('uid', uid)
        .maybeSingle();

      if (errorRfid) {
        console.error('Error consultando RFID:', errorRfid);

        return NextResponse.json(
          { error: 'No fue posible consultar el RFID' },
          { status: 500 }
        );
      }

      // Una tarjeta desconocida, sin asignación o no activa
      // se procesa como evento anónimo.
      if (
        rfid &&
        rfid.usuario_id &&
        rfid.estado === 'ACTIVA'
      ) {
        const { data: usuario, error: errorUsuario } =
          await supabaseServer
            .from('usuarios')
            .select('id, estado')
            .eq('id', rfid.usuario_id)
            .maybeSingle();

        if (errorUsuario) {
          console.error('Error consultando usuario RFID:', errorUsuario);

          return NextResponse.json(
            { error: 'No fue posible verificar el usuario RFID' },
            { status: 500 }
          );
        }

        // Solo una tarjeta activa vinculada a un usuario activo
        // puede asociarse al ciclo y recibir puntos.
        if (usuario && usuario.estado === 'ACTIVO') {
          usuarioId = rfid.usuario_id;
          rfidId = rfid.id;
        }
      }
    }

    // 6. Registrar clasificación.
    // Si no existe identidad válida, ambos identificadores son NULL.
    const { data: resultado, error: errorRegistro } =
      await supabaseServer.rpc(
        'registrar_clasificacion_idempotente',
        {
          p_idempotency_key: idempotencyKey,
          p_usuario_id: usuarioId,
          p_rfid_id: rfidId,
          p_tipo_residuo: tipoResiduo,
          p_humedad: humedad,
          p_distancia: distancia,
          p_direccion_motor:
            tipoResiduo === 'RECHAZO'
              ? null
              : (direccionMotor || null),
        }
      );

    if (errorRegistro) {
      const detalle = errorRegistro.message || '';

      console.error('Error registrando clasificación:', errorRegistro);

      if (detalle.includes('clave del evento ya fue utilizada')) {
        return NextResponse.json(
          {
            error: 'La clave del evento ya fue utilizada con otros datos'
          },
          { status: 409 }
        );
      }

      if (detalle.includes('Tarjeta RFID no encontrada')) {
        return NextResponse.json(
          { error: 'No fue posible validar la identidad del evento' },
          { status: 409 }
        );
      }

      if (detalle.includes('no pertenece al usuario indicado')) {
        return NextResponse.json(
          { error: 'La identidad RFID no coincide con el usuario' },
          { status: 409 }
        );
      }

      return NextResponse.json(
        {
          error: 'No fue posible registrar la clasificación',
          detalle
        },
        { status: 500 }
      );
    }

    if (!resultado?.exitoso || !resultado?.clasificacion?.id) {
      return NextResponse.json(
        { error: 'La base de datos no devolvió un resultado válido' },
        { status: 500 }
      );
    }

    // 7. Vincular la clasificación con el dispositivo.
    // Esta operación también se ejecuta para clasificaciones anónimas.
    const { data: equipo, error: errorEquipo } =
      await supabaseServer.rpc(
        'sping_vincular_dispositivo_y_alertar',
        {
          p_clasificacion_id: resultado.clasificacion.id,
          p_codigo_dispositivo: codigoDispositivo,
          p_motivo_rechazo:
            tipoResiduo === 'RECHAZO'
              ? motivoRechazo
              : null,
        }
      );

    if (errorEquipo) {
      console.error(
        'Error vinculando clasificación con dispositivo:',
        errorEquipo
      );

      // La clasificación puede estar registrada.
      // El puente debe reintentar usando la misma clave idempotente.
      return NextResponse.json(
        {
          ...resultado,
          equipoVinculado: false,
          errorEquipo: errorEquipo.message,
          mensaje:
            'Clasificación registrada, pero falta vincular el dispositivo. Se reintentará la sincronización.'
        },
        { status: 503 }
      );
    }

    // 8. Construir mensaje según los puntos realmente otorgados.
    const puntosOtorgados =
      Number(resultado.puntos_sumados) || 0;

    let mensaje: string;

    if (resultado.duplicado) {
      mensaje = 'Evento ya registrado. No se sumaron puntos nuevamente.';
    } else if (tipoResiduo === 'RECHAZO') {
      mensaje = puntosOtorgados > 0
        ? `Rechazo registrado. Se sumaron ${puntosOtorgados} SPING POINTS y quedó pendiente de revisión.`
        : 'Rechazo registrado y pendiente de revisión. No se otorgaron puntos.';
    } else if (puntosOtorgados > 0) {
      mensaje = `Clasificación registrada correctamente. Se sumaron ${puntosOtorgados} SPING POINTS.`;
    } else {
      mensaje = 'Clasificación registrada correctamente sin asignación de puntos.';
    }

    // 9. Respuesta final.
    return NextResponse.json({
      ...resultado,
      equipo,
      equipoVinculado: true,
      identidadReconocida: usuarioId !== null && rfidId !== null,
      puntosOtorgados,
      mensaje
    });

  } catch (error) {
    console.error('Error en API de clasificaciones:', error);

    return NextResponse.json(
      { error: 'Solicitud inválida' },
      { status: 400 }
    );
  }
}
