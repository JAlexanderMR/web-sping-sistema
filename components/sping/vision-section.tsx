
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

export function VisionSection({
  roadmap,
  stages,
  goals,
  impact,
  industryPlans,
}: VisionSectionProps) {
  return (
    <section
      id="vision"
      aria-labelledby="vision-title"
      className="border-t border-[#8bbec6]/20 bg-[#0b2026]"
    >
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
                'flex flex-col gap-4 rounded-2xl border p-6 transition-all duration-200 hover:-translate-y-1 hover:border-[#8bbec6]/50',
                release.status === 'actual'
                  ? 'border-[#8bbec6]/40 bg-[#10364b]'
                  : 'border-[#8bbec6]/20 bg-[#0b2a3c]',
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-heading text-3xl font-bold text-[#8bbec6]">
                  {release.version}
                </span>

                <span
                  className={cn(
                    'rounded-full border px-2.5 py-1 text-xs font-medium',
                    release.status === 'actual'
                      ? 'border-[#8bbec6]/30 bg-[#1d5550] text-[#fff7dc]'
                      : 'border-[#8bbec6]/20 bg-[#10364b] text-[#b7d2d6]',
                  )}
                >
                  {STATUS_LABEL[release.status]}
                </span>
              </div>

              <h3 className="font-semibold text-[#fff7dc]">
                {release.title}
              </h3>

              <ul className="flex flex-col gap-2">
                {release.features.map((feature) => (
                  <li
                    key={feature}
                    className="flex gap-2 text-sm leading-relaxed text-[#b7d2d6]"
                  >
                    <Check
                      className="mt-0.5 size-4 shrink-0 text-[#8bbec6]"
                      aria-hidden="true"
                    />
                    {feature}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>

        <IndustryPlans plans={industryPlans} />

        <div className="flex flex-col gap-6">
          <h3 className="text-xl font-semibold text-[#fff7dc]">
            Etapas de crecimiento
          </h3>

          <ol className="grid gap-4 md:grid-cols-4">
            {stages.map((stage) => (
              <li
                key={stage.id}
                className="relative flex flex-col gap-3 rounded-2xl border border-[#8bbec6]/20 bg-[#10364b] p-6 transition-all duration-200 hover:-translate-y-1 hover:border-[#8bbec6]/50"
              >
                <div className="flex items-center gap-3">
                  <span className="flex size-10 items-center justify-center rounded-full border border-[#8bbec6]/20 bg-[#1d5550] text-[#8bbec6]">
                    <Icon name={stage.icon} className="size-5 text-[#8bbec6]" />
                  </span>

                  <span className="font-mono text-xs text-[#8bbec6]">
                    Etapa {stage.stage}
                  </span>
                </div>

                <h4 className="text-lg font-semibold text-[#fff7dc]">
                  {stage.title}
                </h4>

                <p className="text-sm text-[#b7d2d6]">
                  {stage.audience}
                </p>

                <p className="text-sm leading-relaxed text-[#d1e4e6]">
                  {stage.goal}
                </p>
              </li>
            ))}
          </ol>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {goals.map((group) => (
            <article
              key={group.horizon}
              className="rounded-2xl border border-[#8bbec6]/20 bg-[#10364b] p-6 transition-colors hover:border-[#8bbec6]/40"
            >
              <h4 className="mb-4 font-mono text-xs uppercase tracking-widest text-[#8bbec6]">
                {group.label}
              </h4>

              <ul className="flex flex-col gap-3">
                {group.goals.map((goal) => (
                  <li
                    key={goal}
                    className="border-l-2 border-[#8bbec6]/50 pl-3 text-sm leading-relaxed text-[#d1e4e6]"
                  >
                    {goal}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>

        <dl className="grid gap-4 rounded-2xl border border-[#8bbec6]/25 bg-[#10364b] p-6 sm:grid-cols-2 lg:grid-cols-4">
          {impact.map((area) => (
            <div key={area.id} className="flex flex-col gap-2">
              <dt className="font-heading font-semibold text-[#8bbec6]">
                Impacto {area.title.toLowerCase()}
              </dt>

              <dd className="text-sm leading-relaxed text-[#b7d2d6]">
                {area.description}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  )
}
