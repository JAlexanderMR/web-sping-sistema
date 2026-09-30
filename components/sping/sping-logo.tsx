import Image from 'next/image'
import { cn } from '@/lib/utils'

// The source logo has a solid black background; screen blending drops it on dark surfaces.
export function SpingLogo({ className, priority }: { className?: string; priority?: boolean }) {
  return (
    <Image
      src="/images/sping-logo.jpg"
      alt="Logo de SPING"
      width={1254}
      height={1254}
      priority={priority}
      className={cn('object-contain mix-blend-screen', className)}
    />
  )
}
