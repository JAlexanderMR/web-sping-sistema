interface SectionHeadingProps {
  eyebrow: string
  title: string
  description?: string
  id: string
}

export function SectionHeading({ eyebrow, title, description, id }: SectionHeadingProps) {
  return (
    <div className="flex max-w-2xl flex-col gap-4">
      <span className="font-mono text-xs font-medium uppercase tracking-[0.2em] text-primary">
        {eyebrow}
      </span>
      <h2 id={id} className="text-3xl font-semibold tracking-tight md:text-5xl">
        {title}
      </h2>
      {description && (
        <p className="text-pretty leading-relaxed text-muted-foreground md:text-lg">{description}</p>
      )}
    </div>
  )
}
