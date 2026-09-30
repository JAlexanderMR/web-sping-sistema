import type { CycleStep, HardwareComponent } from '@/lib/domain/entities'
import { ComponentsVideo } from './components-video'
import { Icon } from './icon'
import { SectionHeading } from './section-heading'
import { SortingSimulator } from './sorting-simulator'

interface PrototypeSectionProps {
  hardware: HardwareComponent[]
  steps: CycleStep[]
}

export function PrototypeSection({ hardware, steps }: PrototypeSectionProps) {
  return (
    <section id="prototipo" aria-labelledby="prototipo-title" className="border-t border-border bg-card/40">
      <div className="mx-auto flex max-w-6xl flex-col gap-12 px-6 py-24">
        <SectionHeading
          id="prototipo-title"
          eyebrow="SPING 1.0 · Prototipo actual"
          title="Cómo funciona la máquina"
          description="Sensores, un Arduino Mega 2560 y un motorreductor de 9 V trabajan juntos para llevar cada residuo al compartimento correcto."
        />

        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {hardware.map((item) => (
            <li key={item.id} className="flex gap-4 rounded-2xl border border-border bg-background p-5">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent/15 text-accent">
                <Icon name={item.icon} className="size-5" />
              </span>
              <div>
                <p className="font-semibold">{item.name}</p>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{item.role}</p>
              </div>
            </li>
          ))}
        </ul>

        <ComponentsVideo />

        <SortingSimulator steps={steps} />
      </div>
    </section>
  )
}
