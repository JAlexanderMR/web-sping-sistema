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
          <span className="w-fit rounded-full border border-primary/30 bg-primary/10 px-3 py-1 font-mono text-xs uppercase tracking-widest text-primary">
            Proyecto STEAM · Feria 2026
          </span>
          <h1 className="text-5xl font-bold leading-[1.05] tracking-tight md:text-7xl">
            <span className="text-gradient">{identity.slogan}</span>
          </h1>
          <p className="max-w-xl text-pretty text-lg leading-relaxed text-muted-foreground">
            {identity.foundingQuestion}
          </p>
          <div className="flex flex-wrap gap-3">
            <a
              href="#proyecto"
              className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 font-medium text-primary-foreground transition-opacity hover:opacity-90"
            >
              Conoce SPING
              <ArrowRight className="size-4" aria-hidden="true" />
            </a>
            <a
              href="#vision"
              className="inline-flex items-center rounded-full border border-border px-6 py-3 font-medium transition-colors hover:bg-secondary"
            >
              Visión a futuro
            </a>
          </div>
          <dl className="grid max-w-md grid-cols-3 gap-4 border-t border-border pt-6">
            {STATS.map((stat) => (
              <div key={stat.label} className="flex flex-col gap-1">
                <dt className="order-2 text-xs text-muted-foreground">{stat.label}</dt>
                <dd className="order-1 font-heading text-2xl font-semibold text-accent">{stat.value}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="relative">
          <div className="absolute -inset-6 rounded-[2rem] bg-gradient-to-br from-steel/40 to-forest/40 blur-3xl" />
          <figure className="relative overflow-hidden rounded-3xl border border-border bg-card">
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
              <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-card to-transparent" />
              <span className="absolute left-4 top-4 rounded-full border border-primary/30 bg-background/70 px-3 py-1 font-mono text-[11px] uppercase tracking-widest text-primary backdrop-blur">
                Prototipo real · SPING 1.0
              </span>
            </div>
            <figcaption className="flex flex-wrap gap-2 border-t border-border p-4">
              {['Arduino Mega 2560', 'LCD 1602 + I2C', 'HC-SR04', 'Sensor de humedad', 'Motorreductor 9 V', 'L298N'].map(
                (part) => (
                  <span
                    key={part}
                    className="rounded-full bg-secondary px-3 py-1 font-mono text-[11px] text-secondary-foreground"
                  >
                    {part}
                  </span>
                ),
              )}
            </figcaption>
          </figure>
        </div>
      </div>
    </section>
  )
}
