import type { ProjectIdentity } from '@/lib/domain/entities'
import { SpingLogo } from './sping-logo'

export function SiteFooter({ identity }: { identity: ProjectIdentity }) {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-8 px-6 py-24 text-center">
        <SpingLogo className="size-40" />
        <blockquote className="max-w-3xl text-balance font-heading text-2xl font-medium leading-snug md:text-4xl">
          {`“${identity.centralConcept}”`}
        </blockquote>
        <p className="text-muted-foreground">
          Porque el cambio no siempre comienza con una gran acción. A veces comienza con una pequeña decisión.
        </p>
        <p className="font-heading text-3xl font-bold text-gradient md:text-5xl">{identity.slogan}</p>
        <p className="text-xs text-muted-foreground">
          © 2026 SPING · Proyecto STEAM de innovación ambiental · Grado once
        </p>
      </div>
    </footer>
  )
}
