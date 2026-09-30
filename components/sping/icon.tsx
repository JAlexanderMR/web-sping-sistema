import {
  Building2,
  Cog,
  Cpu,
  CreditCard,
  Droplets,
  Factory,
  Gamepad2,
  GraduationCap,
  House,
  Leaf,
  type LucideIcon,
  MemoryStick,
  Monitor,
  Radar,
  Recycle,
  RefreshCw,
  School,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react'
import type { IconKey } from '@/lib/domain/entities'

const ICONS: Record<IconKey, LucideIcon> = {
  leaf: Leaf,
  cpu: Cpu,
  education: GraduationCap,
  users: Users,
  shield: ShieldCheck,
  refresh: RefreshCw,
  radar: Radar,
  droplets: Droplets,
  chip: MemoryStick,
  cog: Cog,
  monitor: Monitor,
  card: CreditCard,
  recycle: Recycle,
  school: School,
  home: House,
  building: Building2,
  factory: Factory,
  sparkles: Sparkles,
  gamepad: Gamepad2,
}

export function Icon({ name, className }: { name: IconKey; className?: string }) {
  const Component = ICONS[name]
  return <Component className={className} aria-hidden="true" />
}
