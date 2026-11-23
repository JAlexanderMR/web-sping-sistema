
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Menu,
  X,
  ChevronRight,
  Leaf,
  LogIn,
  LogOut,
  LayoutDashboard,
} from 'lucide-react'
import { SpingLogo } from './sping-logo'
import { supabase } from '@/lib/supabase/client'

const NAV_LINKS = [
  { href: '/proyecto', label: 'Proyecto' },
  { href: '/prototipo', label: 'Prototipo' },
  { href: '/vision', label: 'Visión' },
  { href: '/equipo', label: 'Equipo' },
  { href: '/contacto', label: 'Contacto' },
]

export function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [sesionActiva, setSesionActiva] = useState(false)
  const [comprobandoSesion, setComprobandoSesion] = useState(true)
  const [cerrandoSesion, setCerrandoSesion] = useState(false)

  const router = useRouter()

  useEffect(() => {
    let activo = true

    async function comprobarSesion() {
      const { data, error } = await supabase.auth.getSession()

      if (activo) {
        setSesionActiva(!error && !!data.session)
        setComprobandoSesion(false)
      }
    }

    comprobarSesion()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSesionActiva(!!session)
      setComprobandoSesion(false)
    })

    return () => {
      activo = false
      subscription.unsubscribe()
    }
  }, [])

  async function cerrarSesion() {
    setCerrandoSesion(true)

    const { error } = await supabase.auth.signOut()

    if (error) {
      setCerrandoSesion(false)
      return
    }

    setMenuOpen(false)
    setSesionActiva(false)
    router.push('/')
    router.refresh()
  }

  return (
    <header className="sticky top-0 z-50 border-b border-[#8bbec6]/20 bg-[#0b2a3c]/95 shadow-[0_4px_20px_rgba(0,0,0,0.20)] backdrop-blur-xl">
      <nav
        aria-label="Navegación principal"
        className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8"
      >
        <div className="flex items-center gap-3">
          <Link
            href="/"
            onClick={() => setMenuOpen(false)}
            aria-label="SPING, ir al inicio"
            className="flex items-center gap-2 text-[#fff7dc] transition-opacity hover:opacity-80"
          >
            <SpingLogo className="size-10" />

            <span className="font-heading text-xl font-bold tracking-tight text-[#fff7dc]">
              SPING
            </span>

            <Leaf className="hidden size-4 text-[#8bbec6] sm:block" />
          </Link>

          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
              aria-expanded={menuOpen}
              aria-controls="sping-navigation"
              className="flex size-10 items-center justify-center rounded-xl border border-[#8bbec6]/30 bg-[#10364b] text-[#8bbec6] shadow-sm transition-all hover:bg-[#1d5550] hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8bbec6] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b2a3c]"
            >
              {menuOpen ? (
                <X className="size-5" />
              ) : (
                <Menu className="size-5" />
              )}
            </button>

            <div
              id="sping-navigation"
              aria-hidden={!menuOpen}
              className={`absolute left-0 top-[calc(100%+14px)] w-64 origin-top-left transition-all duration-200 sm:w-72 ${
                menuOpen
                  ? 'visible translate-y-0 scale-100 opacity-100'
                  : 'invisible -translate-y-2 scale-95 opacity-0'
              }`}
            >
              <div className="rounded-2xl border border-[#8bbec6]/25 bg-[#10364b] p-3 shadow-[0_18px_45px_rgba(0,0,0,0.35)]">
                <div className="mb-2 border-b border-[#8bbec6]/20 px-3 pb-3 pt-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8bbec6]">
                    Explora SPING
                  </p>

                  <p className="mt-1 text-xs text-[#b7d2d6]">
                    Descubre nuestro proyecto
                  </p>
                </div>

                <div className="flex flex-col gap-1">
                  {NAV_LINKS.map((link, index) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      tabIndex={menuOpen ? 0 : -1}
                      onClick={() => setMenuOpen(false)}
                      className="group flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium text-[#fff7dc] transition-colors hover:bg-[#1d5550] hover:text-[#8bbec6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8bbec6]"
                    >
                      <span className="flex items-center gap-3">
                        <span className="flex size-7 items-center justify-center rounded-lg bg-[#0b2a3c] font-mono text-[10px] font-semibold text-[#8bbec6] group-hover:bg-[#2a7a9e] group-hover:text-white">
                          {String(index + 1).padStart(2, '0')}
                        </span>

                        {link.label}
                      </span>

                      <ChevronRight className="size-4 text-[#8bbec6] transition-transform group-hover:translate-x-1" />
                    </Link>
                  ))}
                </div>

                {sesionActiva && (
                  <div className="mt-2 border-t border-[#8bbec6]/20 pt-2">
                    <Link
                      href="/dashboard"
                      tabIndex={menuOpen ? 0 : -1}
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-[#8bbec6] transition-colors hover:bg-[#1d5550]"
                    >
                      <LayoutDashboard className="size-4" />
                      Panel de control
                    </Link>

                    <button
                      type="button"
                      disabled={cerrandoSesion}
                      onClick={cerrarSesion}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-red-300 transition-colors hover:bg-red-950/40 disabled:opacity-50"
                    >
                      <LogOut className="size-4" />
                      {cerrandoSesion
                        ? 'Cerrando sesión...'
                        : 'Cerrar sesión'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {!comprobandoSesion && (
          <Link
            href={sesionActiva ? '/dashboard' : '/login'}
            className="inline-flex shrink-0 items-center gap-2 rounded-full border border-[#8bbec6]/20 bg-[#1d5550] px-4 py-2.5 text-sm font-semibold text-[#fff7dc] shadow-sm transition-colors hover:bg-[#2a7a9e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8bbec6] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b2a3c]"
          >
            {sesionActiva ? (
              <>
                <LayoutDashboard className="size-4" />
                <span>Mi panel</span>
              </>
            ) : (
              <>
                <LogIn className="size-4" />
                <span>Iniciar sesión</span>
              </>
            )}
          </Link>
        )}
      </nav>
    </header>
  )
}
