import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const deviceKey = request.headers.get('x-sping-device-key');
    const expectedKey = process.env.SPING_DEVICE_API_KEY;

    if (!expectedKey || deviceKey !== expectedKey) {
      return NextResponse.json(
        { error: 'Dispositivo no autorizado' },
        { status: 401 }
      );
    }

    const body = await request.json();

    const uid = body.uid?.trim();
    const tipoResiduo = body.tipoResiduo?.trim()?.toUpperCase();
    const humedad = body.humedad;
    const distancia = body.distancia;
    const direccionMotor = body.direccionMotor?.trim()?.toUpperCase();

    // 1. Validar datos obligatorios
    if (
      !uid ||
      !tipoResiduo ||
      humedad === undefined ||
      distancia === undefined
    ) {
      return NextResponse.json(
        {
          error:
            'UID, tipo de residuo, humedad y distancia son obligatorios',
        },
        { status: 400 }
      );
    }

    // 2. Validar tipo de residuo
    if (!['HUMEDO', 'SECO'].includes(tipoResiduo)) {
      return NextResponse.json(
        { error: 'El tipo de residuo debe ser HUMEDO o SECO' },
        { status: 400 }
      );
    }

    // 3. Validar dirección del motor
    if (
      direccionMotor &&
      !['IZQUIERDA', 'DERECHA'].includes(direccionMotor)
    ) {
      return NextResponse.json(
        { error: 'La dirección debe ser IZQUIERDA o DERECHA' },
        { status: 400 }
      );
    }

    // 4. Buscar RFID y usuario
    const { data: rfid, error: errorRfid } = await supabaseServer
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
      .eq('estado', 'ACTIVA')
      .maybeSingle();

    if (errorRfid) {
      return NextResponse.json(
        { error: errorRfid.message },
        { status: 500 }
      );
    }

    if (!rfid) {
      return NextResponse.json(
        {
          error: 'RFID no registrado',
          uid,
        },
        { status: 404 }
      );
    }

    if (!rfid.usuario_id) {
      return NextResponse.json(
        { error: 'El RFID no tiene un usuario asociado' },
        { status: 400 }
      );
    }

    // 5. Registrar clasificación
    const puntos = 10;

    const { data: clasificacion, error: errorClasificacion } =
      await supabaseServer
        .from('clasificaciones')
        .insert({
          usuario_id: rfid.usuario_id,
          rfid_id: rfid.id,
          tipo_residuo: tipoResiduo,
          humedad: Number(humedad),
          distancia: Number(distancia),
          direccion_motor: direccionMotor || null,
          puntos_obtenidos: puntos,
          estado: 'COMPLETADO',
        })
        .select()
        .single();

    if (errorClasificacion) {
      return NextResponse.json(
        { error: errorClasificacion.message },
        { status: 500 }
      );
    }

    // 6. Guardar lectura de sensores
    const { data: lectura, error: errorLectura } =
      await supabaseServer
        .from('lecturas_sensores')
        .insert({
          clasificacion_id: clasificacion.id,
          humedad: Number(humedad),
          distancia: Number(distancia),
        })
        .select()
        .single();

    if (errorLectura) {
      return NextResponse.json(
        { error: errorLectura.message },
        { status: 500 }
      );
    }

    // 7. Sumar puntos de forma segura en PostgreSQL
    const { data: nuevosPuntos, error: errorPuntos } =
      await supabaseServer.rpc('registrar_puntos_clasificacion', {
        p_usuario_id: rfid.usuario_id,
        p_clasificacion_id: clasificacion.id,
        p_puntos: puntos,
      });

    if (errorPuntos) {
      return NextResponse.json(
        {
          error: 'No fue posible registrar los puntos',
          detalle: errorPuntos.message,
        },
        { status: 500 }
      );
    }

    // 8. Obtener usuario actualizado
    const { data: usuarioActualizado, error: errorUsuario } =
      await supabaseServer
        .from('usuarios')
        .select(
          'id, codigo_usuario, nombre, puntos_totales, estado, fecha_registro'
        )
        .eq('id', rfid.usuario_id)
        .single();

    if (errorUsuario) {
      return NextResponse.json(
        { error: errorUsuario.message },
        { status: 500 }
      );
    }

    // 9. Respuesta final
    return NextResponse.json({
      exitoso: true,
      mensaje: 'Clasificación registrada correctamente',
      usuario: usuarioActualizado,
      clasificacion,
      lectura,
      puntos_sumados: puntos,
      puntos_totales: nuevosPuntos,
    });
    } catch {
    return NextResponse.json(
      { error: 'Solicitud inválida' },
      { status: 400 }
    );
  }
}