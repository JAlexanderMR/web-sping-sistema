
'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';

type Usuario = {
  id: number;
  codigo_usuario: string;
  nombre: string;
  rol: string;
  estado: string;
  rfid?: TarjetaRFID[];
};

type TarjetaRFID = {
  id: number;
  uid: string;
  usuario_id: number | null;
  estado: string;
  fecha_ingreso?: string | null;
  fecha_asignacion: string | null;
  fecha_activacion?: string | null;
  usuario?: {
    id: number;
    codigo_usuario: string;
    nombre: string;
    rol: string;
    estado: string;
  } | null;
};

type SolicitudReposicion = {
  id: number;
  usuario_id: number;
  rfid_id: number;
  motivo: string;
  detalle: string | null;
  estado_solicitud: string;
  fecha_solicitud: string;
  fecha_resolucion?: string | null;
  resuelto_por?: number | null;
  observacion_admin?: string | null;
};

type HistorialRFID = {
  id: number;
  rfid_id: number;
  usuario_id: number | null;
  accion: string;
  estado_anterior: string | null;
  estado_nuevo: string | null;
  motivo: string | null;
  observacion: string | null;
  autorizado_por_empresa: string | null;
  referencia_autorizacion: string | null;
  registrado_por: number | null;
  fecha_evento: string;
};

const ESTADOS_TARJETA = [
  'DISPONIBLE',
  'RESERVADA',
  'ACTIVA',
  'BLOQUEADA',
  'REPORTADA',
  'INACTIVA',
];

const MOTIVOS_REPOSICION = [
  { value: 'PERDIDA', label: 'Pérdida' },
  { value: 'ROBO', label: 'Robo' },
  { value: 'DANADA', label: 'Daño' },
];

function formatearFecha(fecha: string | null | undefined) {
  if (!fecha) return 'No disponible';

  return new Date(fecha).toLocaleString('es-CO', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

function colorEstado(estado: string) {
  switch (estado?.toUpperCase()) {
    case 'ACTIVA':
    case 'DISPONIBLE':
    case 'APROBADA':
    case 'ATENDIDA':
      return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';

    case 'BLOQUEADA':
    case 'RESERVADA':
    case 'PENDIENTE':
    case 'PENDIENTE_REVISION':
      return 'bg-amber-500/15 text-amber-400 border-amber-500/30';

    case 'REPORTADA':
    case 'RECHAZADA':
    case 'INACTIVA':
      return 'bg-red-500/15 text-red-400 border-red-500/30';

    default:
      return 'bg-slate-500/15 text-slate-400 border-slate-500/30';
  }
}

function etiquetaEstado(estado: string) {
  const etiquetas: Record<string, string> = {
    DISPONIBLE: 'Disponible',
    RESERVADA: 'Reservada',
    ACTIVA: 'Activa',
    BLOQUEADA: 'Bloqueada',
    REPORTADA: 'Reportada',
    INACTIVA: 'Inactiva',
    PENDIENTE: 'Pendiente',
    APROBADA: 'Aprobada',
    RECHAZADA: 'Rechazada',
    ATENDIDA: 'Atendida',
  };

  return etiquetas[estado?.toUpperCase()] ?? estado;
}

function etiquetaMotivo(motivo: string) {
  const motivos: Record<string, string> = {
    PERDIDA: 'Pérdida',
    ROBO: 'Robo',
    DANADA: 'Daño',
  };

  return motivos[motivo?.toUpperCase()] ?? motivo;
}

export default function RFIDAssignment() {
  const [tarjetas, setTarjetas] = useState<TarjetaRFID[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [solicitudes, setSolicitudes] = useState<SolicitudReposicion[]>([]);
  const [historial, setHistorial] = useState<HistorialRFID[]>([]);

  const [cargando, setCargando] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const [solicitudProcesando, setSolicitudProcesando] = useState<number | null>(null);

  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');

  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('TODOS');

  const [uid, setUid] = useState('');
  const [tarjetaParaAsignarId, setTarjetaParaAsignarId] = useState<number | null>(null);
  const [usuarioAsignacionId, setUsuarioAsignacionId] = useState('');
  const [codigoGenerado, setCodigoGenerado] = useState<{ codigo: string; uid: string; usuario: string; fechaExpiracion: string } | null>(null);

  const [mostrarFormulario, setMostrarFormulario] = useState(false);

  const [mostrarSolicitudes, setMostrarSolicitudes] = useState(true);

  const cargarDatos = async () => {
    setCargando(true);
    setError('');

    try {
      const [respuestaRFID, respuestaUsuarios] = await Promise.all([
        fetch('/api/rfid', { cache: 'no-store' }),
        fetch('/api/usuarios', { cache: 'no-store' }),
      ]);

      const datosRFID = await respuestaRFID.json();
      const datosUsuarios = await respuestaUsuarios.json();

      if (!respuestaRFID.ok) {
        throw new Error(
          datosRFID.error || 'No se pudieron consultar las tarjetas RFID.'
        );
      }

      if (!respuestaUsuarios.ok) {
        throw new Error(
          datosUsuarios.error || 'No se pudieron consultar los usuarios.'
        );
      }

      setTarjetas(datosRFID.tarjetas ?? []);
      setSolicitudes(datosRFID.solicitudes ?? []);
      setHistorial(datosRFID.historial ?? []);

      const listaUsuarios = Array.isArray(datosUsuarios)
        ? datosUsuarios
        : datosUsuarios.usuarios ?? [];

      setUsuarios(listaUsuarios);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Ocurrió un error al cargar la información.'
      );
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const tarjetasFiltradas = useMemo(() => {
    return tarjetas.filter((tarjeta) => {
      const nombreUsuario = tarjeta.usuario?.nombre ?? '';
      const codigoUsuario = tarjeta.usuario?.codigo_usuario ?? '';

      const coincideBusqueda =
        tarjeta.uid.toLowerCase().includes(busqueda.toLowerCase()) ||
        nombreUsuario.toLowerCase().includes(busqueda.toLowerCase()) ||
        codigoUsuario.toLowerCase().includes(busqueda.toLowerCase());

      const coincideEstado =
        filtroEstado === 'TODOS' || tarjeta.estado === filtroEstado;

      return coincideBusqueda && coincideEstado;
    });
  }, [tarjetas, busqueda, filtroEstado]);

  const estadisticas = useMemo(() => {
    return {
      total: tarjetas.length,
      disponibles: tarjetas.filter((tarjeta) => tarjeta.estado === 'DISPONIBLE').length,
      reservadas: tarjetas.filter((tarjeta) => tarjeta.estado === 'RESERVADA').length,
      activas: tarjetas.filter((tarjeta) => tarjeta.estado === 'ACTIVA').length,
      bloqueadas: tarjetas.filter((tarjeta) => tarjeta.estado === 'BLOQUEADA').length,
      reportadas: tarjetas.filter((tarjeta) => tarjeta.estado === 'REPORTADA').length,
      pendientes: solicitudes.filter(
        (solicitud) => solicitud.estado_solicitud === 'PENDIENTE'
      ).length,
    };
  }, [tarjetas, solicitudes]);

  const registrarTarjeta = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setProcesando(true);
    setMensaje('');
    setError('');

    try {
      if (!uid.trim()) throw new Error('Debes ingresar el UID de la tarjeta.');

      const respuesta = await fetch('/api/rfid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accion: 'registrar', uid: uid.trim() }),
      });
      const resultado = await respuesta.json();
      if (!respuesta.ok) throw new Error(resultado.error || 'No se pudo registrar la tarjeta.');

      setMensaje(resultado.mensaje || 'Tarjeta agregada al inventario.');
      setUid('');
      setMostrarFormulario(false);
      await cargarDatos();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ocurrió un error al registrar la tarjeta.');
    } finally {
      setProcesando(false);
    }
  };

  const asignarTarjeta = async () => {
    if (!tarjetaParaAsignarId || !usuarioAsignacionId) {
      setError('Selecciona un usuario para asignar la tarjeta.');
      return;
    }

    setProcesando(true);
    setMensaje('');
    setError('');

    try {
      const tarjeta = tarjetas.find((item) => item.id === tarjetaParaAsignarId);
      const usuario = usuarios.find((item) => item.id === Number(usuarioAsignacionId));
      const respuesta = await fetch('/api/rfid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accion: 'asignar',
          rfidId: tarjetaParaAsignarId,
          usuarioId: Number(usuarioAsignacionId),
        }),
      });
      const resultado = await respuesta.json();
      if (!respuesta.ok) throw new Error(resultado.error || 'No se pudo asignar la tarjeta.');

      setCodigoGenerado({
        codigo: resultado.codigoActivacion,
        uid: resultado.tarjeta?.uid ?? tarjeta?.uid ?? 'No disponible',
        usuario: resultado.tarjeta?.usuario ?? usuario?.nombre ?? 'Usuario',
        fechaExpiracion: resultado.fechaExpiracion,
      });
      setTarjetaParaAsignarId(null);
      setUsuarioAsignacionId('');
      await cargarDatos();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ocurrió un error al asignar la tarjeta.');
    } finally {
      setProcesando(false);
    }
  };

  const reemitirCodigo = async (tarjeta: TarjetaRFID) => {
    if (!window.confirm(`¿Generar un nuevo código para la tarjeta ${tarjeta.uid}? El código anterior quedará revocado.`)) return;

    setProcesando(true);
    setMensaje('');
    setError('');
    try {
      const respuesta = await fetch('/api/rfid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accion: 'reemitar_codigo', rfidId: tarjeta.id }),
      });
      const resultado = await respuesta.json();
      if (!respuesta.ok) throw new Error(resultado.error || 'No se pudo generar el nuevo código.');

      setCodigoGenerado({
        codigo: resultado.codigoActivacion,
        uid: tarjeta.uid,
        usuario: tarjeta.usuario?.nombre ?? 'Usuario asignado',
        fechaExpiracion: resultado.fechaExpiracion,
      });
      await cargarDatos();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ocurrió un error al reemitir el código.');
    } finally {
      setProcesando(false);
    }
  };

  const cambiarEstadoTarjeta = async (
    tarjetaId: number,
    accion: 'bloquear' | 'desbloquear'
  ) => {
    const confirmacion =
      accion === 'bloquear'
        ? '¿Estás seguro de que deseas bloquear esta tarjeta?'
        : '¿Deseas desbloquear esta tarjeta?';

    if (!window.confirm(confirmacion)) return;

    setProcesando(true);
    setMensaje('');
    setError('');

    try {
      const respuesta = await fetch('/api/rfid', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          accion,
          tarjetaId,
        }),
      });

      const resultado = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(resultado.error || 'No se pudo actualizar la tarjeta.');
      }

      setMensaje(resultado.mensaje || 'Estado de tarjeta actualizado.');
      await cargarDatos();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Ocurrió un error al actualizar la tarjeta.'
      );
    } finally {
      setProcesando(false);
    }
  };

  const resolverSolicitud = async (
    solicitudId: number,
    accion: 'aprobar_reposicion' | 'rechazar_reposicion'
  ) => {
    const esAprobacion = accion === 'aprobar_reposicion';

    let observacion = '';

    if (esAprobacion) {
      observacion =
        window.prompt(
          'Observación para la aprobación (opcional):',
          'Solicitud aprobada. Puede asignarse una tarjeta disponible del inventario.'
        ) ?? '';

      if (observacion === null) return;
    } else {
      const respuestaObservacion = window.prompt(
        'Indica el motivo por el cual se rechaza la solicitud:'
      );

      if (respuestaObservacion === null) return;

      observacion = respuestaObservacion.trim();

      if (!observacion) {
        window.alert('Debes escribir el motivo del rechazo.');
        return;
      }
    }

    const confirmacion = esAprobacion
      ? '¿Confirmas que deseas aprobar esta solicitud de reposición?'
      : '¿Confirmas que deseas rechazar esta solicitud de reposición?';

    if (!window.confirm(confirmacion)) return;

    setSolicitudProcesando(solicitudId);
    setMensaje('');
    setError('');

    try {
      const respuesta = await fetch('/api/rfid', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          accion,
          solicitudId,
          observacion,
        }),
      });

      const resultado = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(
          resultado.error || 'No se pudo resolver la solicitud.'
        );
      }

      setMensaje(resultado.mensaje || 'Solicitud actualizada correctamente.');

      await cargarDatos();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Ocurrió un error al resolver la solicitud.'
      );
    } finally {
      setSolicitudProcesando(null);
    }
  };

  const reactivarTarjeta = async (tarjeta: TarjetaRFID) => {
    const autorizadoPorEmpresa = window.prompt(
      'Nombre de la empresa que autoriza la reactivación:'
    );
    if (autorizadoPorEmpresa === null || !autorizadoPorEmpresa.trim()) return;

    const referenciaAutorizacion = window.prompt(
      'Número o referencia de la autorización empresarial:'
    );
    if (referenciaAutorizacion === null || !referenciaAutorizacion.trim()) return;

    const motivo = window.prompt(
      'Motivo por el cual la empresa autoriza recuperar/reactivar esta tarjeta:'
    );
    if (motivo === null || !motivo.trim()) return;

    const observacion = window.prompt(
      'Observaciones adicionales (opcional):'
    );
    if (observacion === null) return;

    if (!window.confirm(
      `¿Confirmas la reactivación de la tarjeta ${tarjeta.uid}? La tarjeta volverá a estado ACTIVA.`
    )) return;

    setProcesando(true);
    setMensaje('');
    setError('');

    try {
      const respuesta = await fetch('/api/rfid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accion: 'reactivar',
          tarjetaId: tarjeta.id,
          autorizadoPorEmpresa: autorizadoPorEmpresa.trim(),
          referenciaAutorizacion: referenciaAutorizacion.trim(),
          motivo: motivo.trim(),
          observacion: observacion.trim(),
        }),
      });

      const resultado = await respuesta.json();
      if (!respuesta.ok) {
        throw new Error(resultado.error || 'No se pudo reactivar la tarjeta.');
      }

      setMensaje(resultado.mensaje || 'Tarjeta reactivada correctamente.');
      await cargarDatos();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Ocurrió un error al reactivar la tarjeta.'
      );
    } finally {
      setProcesando(false);
    }
  };

  const obtenerNombreUsuario = (usuarioId: number | null) =>
    usuarioId === null
      ? 'Sin usuario asignado'
      : usuarios.find((usuario) => usuario.id === usuarioId)?.nombre ?? `Usuario #${usuarioId}`;

  const obtenerUIDHistorial = (rfidId: number) =>
    tarjetas.find((tarjeta) => tarjeta.id === rfidId)?.uid ??
    `Tarjeta #${rfidId}`;

  // Un usuario no puede reactivar otra tarjeta mientras ya tenga una ACTIVA.
  const usuarioTieneTarjetaActiva = (usuarioId: number | null) => {
    if (usuarioId === null) return false;

    return tarjetas.some(
      (tarjeta) =>
        tarjeta.usuario_id === usuarioId && ['ACTIVA', 'RESERVADA'].includes(tarjeta.estado)
    );
  };

  const etiquetaAccion = (accion: string) => {
    const acciones: Record<string, string> = {
      REGISTRO: 'Registro (histórico)',
      INGRESO_INVENTARIO: 'Ingreso al inventario',
      ASIGNACION: 'Asignación a usuario',
      ACTIVACION_CODIGO: 'Activación mediante código',
      REEMISION_CODIGO_ACTIVACION: 'Reemisión de código',
      BLOQUEO: 'Bloqueo',
      DESBLOQUEO: 'Desbloqueo',
      REPORTE: 'Reporte',
      SOLICITUD_REPOSICION: 'Solicitud de reposición',
      REPOSICION_APROBADA: 'Reposición aprobada',
      REPOSICION_RECHAZADA: 'Reposición rechazada',
      REACTIVACION: 'Reactivación',
    };
    return acciones[accion] ?? accion;
  };

  const solicitudesPendientes = solicitudes.filter(
    (solicitud) => solicitud.estado_solicitud === 'PENDIENTE'
  );

  const solicitudesResueltas = solicitudes.filter(
    (solicitud) => solicitud.estado_solicitud !== 'PENDIENTE'
  );

  const obtenerTarjetaSolicitud = (solicitud: SolicitudReposicion) => {
    return tarjetas.find((tarjeta) => tarjeta.id === solicitud.rfid_id);
  };

  const obtenerUsuarioSolicitud = (solicitud: SolicitudReposicion) => {
    return usuarios.find((usuario) => usuario.id === solicitud.usuario_id);
  };

  if (cargando) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-500/20 border-t-emerald-400" />
          <p className="text-sm text-slate-400">
            Cargando información RFID...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ENCABEZADO */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">
            Gestión de tarjetas RFID
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Administra el inventario de tarjetas, sus asignaciones, activaciones y solicitudes de reposición.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={cargarDatos}
            disabled={cargando || procesando}
            className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm font-medium text-slate-200 transition hover:bg-slate-700 disabled:opacity-50"
          >
            <span className="mr-2">↻</span>
            Actualizar
          </button>

          <button
            type="button"
            onClick={() => setMostrarFormulario(!mostrarFormulario)}
            className="rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400"
          >
            {mostrarFormulario ? 'Cancelar' : '+ Registrar tarjeta'}
          </button>
        </div>
      </div>

      {/* MENSAJES */}
      {mensaje && (
        <div className="flex items-start gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-300">
          <span className="text-lg">✓</span>
          <p>{mensaje}</p>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
          <span className="text-lg">!</span>
          <p>{error}</p>
        </div>
      )}

      {/* ESTADÍSTICAS */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-7">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
          <p className="text-sm text-slate-400">Total tarjetas</p>
          <p className="mt-2 text-3xl font-bold text-white">
            {estadisticas.total}
          </p>
        </div>

        <div className="rounded-2xl border border-sky-500/20 bg-slate-900/70 p-5">
          <p className="text-sm text-slate-400">Disponibles</p>
          <p className="mt-2 text-3xl font-bold text-sky-300">
            {estadisticas.disponibles}
          </p>
        </div>

        <div className="rounded-2xl border border-violet-500/20 bg-slate-900/70 p-5">
          <p className="text-sm text-slate-400">Reservadas</p>
          <p className="mt-2 text-3xl font-bold text-violet-300">
            {estadisticas.reservadas}
          </p>
        </div>

        <div className="rounded-2xl border border-emerald-500/20 bg-slate-900/70 p-5">
          <p className="text-sm text-slate-400">Activas</p>
          <p className="mt-2 text-3xl font-bold text-emerald-400">
            {estadisticas.activas}
          </p>
        </div>

        <div className="rounded-2xl border border-amber-500/20 bg-slate-900/70 p-5">
          <p className="text-sm text-slate-400">Bloqueadas</p>
          <p className="mt-2 text-3xl font-bold text-amber-400">
            {estadisticas.bloqueadas}
          </p>
        </div>

        <div className="rounded-2xl border border-red-500/20 bg-slate-900/70 p-5">
          <p className="text-sm text-slate-400">Reportadas</p>
          <p className="mt-2 text-3xl font-bold text-red-400">
            {estadisticas.reportadas}
          </p>
        </div>

        <div className="rounded-2xl border border-sky-500/20 bg-slate-900/70 p-5">
          <p className="text-sm text-slate-400">Solicitudes pendientes</p>
          <p className="mt-2 text-3xl font-bold text-sky-400">
            {estadisticas.pendientes}
          </p>
        </div>
      </div>

      {/* FORMULARIO DE REGISTRO */}
      {mostrarFormulario && (
        <div className="rounded-2xl border border-emerald-500/20 bg-slate-900/80 p-5 sm:p-6">
          <div className="mb-5">
            <h2 className="text-lg font-semibold text-white">
              Registrar nueva tarjeta RFID
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              Registra el UID de una tarjeta de la empresa. Quedará DISPONIBLE y sin usuario hasta que la asignes.
            </p>
          </div>

          <form onSubmit={registrarTarjeta} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-1">
              <div>
                <label
                  htmlFor="uid"
                  className="mb-2 block text-sm font-medium text-slate-300"
                >
                  UID de la tarjeta
                </label>
                <input
                  id="uid"
                  type="text"
                  value={uid}
                  onChange={(event) => setUid(event.target.value)}
                  placeholder="Ejemplo: A1B2C3D4"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-emerald-500"
                  required
                />
              </div>

            </div>

            <div className="flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={() => setMostrarFormulario(false)}
                className="rounded-xl border border-slate-700 px-5 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-slate-800"
              >
                Cancelar
              </button>

              <button
                type="submit"
                disabled={procesando}
                className="rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {procesando ? 'Registrando...' : 'Registrar tarjeta'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: ASIGNAR TARJETA DISPONIBLE */}
      {tarjetaParaAsignarId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
            <h2 className="text-xl font-bold text-white">Asignar tarjeta RFID</h2>
            <p className="mt-2 text-sm text-slate-400">
              Tarjeta: <span className="font-mono text-emerald-300">{tarjetas.find((item) => item.id === tarjetaParaAsignarId)?.uid}</span>
            </p>
            <label htmlFor="usuarioAsignacionId" className="mt-5 mb-2 block text-sm font-medium text-slate-300">
              Selecciona el usuario destinatario
            </label>
            <select
              id="usuarioAsignacionId"
              value={usuarioAsignacionId}
              onChange={(event) => setUsuarioAsignacionId(event.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-emerald-500"
            >
              <option value="">Seleccionar usuario</option>
              {usuarios.filter((usuario) => usuario.estado === 'ACTIVO' && !tarjetas.some((tarjeta) => tarjeta.usuario_id === usuario.id && ['ACTIVA', 'RESERVADA'].includes(tarjeta.estado))).map((usuario) => (
                <option key={usuario.id} value={usuario.id}>
                  {usuario.nombre} ({usuario.codigo_usuario})
                </option>
              ))}
            </select>
            <p className="mt-3 text-xs text-slate-500">
              Al confirmar, SPING reservará la tarjeta y generará un código de activación que se mostrará una sola vez.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => setTarjetaParaAsignarId(null)} disabled={procesando} className="rounded-xl border border-slate-700 px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-800">
                Cancelar
              </button>
              <button type="button" onClick={asignarTarjeta} disabled={procesando || !usuarioAsignacionId} className="rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-slate-950 disabled:opacity-50">
                {procesando ? 'Asignando...' : 'Asignar y generar código'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: MOSTRAR CÓDIGO UNA SOLA VEZ */}
      {codigoGenerado && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/75 p-4">
          <div className="w-full max-w-md rounded-2xl border border-emerald-500/30 bg-slate-900 p-6 shadow-2xl">
            <div className="text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/15 text-2xl text-emerald-300">✓</div>
              <h2 className="text-xl font-bold text-white">Código de activación generado</h2>
              <p className="mt-2 text-sm text-slate-400">Entrega este código a {codigoGenerado.usuario}. No volverá a mostrarse.</p>
              <div className="my-5 rounded-xl border border-emerald-500/30 bg-slate-950 px-4 py-5">
                <p className="font-mono text-3xl font-bold tracking-[0.25em] text-emerald-300">{codigoGenerado.codigo}</p>
                <p className="mt-2 text-xs text-slate-500">UID: {codigoGenerado.uid}</p>
              </div>
              <p className="text-xs text-slate-500">Vence: {formatearFecha(codigoGenerado.fechaExpiracion)}</p>
            </div>
            <div className="mt-6 flex flex-col gap-2 sm:flex-row">
              <button type="button" onClick={async () => {
                try {
                  await navigator.clipboard.writeText(codigoGenerado.codigo);
                  setMensaje('Código copiado al portapapeles. Entrégalo al usuario de forma segura.');
                } catch {
                  setError('No se pudo copiar automáticamente. Copia el código manualmente antes de cerrar esta ventana.');
                }
              }} className="flex-1 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-sm font-semibold text-emerald-300">
                Copiar código
              </button>
              <button type="button" onClick={() => setCodigoGenerado(null)} className="flex-1 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-slate-950">
                Ya lo guardé
              </button>
            </div>
            <p className="mt-3 text-center text-xs text-amber-300">Asegúrate de entregar el código antes de cerrar esta ventana.</p>
          </div>
        </div>
      )}

      {/* SOLICITUDES DE REPOSICIÓN */}
      <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70">
        <button
          type="button"
          onClick={() => setMostrarSolicitudes(!mostrarSolicitudes)}
          className="flex w-full items-center justify-between gap-4 p-5 text-left transition hover:bg-slate-800/40"
        >
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-lg font-semibold text-white">
                Solicitudes de reposición RFID
              </h2>

              {estadisticas.pendientes > 0 && (
                <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-400">
                  {estadisticas.pendientes} pendientes
                </span>
              )}
            </div>

            <p className="mt-1 text-sm text-slate-400">
              Revisa, aprueba o rechaza las solicitudes de los usuarios.
            </p>
          </div>

          <span className="text-xl text-slate-400">
            {mostrarSolicitudes ? '−' : '+'}
          </span>
        </button>

        {mostrarSolicitudes && (
          <div className="border-t border-slate-800 p-5">
            {solicitudes.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-700 p-8 text-center">
                <div className="mb-2 text-3xl">📋</div>
                <p className="font-medium text-slate-300">
                  No hay solicitudes de reposición
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  Cuando un usuario reporte una tarjeta, su solicitud aparecerá aquí.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* SOLICITUDES PENDIENTES */}
                <div>
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="font-semibold text-white">
                      Pendientes de revisión
                    </h3>
                    <span className="text-sm text-slate-400">
                      {solicitudesPendientes.length} solicitudes
                    </span>
                  </div>

                  {solicitudesPendientes.length === 0 ? (
                    <p className="rounded-xl bg-slate-950/60 p-4 text-sm text-slate-500">
                      No tienes solicitudes pendientes por resolver.
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {solicitudesPendientes.map((solicitud) => {
                        const tarjeta = obtenerTarjetaSolicitud(solicitud);
                        const usuario = obtenerUsuarioSolicitud(solicitud);

                        return (
                          <div
                            key={solicitud.id}
                            className="rounded-xl border border-amber-500/20 bg-slate-950/60 p-4"
                          >
                            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                              <div>
                                <div className="mb-2 flex flex-wrap items-center gap-2">
                                  <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-400">
                                    Pendiente
                                  </span>
                                  <span className="text-xs text-slate-500">
                                    Solicitud #{solicitud.id}
                                  </span>
                                </div>

                                <h4 className="font-semibold text-white">
                                  {usuario?.nombre ?? `Usuario #${solicitud.usuario_id}`}
                                </h4>

                                <p className="mt-1 text-sm text-slate-400">
                                  {usuario?.codigo_usuario ?? 'Código no disponible'}
                                </p>
                              </div>

                              <div className="text-left sm:text-right">
                                <p className="text-xs text-slate-500">
                                  Fecha de solicitud
                                </p>
                                <p className="mt-1 text-sm text-slate-300">
                                  {formatearFecha(solicitud.fecha_solicitud)}
                                </p>
                              </div>
                            </div>

                            <div className="mt-4 grid gap-3 rounded-xl border border-slate-800 bg-slate-900/60 p-4 sm:grid-cols-2">
                              <div>
                                <p className="text-xs text-slate-500">
                                  Tarjeta reportada
                                </p>
                                <p className="mt-1 font-mono text-sm text-white">
                                  {tarjeta?.uid ?? `Tarjeta #${solicitud.rfid_id}`}
                                </p>
                                <p className="mt-1 text-xs text-slate-500">
                                  Estado:{' '}
                                  {tarjeta?.estado
                                    ? etiquetaEstado(tarjeta.estado)
                                    : 'No disponible'}
                                </p>
                              </div>

                              <div>
                                <p className="text-xs text-slate-500">
                                  Motivo del reporte
                                </p>
                                <p className="mt-1 text-sm font-medium text-white">
                                  {etiquetaMotivo(solicitud.motivo)}
                                </p>
                              </div>

                              {solicitud.detalle && (
                                <div className="sm:col-span-2">
                                  <p className="text-xs text-slate-500">
                                    Detalle del usuario
                                  </p>
                                  <p className="mt-1 text-sm text-slate-300">
                                    {solicitud.detalle}
                                  </p>
                                </div>
                              )}
                            </div>

                            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:justify-end">
                              <button
                                type="button"
                                onClick={() =>
                                  resolverSolicitud(
                                    solicitud.id,
                                    'rechazar_reposicion'
                                  )
                                }
                                disabled={solicitudProcesando === solicitud.id}
                                className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm font-semibold text-red-400 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {solicitudProcesando === solicitud.id
                                  ? 'Procesando...'
                                  : 'Rechazar solicitud'}
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  resolverSolicitud(
                                    solicitud.id,
                                    'aprobar_reposicion'
                                  )
                                }
                                disabled={solicitudProcesando === solicitud.id}
                                className="rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {solicitudProcesando === solicitud.id
                                  ? 'Procesando...'
                                  : '✓ Aprobar reposición'}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* HISTORIAL DE SOLICITUDES */}
                <div className="border-t border-slate-800 pt-5">
                  <h3 className="mb-4 font-semibold text-white">
                    Historial de solicitudes resueltas
                  </h3>

                  {solicitudesResueltas.length === 0 ? (
                    <p className="rounded-xl bg-slate-950/60 p-4 text-sm text-slate-500">
                      Todavía no hay solicitudes resueltas.
                    </p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[650px] text-left text-sm">
                        <thead>
                          <tr className="border-b border-slate-800 text-xs uppercase text-slate-500">
                            <th className="px-3 py-3 font-medium">Usuario</th>
                            <th className="px-3 py-3 font-medium">Motivo</th>
                            <th className="px-3 py-3 font-medium">Estado</th>
                            <th className="px-3 py-3 font-medium">Fecha resolución</th>
                            <th className="px-3 py-3 font-medium">Observación</th>
                          </tr>
                        </thead>

                        <tbody>
                          {solicitudesResueltas.map((solicitud) => {
                            const usuario = obtenerUsuarioSolicitud(solicitud);

                            return (
                              <tr
                                key={solicitud.id}
                                className="border-b border-slate-800/70 last:border-0"
                              >
                                <td className="px-3 py-4">
                                  <p className="font-medium text-white">
                                    {usuario?.nombre ?? `Usuario #${solicitud.usuario_id}`}
                                  </p>
                                  <p className="mt-1 text-xs text-slate-500">
                                    Solicitud #{solicitud.id}
                                  </p>
                                </td>

                                <td className="px-3 py-4 text-slate-300">
                                  {etiquetaMotivo(solicitud.motivo)}
                                </td>

                                <td className="px-3 py-4">
                                  <span
                                    className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${colorEstado(
                                      solicitud.estado_solicitud
                                    )}`}
                                  >
                                    {etiquetaEstado(solicitud.estado_solicitud)}
                                  </span>
                                </td>

                                <td className="px-3 py-4 text-slate-400">
                                  {formatearFecha(solicitud.fecha_resolucion)}
                                </td>

                                <td className="max-w-[240px] px-3 py-4 text-slate-400">
                                  {solicitud.observacion_admin || 'Sin observaciones'}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* LISTADO DE TARJETAS */}
      <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70">
        <div className="border-b border-slate-800 p-5">
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
            <div>
              <h2 className="text-lg font-semibold text-white">
                Tarjetas registradas
              </h2>
              <p className="mt-1 text-sm text-slate-400">
                Consulta el inventario completo de tarjetas, incluidas las disponibles y reservadas.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                type="text"
                value={busqueda}
                onChange={(event) => setBusqueda(event.target.value)}
                placeholder="Buscar UID o usuario..."
                className="min-w-0 rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm text-white outline-none placeholder:text-slate-600 focus:border-emerald-500 sm:w-64"
              />

              <select
                value={filtroEstado}
                onChange={(event) => setFiltroEstado(event.target.value)}
                className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm text-white outline-none focus:border-emerald-500"
              >
                <option value="TODOS">Todos los estados</option>
                {ESTADOS_TARJETA.map((estado) => (
                  <option key={estado} value={estado}>
                    {etiquetaEstado(estado)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {tarjetasFiltradas.length === 0 ? (
          <div className="p-10 text-center">
            <div className="mb-3 text-4xl">💳</div>
            <p className="font-medium text-slate-300">
              No se encontraron tarjetas RFID
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Intenta cambiar los filtros o ingresa una tarjeta al inventario.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[750px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/50 text-xs uppercase text-slate-500">
                  <th className="px-5 py-4 font-medium">UID</th>
                  <th className="px-5 py-4 font-medium">Usuario</th>
                  <th className="px-5 py-4 font-medium">Rol</th>
                  <th className="px-5 py-4 font-medium">Estado</th>
                  <th className="px-5 py-4 font-medium">Ingreso</th>
                  <th className="px-5 py-4 font-medium">Asignación</th>
                  <th className="px-5 py-4 text-right font-medium">Acciones</th>
                </tr>
              </thead>

              <tbody>
                {tarjetasFiltradas.map((tarjeta) => (
                  <tr
                    key={tarjeta.id}
                    className="border-b border-slate-800/70 transition hover:bg-slate-800/30 last:border-0"
                  >
                    <td className="px-5 py-4">
                      <span className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 font-mono text-sm text-emerald-300">
                        {tarjeta.uid}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <p className="font-medium text-white">
                        {tarjeta.usuario?.nombre ?? 'Sin usuario'}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {tarjeta.usuario?.codigo_usuario ?? 'Sin código'}
                      </p>
                    </td>

                    <td className="px-5 py-4 text-slate-400">
                      {tarjeta.usuario?.rol ?? 'No disponible'}
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${colorEstado(
                          tarjeta.estado
                        )}`}
                      >
                        {etiquetaEstado(tarjeta.estado)}
                      </span>
                    </td>

                    <td className="px-5 py-4 text-slate-400">
                      {formatearFecha(tarjeta.fecha_ingreso)}
                    </td>

                    <td className="px-5 py-4 text-slate-400">
                      {formatearFecha(tarjeta.fecha_asignacion)}
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        {tarjeta.estado === 'DISPONIBLE' && (
                          <button
                            type="button"
                            onClick={() => {
                              setTarjetaParaAsignarId(tarjeta.id);
                              setUsuarioAsignacionId('');
                            }}
                            disabled={procesando}
                            className="rounded-lg bg-emerald-500 px-3 py-2 text-xs font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:opacity-50"
                          >
                            Asignar
                          </button>
                        )}

                        {tarjeta.estado === 'RESERVADA' && (
                          <button
                            type="button"
                            onClick={() => reemitirCodigo(tarjeta)}
                            disabled={procesando}
                            className="rounded-lg border border-violet-500/30 bg-violet-500/10 px-3 py-2 text-xs font-semibold text-violet-300 transition hover:bg-violet-500/20 disabled:opacity-50"
                          >
                            Nuevo código
                          </button>
                        )}

                        {tarjeta.estado === 'ACTIVA' && (
                          <button
                            type="button"
                            onClick={() =>
                              cambiarEstadoTarjeta(tarjeta.id, 'bloquear')
                            }
                            disabled={procesando}
                            className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-400 transition hover:bg-amber-500/20 disabled:opacity-50"
                          >
                            Bloquear
                          </button>
                        )}

                        {tarjeta.estado === 'BLOQUEADA' && (
                          <button
                            type="button"
                            onClick={() =>
                              cambiarEstadoTarjeta(tarjeta.id, 'desbloquear')
                            }
                            disabled={procesando}
                            className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-400 transition hover:bg-emerald-500/20 disabled:opacity-50"
                          >
                            Desbloquear
                          </button>
                        )}

                        {tarjeta.estado === 'REPORTADA' &&
                          (usuarioTieneTarjetaActiva(tarjeta.usuario_id) ? (
                            <span className="text-xs text-slate-500">
                              Usuario ya tiene una tarjeta activa o reservada
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => reactivarTarjeta(tarjeta)}
                              disabled={procesando}
                              className="rounded-lg border border-sky-500/30 bg-sky-500/10 px-3 py-2 text-xs font-semibold text-sky-300 transition hover:bg-sky-500/20 disabled:opacity-50"
                            >
                              Reactivar
                            </button>
                          ))}

                        {tarjeta.estado === 'INACTIVA' && (
                          <span className="text-xs text-slate-500">
                            Sin acciones disponibles
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="border-t border-slate-800 px-5 py-4">
          <p className="text-xs text-slate-500">
            Mostrando {tarjetasFiltradas.length} de {tarjetas.length} tarjetas registradas.
          </p>
        </div>
      </section>

      {/* HISTORIAL DE MOVIMIENTOS RFID */}
      <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70">
        <div className="border-b border-slate-800 p-5">
          <h2 className="text-lg font-semibold text-white">
            Historial de movimientos RFID
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            Registro de asignaciones, bloqueos, reportes, reposiciones y reactivaciones.
          </p>
        </div>

        {historial.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">
            Todavía no hay movimientos registrados.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1350px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/50 text-xs uppercase text-slate-500">
                  <th className="px-4 py-3 font-medium">Fecha</th>
                  <th className="px-4 py-3 font-medium">Tarjeta</th>
                  <th className="px-4 py-3 font-medium">Usuario</th>
                  <th className="px-4 py-3 font-medium">Acción</th>
                  <th className="px-4 py-3 font-medium">Estado anterior</th>
                  <th className="px-4 py-3 font-medium">Estado nuevo</th>
                  <th className="px-4 py-3 font-medium">Registrado por</th>
                  <th className="px-4 py-3 font-medium">Empresa autorizante</th>
                  <th className="px-4 py-3 font-medium">Referencia</th>
                  <th className="px-4 py-3 font-medium">Motivo</th>
                  <th className="px-4 py-3 font-medium">Observaciones</th>
                </tr>
              </thead>
              <tbody>
                {historial.map((evento) => (
                  <tr key={evento.id} className="border-b border-slate-800/70 last:border-0">
                    <td className="whitespace-nowrap px-4 py-4 text-slate-400">
                      {formatearFecha(evento.fecha_evento)}
                    </td>
                    <td className="px-4 py-4 font-mono text-emerald-300">
                      {obtenerUIDHistorial(evento.rfid_id)}
                    </td>
                    <td className="px-4 py-4 text-slate-300">
                      {obtenerNombreUsuario(evento.usuario_id)}
                    </td>
                    <td className="px-4 py-4 font-medium text-white">
                      {etiquetaAccion(evento.accion)}
                    </td>
                    <td className="px-4 py-4 text-slate-400">
                      {evento.estado_anterior ? etiquetaEstado(evento.estado_anterior) : '—'}
                    </td>
                    <td className="px-4 py-4 text-slate-400">
                      {evento.estado_nuevo ? etiquetaEstado(evento.estado_nuevo) : '—'}
                    </td>
                    <td className="px-4 py-4 text-slate-400">
                      {evento.registrado_por ? `Usuario #${evento.registrado_por}` : 'Sistema'}
                    </td>
                    <td className="max-w-[220px] px-4 py-4 text-slate-300">
                      {evento.autorizado_por_empresa || '—'}
                    </td>
                    <td className="max-w-[180px] px-4 py-4 text-slate-400">
                      {evento.referencia_autorizacion || '—'}
                    </td>
                    <td className="max-w-[260px] px-4 py-4 text-slate-300">
                      {evento.motivo || '—'}
                    </td>
                    <td className="max-w-[320px] whitespace-normal px-4 py-4 text-slate-400">
                      {evento.observacion || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="border-t border-slate-800 px-5 py-3">
          <p className="text-xs text-slate-500">
            Mostrando {historial.length} movimientos recibidos desde la API.
          </p>
        </div>
      </section>

      {/* INFORMACIÓN DEL PROCESO */}
      <div className="rounded-2xl border border-sky-500/20 bg-sky-500/5 p-5">
        <div className="flex items-start gap-3">
          <span className="text-xl">ℹ️</span>
          <div>
            <h3 className="font-semibold text-sky-300">
              Proceso de reposición de tarjetas
            </h3>

            <ol className="mt-3 list-inside list-decimal space-y-2 text-sm text-slate-400">
              <li>El usuario reporta su tarjeta por pérdida, robo o daño.</li>
              <li>La tarjeta anterior queda en estado REPORTADA.</li>
              <li>El administrador revisa y aprueba o rechaza la solicitud.</li>
              <li>Si se aprueba, el administrador asigna una tarjeta DISPONIBLE del inventario y entrega al usuario su código de activación.</li>
              <li>La tarjeta anterior permanece en estado REPORTADA y no se elimina.</li>
              <li>Si la empresa autoriza recuperar la tarjeta, el administrador puede reactivarla registrando la empresa, la referencia y el motivo de autorización.</li>
            </ol>

            <p className="mt-3 text-xs text-slate-500">
              La aprobación de una reposición no crea automáticamente una tarjeta nueva. El administrador asigna una tarjeta disponible del inventario y entrega un nuevo código de activación al usuario. La reactivación de una tarjeta reportada es un proceso separado y requiere autorización empresarial.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
