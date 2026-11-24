
'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';

type Dispositivo = {
  id: number;
  codigo_dispositivo: string;
  nombre: string;
  ubicacion: string | null;
  estado: string;
};

type Trabajador = {
  id: number;
  codigo_usuario: string;
  nombre: string;
  rol: string;
};

type ReporteMantenimiento = {
  id: number;
  dispositivo_id: number;
  usuario_mantenimiento_id: number;
  motivo: string;
  descripcion_trabajo: string;
  estado: string;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  observaciones: string | null;
  resultado: string | null;
  fecha_registro: string;
  estado_revision: string;
  dispositivo: Dispositivo | null;
  trabajador: Trabajador | null;
};

type Mantenimiento = {
  dispositivo_id: number;
  usuario_mantenimiento_id: number;
  motivo: string;
  descripcion_trabajo: string;
};

type AlertaRechazo = {
  id: number;
  dispositivo_id: number;
  tipo_reporte: string;
  severidad: string;
  descripcion: string;
  datos_adicionales: Record<string, unknown> | null;
  estado_reporte: string;
  fecha_reporte: string;
  dispositivo: (Dispositivo & {
    limite_rechazos_revision?: number;
    ventana_rechazos_minutos?: number;
  }) | null;
};

export function MaintenanceManagement() {
  const [dispositivos, setDispositivos] = useState<Dispositivo[]>([]);
  const [trabajadores, setTrabajadores] = useState<Trabajador[]>([]);
  const [reportes, setReportes] = useState<ReporteMantenimiento[]>([]);
  const [alertasRechazo, setAlertasRechazo] = useState<AlertaRechazo[]>([]);
  const [trabajadoresAlerta, setTrabajadoresAlerta] = useState<Record<number, string>>({});
  const [asignandoAlertaId, setAsignandoAlertaId] = useState<number | null>(null);

  const [dispositivoId, setDispositivoId] = useState('');
  const [trabajadorId, setTrabajadorId] = useState('');
  const [motivo, setMotivo] = useState('');
  const [descripcion, setDescripcion] = useState('');

  const [observacionesRevision, setObservacionesRevision] = useState<
    Record<number, string>
  >({});

  const [cargando, setCargando] = useState(true);
  const [asignando, setAsignando] = useState(false);
  const [revisandoId, setRevisandoId] = useState<number | null>(null);

  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');

  const cargarDatos = useCallback(async () => {
    setCargando(true);
    setError('');

    try {
      const response = await fetch('/api/mantenimientos', {
        method: 'GET',
        cache: 'no-store',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'No se pudieron cargar los datos.');
      }

      setDispositivos(data.dispositivos ?? []);
      setTrabajadores(data.trabajadores ?? []);
      setReportes(data.reportesPendientes ?? []);
      setAlertasRechazo(data.alertasRechazo ?? []);

      setDispositivoId((actual) => {
        if (
          actual &&
          data.dispositivos?.some(
            (d: Dispositivo) => String(d.id) === actual
          )
        ) {
          return actual;
        }

        return data.dispositivos?.length
          ? String(data.dispositivos[0].id)
          : '';
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Error consultando información.'
      );
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  async function asignarTarea(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setMensaje('');
    setError('');

    if (
      !dispositivoId ||
      !trabajadorId ||
      !motivo.trim() ||
      !descripcion.trim()
    ) {
      setError('Completa todos los campos para asignar la tarea.');
      return;
    }

    setAsignando(true);

    const datos: Mantenimiento = {
      dispositivo_id: Number(dispositivoId),
      usuario_mantenimiento_id: Number(trabajadorId),
      motivo: motivo.trim(),
      descripcion_trabajo: descripcion.trim(),
    };

    try {
      const response = await fetch('/api/mantenimientos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(datos),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'No se pudo asignar el mantenimiento.');
      }

      setMensaje(
        `Tarea asignada correctamente a ${data.trabajador.nombre}.`
      );

      setTrabajadorId('');
      setMotivo('');
      setDescripcion('');

      await cargarDatos();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Error asignando mantenimiento.'
      );
    } finally {
      setAsignando(false);
    }
  }

  async function asignarAlerta(alerta: AlertaRechazo) {
    setMensaje('');
    setError('');

    const responsableId = trabajadoresAlerta[alerta.id];
    if (!responsableId) {
      setError(`Selecciona el trabajador que atenderá la alerta #${alerta.id}.`);
      return;
    }
    if (!alerta.dispositivo) {
      setError('No se encontró el dispositivo asociado a esta alerta.');
      return;
    }

    const confirmacion = window.confirm(
      `¿Asignar la alerta #${alerta.id} del dispositivo ${alerta.dispositivo.codigo_dispositivo} y ponerlo en mantenimiento?`
    );
    if (!confirmacion) return;

    setAsignandoAlertaId(alerta.id);
    try {
      const response = await fetch('/api/mantenimientos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dispositivo_id: alerta.dispositivo_id,
          usuario_mantenimiento_id: Number(responsableId),
          motivo: `Atención de alerta por rechazos reiterados #${alerta.id}`,
          descripcion_trabajo: alerta.descripcion,
          reporte_dispositivo_id: alerta.id,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'No se pudo asignar la alerta.');
      setMensaje(data.mensaje || 'Alerta asignada correctamente.');
      setTrabajadoresAlerta((actual) => {
        const next = { ...actual };
        delete next[alerta.id];
        return next;
      });
      await cargarDatos();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error asignando la alerta.');
    } finally {
      setAsignandoAlertaId(null);
    }
  }

  async function revisarReporte(
    reporte: ReporteMantenimiento,
    accion: 'APROBAR' | 'RECHAZAR'
  ) {
    setMensaje('');
    setError('');

    const observacion = (
      observacionesRevision[reporte.id] ?? ''
    ).trim();

    if (accion === 'RECHAZAR' && !observacion) {
      setError(
        `Debes escribir el motivo del rechazo del mantenimiento #${reporte.id}.`
      );
      return;
    }

    if (
      accion === 'APROBAR' &&
      reporte.resultado !== 'REPARADO'
    ) {
      setError(
        'No puedes autorizar la reactivación porque el trabajador no reportó el dispositivo como reparado.'
      );
      return;
    }

    const confirmacion =
      accion === 'APROBAR'
        ? `¿Confirmas la reactivación de ${reporte.dispositivo?.codigo_dispositivo ?? 'este dispositivo'}? Pasará a estado OPERATIVO.`
        : `¿Confirmas que rechazas la reactivación del mantenimiento #${reporte.id}?`;

    if (!window.confirm(confirmacion)) return;

    try {
      setRevisandoId(reporte.id);

      const response = await fetch('/api/mantenimientos', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mantenimiento_id: reporte.id,
          accion,
          observacion_revision: observacion,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || 'No se pudo procesar la revisión.'
        );
      }

      setMensaje(data.mensaje);
      setObservacionesRevision((actual) => {
        const nuevas = { ...actual };
        delete nuevas[reporte.id];
        return nuevas;
      });

      await cargarDatos();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Ocurrió un error al revisar el reporte.'
      );
    } finally {
      setRevisandoId(null);
    }
  }

  const dispositivoSeleccionado = dispositivos.find(
    (d) => String(d.id) === dispositivoId
  );

  function nombreResultado(resultado: string | null) {
    switch (resultado) {
      case 'REPARADO':
        return 'Reparado';
      case 'REQUIERE_REPUESTOS':
        return 'Requiere repuestos';
      case 'NO_REPARADO':
        return 'No fue posible repararlo';
      default:
        return 'Sin resultado';
    }
  }

  return (
    <section id="gestion-mantenimiento" className="mb-12">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium uppercase tracking-wider text-primary">
            Administración
          </p>

          <h2 className="mt-1 font-heading text-2xl font-bold">
            Gestión de mantenimiento
          </h2>

          <p className="mt-1 text-sm text-muted-foreground">
            Asigna intervenciones y revisa los resultados del personal de mantenimiento.
          </p>
        </div>

        <button
          type="button"
          onClick={cargarDatos}
          disabled={cargando}
          className="rounded-xl border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted disabled:opacity-50"
        >
          {cargando ? 'Actualizando...' : 'Actualizar información'}
        </button>
      </div>

      {mensaje && (
        <div className="mb-5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-400">
          {mensaje}
        </div>
      )}

      {error && (
        <div className="mb-5 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_0.8fr]">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <h3 className="font-heading text-lg font-bold">
            Nueva tarea de mantenimiento
          </h3>

          <form onSubmit={asignarTarea} className="mt-5 space-y-5">
            <div>
              <label className="mb-2 block text-sm font-medium">
                Dispositivo
              </label>

              <select
                required
                value={dispositivoId}
                onChange={(e) => setDispositivoId(e.target.value)}
                disabled={cargando || asignando}
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none transition focus:border-primary disabled:opacity-50"
              >
                <option value="">Seleccionar dispositivo</option>

                {dispositivos.map((dispositivo) => (
                  <option key={dispositivo.id} value={dispositivo.id}>
                    {dispositivo.codigo_dispositivo} — {dispositivo.nombre}
                  </option>
                ))}
              </select>

              {dispositivoSeleccionado && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Ubicación: {dispositivoSeleccionado.ubicacion || 'No especificada'}
                  {' · '}Estado: {dispositivoSeleccionado.estado}
                </p>
              )}
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">
                Trabajador responsable
              </label>

              <select
                required
                value={trabajadorId}
                onChange={(e) => setTrabajadorId(e.target.value)}
                disabled={cargando || asignando}
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none transition focus:border-primary disabled:opacity-50"
              >
                <option value="">Seleccionar trabajador</option>

                {trabajadores.map((trabajador) => (
                  <option key={trabajador.id} value={trabajador.id}>
                    {trabajador.nombre} ({trabajador.codigo_usuario})
                  </option>
                ))}
              </select>

              {!cargando && trabajadores.length === 0 && (
                <p className="mt-2 text-xs text-amber-500">
                  No hay trabajadores activos de mantenimiento registrados.
                </p>
              )}
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">
                Motivo de la intervención
              </label>

              <input
                type="text"
                required
                maxLength={150}
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                disabled={asignando}
                placeholder="Ej. Limpieza preventiva"
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none transition focus:border-primary disabled:opacity-50"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">
                Actividades que debe realizar
              </label>

              <textarea
                required
                maxLength={2000}
                rows={4}
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                disabled={asignando}
                placeholder="Describe qué debe revisar, limpiar o reparar..."
                className="w-full resize-y rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none transition focus:border-primary disabled:opacity-50"
              />
            </div>

            <button
              type="submit"
              disabled={
                asignando ||
                cargando ||
                dispositivos.length === 0 ||
                trabajadores.length === 0
              }
              className="w-full rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-all duration-200 hover:opacity-90 hover:shadow-md active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {asignando ? 'Asignando tarea...' : 'Asignar tarea de mantenimiento'}
            </button>
          </form>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="flex size-12 items-center justify-center rounded-xl bg-primary/10 text-2xl">
            🔧
          </div>

          <h3 className="mt-4 font-heading text-lg font-bold">
            Información de la intervención
          </h3>

          <p className="mt-2 text-sm text-muted-foreground">
            Al asignar la tarea, el trabajador recibirá la instrucción en su panel.
          </p>

          <div className="mt-5 space-y-3">
            <div className="rounded-xl border border-border p-4">
              <p className="text-xs text-muted-foreground">Estado inicial</p>
              <p className="mt-1 font-semibold">Programado</p>
            </div>

            <div className="rounded-xl border border-border p-4">
              <p className="text-xs text-muted-foreground">Dispositivo</p>
              <p className="mt-1 font-semibold">
                {dispositivoSeleccionado?.codigo_dispositivo || 'SPING'}
              </p>
            </div>

            <div className="rounded-xl border border-border p-4">
              <p className="text-xs text-muted-foreground">
                Reactivación
              </p>
              <p className="mt-1 text-sm font-semibold">
                Requiere aprobación del administrador
              </p>
            </div>
          </div>

          <p className="mt-5 text-xs text-muted-foreground">
            Enviar el reporte no reactiva el dispositivo. El administrador conserva la autorización final.
          </p>
        </div>
      </div>

      <div className="mt-8">
        <div className="mb-5">
          <p className="text-sm font-medium uppercase tracking-wider text-primary">
            Alertas automáticas
          </p>
          <h3 className="mt-1 font-heading text-xl font-bold">Rechazos reiterados por dispositivo</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Estas alertas se generan al alcanzar el umbral de rechazos dentro de la ventana configurada.
          </p>
        </div>

        {cargando ? (
          <div className="rounded-2xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">Consultando alertas...</div>
        ) : alertasRechazo.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-6 text-center">
            <p className="font-semibold">No hay alertas de rechazos abiertas</p>
            <p className="mt-1 text-sm text-muted-foreground">Cuando un dispositivo alcance el límite configurado, aparecerá aquí.</p>
          </div>
        ) : (
          <div className="grid gap-5 lg:grid-cols-2">
            {alertasRechazo.map((alerta) => {
              const datos = alerta.datos_adicionales ?? {};
              const total = datos.rechazos_detectados ?? 'No disponible';
              const umbral = datos.umbral ?? alerta.dispositivo?.limite_rechazos_revision ?? 5;
              const ventana = datos.ventana_minutos ?? alerta.dispositivo?.ventana_rechazos_minutos ?? 1440;
              return (
                <article key={alerta.id} className="rounded-2xl border border-amber-500/30 bg-card p-6 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-wider text-muted-foreground">Alerta #{alerta.id}</p>
                      <h4 className="mt-1 font-heading text-lg font-bold">{alerta.dispositivo?.nombre ?? 'Dispositivo SPING'}</h4>
                      <p className="text-sm text-muted-foreground">{alerta.dispositivo?.codigo_dispositivo ?? 'Sin código'}</p>
                    </div>
                    <span className="rounded-full bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-400">{alerta.estado_reporte === 'EN_REVISION' ? 'En revisión' : 'Abierta'}</span>
                  </div>
                  <p className="mt-4 text-sm">{alerta.descripcion}</p>
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="rounded-xl bg-muted/50 p-3"><p className="text-xs text-muted-foreground">Rechazos detectados</p><p className="mt-1 text-lg font-bold">{String(total)} / {String(umbral)}</p></div>
                    <div className="rounded-xl bg-muted/50 p-3"><p className="text-xs text-muted-foreground">Ventana</p><p className="mt-1 text-lg font-bold">{Math.round(Number(ventana) / 60)} horas</p></div>
                  </div>
                  <p className="mt-3 text-xs text-muted-foreground">Generada: {new Date(alerta.fecha_reporte).toLocaleString('es-CO')}</p>
                  <div className="mt-5 border-t border-border pt-4">
                    <label className="mb-2 block text-sm font-medium">Asignar trabajador de mantenimiento</label>
                    <select
                      value={trabajadoresAlerta[alerta.id] ?? ''}
                      onChange={(e) => setTrabajadoresAlerta((actual) => ({ ...actual, [alerta.id]: e.target.value }))}
                      disabled={asignandoAlertaId !== null || alerta.estado_reporte === 'EN_REVISION'}
                      className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary disabled:opacity-50"
                    >
                      <option value="">Seleccionar trabajador</option>
                      {trabajadores.map((trabajador) => <option key={trabajador.id} value={trabajador.id}>{trabajador.nombre} ({trabajador.codigo_usuario})</option>)}
                    </select>
                    {alerta.estado_reporte === 'EN_REVISION' ? (
                      <p className="mt-2 text-xs text-amber-500">Esta alerta ya fue asignada. Revisa la tarea correspondiente en los reportes de mantenimiento.</p>
                    ) : (
                      <button type="button" onClick={() => asignarAlerta(alerta)} disabled={asignandoAlertaId !== null || trabajadores.length === 0} className="mt-3 w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50">
                        {asignandoAlertaId === alerta.id ? 'Asignando...' : 'Asignar alerta y poner equipo en mantenimiento'}
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      <div className="mt-8">
        <div className="mb-5">
          <p className="text-sm font-medium uppercase tracking-wider text-primary">
            Supervisión
          </p>

          <h3 className="mt-1 font-heading text-xl font-bold">
            Reportes pendientes de revisión
          </h3>

          <p className="mt-1 text-sm text-muted-foreground">
            Revisa el trabajo realizado antes de autorizar la reactivación del dispositivo.
          </p>
        </div>

        {cargando ? (
          <div className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
            Consultando reportes...
          </div>
        ) : reportes.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-8 text-center">
            <div className="mb-3 text-3xl">📋</div>
            <h4 className="font-semibold">
              No hay reportes pendientes
            </h4>
            <p className="mt-2 text-sm text-muted-foreground">
              Cuando un trabajador envíe el resultado de una intervención, aparecerá aquí.
            </p>
          </div>
        ) : (
          <div className="grid gap-5 lg:grid-cols-2">
            {reportes.map((reporte) => (
              <article
                key={reporte.id}
                className="rounded-2xl border border-border bg-card p-6 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-wider text-muted-foreground">
                      Reporte #{reporte.id}
                    </p>

                    <h4 className="mt-1 font-heading text-lg font-bold">
                      {reporte.dispositivo?.nombre ?? 'Dispositivo SPING'}
                    </h4>

                    <p className="text-sm text-muted-foreground">
                      {reporte.dispositivo?.codigo_dispositivo ?? 'Sin código'}
                    </p>
                  </div>

                  <span className="rounded-full bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-400">
                    Pendiente de revisión
                  </span>
                </div>

                <div className="mt-5 space-y-4">
                  <div>
                    <p className="text-xs uppercase text-muted-foreground">
                      Trabajador responsable
                    </p>
                    <p className="mt-1 text-sm font-medium">
                      {reporte.trabajador?.nombre ?? 'No disponible'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {reporte.trabajador?.codigo_usuario ?? ''}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs uppercase text-muted-foreground">
                      Motivo
                    </p>
                    <p className="mt-1 text-sm">{reporte.motivo}</p>
                  </div>

                  <div>
                    <p className="text-xs uppercase text-muted-foreground">
                      Trabajo solicitado
                    </p>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
                      {reporte.descripcion_trabajo}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs uppercase text-muted-foreground">
                      Resultado informado
                    </p>
                    <p className="mt-1 text-sm font-semibold">
                      {nombreResultado(reporte.resultado)}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs uppercase text-muted-foreground">
                      Actividades y observaciones del trabajador
                    </p>
                    <p className="mt-1 whitespace-pre-wrap rounded-xl bg-muted/50 p-3 text-sm">
                      {reporte.observaciones || 'Sin observaciones.'}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-muted-foreground">
                      Fecha de finalización
                    </p>
                    <p className="mt-1 text-sm">
                      {reporte.fecha_fin
                        ? new Date(reporte.fecha_fin).toLocaleString('es-CO')
                        : 'No registrada'}
                    </p>
                  </div>

                  <div className="border-t border-border pt-4">
                    <label className="mb-2 block text-sm font-medium">
                      Observación de la revisión
                    </label>

                    <textarea
                      rows={3}
                      maxLength={2000}
                      value={observacionesRevision[reporte.id] ?? ''}
                      onChange={(e) =>
                        setObservacionesRevision((actual) => ({
                          ...actual,
                          [reporte.id]: e.target.value,
                        }))
                      }
                      placeholder="Escribe una observación. Es obligatoria si rechazas la reactivación."
                      disabled={revisandoId === reporte.id}
                      className="w-full rounded-xl border border-border bg-background p-3 text-sm outline-none focus:border-primary disabled:opacity-50"
                    />
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => revisarReporte(reporte, 'APROBAR')}
                      disabled={
                        revisandoId !== null ||
                        reporte.resultado !== 'REPARADO'
                      }
                      className="rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {revisandoId === reporte.id
                        ? 'Procesando...'
                        : 'Autorizar reactivación'}
                    </button>

                    <button
                      type="button"
                      onClick={() => revisarReporte(reporte, 'RECHAZAR')}
                      disabled={revisandoId !== null}
                      className="rounded-xl border border-red-500/40 px-4 py-3 text-sm font-semibold text-red-400 transition-colors hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Rechazar reactivación
                    </button>
                  </div>

                  {reporte.resultado !== 'REPARADO' && (
                    <p className="text-xs text-amber-500">
                      La reactivación no está disponible porque el resultado informado no es «Reparado».
                    </p>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
