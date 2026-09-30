import type { TeamProfile } from '@/lib/domain/entities'
import { TeamService } from '@/lib/application/services'
import { SectionHeading } from './section-heading'

export function TeamSection({ team }: { team: TeamProfile }) {
  return (
    <section id="equipo" aria-labelledby="equipo-title" className="border-t border-border bg-card/40">
      <div className="mx-auto flex max-w-6xl flex-col gap-12 px-6 py-24">
        <SectionHeading
          id="equipo-title"
          eyebrow="Quiénes somos"
          title={team.headline}
          description={team.description}
        />
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {team.members.map((member) => (
            <li
              key={member.id}
              className="group flex flex-col gap-4 rounded-2xl border border-border bg-background p-6 transition-colors hover:border-primary/50"
            >
              <span
                aria-hidden="true"
                className="flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-accent font-heading text-lg font-bold text-primary-foreground"
              >
                {TeamService.getInitials(member.displayName)}
              </span>
              <div>
                <h3 className="font-semibold">{member.displayName}</h3>
                <p className="text-xs text-muted-foreground">{member.fullName}</p>
              </div>
              <p className="font-mono text-xs uppercase tracking-wider text-primary">{member.role}</p>
              <p className="text-sm leading-relaxed text-muted-foreground">{member.description}</p>
            </li>
          ))}
        </ul>
        <p className="rounded-2xl border border-primary/20 bg-primary/10 p-6 text-center text-pretty">
          {team.collectiveStatement}
        </p>
      </div>
    </section>
  )
}
