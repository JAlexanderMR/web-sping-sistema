
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LogoutButton } from '@/components/dashboard/logout-button';

type Enlace = {
  nombre: string;
  ruta: string;
  visible: boolean;
};

export function DashboardNavigation({
  enlaces,
}: {
  enlaces: Enlace[];
}) {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 shadow-sm backdrop-blur-xl">
      <nav className="mx-auto flex min-h-16 max-w-[1440px] items-center justify-between gap-4 px-4 sm:px-6">

        {/* LOGOTIPO: REGRESAR A LA PÁGINA PÚBLICA */}
        <Link
          href="/"
          aria-label="Volver a la página principal de SPING"
          title="Volver al inicio de SPING"
          className="flex shrink-0 items-center gap-2 font-heading text-lg font-bold transition-opacity hover:opacity-80"
        >
          <span className="flex size-9 items-center justify-center rounded-full bg-primary text-primary-foreground">
            ♻
          </span>
          SPING
        </Link>

        {/* NAVEGACIÓN */}
        <div className="flex flex-1 items-center justify-center gap-1 overflow-x-auto">
          {enlaces
            .filter((enlace) => enlace.visible)
            .map((enlace) => {
              const activo = pathname === enlace.ruta;

              return (
                <Link
                  key={enlace.ruta}
                  href={enlace.ruta}
                  aria-current={activo ? 'page' : undefined}
                  className={`relative whitespace-nowrap rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                    activo
                      ? 'bg-primary/20 text-[#8bbec6]'
                      : 'text-muted-foreground hover:bg-card hover:text-foreground'
                  }`}
                >
                  {enlace.nombre}

                  {activo && (
                    <span className="absolute inset-x-3 -bottom-[9px] h-0.5 rounded-full bg-[#8bbec6]" />
                  )}
                </Link>
              );
            })}
        </div>

        {/* CERRAR SESIÓN */}
        <div className="shrink-0">
          <LogoutButton />
        </div>
      </nav>
    </header>
  );
}
