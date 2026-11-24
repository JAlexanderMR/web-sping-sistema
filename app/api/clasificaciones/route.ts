import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const UID_RE = /^(?:[A-F0-9]{8}|[A-F0-9]{14}|[A-F0-9]{20})$/;

export async function POST(request: Request) {
  try {
    const deviceKey = request.headers.get('x-sping-device-key');
    const expectedKey = process.env.SPING_DEVICE_API_KEY;
    if (!expectedKey || deviceKey !== expectedKey) {
      return NextResponse.json({ error: 'Dispositivo no autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const uid = typeof body.uid === 'string'
      ? body.uid.trim().replace(/[\s:-]/g, '').toUpperCase() : '';
    const tipoResiduo = typeof body.tipoResiduo === 'string'
      ? body.tipoResiduo.trim().toUpperCase() : '';
    const humedad = Number(body.humedad);
    const distancia = Number(body.distancia);
    const direccionMotor = typeof body.direccionMotor === 'string'
      ? body.direccionMotor.trim().toUpperCase() : '';
    const motivoRechazo = typeof body.motivoRechazo === 'string'
      ? body.motivoRechazo.trim().toUpperCase() : '';
    const codigoDispositivo = typeof body.codigoDispositivo === 'string'
      ? body.codigoDispositivo.trim() : '';
    const idempotencyKey = request.headers.get('x-idempotency-key') || body.idempotencyKey;

    if (typeof idempotencyKey !== 'string' || !UUID_RE.test(idempotencyKey)) {
      return NextResponse.json({ error: 'Se requiere una clave UUID válida para identificar el evento' }, { status: 400 });
    }
    if (!UID_RE.test(uid) || !['HUMEDO', 'SECO', 'RECHAZO'].includes(tipoResiduo) ||
        body.humedad == null || body.distancia == null || !Number.isFinite(humedad) ||
        !Number.isFinite(distancia) || humedad < 0 || distancia < 0) {
      return NextResponse.json({ error: 'UID, tipo de residuo, humedad y distancia deben ser válidos' }, { status: 400 });
    }
    if (tipoResiduo === 'RECHAZO' && !['PUNTO_INVALIDO', 'SIN_CONSENSO'].includes(motivoRechazo)) {
      return NextResponse.json({ error: 'El rechazo requiere motivo PUNTO_INVALIDO o SIN_CONSENSO' }, { status: 400 });
    }
    if (!codigoDispositivo || codigoDispositivo.length > 48) {
      return NextResponse.json({ error: 'Código de dispositivo obligatorio o inválido' }, { status: 400 });
    }
    if (direccionMotor && !['IZQUIERDA', 'DERECHA'].includes(direccionMotor)) {
      return NextResponse.json({ error: 'La dirección debe ser IZQUIERDA o DERECHA' }, { status: 400 });
    }

    const { data: rfid, error: errorRfid } = await supabaseServer
      .from('rfid').select('id, uid, usuario_id').eq('uid', uid).maybeSingle();
    if (errorRfid) {
      console.error('Error consultando RFID:', errorRfid);
      return NextResponse.json({ error: 'No fue posible consultar el RFID' }, { status: 500 });
    }
    if (!rfid?.usuario_id) {
      return NextResponse.json({ error: 'RFID no registrado o sin usuario asignado', uid }, { status: 404 });
    }

    const { data: resultado, error: errorRegistro } = await supabaseServer.rpc(
      'registrar_clasificacion_idempotente',
      {
        p_idempotency_key: idempotencyKey,
        p_usuario_id: rfid.usuario_id,
        p_rfid_id: rfid.id,
        p_tipo_residuo: tipoResiduo,
        p_humedad: humedad,
        p_distancia: distancia,
        p_direccion_motor: tipoResiduo === 'RECHAZO' ? null : (direccionMotor || null),
      }
    );

    if (errorRegistro) {
      const detalle = errorRegistro.message || '';
      console.error('Error registrando clasificación:', errorRegistro);
      const errorTarjeta = detalle.match(/Tarjeta RFID no activa\. Estado actual:\s*(.+)/i);
      if (errorTarjeta) {
        const estado = errorTarjeta[1].trim().toUpperCase();
        const mensajes: Record<string, string> = {
          BLOQUEADA: 'Esta tarjeta está bloqueada y no puede utilizarse.',
          REPORTADA: 'Esta tarjeta fue reportada como perdida, robada o dañada.',
          INACTIVA: 'Esta tarjeta está inactiva y ya no puede utilizarse.',
        };
        return NextResponse.json({ error: mensajes[estado] ?? 'Esta tarjeta no está habilitada.', tarjetaEstado: estado, clasificacionPermitida: false, puntosOtorgados: 0 }, { status: 403 });
      }
      if (detalle.includes('Tarjeta RFID no encontrada')) return NextResponse.json({ error: 'La tarjeta RFID ya no se encuentra registrada' }, { status: 404 });
      if (detalle.includes('no pertenece al usuario indicado') || detalle.includes('Usuario no activo')) return NextResponse.json({ error: detalle }, { status: 403 });
      if (detalle.includes('Usuario no encontrado')) return NextResponse.json({ error: detalle }, { status: 404 });
      if (detalle.includes('clave del evento ya fue utilizada')) return NextResponse.json({ error: 'La clave del evento ya fue utilizada con otros datos' }, { status: 409 });
      return NextResponse.json({ error: 'No fue posible registrar la clasificación', detalle }, { status: 500 });
    }

    if (!resultado?.exitoso || !resultado?.clasificacion?.id) {
      return NextResponse.json({ error: 'La base de datos no devolvió un resultado válido' }, { status: 500 });
    }

    const { data: equipo, error: errorEquipo } = await supabaseServer.rpc(
      'sping_vincular_dispositivo_y_alertar',
      {
        p_clasificacion_id: resultado.clasificacion.id,
        p_codigo_dispositivo: codigoDispositivo,
        p_motivo_rechazo: tipoResiduo === 'RECHAZO' ? motivoRechazo : null,
      }
    );
    if (errorEquipo) {
      console.error('Error vinculando clasificación con dispositivo:', errorEquipo);
      // La clasificación y los puntos ya se registraron transaccionalmente.
      // Se devuelve estado explícito para que el puente no reintente con otra clave.
      return NextResponse.json({ ...resultado, equipoVinculado: false, errorEquipo: errorEquipo.message, mensaje: 'Clasificación registrada, pero falta vincular el dispositivo. Se reintentará la sincronización.' }, { status: 503 });
    }

    const mensaje = resultado.duplicado
      ? 'Evento ya registrado. No se sumaron puntos nuevamente.'
      : tipoResiduo === 'RECHAZO'
        ? 'Rechazo de clasificación registrado. Se sumaron 3 SPING POINTS y quedó pendiente de revisión.'
        : 'Clasificación registrada correctamente';

    return NextResponse.json({ ...resultado, equipo, equipoVinculado: true, mensaje });
  } catch (error) {
    console.error('Error en API de clasificaciones:', error);
    return NextResponse.json({ error: 'Solicitud inválida' }, { status: 400 });
  }
}
