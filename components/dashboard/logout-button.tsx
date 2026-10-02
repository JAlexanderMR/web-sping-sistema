'use client';

import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';

export function LogoutButton() {
  const router = useRouter();

  async function cerrarSesion() {
    await supabase.auth.signOut();

    router.push('/login');
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={cerrarSesion}
      className="rounded-full border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
    >
      Cerrar sesión
    </button>
  );
}