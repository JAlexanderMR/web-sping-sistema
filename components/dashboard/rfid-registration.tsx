
'use client';

import { useState, type FormEvent } from 'react';

type TarjetaRFID = {
  id: number;
  uid: string;
  estado: string;
  fecha_asignacion: string | null;
};

type Props = {
  tarjeta: TarjetaRFID | null;
};

type MotivoReporte = 'PERDIDA' | 'ROBO' | 'DANADA';

const buttonPrimary =
  'rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground ' +
  'transition-all duration-200 ease-out ' +
  'hover:-translate-y-0.5 hover:opacity-90 hover:shadow-md ' +
  'active:translate-y-0 active:scale-[0.97] ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ' +
  'disabled:cursor-not-allowed disabled:opacity-50 ' +
  'motion-reduce:transform-none motion-reduce:transition-none';

const buttonSecondary =
  'rounded-lg border border-border px-4 py-2 text-sm ' +
  'transition-all duration-200 ease-out ' +
  'hover:-translate-y-0.5 hover:bg-muted hover:shadow-sm ' +
  'active:translate-y-0 active:scale-[0.97] ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ' +
  'disabled:cursor-not-allowed disabled:opacity-50 ' +
  'motion-reduce:transform-none motion-reduce:transition-none';

export function RfidRegistration({ tarjeta }: Props) {
  const [uid, setUid] = useState('');
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');

  const [mostrarReporte, setMostrarReporte] = useState(false);
  const [motivo, setMotivo] = useState<MotivoReporte>('PERDIDA');
  const [detalle, setDetalle] = useState('');

  // =====================================================
  // ENVÍO DE SOLICITUDES A LA API
  // =====================================================

  async function enviarSolicitud(
    accion: string,
    datos: Record<string, unknown> = {}
  ) {
    setCargando(true);
    setMensaje('');
    setError('');

    try {
      const response = await fetch('/api/rfid', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          accion,
          ...datos,
        }),
      });

      const resultado = await response.json();

      if (!response.ok) {
        throw new Error(
          resultado.error || 'No se pudo completar la operación.'
        );
      }

      setMensaje(
        resultado.mensaje || 'Operación realizada correctamente.'
      );

      window.location.reload();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Ocurrió un error inesperado.'
      );
    } finally {
      setCargando(false);
    }
  }

  // =====================================================
  // REGISTRAR TARJETA
  // =====================================================

  async function registrarTarjeta(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    await enviarSolicitud('registrar', { uid });
  }

  // =====================================================
  // BLOQUEAR Y DESBLOQUEAR TARJETA
  // =====================================================

  function gestionarEstado(accion: 'bloquear' | 'desbloquear') {
    if (!tarjeta || cargando) return;

    const confirmacion =
      accion === 'bloquear'
        ? '¿Deseas bloquear tu tarjeta SPING? No podrás utilizarla mientras esté bloqueada.'
        : '¿Deseas desbloquear tu tarjeta SPING?';

    if (!window.confirm(confirmacion)) return;

    enviarSolicitud(accion, {
      tarjetaId: tarjeta.id,
    });
  }

  // =====================================================
  // REPORTAR TARJETA
  // =====================================================

  async function reportarTarjeta(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!tarjeta || cargando) return;

    await enviarSolicitud('reportar', {
      tarjetaId: tarjeta.id,
      motivo,
      detalle,
    });
  }

  // =====================================================
  // ESTADOS VISUALES
  // =====================================================

  const estadoColor: Record<string, string> = {
    ACTIVA: 'text-green-600',
    BLOQUEADA: 'text-yellow-600',
    REPORTADA: 'text-red-600',
    INACTIVA: 'text-muted-foreground',
  };

  // =====================================================
  // INTERFAZ
  // =====================================================

  return (
    <section className="mb-10 rounded-xl border border-border bg-card p-6">

      {/* ENCABEZADO */}

      <div className="mb-5">
        <h2 className="text-xl font-semibold">
          Mi tarjeta SPING
        </h2>

        <p className="mt-1 text-sm text-muted-foreground">
          Consulta y administra tu tarjeta personal.
        </p>
      </div>

      {/* MENSAJES */}

      {mensaje && (
        <p className="mb-4 animate-in fade-in duration-300 text-sm text-green-600">
          {mensaje}
        </p>
      )}

      {error && (
        <p className="mb-4 animate-in fade-in duration-300 text-sm text-red-600">
          {error}
        </p>
      )}

      {/* ================================================= */}
      {/* TARJETA REGISTRADA */}
      {/* ================================================= */}

      {tarjeta ? (
        <div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm text-muted-foreground">
                UID de tarjeta
              </p>

              <p className="font-mono text-lg font-medium">
                {tarjeta.uid}
              </p>
            </div>

            <span
              className={`text-sm font-semibold ${
                estadoColor[tarjeta.estado] ?? 'text-muted-foreground'
              }`}
            >
              {tarjeta.estado}
            </span>
          </div>

          <p className="mt-3 text-sm text-muted-foreground">
            Fecha de registro:{' '}
            {tarjeta.fecha_asignacion
              ? new Date(
                  tarjeta.fecha_asignacion
                ).toLocaleDateString('es-CO')
              : '--'}
          </p>

          <div className="mt-5 border-t border-border pt-4">

            {/* TARJETA ACTIVA */}

            {tarjeta.estado === 'ACTIVA' && (
              <div className="flex flex-wrap gap-3">

                <button
                  type="button"
                  onClick={() => gestionarEstado('bloquear')}
                  disabled={cargando}
                  className={buttonSecondary}
                >
                  {cargando ? 'Procesando...' : 'Bloquear tarjeta'}
                </button>

                <button
                  type="button"
                  onClick={() => setMostrarReporte(!mostrarReporte)}
                  disabled={cargando}
                  className={buttonSecondary}
                >
                  Reportar tarjeta
                </button>

              </div>
            )}

            {/* TARJETA BLOQUEADA */}

            {tarjeta.estado === 'BLOQUEADA' && (
              <div className="flex flex-wrap gap-3">

                <button
                  type="button"
                  onClick={() => gestionarEstado('desbloquear')}
                  disabled={cargando}
                  className={buttonPrimary}
                >
                  {cargando ? 'Procesando...' : 'Desbloquear tarjeta'}
                </button>

                <button
                  type="button"
                  onClick={() => setMostrarReporte(!mostrarReporte)}
                  disabled={cargando}
                  className={buttonSecondary}
                >
                  Reportar tarjeta
                </button>

              </div>
            )}

            {/* TARJETA REPORTADA */}

            {tarjeta.estado === 'REPORTADA' && (
              <p className="text-sm text-muted-foreground">
                La tarjeta está reportada y no puede utilizarse.
                La solicitud de reposición debe ser gestionada
                por el administrador.
              </p>
            )}

            {/* TARJETA INACTIVA */}

            {tarjeta.estado === 'INACTIVA' && (
              <p className="text-sm text-muted-foreground">
                Esta tarjeta está deshabilitada. Contacta al administrador.
              </p>
            )}

          </div>

          {/* FORMULARIO DE REPORTE */}

          {mostrarReporte && (
            <form
              onSubmit={reportarTarjeta}
              className="mt-5 space-y-4 border-t border-border pt-4 animate-in fade-in slide-in-from-top-2 duration-200"
            >

              <h3 className="font-medium">
                Reportar tarjeta
              </h3>

              <div>
                <label
                  htmlFor="motivo"
                  className="mb-1 block text-sm font-medium"
                >
                  Motivo
                </label>

                <select
                  id="motivo"
                  value={motivo}
                  onChange={(event) =>
                    setMotivo(event.target.value as MotivoReporte)
                  }
                  disabled={cargando}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm transition-colors focus:border-primary focus:outline-none disabled:opacity-50"
                >
                  <option value="PERDIDA">
                    Pérdida
                  </option>

                  <option value="ROBO">
                    Robo
                  </option>

                  <option value="DANADA">
                    Daño
                  </option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="detalle"
                  className="mb-1 block text-sm font-medium"
                >
                  Descripción (opcional)
                </label>

                <textarea
                  id="detalle"
                  value={detalle}
                  onChange={(event) => setDetalle(event.target.value)}
                  maxLength={1000}
                  rows={3}
                  disabled={cargando}
                  placeholder="Describe brevemente lo ocurrido."
                  className="w-full resize-y rounded-lg border border-border bg-background px-3 py-2 text-sm transition-colors focus:border-primary focus:outline-none disabled:opacity-50"
                />
              </div>

              <div className="flex flex-wrap gap-3">

                <button
                  type="submit"
                  disabled={cargando}
                  className={buttonPrimary}
                >
                  {cargando ? 'Enviando...' : 'Enviar reporte'}
                </button>

                <button
                  type="button"
                  onClick={() => setMostrarReporte(false)}
                  disabled={cargando}
                  className={buttonSecondary}
                >
                  Cancelar
                </button>

              </div>
            </form>
          )}

        </div>

      ) : (

        /* ================================================= */
        /* REGISTRO DE TARJETA */
        /* ================================================= */

        <div>

          <p className="mb-4 text-sm text-muted-foreground">
            Todavía no tienes una tarjeta asociada a tu cuenta.
          </p>

          <form
            onSubmit={registrarTarjeta}
            className="space-y-3"
          >

            <div>
              <label
                htmlFor="rfid-uid"
                className="mb-1 block text-sm font-medium"
              >
                UID de tarjeta
              </label>

              <input
                id="rfid-uid"
                type="text"
                value={uid}
                onChange={(event) => setUid(event.target.value)}
                placeholder="Ejemplo: A1B2C3D4"
                required
                maxLength={64}
                disabled={cargando}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm transition-colors focus:border-primary focus:outline-none disabled:opacity-50"
              />
            </div>

            <p className="text-xs text-muted-foreground">
              Modo de simulación mientras se conecta el lector RC522.
            </p>

            <button
              type="submit"
              disabled={cargando || !uid.trim()}
              className={buttonPrimary}
            >
              {cargando ? 'Registrando...' : 'Registrar tarjeta'}
            </button>

          </form>

        </div>
      )}

    </section>
  );
}
