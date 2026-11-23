
interface SectionHeadingProps {
  eyebrow: string
  title: string
  description?: string
  id: string
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  id,
}: SectionHeadingProps) {
  return (
    <div className="flex max-w-2xl flex-col gap-4">
      <span className="font-mono text-xs font-medium uppercase tracking-[0.2em] text-[#8bbec6]">
        {eyebrow}
      </span>

      <h2
        id={id}
        className="text-3xl font-semibold tracking-tight text-[#fff7dc] md:text-5xl"
      >
        {title}
      </h2>

      {description && (
        <p className="text-pretty leading-relaxed text-[#b7d2d6] md:text-lg">
          {description}
        </p>
      )}
    </div>
  )
}
