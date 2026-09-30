import { PlayCircle } from 'lucide-react'

export function ComponentsVideo() {
  return (
    <figure className="grid items-center gap-8 overflow-hidden rounded-3xl border border-border bg-background p-6 md:p-8 lg:grid-cols-5">
      <figcaption className="flex flex-col gap-4 lg:col-span-2">
        <span className="flex w-fit items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 font-mono text-xs uppercase tracking-widest text-primary">
          <PlayCircle className="size-3.5" aria-hidden="true" />
          Video
        </span>
        <h3 className="text-balance text-2xl font-bold">Los componentes de SPING en acción</h3>
        <p className="text-pretty leading-relaxed text-muted-foreground">
          Mira de cerca el Arduino Mega 2560, la pantalla LCD, el sensor ultrasónico, el sensor de humedad y el
          motorreductor de 9 V que hacen posible la clasificación de residuos.
        </p>
      </figcaption>
      <div className="relative lg:col-span-3">
        <div className="absolute -inset-4 rounded-[2rem] bg-gradient-to-br from-steel/30 to-forest/30 blur-2xl" />
        <video
          className="relative aspect-video w-full rounded-2xl border border-border bg-black object-contain"
          src="/videos/sping-componentes.mp4"
          controls
          playsInline
          preload="metadata"
          aria-label="Video de los componentes electrónicos del prototipo SPING"
        />
      </div>
    </figure>
  )
}
