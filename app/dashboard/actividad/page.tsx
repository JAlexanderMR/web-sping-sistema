import { redirect } from 'next/navigation';
import { createAuthServerClient } from '@/lib/supabase/auth-server';
import { supabaseServer } from '@/lib/supabase/server';

export default async function ActividadPage() {
  const authClient = await createAuthServerClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  if (!user) redirect('/login');

  const { data: perfil, error: perfilError } = await supabaseServer
    .from('usuarios')
    .select('id, rol, estado')
    .eq('auth_user_id', user.id)
    .maybeSingle();

  if (perfilError || !perfil || perfil.estado !== 'ACTIVO') redirect('/login');

  const esAdmin = perfil.rol === 'admin';
  const esUsuario = perfil.rol === 'user';
  if (!esAdmin && !esUsuario) redirect('/dashboard');

  let actividades: any[] = [];

  if (esAdmin) {
    const { data, error } = await supabaseServer
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
      .limit(50);

    if (error) {
      console.error('Error consultando actividad:', error.message);
    } else {
      actividades = data ?? [];
    }
  } else {
    const { data, error } = await supabaseServer
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
      .limit(50);

    if (error) {
      console.error('Error consultando actividad:', error.message);
    } else {
      actividades = data ?? [];
    }
  }

  function nombreResiduo(tipo: string | null) {
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
    <div className="mx-auto w-full max-w-[1440px] space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#8bbec6]">
          Seguimiento del sistema
        </p>
        <h1 className="font-heading text-3xl font-bold text-foreground">
          Registro de actividad
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {esAdmin
            ? 'Últimas 50 clasificaciones registradas por los usuarios de SPING.'
            : 'Tus últimas 50 clasificaciones registradas en SPING.'}
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        {actividades.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <div className="mb-4 text-4xl">♻️</div>
            <h2 className="font-heading text-lg font-semibold text-foreground">
              No hay actividad todavía
            </h2>
            <p className="mx-auto mt-2 max-w-lg text-sm text-muted-foreground">
              Cuando se registren clasificaciones, aparecerán en este historial.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-secondary/60">
                <tr className="text-left">
                  {esAdmin && <th className="px-5 py-4 font-semibold">Usuario</th>}
                  <th className="px-5 py-4 font-semibold">Residuo</th>
                  <th className="px-5 py-4 font-semibold">Humedad</th>
                  <th className="px-5 py-4 font-semibold">Distancia</th>
                  <th className="px-5 py-4 font-semibold">Motor</th>
                  <th className="px-5 py-4 font-semibold">Puntos</th>
                  <th className="px-5 py-4 font-semibold">Fecha</th>
                </tr>
              </thead>
              <tbody>
                {actividades.map((actividad) => {
                  const usuario = Array.isArray(actividad.usuarios)
                    ? actividad.usuarios[0]
                    : actividad.usuarios;

                  return (
                    <tr key={actividad.id} className="border-b border-border last:border-0">
                      {esAdmin && (
                        <td className="px-5 py-4">
                          <p className="font-medium text-foreground">
                            {usuario?.nombre ?? 'Sin nombre'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {usuario?.codigo_usuario ?? 'Sin código'}
                          </p>
                        </td>
                      )}
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                            actividad.tipo_residuo === 'HUMEDO'
                              ? 'bg-emerald-500/10 text-emerald-600'
                              : actividad.tipo_residuo === 'RECHAZO'
                                ? 'bg-amber-500/10 text-amber-600'
                                : 'bg-secondary text-foreground'
                          }`}
                        >
                          {nombreResiduo(actividad.tipo_residuo)}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-muted-foreground">
                        {actividad.humedad ?? '--'} %
                      </td>
                      <td className="px-5 py-4 text-muted-foreground">
                        {actividad.distancia ?? '--'} cm
                      </td>
                      <td className="px-5 py-4 text-muted-foreground">
                        {actividad.direccion_motor ?? '--'}
                      </td>
                      <td className="px-5 py-4 font-semibold text-foreground">
                        +{actividad.puntos_obtenidos ?? 0}
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-muted-foreground">
                        {actividad.fecha_hora
                          ? new Date(actividad.fecha_hora).toLocaleString('es-CO', {
                              timeZone: 'America/Bogota',
                            })
                          : '--'}
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
  );
}
