import { SpingLogo } from './sping-logo'

const NAV_LINKS = [
  { href: '#proyecto', label: 'Proyecto' },
  { href: '#prototipo', label: 'Prototipo' },
  { href: '#vision', label: 'Visión' },
  { href: '#equipo', label: 'Equipo' },
  { href: '#contacto', label: 'Contacto' },
]

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
      <nav
        aria-label="Principal"
        className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6"
      >
        <a href="#inicio" className="flex items-center gap-2 font-heading text-lg font-bold">
          <SpingLogo className="size-10" />
          SPING
        </a>
        <ul className="hidden items-center gap-8 text-sm text-muted-foreground md:flex">
          {NAV_LINKS.map((link) => (
            <li key={link.href}>
              <a href={link.href} className="transition-colors hover:text-foreground">
                {link.label}
              </a>
            </li>
          ))}
        </ul>
        <a
          href="#contacto"
          className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
        >
          Contáctanos
        </a>
      </nav>
    </header>
  )
}
