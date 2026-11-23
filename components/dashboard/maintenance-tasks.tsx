
'use client';

import { useCallback, useEffect, useState } from 'react';

interface Dispositivo {
  id: number;
  codigo_dispositivo: string;
  nombre: string;
  ubicacion: string | null;
  estado: string;
}

interface Mantenimiento {
  id: number;
  dispositivo_id: number;
  motivo: string;
  descripcion_trabajo: string;
  estado: string;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  fecha_registro: string;
  observaciones?: string | null;
  resultado?: string | null;
  dispositivo: Dispositivo | null;
}

export function MaintenanceTasks() {
  const [tareas, setTareas] = useState<Mantenimiento[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');

  const [tareaSeleccionada, setTareaSeleccionada] =
    useState<number | null>(null);
  const [actividadesRealizadas, setActividadesRealizadas] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [resultado, setResultado] = useState('REPARADO');
  const [enviando, setEnviando] = useState(false);

  const cargarTareas = useCallback(async () => {
    try {
      setCargando(true);
      setError('');

      const respuesta = await fetch('/api/mantenimientos', {
        method: 'GET',
        cache: 'no-store',
      });

      const data = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(
          data.error ?? 'No fue posible consultar tus tareas.'
        );
      }

      setTareas(data.mantenimientos ?? []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Ocurrió un error al consultar las tareas.'
      );
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargarTareas();
  }, [cargarTareas]);

  function nombreEstado(estado: string) {
    switch (estado) {
      case 'PROGRAMADO':
        return 'Pendiente de inicio';
      case 'EN_CURSO':
        return 'En curso';
      case 'FINALIZADO':
        return 'Reporte enviado';
      case 'CANCELADO':
        return 'Cancelado';
      default:
        return estado;
    }
  }

  function colorEstado(estado: string) {
    switch (estado) {
      case 'PROGRAMADO':
        return 'bg-blue-500/10 text-blue-400';
      case 'EN_CURSO':
        return 'bg-amber-500/10 text-amber-400';
      case 'FINALIZADO':
        return 'bg-green-500/10 text-green-400';
      case 'CANCELADO':
        return 'bg-red-500/10 text-red-400';
      default:
        return 'bg-muted text-foreground';
    }
  }

  function abrirReporte(id: number) {
    setTareaSeleccionada(id);
    setActividadesRealizadas('');
    setObservaciones('');
    setResultado('REPARADO');
    setError('');
    setMensaje('');
  }

  function cancelarReporte() {
    setTareaSeleccionada(null);
    setActividadesRealizadas('');
    setObservaciones('');
    setResultado('REPARADO');
  }

  async function enviarReporte(id: number) {
    if (!actividadesRealizadas.trim()) {
      setError('Describe las actividades que realizaste.');
      return;
    }

    if (!observaciones.trim()) {
      setError('Debes registrar las observaciones de la intervención.');
      return;
    }

    try {
      setEnviando(true);
      setError('');
      setMensaje('');

      const respuesta = await fetch('/api/mantenimientos', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mantenimiento_id: id,
          actividades_realizadas: actividadesRealizadas.trim(),
          observaciones: observaciones.trim(),
          resultado,
        }),
      });

      const data = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(
          data.error ?? 'No fue posible enviar el reporte.'
        );
      }

      setMensaje(
        'Reporte enviado correctamente. El administrador debe revisar la intervención.'
      );

      cancelarReporte();
      await cargarTareas();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Ocurrió un error al enviar el reporte.'
      );
    } finally {
      setEnviando(false);
    }
  }

  function nombreResultado(valor: string) {
    switch (valor) {
      case 'REPARADO':
        return 'Reparado';
      case 'REQUIERE_REPUESTOS':
        return 'Requiere repuestos';
      case 'NO_REPARADO':
        return 'No fue posible repararlo';
      default:
        return valor;
    }
  }

  return (
    <section className="mb-12" id="mis-mantenimientos">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium uppercase tracking-wider text-primary">
            Gestión de tareas
          </p>

          <h2 className="mt-1 font-heading text-2xl font-bold">
            Mis mantenimientos asignados
          </h2>

          <p className="mt-1 text-sm text-muted-foreground">
            Consulta tus actividades y registra los resultados de cada intervención.
          </p>
        </div>

        <button
          type="button"
          onClick={cargarTareas}
          disabled={cargando}
          className="rounded-xl border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted disabled:opacity-50"
        >
          {cargando ? 'Actualizando...' : 'Actualizar tareas'}
        </button>
      </div>

      {error && (
        <div className="mb-5 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">
          {error}
        </div>
      )}

      {mensaje && (
        <div className="mb-5 rounded-xl border border-green-500/30 bg-green-500/10 p-4 text-sm text-green-400">
          {mensaje}
        </div>
      )}

      {cargando ? (
        <div className="rounded-2xl border border-border bg-card p-10 text-center">
          <p className="text-sm text-muted-foreground">
            Cargando tus tareas de mantenimiento...
          </p>
        </div>
      ) : tareas.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-10 text-center">
          <div className="mb-4 text-4xl">🔧</div>

          <h3 className="font-heading text-lg font-semibold">
            No tienes tareas asignadas
          </h3>

          <p className="mt-2 text-sm text-muted-foreground">
            Cuando el administrador te asigne un mantenimiento,
            aparecerá aquí.
          </p>
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          {tareas.map((tarea) => (
            <article
              key={tarea.id}
              className="rounded-2xl border border-border bg-card p-6 shadow-sm"
            >
              <div className="mb-5 flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Mantenimiento #{tarea.id}
                  </p>

                  <h3 className="mt-1 font-heading text-xl font-bold">
                    {tarea.dispositivo?.nombre ?? 'Dispositivo SPING'}
                  </h3>

                  <p className="mt-1 text-sm text-muted-foreground">
                    {tarea.dispositivo?.codigo_dispositivo ?? 'Sin código'}
                  </p>
                </div>

                <span
                  className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${colorEstado(tarea.estado)}`}
                >
                  {nombreEstado(tarea.estado)}
                </span>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="text-xs font-medium uppercase text-muted-foreground">
                    Motivo
                  </p>
                  <p className="mt-1 text-sm">{tarea.motivo}</p>
                </div>

                <div>
                  <p className="text-xs font-medium uppercase text-muted-foreground">
                    Trabajo solicitado
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
                    {tarea.descripcion_trabajo}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-medium uppercase text-muted-foreground">
                    Ubicación
                  </p>
                  <p className="mt-1 text-sm">
                    {tarea.dispositivo?.ubicacion ?? 'No especificada'}
                  </p>
                </div>

                <div className="border-t border-border pt-4">
                  <p className="text-xs text-muted-foreground">
                    Fecha de asignación
                  </p>
                  <p className="mt-1 text-sm">
                    {new Date(tarea.fecha_registro).toLocaleString('es-CO')}
                  </p>
                </div>

                {tarea.estado === 'PROGRAMADO' && (
                  <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 text-sm text-blue-300">
                    Esta tarea está pendiente de inicio. Podrás registrar el reporte cuando el mantenimiento haya comenzado mediante la tarjeta RFID.
                  </div>
                )}

                {tarea.estado === 'EN_CURSO' && (
                  <div className="border-t border-border pt-4">
                    {tareaSeleccionada === tarea.id ? (
                      <div className="space-y-4">
                        <h4 className="font-semibold">
                          Reporte de mantenimiento
                        </h4>

                        <div>
                          <label className="mb-2 block text-sm font-medium">
                            Actividades realizadas
                          </label>
                          <textarea
                            value={actividadesRealizadas}
                            onChange={(e) =>
                              setActividadesRealizadas(e.target.value)
                            }
                            rows={4}
                            maxLength={2000}
                            placeholder="Describe las actividades que realizaste..."
                            className="w-full rounded-xl border border-border bg-background p-3 text-sm outline-none focus:border-primary"
                          />
                        </div>

                        <div>
                          <label className="mb-2 block text-sm font-medium">
                            Resultado de la intervención
                          </label>
                          <select
                            value={resultado}
                            onChange={(e) => setResultado(e.target.value)}
                            className="w-full rounded-xl border border-border bg-background p-3 text-sm outline-none focus:border-primary"
                          >
                            <option value="REPARADO">
                              Reparado
                            </option>
                            <option value="REQUIERE_REPUESTOS">
                              Requiere repuestos
                            </option>
                            <option value="NO_REPARADO">
                              No fue posible repararlo
                            </option>
                          </select>
                        </div>

                        <div>
                          <label className="mb-2 block text-sm font-medium">
                            Observaciones
                          </label>
                          <textarea
                            value={observaciones}
                            onChange={(e) =>
                              setObservaciones(e.target.value)
                            }
                            rows={3}
                            maxLength={2000}
                            placeholder="Indica problemas encontrados, repuestos utilizados u otras observaciones..."
                            className="w-full rounded-xl border border-border bg-background p-3 text-sm outline-none focus:border-primary"
                          />
                        </div>

                        <div className="flex flex-wrap gap-3">
                          <button
                            type="button"
                            onClick={() => enviarReporte(tarea.id)}
                            disabled={enviando}
                            className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
                          >
                            {enviando ? 'Enviando...' : 'Enviar reporte'}
                          </button>

                          <button
                            type="button"
                            onClick={cancelarReporte}
                            disabled={enviando}
                            className="rounded-xl border border-border px-4 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50"
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => abrirReporte(tarea.id)}
                        className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
                      >
                        Registrar resultado del mantenimiento
                      </button>
                    )}
                  </div>
                )}

                {tarea.estado === 'FINALIZADO' && (
                  <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-4 text-sm">
                    <p className="font-semibold text-green-400">
                      Reporte enviado al administrador
                    </p>

                    {tarea.resultado && (
                      <p className="mt-2 text-muted-foreground">
                        Resultado: {nombreResultado(tarea.resultado)}
                      </p>
                    )}

                    {tarea.observaciones && (
                      <p className="mt-2 whitespace-pre-wrap text-muted-foreground">
                        {tarea.observaciones}
                      </p>
                    )}

                    <p className="mt-2 text-xs text-muted-foreground">
                      El dispositivo seguirá en mantenimiento hasta que el administrador revise y autorice su reactivación.
                    </p>
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
