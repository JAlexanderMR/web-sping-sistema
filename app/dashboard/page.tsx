
import { redirect } from 'next/navigation';
import { createAuthServerClient } from '@/lib/supabase/auth-server';
import { supabaseServer } from '@/lib/supabase/server';
import { LogoutButton } from '@/components/dashboard/logout-button';
import { RfidRegistration } from '@/components/dashboard/rfid-registration';
import RfidAssignment from '@/components/dashboard/rfid-assignment';
import { UserManagement } from '@/components/dashboard/user-management';
import { MaintenanceManagement } from '@/components/dashboard/maintenance-management';
import { MaintenanceTasks } from '@/components/dashboard/maintenance-tasks';

export default async function DashboardPage() {
  // 1. Verificar sesión
  const supabaseAuth = await createAuthServerClient();

  const {
    data: { user },
  } = await supabaseAuth.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // 2. Buscar perfil asociado a la cuenta
  const { data: perfil, error: perfilError } = await supabaseServer
    .from('usuarios')
    .select('id, codigo_usuario, nombre, puntos_totales, rol, estado')
    .eq('auth_user_id', user.id)
    .maybeSingle();

  if (perfilError || !perfil || perfil.estado !== 'ACTIVO') {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-6">
        <div className="max-w-md rounded-2xl border border-border bg-card p-8 text-center">
          <h1 className="font-heading text-2xl font-bold">
            Perfil no encontrado
          </h1>

          <p className="mt-3 text-sm text-muted-foreground">
            Tu cuenta inició sesión, pero no encontramos un perfil SPING
            asociado. Contacta al administrador.
          </p>

          <div className="mt-6">
            <LogoutButton />
          </div>
        </div>
      </main>
    );
  }

  // 3. Determinar rol
  const esAdmin = perfil.rol === 'admin';
  const esUsuario = perfil.rol === 'user';
  const esMantenimiento = perfil.rol === 'maintenance';

  // 4. Consultar tarjeta personal únicamente del usuario normal
  let tarjetaUsuario = null;

  if (esUsuario) {
    const { data: tarjeta, error: tarjetaError } = await supabaseServer
      .from('rfid')
      .select('id, uid, estado, fecha_asignacion')
      .eq('usuario_id', perfil.id)
      .order('fecha_asignacion', { ascending: false })
      .limit(1)
      .maybeSingle();

    tarjetaUsuario = tarjeta;

    if (tarjetaError) {
      console.error('Error consultando tarjeta RFID:', tarjetaError.message);
    }
  }

  // 5. Consultar información según el rol
  let totalUsuarios = 0;
  let totalRfid = 0;
  let totalClasificaciones = 0;
  let totalPuntos = 0;
  let ultimasClasificaciones: any[] = [];

  if (esAdmin) {
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
        .from('usuarios')
        .select('puntos_totales'),

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

    totalUsuarios = usuariosResult.count ?? 0;
    totalRfid = rfidResult.count ?? 0;
    totalClasificaciones = clasificacionesResult.count ?? 0;

    totalPuntos =
      puntosResult.data?.reduce(
        (total, usuario) => total + (usuario.puntos_totales ?? 0),
        0
      ) ?? 0;

    ultimasClasificaciones = ultimasResult.data ?? [];

  } else if (esUsuario) {
    const [
      rfidResult,
      clasificacionesResult,
      ultimasResult,
    ] = await Promise.all([
      supabaseServer
        .from('rfid')
        .select('id', { count: 'exact', head: true })
        .eq('usuario_id', perfil.id),

      supabaseServer
        .from('clasificaciones')
        .select('id', { count: 'exact', head: true })
        .eq('usuario_id', perfil.id),

      supabaseServer
        .from('clasificaciones')
        .select(`
          id,
          tipo_residuo,
          humedad,
          distancia,
          direccion_motor,
          puntos_obtenidos,
          fecha_hora
        `)
        .eq('usuario_id', perfil.id)
        .order('fecha_hora', { ascending: false })
        .limit(10),
    ]);

    totalRfid = rfidResult.count ?? 0;
    totalClasificaciones = clasificacionesResult.count ?? 0;
    totalPuntos = perfil.puntos_totales ?? 0;
    ultimasClasificaciones = ultimasResult.data ?? [];
  }

  // 6. Formatear tipo de residuo
  function nombreResiduo(tipo: string) {
    switch (tipo) {
      case 'HUMEDO':
        return 'ORGÁNICO';
      case 'SECO':
        return 'INORGÁNICO';
      case 'RECHAZO':
        return 'RECHAZO';
      default:
        return tipo ?? 'SIN CLASIFICAR';
    }
  }

  return (
    <main className="min-h-screen bg-background">

      {/* CONTENIDO PRINCIPAL */}
      <section className="mx-auto max-w-6xl px-6 py-12">

        {/* PRESENTACIÓN */}
        <div className="mb-10">
          <p className="mb-2 text-sm font-medium uppercase tracking-wider text-primary">
            Sistema SPING
          </p>

          <h1 className="font-heading text-4xl font-bold tracking-tight md:text-5xl">
            {esAdmin
              ? 'Panel de administración'
              : esMantenimiento
                ? 'Panel de mantenimiento'
                : 'Mi Dashboard SPING'}
          </h1>

          <p className="mt-3 max-w-2xl text-muted-foreground">
            {esAdmin
              ? 'Monitoreo y gestión general del sistema de clasificación de residuos.'
              : esMantenimiento
                ? `Bienvenido, ${perfil.nombre ?? 'personal de mantenimiento'}. Desde aquí podrás consultar y gestionar tus tareas asignadas.`
                : `Bienvenido, ${perfil.nombre ?? 'usuario'}. Consulta tus puntos y actividad en SPING.`}
          </p>

          {!esAdmin && (
            <p className="mt-2 text-sm text-muted-foreground">
              Código de usuario: {perfil.codigo_usuario}
            </p>
          )}

          <div className="mt-3 inline-flex rounded-full border border-border bg-card px-3 py-1 text-xs font-medium">
            {esAdmin
              ? 'Administrador'
              : esMantenimiento
                ? 'Personal de mantenimiento'
                : 'Usuario SPING'}
          </div>
        </div>

        {/* GESTIÓN DE USUARIOS: SOLO ADMINISTRADOR */}
        {esAdmin && <UserManagement />}

        {/* ASIGNACIÓN RFID: SOLO ADMINISTRADOR */}
        {esAdmin && <RfidAssignment />}

        {/* GESTIÓN DE MANTENIMIENTO: SOLO ADMINISTRADOR */}
        {esAdmin && <MaintenanceManagement />}

        {/* BANDEJA DE TAREAS: SOLO PERSONAL DE MANTENIMIENTO */}
        {esMantenimiento && <MaintenanceTasks />}

        {/* TARJETA PERSONAL: SOLO USUARIO NORMAL */}
        {esUsuario && (
          <RfidRegistration tarjeta={tarjetaUsuario ?? null} />
        )}

        {/* ESTADÍSTICAS: ADMINISTRADOR Y USUARIO */}
        {(esAdmin || esUsuario) && (
          <section id="estadisticas" className="mb-12">
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">

              {/* USUARIOS: SOLO ADMIN */}
              {esAdmin && (
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
              )}

              {/* RFID */}
              <div className="rounded-2xl border border-border bg-card p-6 shadow-sm transition-shadow hover:shadow-md">
                <div className="mb-4 flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">
                    {esAdmin ? 'RFID' : 'Mi tarjeta RFID'}
                  </span>

                  <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-xl">
                    📡
                  </div>
                </div>

                <p className="font-heading text-3xl font-bold">
                  {totalRfid}
                </p>

                <p className="mt-1 text-sm text-muted-foreground">
                  {esAdmin
                    ? 'Tarjetas registradas'
                    : 'Tarjetas asociadas a mi cuenta'}
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
                  {esAdmin
                    ? 'Residuos registrados'
                    : 'Mis residuos registrados'}
                </p>
              </div>

              {/* PUNTOS */}
              <div className="rounded-2xl border border-border bg-card p-6 shadow-sm transition-shadow hover:shadow-md">
                <div className="mb-4 flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">
                    {esAdmin ? 'Puntos' : 'Mis puntos'}
                  </span>

                  <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-xl">
                    ⭐
                  </div>
                </div>

                <p className="font-heading text-3xl font-bold">
                  {totalPuntos}
                </p>

                <p className="mt-1 text-sm text-muted-foreground">
                  {esAdmin
                    ? 'Puntos acumulados'
                    : 'Puntos acumulados en mi cuenta'}
                </p>
              </div>
            </div>
          </section>
        )}

        {/* ACTIVIDAD */}
        {(esAdmin || esUsuario) && (
          <section id="actividad">
            <div className="mb-5">
              <p className="text-sm font-medium uppercase tracking-wider text-primary">
                {esAdmin ? 'Monitoreo general' : 'Mi actividad'}
              </p>

              <h2 className="mt-1 font-heading text-2xl font-bold">
                Actividad reciente
              </h2>

              <p className="mt-1 text-sm text-muted-foreground">
                {esAdmin
                  ? 'Últimas clasificaciones registradas por todos los usuarios.'
                  : 'Últimas clasificaciones registradas en tu cuenta.'}
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
                    Cuando se registren residuos aparecerán aquí.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b border-border bg-muted/40">
                      <tr className="text-left">
                        {esAdmin && (
                          <th className="px-6 py-4 font-medium">
                            Usuario
                          </th>
                        )}

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
                            {esAdmin && (
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
                            )}

                            <td className="px-6 py-4">
                              <span
                                className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                                  clasificacion.tipo_residuo === 'HUMEDO'
                                    ? 'bg-primary/10 text-primary'
                                    : clasificacion.tipo_residuo === 'RECHAZO'
                                      ? 'bg-yellow-500/10 text-yellow-600'
                                      : 'bg-muted text-foreground'
                                }`}
                              >
                                {nombreResiduo(clasificacion.tipo_residuo)}
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
        )}

        {/* PIE */}
        <footer className="mt-12 border-t border-border pt-6 text-center text-sm text-muted-foreground">
          <p>
            SPING · Sistema inteligente para la gestión y clasificación de residuos.
          </p>
        </footer>
      </section>
    </main>
  );
}
