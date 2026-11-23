
import {
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  type LucideIcon,
} from 'lucide-react'
import type {
  ContactChannel,
  ContactChannelKind,
  ContactInfo,
} from '@/lib/domain/entities'
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
    <section
      id="contacto"
      aria-labelledby="contacto-titulo"
      className="border-t border-[#8bbec6]/20 bg-[#0b2026]"
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-12 px-6 py-24">
        <SectionHeading
          id="contacto-titulo"
          eyebrow="Contacto"
          title={info.headline}
          description={info.description}
        />

        <div className="grid gap-6 lg:grid-cols-5">
          <article className="flex flex-col gap-6 rounded-3xl border border-[#8bbec6]/25 bg-[#10364b] p-8 shadow-[0_10px_30px_rgba(0,0,0,0.15)] lg:col-span-2">
            <SpingLogo className="size-20" />

            <div className="flex flex-col gap-1">
              <p className="font-mono text-xs uppercase tracking-widest text-[#8bbec6]">
                {info.advisor.role}
              </p>

              <h3 className="text-2xl font-semibold text-[#fff7dc]">
                {info.advisor.name}
              </h3>

              <p className="leading-relaxed text-[#b7d2d6]">
                Atiende solicitudes de alianzas, presentaciones y adquisición
                del prototipo SPING.
              </p>
            </div>

            {whatsapp?.href && (
              <a
                href={whatsapp.href}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-auto inline-flex w-fit items-center gap-2 rounded-full border border-[#8bbec6]/20 bg-[#1d5550] px-6 py-3 font-medium text-[#fff7dc] transition-all hover:bg-[#2a7a9e] hover:shadow-[0_6px_18px_rgba(0,0,0,0.20)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8bbec6] focus-visible:ring-offset-2 focus-visible:ring-offset-[#10364b]"
              >
                <MessageCircle className="size-4" aria-hidden="true" />
                Escribir por WhatsApp
              </a>
            )}
          </article>

          <ul className="grid gap-4 sm:grid-cols-2 lg:col-span-3">
            {channels.map((channel) => {
              const ChannelIcon = CHANNEL_ICONS[channel.kind]
              const external =
                channel.kind === 'whatsapp' || channel.kind === 'location'

              return (
                <li key={channel.kind}>
                  <a
                    href={channel.href}
                    target={external ? '_blank' : undefined}
                    rel={external ? 'noopener noreferrer' : undefined}
                    className="group flex h-full flex-col gap-4 rounded-2xl border border-[#8bbec6]/20 bg-[#10364b] p-6 transition-all duration-200 hover:-translate-y-1 hover:border-[#8bbec6]/50 hover:bg-[#0b2a3c] hover:shadow-[0_10px_25px_rgba(0,0,0,0.20)]"
                  >
                    <span className="flex size-11 items-center justify-center rounded-xl border border-[#8bbec6]/25 bg-[#1d5550] text-[#8bbec6] transition-colors group-hover:bg-[#2a7a9e]">
                      <ChannelIcon
                        className="size-5 text-[#8bbec6]"
                        aria-hidden="true"
                      />
                    </span>

                    <span className="flex flex-col gap-1">
                      <span className="text-sm text-[#8bbec6]">
                        {channel.label}
                      </span>

                      <span className="break-all font-medium text-[#fff7dc] transition-colors group-hover:text-[#8bbec6]">
                        {channel.value}
                      </span>
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
