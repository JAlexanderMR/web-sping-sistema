
'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';

type TarjetaRFID = {
  id: number;
  uid: string;
  usuario_id: number | null;
  estado: string;
  fecha_asignacion: string | null;
};

type Usuario = {
  id: number;
  codigo_usuario: string;
  nombre: string;
  puntos_totales: number;
  rol: string;
  estado: string;
  fecha_registro?: string;
  rfid: TarjetaRFID[];
};

const ELEMENTOS_POR_PAGINA = 8;

export function UserManagement() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rol, setRol] = useState('user');

  const [cargando, setCargando] = useState(true);
  const [creando, setCreando] = useState(false);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);

  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');

  const [busqueda, setBusqueda] = useState('');
  const [filtroRol, setFiltroRol] = useState('todos');
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [pagina, setPagina] = useState(1);

  async function cargarUsuarios() {
    setCargando(true);
    setError('');

    try {
      const response = await fetch('/api/usuarios');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'No fue posible cargar los usuarios.');
      }

      setUsuarios(
        (data.usuarios ?? []).map((usuario: Usuario) => ({
          ...usuario,
          rfid: usuario.rfid ?? [],
        }))
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Error al consultar usuarios.'
      );
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargarUsuarios();
  }, []);

  async function crearUsuario(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreando(true);
    setMensaje('');
    setError('');

    try {
      const response = await fetch('/api/usuarios', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nombre,
          email,
          password,
          rol,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'No fue posible crear el usuario.');
      }

      setMensaje('Usuario creado correctamente.');
      setNombre('');
      setEmail('');
      setPassword('');
      setRol('user');
      setMostrarFormulario(false);

      await cargarUsuarios();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Error al crear el usuario.'
      );
    } finally {
      setCreando(false);
    }
  }

  function nombreRol(rolUsuario: string) {
    if (rolUsuario === 'admin') return 'Administrador';
    if (rolUsuario === 'maintenance') return 'Mantenimiento';
    return 'Usuario';
  }

  function colorEstado(estado: string) {
    switch (estado?.toUpperCase()) {
      case 'ACTIVA':
        return 'border-emerald-400/20 bg-emerald-400/10 text-emerald-400';
      case 'BLOQUEADA':
        return 'border-red-400/20 bg-red-400/10 text-red-400';
      case 'REPORTADA':
        return 'border-amber-400/20 bg-amber-400/10 text-amber-400';
      case 'INACTIVA':
        return 'border-gray-400/20 bg-gray-400/10 text-gray-400';
      default:
        return 'border-border bg-secondary text-muted-foreground';
    }
  }

  const usuariosFiltrados = useMemo(() => {
    const termino = busqueda.trim().toLowerCase();

    return usuarios.filter((usuario) => {
      const coincideBusqueda =
        !termino ||
        usuario.nombre?.toLowerCase().includes(termino) ||
        usuario.codigo_usuario?.toLowerCase().includes(termino) ||
        usuario.rfid?.some((tarjeta) =>
          tarjeta.uid?.toLowerCase().includes(termino)
        );

      const coincideRol =
        filtroRol === 'todos' || usuario.rol === filtroRol;

      const coincideEstado =
        filtroEstado === 'todos' ||
        usuario.estado?.toUpperCase() === filtroEstado;

      return coincideBusqueda && coincideRol && coincideEstado;
    });
  }, [usuarios, busqueda, filtroRol, filtroEstado]);

  const totalPaginas = Math.max(
    1,
    Math.ceil(usuariosFiltrados.length / ELEMENTOS_POR_PAGINA)
  );

  const usuariosPaginados = usuariosFiltrados.slice(
    (pagina - 1) * ELEMENTOS_POR_PAGINA,
    pagina * ELEMENTOS_POR_PAGINA
  );

  const usuariosActivos = usuarios.filter(
    (usuario) => usuario.estado?.toUpperCase() === 'ACTIVO'
  ).length;

  const usuariosInactivos = usuarios.filter(
    (usuario) => usuario.estado?.toUpperCase() === 'INACTIVO'
  ).length;

  const tarjetasAsignadas = usuarios.reduce(
    (total, usuario) =>
      total +
      (usuario.rfid ?? []).filter(
        (tarjeta) => tarjeta.estado?.toUpperCase() === 'ACTIVA'
      ).length,
    0
  );

  useEffect(() => {
    setPagina(1);
  }, [busqueda, filtroRol, filtroEstado]);

  useEffect(() => {
    if (pagina > totalPaginas) {
      setPagina(totalPaginas);
    }
  }, [pagina, totalPaginas]);

  function limpiarFiltros() {
    setBusqueda('');
    setFiltroRol('todos');
    setFiltroEstado('todos');
    setPagina(1);
  }

  return (
    <section id="gestion-usuarios" className="space-y-7">

      {/* ENCABEZADO */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <span className="h-1.5 w-7 rounded-full bg-[#2a7a9e]" />
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8bbec6]">
              Administración
            </p>
          </div>

          <h2 className="font-heading text-2xl font-bold text-foreground md:text-3xl">
            Gestión de usuarios
          </h2>

          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Administra las cuentas, consulta sus tarjetas RFID y controla los
            perfiles registrados en SPING.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setMostrarFormulario(!mostrarFormulario);
            setMensaje('');
            setError('');
          }}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/10 transition hover:opacity-90"
        >
          <span className="text-lg leading-none">
            {mostrarFormulario ? '−' : '+'}
          </span>
          {mostrarFormulario ? 'Cerrar formulario' : 'Nuevo usuario'}
        </button>
      </div>

      {/* INDICADORES */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <p className="text-sm text-muted-foreground">Total de usuarios</p>
          <p className="mt-4 font-heading text-3xl font-bold tabular-nums">
            {cargando ? '—' : usuarios.length}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Cuentas registradas
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <p className="text-sm text-muted-foreground">Usuarios activos</p>
          <p className="mt-4 font-heading text-3xl font-bold tabular-nums">
            {cargando ? '—' : usuariosActivos}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Cuentas habilitadas
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <p className="text-sm text-muted-foreground">Usuarios inactivos</p>
          <p className="mt-4 font-heading text-3xl font-bold tabular-nums">
            {cargando ? '—' : usuariosInactivos}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Cuentas deshabilitadas
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <p className="text-sm text-muted-foreground">Tarjetas RFID activas</p>
          <p className="mt-4 font-heading text-3xl font-bold tabular-nums">
            {cargando ? '—' : tarjetasAsignadas}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Tarjetas habilitadas
          </p>
        </div>
      </div>

      {/* MENSAJES */}
      {mensaje && (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-400">
          <span>✓</span>
          {mensaje}
        </div>
      )}

      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
          <span>!</span>
          {error}
        </div>
      )}

      {/* FORMULARIO */}
      {mostrarFormulario && (
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <div className="border-b border-border bg-secondary/40 px-6 py-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#8bbec6]">
              Nuevo registro
            </p>

            <h3 className="mt-1 font-heading text-xl font-bold">
              Registrar usuario
            </h3>

            <p className="mt-1 text-sm text-muted-foreground">
              Completa los datos para crear una nueva cuenta en SPING.
            </p>
          </div>

          <form onSubmit={crearUsuario} className="space-y-5 p-6">
            <div className="grid gap-5 md:grid-cols-2">

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Nombre completo
                </label>

                <input
                  type="text"
                  required
                  maxLength={100}
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Nombre del usuario"
                  className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none transition placeholder:text-muted-foreground/60 focus:border-[#2a7a9e] focus:ring-2 focus:ring-[#2a7a9e]/15"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Correo electrónico
                </label>

                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="correo@ejemplo.com"
                  className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none transition placeholder:text-muted-foreground/60 focus:border-[#2a7a9e] focus:ring-2 focus:ring-[#2a7a9e]/15"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Contraseña temporal
                </label>

                <input
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                  className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none transition placeholder:text-muted-foreground/60 focus:border-[#2a7a9e] focus:ring-2 focus:ring-[#2a7a9e]/15"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Tipo de usuario
                </label>

                <select
                  value={rol}
                  onChange={(e) => setRol(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none transition focus:border-[#2a7a9e]"
                >
                  <option value="user">Usuario</option>
                  <option value="maintenance">Personal de mantenimiento</option>
                </select>
              </div>
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-border pt-5 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setMostrarFormulario(false)}
                className="rounded-xl border border-border px-5 py-3 text-sm font-medium transition hover:bg-muted"
              >
                Cancelar
              </button>

              <button
                type="submit"
                disabled={creando}
                className="rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {creando ? 'Creando usuario...' : 'Crear usuario'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TABLA */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">

        <div className="border-b border-border px-5 py-5 sm:px-6">
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
            <div>
              <h3 className="font-heading text-lg font-bold">
                Usuarios registrados
              </h3>

              <p className="mt-1 text-sm text-muted-foreground">
                Consulta usuarios, códigos y tarjetas RFID asociadas.
              </p>
            </div>

            <button
              type="button"
              onClick={cargarUsuarios}
              disabled={cargando}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-medium transition hover:bg-muted disabled:opacity-50"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={`size-4 ${cargando ? 'animate-spin' : ''}`}>
                <path d="M20 7v5h-5M4 17v-5h5" />
                <path d="M5.6 9A7 7 0 0 1 18 6l2 6M4 12l2 6a7 7 0 0 0 12.4-3" />
              </svg>
              Actualizar
            </button>
          </div>

          {/* BUSCADOR Y FILTROS */}
          <div className="mt-5 grid gap-3 md:grid-cols-3">

            <div className="relative">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground">
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-4-4" />
              </svg>

              <input
                type="search"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar nombre, código o UID..."
                className="w-full rounded-xl border border-border bg-background py-3 pl-10 pr-4 text-sm outline-none transition placeholder:text-muted-foreground/60 focus:border-[#2a7a9e] focus:ring-2 focus:ring-[#2a7a9e]/15"
              />
            </div>

            <select
              value={filtroRol}
              onChange={(e) => setFiltroRol(e.target.value)}
              className="rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none transition focus:border-[#2a7a9e]"
            >
              <option value="todos">Todos los roles</option>
              <option value="admin">Administrador</option>
              <option value="user">Usuario</option>
              <option value="maintenance">Mantenimiento</option>
            </select>

            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
              className="rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none transition focus:border-[#2a7a9e]"
            >
              <option value="todos">Todos los estados</option>
              <option value="ACTIVO">Activo</option>
              <option value="INACTIVO">Inactivo</option>
            </select>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">
              Mostrando{' '}
              <span className="font-semibold text-foreground">
                {usuariosFiltrados.length}
              </span>{' '}
              de {usuarios.length} usuarios
            </p>

            {(busqueda || filtroRol !== 'todos' || filtroEstado !== 'todos') && (
              <button
                type="button"
                onClick={limpiarFiltros}
                className="text-xs font-semibold text-[#8bbec6] transition hover:text-foreground"
              >
                Limpiar filtros
              </button>
            )}
          </div>
        </div>

        {/* CONTENIDO */}
        {cargando ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16">
            <div className="size-8 animate-spin rounded-full border-2 border-[#2a7a9e]/30 border-t-[#8bbec6]" />
            <p className="text-sm text-muted-foreground">
              Consultando usuarios...
            </p>
          </div>
        ) : usuariosFiltrados.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
            <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-secondary text-[#8bbec6]">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="size-7">
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-4-4" />
              </svg>
            </div>

            <h4 className="font-heading font-semibold">
              No se encontraron usuarios
            </h4>

            <p className="mt-2 max-w-sm text-sm text-muted-foreground">
              No hay registros que coincidan con los criterios de búsqueda.
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1050px] text-left text-sm">
                <thead className="border-b border-border bg-secondary/40">
                  <tr className="text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="px-6 py-4 font-semibold">Usuario</th>
                    <th className="px-6 py-4 font-semibold">Código</th>
                    <th className="px-6 py-4 font-semibold">UID RFID</th>
                    <th className="px-6 py-4 font-semibold">Rol</th>
                    <th className="px-6 py-4 text-right font-semibold">Puntos</th>
                    <th className="px-6 py-4 text-center font-semibold">Estado</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-border">
                  {usuariosPaginados.map((usuario) => (
                    <tr
                      key={usuario.id}
                      className="transition-colors hover:bg-secondary/30"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 font-heading font-bold text-[#8bbec6]">
                            {usuario.nombre?.charAt(0)?.toUpperCase() ?? 'U'}
                          </div>

                          <span className="font-semibold text-foreground">
                            {usuario.nombre}
                          </span>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <span className="font-mono text-xs text-muted-foreground">
                          {usuario.codigo_usuario}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        {usuario.rfid.length === 0 ? (
                          <span className="text-xs text-muted-foreground">
                            Sin tarjeta asignada
                          </span>
                        ) : (
                          <div className="flex flex-col gap-2">
                            {usuario.rfid.map((tarjeta) => (
                              <div key={tarjeta.id} className="flex flex-col items-start gap-1">
                                <span className="rounded-md border border-[#2a7a9e]/30 bg-[#2a7a9e]/10 px-2.5 py-1 font-mono text-xs font-semibold text-[#8bbec6]">
                                  {tarjeta.uid}
                                </span>

                                <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold ${colorEstado(tarjeta.estado)}`}>
                                  {tarjeta.estado}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center rounded-lg border px-2.5 py-1 text-xs font-medium ${
                            usuario.rol === 'admin'
                              ? 'border-violet-400/20 bg-violet-400/10 text-violet-300'
                              : usuario.rol === 'maintenance'
                                ? 'border-amber-400/20 bg-amber-400/10 text-amber-300'
                                : 'border-sky-400/20 bg-sky-400/10 text-sky-300'
                          }`}
                        >
                          {nombreRol(usuario.rol)}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-right">
                        {usuario.rol === 'user' ? (
                          <>
                            <span className="font-semibold tabular-nums">
                              {(usuario.puntos_totales ?? 0).toLocaleString('es-CO')}
                            </span>
                            <span className="ml-1 text-xs text-muted-foreground">
                              pts
                            </span>
                          </>
                        ) : (
                          <span className="text-xs font-medium text-muted-foreground">
                            No aplica
                          </span>
                        )}
                      </td>

                      <td className="px-6 py-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${
                            usuario.estado?.toUpperCase() === 'ACTIVO'
                              ? 'border-emerald-400/20 bg-emerald-400/10 text-emerald-400'
                              : 'border-amber-400/20 bg-amber-400/10 text-amber-400'
                          }`}
                        >
                          <span className={`size-1.5 rounded-full ${
                            usuario.estado?.toUpperCase() === 'ACTIVO'
                              ? 'bg-emerald-400'
                              : 'bg-amber-400'
                          }`} />
                          {usuario.estado}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* PAGINACIÓN */}
            <div className="flex flex-col justify-between gap-4 border-t border-border px-5 py-4 sm:flex-row sm:items-center sm:px-6">
              <p className="text-xs text-muted-foreground">
                Página {pagina} de {totalPaginas}
              </p>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPagina((actual) => Math.max(1, actual - 1))}
                  disabled={pagina === 1}
                  className="rounded-lg border border-border px-3 py-2 text-xs font-medium transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Anterior
                </button>

                <span className="rounded-lg bg-primary/10 px-3 py-2 text-xs font-semibold text-[#8bbec6]">
                  {pagina}
                </span>

                <button
                  type="button"
                  onClick={() =>
                    setPagina((actual) => Math.min(totalPaginas, actual + 1))
                  }
                  disabled={pagina === totalPaginas}
                  className="rounded-lg border border-border px-3 py-2 text-xs font-medium transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Siguiente
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
