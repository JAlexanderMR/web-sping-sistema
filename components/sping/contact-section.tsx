import { Mail, MapPin, MessageCircle, Phone, type LucideIcon } from 'lucide-react'
import type { ContactChannel, ContactChannelKind, ContactInfo } from '@/lib/domain/entities'
import { SectionHeading } from './section-heading'
import { SpingLogo } from './sping-logo'

const CHANNEL_ICONS: Record<ContactChannelKind, LucideIcon> = {
  whatsapp: MessageCircle,
  phone: Phone,
  email: Mail,
  location: MapPin,
}

interface ContactSectionProps {
  info: ContactInfo
  channels: ContactChannel[]
}

export function ContactSection({ info, channels }: ContactSectionProps) {
  const whatsapp = channels.find((channel) => channel.kind === 'whatsapp')

  return (
    <section id="contacto" aria-labelledby="contacto-titulo" className="border-t border-border bg-forest/30">
      <div className="mx-auto flex max-w-6xl flex-col gap-12 px-6 py-24">
        <SectionHeading id="contacto-titulo" eyebrow="Contacto" title={info.headline} description={info.description} />

        <div className="grid gap-6 lg:grid-cols-5">
          <article className="flex flex-col gap-6 rounded-3xl border border-border bg-card p-8 lg:col-span-2">
            <SpingLogo className="size-20" />
            <div className="flex flex-col gap-1">
              <p className="font-mono text-xs uppercase tracking-widest text-primary">{info.advisor.role}</p>
              <h3 className="text-2xl font-semibold">{info.advisor.name}</h3>
              <p className="text-muted-foreground">
                Atiende solicitudes de alianzas, presentaciones y adquisición del prototipo SPING.
              </p>
            </div>
            {whatsapp?.href && (
              <a
                href={whatsapp.href}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-auto inline-flex w-fit items-center gap-2 rounded-full bg-primary px-6 py-3 font-medium text-primary-foreground transition-opacity hover:opacity-90"
              >
                <MessageCircle className="size-4" aria-hidden="true" />
                Escribir por WhatsApp
              </a>
            )}
          </article>

          <ul className="grid gap-4 sm:grid-cols-2 lg:col-span-3">
            {channels.map((channel) => {
              const Icon = CHANNEL_ICONS[channel.kind]
              const external = channel.kind === 'whatsapp' || channel.kind === 'location'
              return (
                <li key={channel.kind}>
                  <a
                    href={channel.href}
                    target={external ? '_blank' : undefined}
                    rel={external ? 'noopener noreferrer' : undefined}
                    className="group flex h-full flex-col gap-4 rounded-2xl border border-border bg-card p-6 transition-colors hover:border-primary/60"
                  >
                    <span className="flex size-11 items-center justify-center rounded-xl bg-steel text-accent">
                      <Icon className="size-5" aria-hidden="true" />
                    </span>
                    <span className="flex flex-col gap-1">
                      <span className="text-sm text-muted-foreground">{channel.label}</span>
                      <span className="break-all font-medium group-hover:text-primary">{channel.value}</span>
                    </span>
                  </a>
                </li>
              )
            })}
          </ul>
        </div>
      </div>
    </section>
  )
}
