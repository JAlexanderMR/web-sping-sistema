import { redirect } from 'next/navigation';
import { createAuthServerClient } from '@/lib/supabase/auth-server';
import { supabaseServer } from '@/lib/supabase/server';
import { LogoutButton } from '@/components/dashboard/logout-button';

export default async function DashboardPage() {
  const supabaseAuth = await createAuthServerClient();

  const {
    data: { user },
  } = await supabaseAuth.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const [
    usuariosResult,
    rfidResult,
    clasificacionesResult,
    puntosResult,
    ultimasResult,
  ] = await Promise.all([
    supabaseServer
      .from('usuarios')
      .select('id', { count: 'exact', head: true }),

    supabaseServer
      .from('rfid')
      .select('id', { count: 'exact', head: true }),

    supabaseServer
      .from('clasificaciones')
      .select('id', { count: 'exact', head: true }),

    supabaseServer
      .from('movimientos_puntos')
      .select('puntos'),

    supabaseServer
      .from('clasificaciones')
      .select(`
        id,
        tipo_residuo,
        humedad,
        distancia,
        direccion_motor,
        puntos_obtenidos,
        fecha_hora,
        usuarios (
          codigo_usuario,
          nombre
        )
      `)
      .order('fecha_hora', { ascending: false })
      .limit(10),
  ]);

  const totalUsuarios = usuariosResult.count ?? 0;
  const totalRfid = rfidResult.count ?? 0;
  const totalClasificaciones = clasificacionesResult.count ?? 0;

  const totalPuntos =
    puntosResult.data?.reduce(
      (total, movimiento) => total + (movimiento.puntos ?? 0),
      0
    ) ?? 0;

  const ultimasClasificaciones = ultimasResult.data ?? [];

  return (
    <main className="min-h-screen bg-background">
      {/* HEADER */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
        <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          {/* LOGO */}
          <a
            href="/"
            className="flex items-center gap-2 font-heading text-lg font-bold"
          >
            <div className="flex size-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
              ♻
            </div>

            SPING
          </a>

          {/* NAVEGACIÓN */}
          <div className="hidden items-center gap-8 text-sm text-muted-foreground md:flex">
            <a
              href="/dashboard"
              className="text-foreground transition-colors"
            >
              Dashboard
            </a>

            <a
              href="#estadisticas"
              className="transition-colors hover:text-foreground"
            >
              Estadísticas
            </a>

            <a
              href="#actividad"
              className="transition-colors hover:text-foreground"
            >
              Actividad
            </a>
          </div>

          {/* SESIÓN */}
          <LogoutButton />
        </nav>
      </header>

      {/* CONTENIDO */}
      <section className="mx-auto max-w-6xl px-6 py-12">
        {/* PRESENTACIÓN */}
        <div className="mb-10">
          <p className="mb-2 text-sm font-medium uppercase tracking-wider text-primary">
            Sistema SPING
          </p>

          <h1 className="font-heading text-4xl font-bold tracking-tight md:text-5xl">
            Dashboard SPING
          </h1>

          <p className="mt-3 max-w-2xl text-muted-foreground">
            Monitoreo y gestión inteligente del sistema de clasificación de
            residuos.
          </p>
        </div>

        {/* ESTADÍSTICAS */}
        <section id="estadisticas" className="mb-12">
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {/* USUARIOS */}
            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm transition-shadow hover:shadow-md">
              <div className="mb-4 flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">
                  Usuarios
                </span>

                <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-xl">
                  👤
                </div>
              </div>

              <p className="font-heading text-3xl font-bold">
                {totalUsuarios}
              </p>

              <p className="mt-1 text-sm text-muted-foreground">
                Usuarios registrados
              </p>
            </div>

            {/* RFID */}
            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm transition-shadow hover:shadow-md">
              <div className="mb-4 flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">
                  RFID
                </span>

                <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-xl">
                  📡
                </div>
              </div>

              <p className="font-heading text-3xl font-bold">
                {totalRfid}
              </p>

              <p className="mt-1 text-sm text-muted-foreground">
                Tarjetas registradas
              </p>
            </div>

            {/* CLASIFICACIONES */}
            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm transition-shadow hover:shadow-md">
              <div className="mb-4 flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">
                  Clasificaciones
                </span>

                <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-xl">
                  ♻
                </div>
              </div>

              <p className="font-heading text-3xl font-bold">
                {totalClasificaciones}
              </p>

              <p className="mt-1 text-sm text-muted-foreground">
                Residuos clasificados
              </p>
            </div>

            {/* PUNTOS */}
            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm transition-shadow hover:shadow-md">
              <div className="mb-4 flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">
                  Puntos
                </span>

                <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-xl">
                  ⭐
                </div>
              </div>

              <p className="font-heading text-3xl font-bold">
                {totalPuntos}
              </p>

              <p className="mt-1 text-sm text-muted-foreground">
                Puntos acumulados
              </p>
            </div>
          </div>
        </section>

        {/* ACTIVIDAD */}
        <section id="actividad">
          <div className="mb-5">
            <p className="text-sm font-medium uppercase tracking-wider text-primary">
              Monitoreo
            </p>

            <h2 className="mt-1 font-heading text-2xl font-bold">
              Actividad reciente
            </h2>

            <p className="mt-1 text-sm text-muted-foreground">
              Últimas clasificaciones registradas por SPING.
            </p>
          </div>

          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
            {ultimasClasificaciones.length === 0 ? (
              <div className="p-10 text-center">
                <div className="mb-3 text-4xl">♻</div>

                <h3 className="font-semibold">
                  No hay clasificaciones todavía
                </h3>

                <p className="mt-1 text-sm text-muted-foreground">
                  Cuando el sistema registre residuos aparecerán aquí.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-border bg-muted/40">
                    <tr className="text-left">
                      <th className="px-6 py-4 font-medium">
                        Usuario
                      </th>

                      <th className="px-6 py-4 font-medium">
                        Residuo
                      </th>

                      <th className="px-6 py-4 font-medium">
                        Humedad
                      </th>

                      <th className="px-6 py-4 font-medium">
                        Distancia
                      </th>

                      <th className="px-6 py-4 font-medium">
                        Motor
                      </th>

                      <th className="px-6 py-4 font-medium">
                        Puntos
                      </th>

                      <th className="px-6 py-4 font-medium">
                        Fecha
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {ultimasClasificaciones.map((clasificacion: any) => {
                      const usuario = Array.isArray(clasificacion.usuarios)
                        ? clasificacion.usuarios[0]
                        : clasificacion.usuarios;

                      return (
                        <tr
                          key={clasificacion.id}
                          className="border-b border-border last:border-0"
                        >
                          <td className="px-6 py-4">
                            <div>
                              <p className="font-medium">
                                {usuario?.nombre ?? 'Sin nombre'}
                              </p>

                              <p className="text-xs text-muted-foreground">
                                {usuario?.codigo_usuario ?? 'Sin código'}
                              </p>
                            </div>
                          </td>

                          <td className="px-6 py-4">
                            <span
                              className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                                clasificacion.tipo_residuo === 'HUMEDO'
                                  ? 'bg-primary/10 text-primary'
                                  : 'bg-muted text-foreground'
                              }`}
                            >
                              {clasificacion.tipo_residuo}
                            </span>
                          </td>

                          <td className="px-6 py-4">
                            {clasificacion.humedad ?? '--'} %
                          </td>

                          <td className="px-6 py-4">
                            {clasificacion.distancia ?? '--'} cm
                          </td>

                          <td className="px-6 py-4">
                            {clasificacion.direccion_motor ?? '--'}
                          </td>

                          <td className="px-6 py-4 font-semibold">
                            +{clasificacion.puntos_obtenidos}
                          </td>

                          <td className="px-6 py-4 text-muted-foreground">
                            {new Date(
                              clasificacion.fecha_hora
                            ).toLocaleString('es-CO')}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        {/* PIE */}
        <footer className="mt-12 border-t border-border pt-6 text-center text-sm text-muted-foreground">
          <p>
            SPING · Sistema inteligente para la gestión y clasificación de
            residuos.
          </p>
        </footer>
      </section>
    </main>
  );
}