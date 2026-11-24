import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createAuthServerClient } from '@/lib/supabase/auth-server';
import { supabaseServer } from '@/lib/supabase/server';
import { RfidRegistration } from '@/components/dashboard/rfid-registration';

export default async function DashboardPage() {
  // Verificar sesión activa.
  const supabaseAuth = await createAuthServerClient();
  const {
    data: { user },
  } = await supabaseAuth.auth.getUser();

  if (!user) redirect('/login');

  // Obtener el perfil SPING asociado a la sesión.
  const { data: perfil, error: perfilError } = await supabaseServer
    .from('usuarios')
    .select('id, codigo_usuario, nombre, puntos_totales, rol, estado')
    .eq('auth_user_id', user.id)
    .maybeSingle();

  if (perfilError || !perfil || perfil.estado !== 'ACTIVO') {
    redirect('/login');
  }

  const esAdmin = perfil.rol === 'admin';
  const esUsuario = perfil.rol === 'user';
  const esMantenimiento = perfil.rol === 'maintenance';

  let totalUsuarios = 0;
  let totalRfid = 0;
  let totalClasificaciones = 0;
  let totalPuntos = perfil.puntos_totales ?? 0;
  let tarjetaUsuario = null;

  if (esAdmin) {
    const [usuariosResult, rfidResult, clasificacionesResult, puntosResult] =
      await Promise.all([
        supabaseServer
          .from('usuarios')
          .select('id', { count: 'exact', head: true }),
        supabaseServer
          .from('rfid')
          .select('id', { count: 'exact', head: true }),
        supabaseServer
          .from('clasificaciones')
          .select('id', { count: 'exact', head: true }),
        supabaseServer.from('usuarios').select('puntos_totales'),
      ]);

    totalUsuarios = usuariosResult.count ?? 0;
    totalRfid = rfidResult.count ?? 0;
    totalClasificaciones = clasificacionesResult.count ?? 0;
    totalPuntos =
      puntosResult.data?.reduce(
        (total, usuario) => total + (usuario.puntos_totales ?? 0),
        0
      ) ?? 0;
  } else if (esUsuario) {
    const [tarjetaResult, clasificacionesResult] = await Promise.all([
      supabaseServer
        .from('rfid')
        .select('id, uid, estado, fecha_asignacion')
        .eq('usuario_id', perfil.id)
        .order('fecha_asignacion', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabaseServer
        .from('clasificaciones')
        .select('id', { count: 'exact', head: true })
        .eq('usuario_id', perfil.id),
    ]);

    tarjetaUsuario = tarjetaResult.data;
    totalClasificaciones = clasificacionesResult.count ?? 0;

    if (tarjetaResult.error) {
      console.error('Error consultando tarjeta RFID:', tarjetaResult.error.message);
    }
  }

  const indicadores = esAdmin
    ? [
        {
          etiqueta: 'Usuarios',
          valor: totalUsuarios,
          detalle: 'Usuarios registrados',
          icono: '👤',
        },
        {
          etiqueta: 'Tarjetas RFID',
          valor: totalRfid,
          detalle: 'Tarjetas en el inventario',
          icono: '📡',
        },
        {
          etiqueta: 'Clasificaciones',
          valor: totalClasificaciones,
          detalle: 'Residuos registrados',
          icono: '♻️',
        },
        {
          etiqueta: 'Puntos',
          valor: totalPuntos,
          detalle: 'Puntos acumulados por los usuarios',
          icono: '⭐',
        },
      ]
    : [
        {
          etiqueta: 'Mis clasificaciones',
          valor: totalClasificaciones,
          detalle: 'Residuos que he registrado',
          icono: '♻️',
        },
        {
          etiqueta: 'Mis puntos',
          valor: totalPuntos,
          detalle: 'Puntos acumulados en mi cuenta',
          icono: '⭐',
        },
      ];

  return (
    <div className="mx-auto w-full max-w-[1440px] space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      <section className="rounded-3xl border border-border bg-card p-6 shadow-sm sm:p-8">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#8bbec6]">
          Sistema SPING
        </p>

        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div>
            <h1 className="font-heading text-3xl font-bold text-foreground sm:text-4xl">
              {esAdmin
                ? 'Panel de administración'
                : esMantenimiento
                  ? 'Panel de mantenimiento'
                  : 'Mi Dashboard SPING'}
            </h1>
            <p className="mt-3 max-w-2xl text-sm text-muted-foreground sm:text-base">
              {esAdmin
                ? 'Bienvenido. Desde este panel puedes consultar el estado general de SPING y acceder a sus módulos desde el menú superior.'
                : esMantenimiento
                  ? `Bienvenido, ${perfil.nombre ?? 'personal de mantenimiento'}. Consulta tus tareas desde el módulo de mantenimiento.`
                  : `Bienvenido, ${perfil.nombre ?? 'usuario'}. Aquí puedes consultar un resumen de tu actividad en SPING.`}
            </p>
            {!esAdmin && (
              <p className="mt-3 text-sm text-muted-foreground">
                Código de usuario: {perfil.codigo_usuario}
              </p>
            )}
          </div>

          <span className="inline-flex w-fit rounded-full border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground">
            {esAdmin
              ? 'Administrador'
              : esMantenimiento
                ? 'Personal de mantenimiento'
                : 'Usuario SPING'}
          </span>
        </div>
      </section>

      {(esAdmin || esUsuario) && (
        <section aria-label="Resumen general" className="space-y-4">
          <div>
            <h2 className="font-heading text-xl font-bold text-foreground">
              Resumen general
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {esAdmin
                ? 'Indicadores principales del sistema.'
                : 'Un vistazo a tus resultados y puntos acumulados.'}
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {indicadores.map((indicador) => (
              <article
                key={indicador.etiqueta}
                className="rounded-2xl border border-border bg-card p-5 shadow-sm"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-muted-foreground">
                    {indicador.etiqueta}
                  </p>
                  <span className="flex size-10 items-center justify-center rounded-xl bg-secondary text-xl">
                    {indicador.icono}
                  </span>
                </div>
                <p className="mt-4 font-heading text-3xl font-bold text-foreground">
                  {indicador.valor.toLocaleString('es-CO')}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {indicador.detalle}
                </p>
              </article>
            ))}
          </div>
        </section>
      )}

      {esAdmin && (
        <section className="rounded-2xl border border-border bg-card p-6">
          <h2 className="font-heading text-lg font-semibold text-foreground">
            Administración de SPING
          </h2>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
            Los módulos de usuarios, inventario RFID y mantenimiento están disponibles desde las opciones del menú superior. Cada opción abre su propia página de trabajo.
          </p>
        </section>
      )}

      {esMantenimiento && (
        <section className="rounded-2xl border border-border bg-card p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-heading text-lg font-semibold text-foreground">
                Tus tareas de mantenimiento
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Ingresa al módulo para consultar y actualizar las tareas que tienes asignadas.
              </p>
            </div>
            <Link
              href="/dashboard/mantenimiento"
              className="inline-flex w-fit items-center justify-center rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
            >
              Ir a mantenimiento
            </Link>
          </div>
        </section>
      )}

      {esUsuario && <RfidRegistration tarjeta={tarjetaUsuario} />}
    </div>
  );
}
