import { Check } from 'lucide-react'
import type {
  AudienceStage,
  GoalGroup,
  ImpactArea,
  IndustryPlan,
  ReleaseStatus,
  RoadmapRelease,
} from '@/lib/domain/entities'
import { cn } from '@/lib/utils'
import { Icon } from './icon'
import { IndustryPlans } from './industry-plans'
import { SectionHeading } from './section-heading'

interface VisionSectionProps {
  roadmap: RoadmapRelease[]
  stages: AudienceStage[]
  goals: GoalGroup[]
  impact: ImpactArea[]
  industryPlans: IndustryPlan[]
}

const STATUS_LABEL: Record<ReleaseStatus, string> = {
  actual: 'Actual',
  proximo: 'Próximo',
  futuro: 'Futuro',
}

export function VisionSection({ roadmap, stages, goals, impact, industryPlans }: VisionSectionProps) {
  return (
    <section id="vision" aria-labelledby="vision-title" className="border-t border-border bg-card/40">
      <div className="mx-auto flex max-w-6xl flex-col gap-16 px-6 py-24">
        <SectionHeading
          id="vision-title"
          eyebrow="Visión a futuro"
          title="Del colegio a la industria"
          description="Nuestro objetivo no termina en el prototipo. SPING proyecta evolucionar hacia sistemas capaces de identificar y separar distintos materiales en hogares, instituciones e industrias."
        />

        <ol className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {roadmap.map((release) => (
            <li
              key={release.version}
              className={cn(
                'flex flex-col gap-4 rounded-2xl border p-6',
                release.status === 'actual' ? 'border-primary bg-primary/10' : 'border-border bg-background',
              )}
            >
              <div className="flex items-center justify-between">
                <span className="font-heading text-3xl font-bold text-gradient">{release.version}</span>
                <span
                  className={cn(
                    'rounded-full px-2.5 py-0.5 text-xs font-medium',
                    release.status === 'actual'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-muted-foreground',
                  )}
                >
                  {STATUS_LABEL[release.status]}
                </span>
              </div>
              <h3 className="font-semibold">{release.title}</h3>
              <ul className="flex flex-col gap-2">
                {release.features.map((feature) => (
                  <li key={feature} className="flex gap-2 text-sm text-muted-foreground">
                    <Check className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                    {feature}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>

        <IndustryPlans plans={industryPlans} />

        <div className="flex flex-col gap-6">
          <h3 className="text-xl font-semibold">Etapas de crecimiento</h3>
          <ol className="grid gap-4 md:grid-cols-4">
            {stages.map((stage) => (
              <li key={stage.id} className="relative flex flex-col gap-3 rounded-2xl border border-border bg-background p-6">
                <div className="flex items-center gap-3">
                  <span className="flex size-10 items-center justify-center rounded-full bg-accent/15 text-accent">
                    <Icon name={stage.icon} className="size-5" />
                  </span>
                  <span className="font-mono text-xs text-muted-foreground">Etapa {stage.stage}</span>
                </div>
                <h4 className="text-lg font-semibold">{stage.title}</h4>
                <p className="text-sm text-muted-foreground">{stage.audience}</p>
                <p className="text-sm text-foreground/90">{stage.goal}</p>
              </li>
            ))}
          </ol>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {goals.map((group) => (
            <article key={group.horizon} className="rounded-2xl border border-border bg-background p-6">
              <h4 className="mb-4 font-mono text-xs uppercase tracking-widest text-primary">{group.label}</h4>
              <ul className="flex flex-col gap-3">
                {group.goals.map((goal) => (
                  <li key={goal} className="border-l-2 border-primary/40 pl-3 text-sm">
                    {goal}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>

        <dl className="grid gap-4 rounded-2xl border border-border bg-background p-6 sm:grid-cols-2 lg:grid-cols-4">
          {impact.map((area) => (
            <div key={area.id} className="flex flex-col gap-1">
              <dt className="font-heading font-semibold text-accent">Impacto {area.title.toLowerCase()}</dt>
              <dd className="text-sm text-muted-foreground">{area.description}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  )
}
