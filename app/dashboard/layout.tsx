
import { redirect } from 'next/navigation';
import { createAuthServerClient } from '@/lib/supabase/auth-server';
import { supabaseServer } from '@/lib/supabase/server';
import { DashboardNavigation } from '@/components/dashboard/dashboard-navigation';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const authClient = await createAuthServerClient();

  const {
    data: { user },
  } = await authClient.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: perfil, error } = await supabaseServer
    .from('usuarios')
    .select('nombre, rol, estado')
    .eq('auth_user_id', user.id)
    .maybeSingle();

  if (error || !perfil || perfil.estado !== 'ACTIVO') {
    redirect('/login');
  }

  const esAdmin = perfil.rol === 'admin';
  const esMantenimiento = perfil.rol === 'maintenance';
  const esUsuario = perfil.rol === 'user';

  const enlaces = [
    {
      nombre: 'Dashboard',
      ruta: '/dashboard',
      visible: true,
    },
    {
      nombre: 'Usuarios',
      ruta: '/dashboard/usuarios',
      visible: esAdmin,
    },
    {
      nombre: 'Asignar RFID',
      ruta: '/dashboard/rfid',
      visible: esAdmin,
    },
    {
      nombre: 'Mantenimiento',
      ruta: '/dashboard/mantenimiento',
      visible: esAdmin || esMantenimiento,
    },
    {
      nombre: 'Estadísticas',
      ruta: '/dashboard/estadisticas',
      visible: esAdmin || esUsuario,
    },
    {
      nombre: 'Actividad',
      ruta: '/dashboard/actividad',
      visible: esAdmin || esUsuario,
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <DashboardNavigation enlaces={enlaces} />

      <main className="min-h-[calc(100vh-64px)]">
        {children}
      </main>

      <footer className="mx-auto max-w-[1440px] border-t border-border px-6 py-6 text-center text-sm text-muted-foreground">
        SPING · Sistema inteligente para la gestión y clasificación de residuos.
      </footer>
    </div>
  );
}
