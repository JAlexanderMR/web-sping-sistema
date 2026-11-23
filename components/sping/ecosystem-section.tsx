
import { ChevronRight, Leaf, Recycle, Sparkles } from 'lucide-react'
import { SectionHeading } from './section-heading'

const ECOSYSTEM = [
  'SPING Machine',
  'SPING Card',
  'SPING Points',
  'SPING App / Web',
  'Comunidad SPING',
]

const HABIT_LOOP = [
  'Acción',
  'Recompensa',
  'Motivación',
  'Repetición',
  'Hábito',
]

export function EcosystemSection() {
  return (
    <section
      aria-labelledby="ecosistema-title"
      className="rounded-3xl border border-[#8bbec6]/20 bg-gradient-to-br from-[#0b2a3c] via-[#0b2026] to-[#10364b] shadow-[0_12px_35px_rgba(0,0,0,0.20)]"
    >
      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-16 lg:grid-cols-2 lg:gap-12 lg:py-20">
        <SectionHeading
          id="ecosistema-title"
          eyebrow="SPING Points · SP"
          title="Más que una máquina: un ecosistema"
          description="Los SPING Points convierten cada reciclaje en una experiencia gamificada. No buscamos que se recicle solo por un premio: el incentivo es la puerta de entrada para construir un hábito ambiental."
        />

        <div className="flex flex-col gap-6">
          <ol className="flex flex-col gap-3">
            {ECOSYSTEM.map((item, index) => (
              <li
                key={item}
                className="group flex items-center justify-between gap-4 rounded-2xl border border-[#8bbec6]/20 bg-[#10364b] px-5 py-4 shadow-[0_3px_12px_rgba(0,0,0,0.12)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#8bbec6]/50 hover:bg-[#0b2a3c] hover:shadow-[0_8px_20px_rgba(0,0,0,0.20)]"
                style={{ marginLeft: `${index * 8}px` }}
              >
                <span className="flex items-center gap-3 font-medium text-[#fff7dc]">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-[#8bbec6]/20 bg-[#0b2a3c] text-[#8bbec6] transition-colors group-hover:bg-[#1d5550]">
                    {index === 0 ? (
                      <Recycle className="size-4" aria-hidden="true" />
                    ) : index === 1 ? (
                      <Leaf className="size-4" aria-hidden="true" />
                    ) : index === 2 ? (
                      <Sparkles className="size-4" aria-hidden="true" />
                    ) : (
                      <ChevronRight className="size-4" aria-hidden="true" />
                    )}
                  </span>
                  {item}
                </span>

                <span className="font-mono text-xs font-semibold text-[#8bbec6]">
                  0{index + 1}
                </span>
              </li>
            ))}
          </ol>

          <div className="rounded-2xl border border-[#8bbec6]/25 bg-[#10364b] p-5 shadow-[0_4px_14px_rgba(0,0,0,0.15)]">
            <p className="mb-4 font-mono text-xs font-semibold uppercase tracking-widest text-[#8bbec6]">
              Ciclo del hábito
            </p>

            <ol className="flex flex-wrap items-center gap-x-2 gap-y-3 text-sm font-medium text-[#fff7dc]">
              {HABIT_LOOP.map((step, index) => (
                <li key={step} className="flex items-center gap-2">
                  <span className="rounded-full border border-[#8bbec6]/25 bg-[#0b2a3c] px-3 py-1.5 transition-colors hover:bg-[#1d5550]">
                    {step}
                  </span>

                  {index < HABIT_LOOP.length - 1 && (
                    <ChevronRight
                      className="size-4 text-[#8bbec6]"
                      aria-hidden="true"
                    />
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
