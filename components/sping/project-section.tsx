import { ArrowRight, CircleAlert } from 'lucide-react'
import type { Pillar, ProblemPerspective, ProjectIdentity } from '@/lib/domain/entities'
import { Icon } from './icon'
import { SectionHeading } from './section-heading'

interface ProjectSectionProps {
  identity: ProjectIdentity
  problems: ProblemPerspective[]
  pillars: Pillar[]
}

const USER_FLOW = ['Interactúa', 'Analiza', 'Clasifica', 'Registra', 'Recompensa', 'Hábito']

export function ProjectSection({ identity, problems, pillars }: ProjectSectionProps) {
  return (
    <section id="proyecto" aria-labelledby="proyecto-title" className="border-t border-border">
      <div className="mx-auto flex max-w-6xl flex-col gap-16 px-6 py-24">
        <div className="grid gap-10 lg:grid-cols-2">
          <SectionHeading
            id="proyecto-title"
            eyebrow="¿Qué es SPING?"
            title="Un giro inteligente a nuestra relación con los residuos"
            description={identity.summary}
          />
          <p className="self-end text-pretty leading-relaxed text-muted-foreground">
            {identity.nameConcept}
          </p>
        </div>

        <div className="flex flex-col gap-6">
          <h3 className="text-xl font-semibold">El problema</h3>
          <p className="max-w-3xl text-pretty text-2xl font-medium leading-snug md:text-3xl">
            ¿Cómo usar la tecnología para facilitar la separación de residuos y, al mismo tiempo,
            motivar mejores hábitos ambientales?
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            {problems.map((problem) => (
              <article key={problem.id} className="rounded-2xl border border-border bg-card p-6">
                <h4 className="mb-4 font-semibold text-accent">{problem.audience}</h4>
                <ul className="flex flex-col gap-3">
                  {problem.issues.map((issue) => (
                    <li key={issue} className="flex gap-3 text-sm text-muted-foreground">
                      <CircleAlert className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden="true" />
                      {issue}
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <h3 className="text-xl font-semibold">Nuestra solución</h3>
          <div className="grid gap-4 md:grid-cols-3">
            {pillars.map((pillar) => (
              <article
                key={pillar.id}
                className="flex flex-col gap-4 rounded-2xl border border-primary/20 bg-gradient-to-b from-primary/10 to-transparent p-6"
              >
                <span className="flex size-11 items-center justify-center rounded-xl bg-primary/15 text-primary">
                  <Icon name={pillar.icon} className="size-5" />
                </span>
                <h4 className="text-lg font-semibold">{pillar.title}</h4>
                <p className="text-sm leading-relaxed text-muted-foreground">{pillar.description}</p>
              </article>
            ))}
          </div>
          <ol className="flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-card p-4">
            {USER_FLOW.map((step, index) => (
              <li key={step} className="flex items-center gap-2 text-sm">
                <span className="rounded-full bg-secondary px-3 py-1 font-medium">{step}</span>
                {index < USER_FLOW.length - 1 && (
                  <ArrowRight className="size-4 text-primary" aria-hidden="true" />
                )}
              </li>
            ))}
          </ol>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <article className="rounded-2xl border border-border bg-card p-8">
            <span className="font-mono text-xs uppercase tracking-widest text-primary">Misión</span>
            <p className="mt-4 text-pretty leading-relaxed">{identity.mission}</p>
          </article>
          <article className="rounded-2xl border border-border bg-card p-8">
            <span className="font-mono text-xs uppercase tracking-widest text-accent">Visión</span>
            <p className="mt-4 text-pretty leading-relaxed">{identity.vision}</p>
          </article>
        </div>
      </div>
    </section>
  )
}
