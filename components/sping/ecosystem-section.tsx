import { ChevronRight } from 'lucide-react'
import { SectionHeading } from './section-heading'

const ECOSYSTEM = ['SPING Machine', 'SPING Card', 'SPING Points', 'SPING App / Web', 'Comunidad SPING']
const HABIT_LOOP = ['Acción', 'Recompensa', 'Motivación', 'Repetición', 'Hábito']

export function EcosystemSection() {
  return (
    <section aria-labelledby="ecosistema-title" className="border-t border-border">
      <div className="mx-auto grid max-w-6xl gap-12 px-6 py-24 lg:grid-cols-2">
        <SectionHeading
          id="ecosistema-title"
          eyebrow="SPING Points · SP"
          title="Más que una máquina: un ecosistema"
          description="Los SPING Points convierten cada reciclaje en una experiencia gamificada. No buscamos que se recicle solo por un premio: el incentivo es la puerta de entrada para construir un hábito ambiental."
        />
        <div className="flex flex-col gap-6">
          <ol className="flex flex-col gap-2">
            {ECOSYSTEM.map((item, index) => (
              <li
                key={item}
                className="flex items-center justify-between rounded-xl border border-border bg-card px-5 py-4"
                style={{ marginLeft: `${index * 12}px` }}
              >
                <span className="font-medium">{item}</span>
                <span className="font-mono text-xs text-primary">0{index + 1}</span>
              </li>
            ))}
          </ol>
          <div className="rounded-2xl border border-accent/30 bg-accent/10 p-5">
            <p className="mb-3 font-mono text-xs uppercase tracking-widest text-accent">Ciclo del hábito</p>
            <ol className="flex flex-wrap items-center gap-1 text-sm">
              {HABIT_LOOP.map((step, index) => (
                <li key={step} className="flex items-center gap-1">
                  {step}
                  {index < HABIT_LOOP.length - 1 && (
                    <ChevronRight className="size-4 text-accent" aria-hidden="true" />
                  )}
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </section>
  )
}
