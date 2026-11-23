
import type { ProjectIdentity } from '@/lib/domain/entities'
import { SpingLogo } from './sping-logo'

export function SiteFooter({ identity }: { identity: ProjectIdentity }) {
  return (
    <footer className="border-t border-[#8bbec6]/20 bg-[#0b2026]">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-8 px-6 py-24 text-center">
        <SpingLogo className="size-40" />

        <blockquote className="max-w-3xl text-balance font-heading text-2xl font-medium leading-snug text-[#fff7dc] md:text-4xl">
          {`“${identity.centralConcept}”`}
        </blockquote>

        <p className="max-w-2xl text-pretty leading-relaxed text-[#b7d2d6]">
          Porque el cambio no siempre comienza con una gran acción. A veces
          comienza con una pequeña decisión.
        </p>

        <p className="font-heading text-3xl font-bold text-[#8bbec6] md:text-5xl">
          {identity.slogan}
        </p>

        <div className="h-px w-24 bg-[#8bbec6]/30" />

        <p className="text-xs text-[#8bbec6]">
          © 2026 SPING · Proyecto STEAM de innovación ambiental · Grado once
        </p>
      </div>
    </footer>
  )
}
