
import { container } from '@/lib/container'
import { SiteHeader } from '@/components/sping/site-header'
import { HeroSection } from '@/components/sping/hero-section'
import { ProjectSection } from '@/components/sping/project-section'
import { PrototypeSection } from '@/components/sping/prototype-section'
import { EcosystemSection } from '@/components/sping/ecosystem-section'
import { VisionSection } from '@/components/sping/vision-section'
import { ValuesSection } from '@/components/sping/values-section'
import { TeamSection } from '@/components/sping/team-section'
import { ContactSection } from '@/components/sping/contact-section'
import { SiteFooter } from '@/components/sping/site-footer'

export default function Page() {
  const { identity, problems, pillars, values } = container.projectService.getOverview()
  const { hardware, steps } = container.prototypeService.getPrototype()
  const vision = container.futureService.getVision()
  const team = container.teamService.getTeam()
  const contact = container.contactService.getContact()

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#f7faf7] text-[#20352b] selection:bg-emerald-100 selection:text-emerald-950">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.10),transparent_35%),radial-gradient(circle_at_bottom_right,_rgba(34,197,94,0.07),transparent_25%)]" />

      <SiteHeader />

      <main className="mx-auto max-w-7xl px-4 pb-16 pt-6 sm:px-6 lg:px-8">
        <section className="rounded-[30px] border border-emerald-900/10 bg-white p-1 shadow-[0_20px_60px_rgba(23,61,49,0.08)]">
          <div className="rounded-[26px] bg-white">
            <HeroSection identity={identity} />
          </div>
        </section>

        <div className="mt-8 space-y-8">
          <ProjectSection identity={identity} problems={problems} pillars={pillars} />
          <PrototypeSection hardware={hardware} steps={steps} />
          <EcosystemSection />
          <VisionSection {...vision} />
          <ValuesSection values={values} />
          <TeamSection team={team} />
          <ContactSection {...contact} />
        </div>
      </main>

      <div className="mx-auto max-w-7xl px-4 pb-10 sm:px-6 lg:px-8">
        <SiteFooter identity={identity} />
      </div>
    </div>
  )
}
