import { redirect } from 'next/navigation';
import { createAuthServerClient } from '@/lib/supabase/auth-server';
import { supabaseServer } from '@/lib/supabase/server';
import { UserManagement } from '@/components/dashboard/user-management';

export default async function UsuariosPage() {
  const authClient = await createAuthServerClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  if (!user) redirect('/login');

  const { data: perfil, error } = await supabaseServer
    .from('usuarios')
    .select('rol, estado')
    .eq('auth_user_id', user.id)
    .maybeSingle();

  if (error || !perfil || perfil.estado !== 'ACTIVO') redirect('/login');
  if (perfil.rol !== 'admin') redirect('/dashboard');

  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 py-8 sm:px-6 lg:px-8">
      <UserManagement />
    </div>
  );
}
