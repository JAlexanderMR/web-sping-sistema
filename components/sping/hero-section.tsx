
import Image from 'next/image'
import { ArrowRight } from 'lucide-react'
import type { ProjectIdentity } from '@/lib/domain/entities'

const STATS = [
  { value: '2', label: 'Compartimentos' },
  { value: '9 V', label: 'Motorreductor' },
  { value: '+10 SP', label: 'Por reciclaje' },
]

export function HeroSection({ identity }: { identity: ProjectIdentity }) {
  return (
    <section id="inicio" className="relative overflow-hidden bg-[#0b2026]">
      <div className="bg-grid absolute inset-0 [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)]" />

      <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-6 py-20 md:py-28 lg:grid-cols-2">
        <div className="flex flex-col gap-8">
          <span className="w-fit rounded-full border border-[#8bbec6]/30 bg-[#10364b] px-3 py-1 font-mono text-xs font-semibold uppercase tracking-widest text-[#8bbec6]">
            Proyecto STEAM · Feria 2026
          </span>

          <h1 className="text-5xl font-bold leading-[1.05] tracking-tight md:text-7xl">
            <span className="text-gradient">{identity.slogan}</span>
          </h1>

          <p className="max-w-xl text-pretty text-lg leading-relaxed text-[#b7d2d6]">
            {identity.foundingQuestion}
          </p>

          <div className="flex flex-wrap gap-3">
            <a
              href="/proyecto"
              className="inline-flex items-center gap-2 rounded-full bg-[#8bbec6] px-6 py-3 font-semibold text-[#0b2a3c] transition-colors hover:bg-[#b0d5da] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8bbec6] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b2026]"
            >
              Conoce SPING
              <ArrowRight className="size-4" aria-hidden="true" />
            </a>

            <a
              href="/vision"
              className="inline-flex items-center rounded-full border border-[#8bbec6]/40 bg-[#10364b] px-6 py-3 font-semibold text-[#fff7dc] transition-colors hover:bg-[#1d5550] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8bbec6] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b2026]"
            >
              Visión a futuro
            </a>
          </div>

          <dl className="grid max-w-md grid-cols-3 gap-4 border-t border-[#8bbec6]/20 pt-6">
            {STATS.map((stat) => (
              <div key={stat.label} className="flex flex-col gap-1">
                <dt className="order-2 text-xs leading-relaxed text-[#b7d2d6]">
                  {stat.label}
                </dt>
                <dd className="order-1 font-heading text-2xl font-bold text-[#fff7dc]">
                  {stat.value}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="relative">
          <div className="absolute -inset-6 rounded-[2rem] bg-gradient-to-br from-[#2a7a9e]/30 to-[#8bbec6]/20 blur-3xl" />

          <figure className="relative overflow-hidden rounded-3xl border border-[#8bbec6]/25 bg-[#10364b] shadow-[0_20px_50px_rgba(0,0,0,0.35)]">
            <div className="relative">
              
            <Image
              src="/images/sping-smart-bin.jpg"
              alt="Prototipo SPING: sistema inteligente de clasificación de residuos con compartimentos para orgánico, rechazo e inorgánico"
              width={1600}
              height={900}
              priority
              sizes="(min-width: 1024px) 560px, 100vw"
              className="aspect-[16/9] w-full object-cover object-center"
            />

              <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#10364b] to-transparent" />

              <span className="absolute left-4 top-4 rounded-full border border-[#8bbec6]/30 bg-[#0b2a3c]/95 px-3 py-1 font-mono text-[11px] font-semibold uppercase tracking-widest text-[#8bbec6] shadow-sm backdrop-blur">
                Prototipo real · SPING 1.0
              </span>
            </div>

            <figcaption className="flex flex-wrap gap-2 border-t border-[#8bbec6]/15 bg-[#10364b] p-4">
              {[
                'Arduino Mega 2560',
                'LCD 1602 + I2C',
                'HC-SR04',
                'Sensor de humedad',
                'Motorreductor 9 V',
                'L298N',
              ].map((part) => (
                <span
                  key={part}
                  className="rounded-full border border-[#8bbec6]/25 bg-[#0b2a3c] px-3 py-1 font-mono text-[11px] font-medium text-[#8bbec6]"
                >
                  {part}
                </span>
              ))}
            </figcaption>
          </figure>
        </div>
      </div>
    </section>
  )
}
