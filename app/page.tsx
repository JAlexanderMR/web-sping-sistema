
import { container } from '@/lib/container'
import { SiteHeader } from '@/components/sping/site-header'
import { HeroSection } from '@/components/sping/hero-section'
import { SiteFooter } from '@/components/sping/site-footer'

export default function Page() {
  const { identity } = container.projectService.getOverview()

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#041d22] text-[#fff7dc] selection:bg-[#2a7a9e] selection:text-white">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,_rgba(42,122,158,0.16),transparent_35%),radial-gradient(circle_at_bottom_right,_rgba(29,85,80,0.14),transparent_25%)]" />

      <SiteHeader />

      <main className="mx-auto max-w-7xl px-4 pb-16 pt-6 sm:px-6 lg:px-8">
        {/* Presentación principal */}
        <section className="overflow-hidden rounded-[30px] border border-[#8bbec6]/20 bg-[#0b2026] shadow-[0_20px_60px_rgba(0,0,0,0.25)]">
          <HeroSection identity={identity} />
        </section>

        {/* Novedades y actualidad */}
        <section
          id="novedades"
          className="mt-12 overflow-hidden rounded-3xl border border-[#8bbec6]/20 bg-gradient-to-br from-[#10364b] via-[#0b2026] to-[#0b2a3c] p-6 shadow-[0_12px_35px_rgba(0,0,0,0.20)] md:p-10"
        >
          <div className="mb-8">
            <p className="mb-3 font-mono text-xs font-semibold uppercase tracking-[0.2em] text-[#8bbec6]">
              Actualidad SPING
            </p>

            <h2 className="text-3xl font-bold tracking-tight text-[#fff7dc] md:text-4xl">
              ¿Qué está pasando con SPING?
            </h2>

            <p className="mt-4 max-w-2xl leading-relaxed text-[#b7d2d6] md:text-lg">
              Este es nuestro espacio para compartir los avances del proyecto,
              eventos, participaciones, nuevas mejoras y experiencias que
              construyen la historia de SPING.
            </p>
          </div>

          <div className="rounded-2xl border border-dashed border-[#8bbec6]/30 bg-[#041d22]/50 px-6 py-12 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-[#8bbec6]/20 bg-[#10364b]">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="26"
                height="26"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#8bbec6"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="4" width="18" height="16" rx="2" />
                <path d="M8 2v4M16 2v4M3 10h18M8 15h.01M12 15h.01M16 15h.01" />
              </svg>
            </div>

            <h3 className="text-xl font-semibold text-[#fff7dc]">
              Próximamente, novedades de SPING
            </h3>

            <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-[#b7d2d6]">
              Estamos preparando este espacio para compartir nuestros próximos
              avances, actividades y experiencias. ¡Mantente al tanto!
            </p>
          </div>
        </section>
      </main>

      <div className="mx-auto max-w-7xl px-4 pb-10 sm:px-6 lg:px-8">
        <SiteFooter identity={identity} />
      </div>
    </div>
  )
}
