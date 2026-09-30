import type { CoreValue } from '@/lib/domain/entities'
import { Icon } from './icon'
import { SectionHeading } from './section-heading'

export function ValuesSection({ values }: { values: CoreValue[] }) {
  return (
    <section aria-labelledby="valores-title" className="border-t border-border">
      <div className="mx-auto flex max-w-6xl flex-col gap-12 px-6 py-24">
        <SectionHeading id="valores-title" eyebrow="Lo que nos mueve" title="Valores de SPING" />
        <ul className="grid gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
          {values.map((value) => (
            <li key={value.id} className="flex flex-col gap-3 bg-background p-6">
              <Icon name={value.icon} className="size-6 text-primary" />
              <h3 className="font-semibold">{value.title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{value.description}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
