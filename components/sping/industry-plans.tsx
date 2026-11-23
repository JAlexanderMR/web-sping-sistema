
import type { IndustryPlan } from '@/lib/domain/entities'
import { Icon } from './icon'

export function IndustryPlans({ plans }: { plans: IndustryPlan[] }) {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-[#8bbec6]/25 bg-gradient-to-br from-[#10364b] via-[#0b2026] to-[#0b2a3c] p-8 shadow-[0_12px_35px_rgba(0,0,0,0.20)] md:p-10">
      <div className="bg-grid pointer-events-none absolute inset-0 opacity-30 [mask-image:radial-gradient(ellipse_at_top_right,black,transparent_70%)]" />

      <div className="relative flex flex-col gap-8">
        <div className="flex max-w-2xl flex-col gap-3">
          <span className="font-mono text-xs font-semibold uppercase tracking-widest text-[#8bbec6]">
            Planes a futuro · Industria
          </span>

          <h3 className="text-balance text-2xl font-bold text-[#fff7dc] md:text-3xl">
            SPING para la industria del reciclaje
          </h3>

          <p className="text-pretty leading-relaxed text-[#b7d2d6]">
            Nuestra meta es que la tecnología que hoy probamos en el colegio
            llegue a empresas de gestión de residuos, plantas de
            aprovechamiento y grandes generadores, automatizando la
            separación desde el origen.
          </p>
        </div>

        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan) => (
            <li
              key={plan.id}
              className="group flex flex-col gap-3 rounded-2xl border border-[#8bbec6]/20 bg-[#0b2a3c]/90 p-5 backdrop-blur transition-all duration-200 hover:-translate-y-1 hover:border-[#8bbec6]/50 hover:bg-[#10364b] hover:shadow-[0_10px_25px_rgba(0,0,0,0.20)]"
            >
              <span className="flex size-10 items-center justify-center rounded-xl border border-[#8bbec6]/20 bg-[#1d5550] text-[#8bbec6] transition-colors group-hover:bg-[#2a7a9e]">
                <Icon
                  name={plan.icon}
                  className="size-5 text-[#8bbec6]"
                />
              </span>

              <h4 className="font-semibold text-[#fff7dc]">
                {plan.title}
              </h4>

              <p className="text-sm leading-relaxed text-[#b7d2d6]">
                {plan.description}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
