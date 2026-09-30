import type { IndustryPlan } from '@/lib/domain/entities'
import { Icon } from './icon'

export function IndustryPlans({ plans }: { plans: IndustryPlan[] }) {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-primary/30 bg-gradient-to-br from-forest/40 via-background to-steel/30 p-8 md:p-10">
      <div className="bg-grid absolute inset-0 opacity-40 [mask-image:radial-gradient(ellipse_at_top_right,black,transparent_70%)]" />
      <div className="relative flex flex-col gap-8">
        <div className="flex max-w-2xl flex-col gap-3">
          <span className="font-mono text-xs uppercase tracking-widest text-primary">Planes a futuro · Industria</span>
          <h3 className="text-balance text-2xl font-bold md:text-3xl">SPING para la industria del reciclaje</h3>
          <p className="text-pretty leading-relaxed text-muted-foreground">
            Nuestra meta es que la tecnología que hoy probamos en el colegio llegue a empresas de gestión de residuos,
            plantas de aprovechamiento y grandes generadores, automatizando la separación desde el origen.
          </p>
        </div>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan) => (
            <li key={plan.id} className="flex flex-col gap-3 rounded-2xl border border-border bg-background/70 p-5 backdrop-blur">
              <span className="flex size-10 items-center justify-center rounded-lg bg-primary/15 text-primary">
                <Icon name={plan.icon} className="size-5" />
              </span>
              <h4 className="font-semibold">{plan.title}</h4>
              <p className="text-sm leading-relaxed text-muted-foreground">{plan.description}</p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
