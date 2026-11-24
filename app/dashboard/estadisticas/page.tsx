import { redirect } from 'next/navigation';
import { createAuthServerClient } from '@/lib/supabase/auth-server';
import { supabaseServer } from '@/lib/supabase/server';

export default async function EstadisticasPage() {
  const authClient = await createAuthServerClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  if (!user) redirect('/login');

  const { data: perfil, error: perfilError } = await supabaseServer
    .from('usuarios')
    .select('id, puntos_totales, rol, estado')
    .eq('auth_user_id', user.id)
    .maybeSingle();

  if (perfilError || !perfil || perfil.estado !== 'ACTIVO') redirect('/login');

  const esAdmin = perfil.rol === 'admin';
  const esUsuario = perfil.rol === 'user';
  if (!esAdmin && !esUsuario) redirect('/dashboard');

  const filtroUsuario = (query: any) =>
    esUsuario ? query.eq('usuario_id', perfil.id) : query;

  const [totalResult, humedoResult, secoResult, rechazoResult] =
    await Promise.all([
      filtroUsuario(
        supabaseServer
          .from('clasificaciones')
          .select('id', { count: 'exact', head: true })
      ),
      filtroUsuario(
        supabaseServer
          .from('clasificaciones')
          .select('id', { count: 'exact', head: true })
          .eq('tipo_residuo', 'HUMEDO')
      ),
      filtroUsuario(
        supabaseServer
          .from('clasificaciones')
          .select('id', { count: 'exact', head: true })
          .eq('tipo_residuo', 'SECO')
      ),
      filtroUsuario(
        supabaseServer
          .from('clasificaciones')
          .select('id', { count: 'exact', head: true })
          .eq('tipo_residuo', 'RECHAZO')
      ),
    ]);

  let totalUsuarios = 0;
  let totalRfid = 0;
  let totalPuntos = perfil.puntos_totales ?? 0;

  if (esAdmin) {
    const [usuariosResult, rfidResult, puntosResult] = await Promise.all([
      supabaseServer
        .from('usuarios')
        .select('id', { count: 'exact', head: true }),
      supabaseServer
        .from('rfid')
        .select('id', { count: 'exact', head: true }),
      supabaseServer.from('usuarios').select('puntos_totales'),
    ]);

    totalUsuarios = usuariosResult.count ?? 0;
    totalRfid = rfidResult.count ?? 0;
    totalPuntos =
      puntosResult.data?.reduce(
        (total, usuario) => total + (usuario.puntos_totales ?? 0),
        0
      ) ?? 0;
  }

  const indicadores = esAdmin
    ? [
        { etiqueta: 'Usuarios registrados', valor: totalUsuarios, icono: '👤' },
        { etiqueta: 'Tarjetas RFID', valor: totalRfid, icono: '📡' },
        {
          etiqueta: 'Clasificaciones',
          valor: totalResult.count ?? 0,
          icono: '♻️',
        },
        { etiqueta: 'Puntos acumulados', valor: totalPuntos, icono: '⭐' },
      ]
    : [
        {
          etiqueta: 'Mis clasificaciones',
          valor: totalResult.count ?? 0,
          icono: '♻️',
        },
        { etiqueta: 'Mis puntos', valor: totalPuntos, icono: '⭐' },
      ];

  const distribucion = [
    { etiqueta: 'Orgánicos', valor: humedoResult.count ?? 0, color: 'bg-emerald-500' },
    { etiqueta: 'Inorgánicos', valor: secoResult.count ?? 0, color: 'bg-sky-500' },
    { etiqueta: 'Rechazo', valor: rechazoResult.count ?? 0, color: 'bg-amber-500' },
  ];
  const totalDistribucion = distribucion.reduce((suma, item) => suma + item.valor, 0);

  return (
    <div className="mx-auto w-full max-w-[1440px] space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#8bbec6]">
          Análisis del sistema
        </p>
        <h1 className="font-heading text-3xl font-bold text-foreground">
          Estadísticas
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {esAdmin
            ? 'Indicadores generales de usuarios, tarjetas, puntos y clasificación de residuos.'
            : 'Consulta tus clasificaciones y el comportamiento de tus resultados.'}
        </p>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {indicadores.map((item) => (
          <article key={item.etiqueta} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">{item.etiqueta}</p>
              <span className="flex size-10 items-center justify-center rounded-xl bg-secondary text-xl">
                {item.icono}
              </span>
            </div>
            <p className="mt-4 font-heading text-3xl font-bold text-foreground">
              {item.valor.toLocaleString('es-CO')}
            </p>
          </article>
        ))}
      </section>

      <section className="rounded-2xl border border-border bg-card p-6">
        <div className="mb-6">
          <h2 className="font-heading text-xl font-semibold text-foreground">
            Clasificaciones por tipo de residuo
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Distribución de los registros disponibles en SPING.
          </p>
        </div>

        {totalDistribucion === 0 ? (
          <div className="rounded-xl border border-dashed border-border px-5 py-10 text-center">
            <p className="font-medium text-foreground">Todavía no hay datos para mostrar</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Las estadísticas aparecerán aquí cuando se registren clasificaciones.
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {distribucion.map((item) => {
              const porcentaje = totalDistribucion
                ? (item.valor / totalDistribucion) * 100
                : 0;
              return (
                <div key={item.etiqueta}>
                  <div className="mb-2 flex items-center justify-between gap-4 text-sm">
                    <span className="font-medium text-foreground">{item.etiqueta}</span>
                    <span className="text-muted-foreground">
                      {item.valor.toLocaleString('es-CO')} · {porcentaje.toFixed(1)}%
                    </span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-secondary">
                    <div
                      className={`h-full rounded-full ${item.color}`}
                      style={{ width: `${porcentaje}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
