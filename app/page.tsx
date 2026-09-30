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
    <>
      <SiteHeader />
      <main>
        <HeroSection identity={identity} />
        <ProjectSection identity={identity} problems={problems} pillars={pillars} />
        <PrototypeSection hardware={hardware} steps={steps} />
        <EcosystemSection />
        <VisionSection {...vision} />
        <ValuesSection values={values} />
        <TeamSection team={team} />
        <ContactSection {...contact} />
      </main>
      <SiteFooter identity={identity} />
    </>
  )
}
