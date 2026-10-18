
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
    <section id="inicio" className="relative overflow-hidden">
      <div className="bg-grid absolute inset-0 [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)]" />

      <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-6 py-20 md:py-28 lg:grid-cols-2">
        <div className="flex flex-col gap-8">
          <span className="w-fit rounded-full border border-[#176b4d]/25 bg-[#e5f3e9] px-3 py-1 font-mono text-xs font-semibold uppercase tracking-widest text-[#14543d]">
            Proyecto STEAM · Feria 2026
          </span>

          <h1 className="text-5xl font-bold leading-[1.05] tracking-tight md:text-7xl">
            <span className="text-gradient">{identity.slogan}</span>
          </h1>

          <p className="max-w-xl text-pretty text-lg leading-relaxed text-[#43574b]">
            {identity.foundingQuestion}
          </p>

          <div className="flex flex-wrap gap-3">
            <a
              href="#proyecto"
              className="inline-flex items-center gap-2 rounded-full bg-[#176b4d] px-6 py-3 font-semibold text-white transition-colors hover:bg-[#12563e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#176b4d] focus-visible:ring-offset-2"
            >
              Conoce SPING
              <ArrowRight className="size-4" aria-hidden="true" />
            </a>

            <a
              href="#vision"
              className="inline-flex items-center rounded-full border border-[#c8d9ce] bg-white px-6 py-3 font-semibold text-[#245b42] transition-colors hover:bg-[#e5f3e9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#176b4d] focus-visible:ring-offset-2"
            >
              Visión a futuro
            </a>
          </div>

          <dl className="grid max-w-md grid-cols-3 gap-4 border-t border-[#dce7df] pt-6">
            {STATS.map((stat) => (
              <div key={stat.label} className="flex flex-col gap-1">
                <dt className="order-2 text-xs leading-relaxed text-[#52665a]">
                  {stat.label}
                </dt>
                <dd className="order-1 font-heading text-2xl font-bold text-[#176b4d]">
                  {stat.value}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="relative">
          <div className="absolute -inset-6 rounded-[2rem] bg-gradient-to-br from-[#438b72]/25 to-[#b9e7ca]/40 blur-3xl" />

          <figure className="relative overflow-hidden rounded-3xl border border-[#dce7df] bg-white shadow-[0_20px_50px_rgba(23,61,49,0.12)]">
            <div className="relative">
              <Image
                src="/images/sping-smart-bin.jpg"
                alt="Prototipo real de SPING: caja de madera con pantalla LCD encendida al frente, motorreductor de 9 V y sensor ultrasónico en la parte superior, y cajón lateral para el segundo compartimento"
                width={1200}
                height={1600}
                priority
                sizes="(min-width: 1024px) 560px, 100vw"
                className="aspect-square w-full object-cover object-[center_55%]"
              />

              <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-white to-transparent" />

              <span className="absolute left-4 top-4 rounded-full border border-[#c8d9ce] bg-white/95 px-3 py-1 font-mono text-[11px] font-semibold uppercase tracking-widest text-[#14543d] shadow-sm backdrop-blur">
                Prototipo real · SPING 1.0
              </span>
            </div>

            <figcaption className="flex flex-wrap gap-2 border-t border-[#e3ece5] bg-white p-4">
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
                  className="rounded-full border border-[#d5e9dc] bg-[#e5f3e9] px-3 py-1 font-mono text-[11px] font-medium text-[#245b42]"
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
