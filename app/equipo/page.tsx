
import { container } from '@/lib/container'
import { SiteHeader } from '@/components/sping/site-header'
import { TeamSection } from '@/components/sping/team-section'
import { SiteFooter } from '@/components/sping/site-footer'

export default function EquipoPage() {
  const team = container.teamService.getTeam()
  const identity = container.projectService.getOverview().identity

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#041d22] text-[#fff7dc] selection:bg-[#2a7a9e] selection:text-white">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,_rgba(42,122,158,0.16),transparent_35%),radial-gradient(circle_at_bottom_right,_rgba(29,85,80,0.14),transparent_25%)]" />

      <SiteHeader />

      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="relative mb-8 overflow-hidden rounded-3xl border border-[#8bbec6]/25 bg-gradient-to-br from-[#10364b] via-[#0b2026] to-[#0b2a3c] p-8 shadow-[0_12px_35px_rgba(0,0,0,0.20)] md:p-12">
          <div className="bg-grid pointer-events-none absolute inset-0 opacity-30 [mask-image:radial-gradient(ellipse_at_top_right,black,transparent_70%)]" />

          <div className="relative">
            <p className="mb-3 font-mono text-xs font-semibold uppercase tracking-widest text-[#8bbec6]">
              Las personas detrás de la idea
            </p>

            <h1 className="max-w-3xl text-4xl font-bold tracking-tight text-[#fff7dc] md:text-5xl">
              Conoce al equipo SPING
            </h1>

            <p className="mt-5 max-w-2xl text-lg leading-relaxed text-[#b7d2d6]">
              Somos un equipo que apuesta por la creatividad, la tecnología
              y el compromiso ambiental para promover nuevas formas de reciclar.
            </p>
          </div>
        </div>

        <div className="overflow-hidden rounded-3xl border border-[#8bbec6]/20 bg-[#0b2026] shadow-[0_12px_35px_rgba(0,0,0,0.20)]">
          <TeamSection team={team} />
        </div>
      </main>

      <div className="mx-auto max-w-7xl px-4 pb-10 sm:px-6 lg:px-8">
        <SiteFooter identity={identity} />
      </div>
    </div>
  )
}
