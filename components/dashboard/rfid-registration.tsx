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
  const [tarjetaActual, setTarjetaActual] = useState<TarjetaRFID | null>(tarjeta);
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');

  const [mostrarActivacion, setMostrarActivacion] = useState(false);
  const [codigo, setCodigo] = useState('');

  const [mostrarReporte, setMostrarReporte] = useState(false);
  const [motivo, setMotivo] = useState<MotivoReporte>('PERDIDA');
  const [detalle, setDetalle] = useState('');

  // =====================================================
  // OPERACIONES GENERALES DE LA TARJETA
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accion, ...datos }),
      });

      const resultado = await response.json();

      if (!response.ok) {
        throw new Error(resultado.error || 'No se pudo completar la operación.');
      }

      setMensaje(resultado.mensaje || 'Operación realizada correctamente.');
      window.location.reload();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Ocurrió un error inesperado.'
      );
    } finally {
      setCargando(false);
    }
  }

  // =====================================================
  // ACTIVAR TARJETA RESERVADA MEDIANTE CÓDIGO
  // =====================================================

  async function activarTarjeta(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const codigoLimpio = codigo.replace(/\s/g, '');

    if (!/^\d{8}$/.test(codigoLimpio)) {
      setError('Ingresa el código de activación de ocho dígitos.');
      return;
    }

    setCargando(true);
    setMensaje('');
    setError('');

    try {
      const response = await fetch('/api/rfid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accion: 'activar_codigo',
          codigo: codigoLimpio,
        }),
      });

      const resultado = await response.json();

      if (!response.ok || !resultado.exitoso) {
        throw new Error(
          resultado.error || 'No fue posible activar tu tarjeta.'
        );
      }

      if (resultado.rfid) {
        setTarjetaActual((actual) =>
          actual
            ? {
                ...actual,
                id: resultado.rfid.id ?? actual.id,
                uid: resultado.rfid.uid ?? actual.uid,
                estado: resultado.rfid.estado ?? 'ACTIVA',
              }
            : actual
        );
      }

      setCodigo('');
      setMostrarActivacion(false);
      setMostrarReporte(false);
      setMensaje(
        resultado.mensaje || '¡Tu tarjeta SPING fue activada correctamente!'
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Ocurrió un error al activar tu tarjeta.'
      );
    } finally {
      setCargando(false);
    }
  }

  // =====================================================
  // BLOQUEAR Y DESBLOQUEAR TARJETA
  // =====================================================

  function gestionarEstado(accion: 'bloquear' | 'desbloquear') {
    if (!tarjetaActual || cargando) return;

    const confirmacion =
      accion === 'bloquear'
        ? '¿Deseas bloquear tu tarjeta SPING? No podrás utilizarla mientras esté bloqueada.'
        : '¿Deseas desbloquear tu tarjeta SPING?';

    if (!window.confirm(confirmacion)) return;

    enviarSolicitud(accion, { tarjetaId: tarjetaActual.id });
  }

  // =====================================================
  // REPORTAR TARJETA
  // =====================================================

  async function reportarTarjeta(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!tarjetaActual || cargando) return;

    await enviarSolicitud('reportar', {
      tarjetaId: tarjetaActual.id,
      motivo,
      detalle,
    });
  }

  // =====================================================
  // ESTADOS VISUALES
  // =====================================================

  const estadoColor: Record<string, string> = {
    ACTIVA: 'border-green-500/30 bg-green-500/10 text-green-600',
    BLOQUEADA: 'border-yellow-500/30 bg-yellow-500/10 text-yellow-600',
    REPORTADA: 'border-red-500/30 bg-red-500/10 text-red-600',
    INACTIVA: 'border-border bg-muted text-muted-foreground',
  };

  const estadoEtiqueta: Record<string, string> = {
    ACTIVA: 'Tarjeta activa',
    BLOQUEADA: 'Tarjeta bloqueada',
    REPORTADA: 'Tarjeta reportada',
    INACTIVA: 'Tarjeta deshabilitada',
  };

  const fechaAsignacion = tarjetaActual?.fecha_asignacion
    ? new Date(tarjetaActual.fecha_asignacion).toLocaleDateString('es-CO')
    : 'No disponible';

  // =====================================================
  // INTERFAZ
  // =====================================================

  return (
    <section className="mb-10 rounded-xl border border-border bg-card p-6">
      <div className="mb-5">
        <h2 className="text-xl font-semibold">Mi tarjeta SPING</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Consulta y administra tu tarjeta personal.
        </p>
      </div>

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

      {!tarjetaActual ? (
        <div className="rounded-lg border border-dashed border-border p-5">
          <p className="font-medium">Todavía no tienes una tarjeta asignada.</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Cuando la empresa te asigne y entregue tu tarjeta SPING, podrás
            activarla desde aquí con el código de seguridad que recibirás junto
            con ella.
          </p>
        </div>
      ) : (
        <div>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm text-muted-foreground">UID de tarjeta</p>
              <p className="font-mono text-lg font-medium">{tarjetaActual.uid}</p>
              <p className="mt-3 text-sm text-muted-foreground">
                Fecha de asignación: {fechaAsignacion}
              </p>
            </div>

            {/* No mostramos RESERVADA: la activación se presenta como una acción. */}
            {tarjetaActual.estado !== 'RESERVADA' && (
              <span
                className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${
                  estadoColor[tarjetaActual.estado] ??
                  'border-border bg-muted text-muted-foreground'
                }`}
              >
                {estadoEtiqueta[tarjetaActual.estado] ?? 'Estado de tarjeta'}
              </span>
            )}
          </div>

          <div className="mt-5 border-t border-border pt-4">
            {tarjetaActual.estado === 'RESERVADA' && (
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium">¿Ya recibiste tu tarjeta?</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Cuando tengas tu tarjeta física, actívala con el código de
                    seguridad que recibiste junto con ella.
                  </p>
                </div>

                {!mostrarActivacion ? (
                  <button
                    type="button"
                    onClick={() => {
                      setMostrarActivacion(true);
                      setMensaje('');
                      setError('');
                    }}
                    disabled={cargando}
                    className={buttonPrimary}
                  >
                    Activar mi tarjeta
                  </button>
                ) : (
                  <form onSubmit={activarTarjeta} className="space-y-3">
                    <div>
                      <label
                        htmlFor="codigo-activacion-rfid"
                        className="mb-1 block text-sm font-medium"
                      >
                        Código de seguridad
                      </label>
                      <input
                        id="codigo-activacion-rfid"
                        type="text"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        value={codigo}
                        onChange={(event) =>
                          setCodigo(event.target.value.replace(/\D/g, '').slice(0, 8))
                        }
                        placeholder="Ingresa los 8 dígitos"
                        maxLength={8}
                        pattern="[0-9]{8}"
                        required
                        disabled={cargando}
                        className="w-full max-w-sm rounded-lg border border-border bg-background px-3 py-2.5 text-center font-mono text-lg tracking-[0.3em] transition-colors focus:border-primary focus:outline-none disabled:opacity-50"
                      />
                      <p className="mt-1 text-xs text-muted-foreground">
                        El código es de un solo uso y tiene una vigencia limitada.
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <button
                        type="submit"
                        disabled={cargando || codigo.length !== 8}
                        className={buttonPrimary}
                      >
                        {cargando ? 'Activando...' : 'Confirmar activación'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setMostrarActivacion(false);
                          setCodigo('');
                          setError('');
                        }}
                        disabled={cargando}
                        className={buttonSecondary}
                      >
                        Cancelar
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}

            {tarjetaActual.estado === 'ACTIVA' && (
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

            {tarjetaActual.estado === 'BLOQUEADA' && (
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

            {tarjetaActual.estado === 'REPORTADA' && (
              <p className="text-sm text-muted-foreground">
                La tarjeta está reportada y no puede utilizarse. La solicitud
                de reposición debe ser gestionada por el administrador.
              </p>
            )}

            {tarjetaActual.estado === 'INACTIVA' && (
              <p className="text-sm text-muted-foreground">
                Esta tarjeta está deshabilitada. Contacta al administrador.
              </p>
            )}
          </div>

          {mostrarReporte &&
            ['ACTIVA', 'BLOQUEADA'].includes(tarjetaActual.estado) && (
              <form
                onSubmit={reportarTarjeta}
                className="mt-5 space-y-4 border-t border-border pt-4 animate-in fade-in slide-in-from-top-2 duration-200"
              >
                <h3 className="font-medium">Reportar tarjeta</h3>

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
                    <option value="PERDIDA">Pérdida</option>
                    <option value="ROBO">Robo</option>
                    <option value="DANADA">Daño</option>
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
      )}
    </section>
  );
}
