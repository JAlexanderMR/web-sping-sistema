
import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    // 1. Autenticar dispositivo Arduino o puente USB
    const deviceKey = request.headers.get('x-sping-device-key');
    const expectedKey = process.env.SPING_DEVICE_API_KEY;

    if (!expectedKey || deviceKey !== expectedKey) {
      return NextResponse.json(
        { error: 'Dispositivo no autorizado' },
        { status: 401 }
      );
    }

    // 2. Leer información recibida
    const body = await request.json();

    const uid =
      typeof body.uid === 'string'
        ? body.uid.trim().replace(/[\s:-]/g, '').toUpperCase()
        : '';

    const tipoResiduo =
      typeof body.tipoResiduo === 'string'
        ? body.tipoResiduo.trim().toUpperCase()
        : '';

    const humedad = Number(body.humedad);
    const distancia = Number(body.distancia);

    const direccionMotor =
      typeof body.direccionMotor === 'string'
        ? body.direccionMotor.trim().toUpperCase()
        : '';

    // 3. Obtener clave única del evento
    const idempotencyKey =
      request.headers.get('x-idempotency-key') ||
      body.idempotencyKey;

    const uuidValido =
      typeof idempotencyKey === 'string' &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        idempotencyKey
      );

    if (!uuidValido) {
      return NextResponse.json(
        {
          error: 'Se requiere una clave UUID válida para identificar el evento',
        },
        { status: 400 }
      );
    }

    // 4. Validar datos obligatorios
    if (
      !uid ||
      !tipoResiduo ||
      body.humedad === undefined ||
      body.humedad === null ||
      body.distancia === undefined ||
      body.distancia === null ||
      !Number.isFinite(humedad) ||
      !Number.isFinite(distancia) ||
      humedad < 0 ||
      distancia < 0
    ) {
      return NextResponse.json(
        {
          error:
            'UID, tipo de residuo, humedad y distancia son obligatorios y deben ser válidos',
        },
        { status: 400 }
      );
    }

    // 5. Validar resultados permitidos
    const tiposPermitidos = ['HUMEDO', 'SECO', 'RECHAZO'];

    if (!tiposPermitidos.includes(tipoResiduo)) {
      return NextResponse.json(
        {
          error: 'El tipo de residuo debe ser HUMEDO, SECO o RECHAZO',
        },
        { status: 400 }
      );
    }

    // 6. Validar dirección del motor
    if (
      direccionMotor &&
      !['IZQUIERDA', 'DERECHA'].includes(direccionMotor)
    ) {
      return NextResponse.json(
        { error: 'La dirección debe ser IZQUIERDA o DERECHA' },
        { status: 400 }
      );
    }

    // 7. Buscar RFID sin filtrar por estado.
    // La validación definitiva se realiza dentro de SQL.
    const { data: rfid, error: errorRfid } = await supabaseServer
      .from('rfid')
      .select(`
        id,
        uid,
        usuario_id
      `)
      .eq('uid', uid)
      .maybeSingle();

    if (errorRfid) {
      console.error('Error consultando RFID:', errorRfid);

      return NextResponse.json(
        { error: 'No fue posible consultar el RFID' },
        { status: 500 }
      );
    }

    if (!rfid) {
      return NextResponse.json(
        { error: 'RFID no registrado', uid },
        { status: 404 }
      );
    }

    // 8. Registrar mediante la función SQL transaccional.
    // SQL valida el estado de la tarjeta, su propietario y el estado del usuario.
    // También controla los eventos duplicados antes de validar el estado actual.
    const { data: resultado, error: errorRegistro } =
      await supabaseServer.rpc(
        'registrar_clasificacion_idempotente',
        {
          p_idempotency_key: idempotencyKey,
          p_usuario_id: rfid.usuario_id,
          p_rfid_id: rfid.id,
          p_tipo_residuo: tipoResiduo,
          p_humedad: humedad,
          p_distancia: distancia,
          p_direccion_motor:
            tipoResiduo === 'RECHAZO'
              ? null
              : direccionMotor || null,
        }
      );

    // 9. Interpretar errores de validación generados por SQL
    if (errorRegistro) {
      console.error(
        'Error registrando clasificación:',
        errorRegistro
      );

      const detalle = errorRegistro.message || '';

      const errorTarjeta = detalle.match(
        /Tarjeta RFID no activa\. Estado actual: (.+)/i
      );

      if (errorTarjeta) {
        const estadoTarjeta = errorTarjeta[1].trim().toUpperCase();

        const mensajesEstado: Record<string, string> = {
          BLOQUEADA: 'Esta tarjeta está bloqueada y no puede utilizarse.',
          REPORTADA: 'Esta tarjeta fue reportada como perdida, robada o dañada.',
          INACTIVA: 'Esta tarjeta está inactiva y ya no puede utilizarse.',
        };

        return NextResponse.json(
          {
            error:
              mensajesEstado[estadoTarjeta] ??
              'Esta tarjeta no está habilitada para clasificar residuos.',
            tarjetaEstado: estadoTarjeta,
            clasificacionPermitida: false,
            puntosOtorgados: 0,
          },
          { status: 403 }
        );
      }

      if (
        detalle.includes('Tarjeta RFID no encontrada')
      ) {
        return NextResponse.json(
          {
            error: 'La tarjeta RFID ya no se encuentra registrada',
            clasificacionPermitida: false,
            puntosOtorgados: 0,
          },
          { status: 404 }
        );
      }

      if (
        detalle.includes('no pertenece al usuario indicado')
      ) {
        return NextResponse.json(
          {
            error: 'La tarjeta RFID no pertenece al usuario indicado',
            clasificacionPermitida: false,
            puntosOtorgados: 0,
          },
          { status: 403 }
        );
      }

      if (
        detalle.includes('Usuario no activo')
      ) {
        return NextResponse.json(
          {
            error: 'El usuario asociado no está activo',
            clasificacionPermitida: false,
            puntosOtorgados: 0,
          },
          { status: 403 }
        );
      }

      if (
        detalle.includes('Usuario no encontrado')
      ) {
        return NextResponse.json(
          {
            error: 'El usuario asociado no existe',
            clasificacionPermitida: false,
            puntosOtorgados: 0,
          },
          { status: 404 }
        );
      }

      if (
        detalle.includes('clave del evento ya fue utilizada')
      ) {
        return NextResponse.json(
          {
            error: 'La clave del evento ya fue utilizada con otros datos',
          },
          { status: 409 }
        );
      }

      return NextResponse.json(
        {
          error: 'No fue posible registrar la clasificación',
          detalle,
        },
        { status: 500 }
      );
    }

    // 10. Verificar resultado de SQL
    if (!resultado || !resultado.exitoso) {
      return NextResponse.json(
        { error: 'La base de datos no devolvió un resultado válido' },
        { status: 500 }
      );
    }

    // 11. Construir mensaje según resultado
    let mensaje = 'Clasificación registrada correctamente';

    if (resultado.resultado === 'RECHAZO') {
      mensaje =
        'Lectura inconsistente registrada. Requiere atención manual.';
    }

    if (resultado.duplicado) {
      mensaje =
        'Evento ya registrado. No se sumaron puntos nuevamente.';
    }

    // 12. Respuesta final
    return NextResponse.json({
      ...resultado,
      mensaje,
    });
  } catch (error) {
    console.error('Error en API de clasificaciones:', error);

    return NextResponse.json(
      { error: 'Solicitud inválida' },
      { status: 400 }
    );
  }
}
