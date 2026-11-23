
import type { TeamProfile } from '@/lib/domain/entities'
import { TeamService } from '@/lib/application/services'
import { SectionHeading } from './section-heading'

export function TeamSection({ team }: { team: TeamProfile }) {
  return (
    <section
      id="equipo"
      aria-labelledby="equipo-title"
      className="border-t border-[#8bbec6]/20 bg-[#0b2026]"
    >
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
              className="group flex flex-col gap-4 rounded-2xl border border-[#8bbec6]/20 bg-[#10364b] p-6 transition-all duration-200 hover:-translate-y-1 hover:border-[#8bbec6]/50 hover:bg-[#0b2a3c] hover:shadow-[0_10px_25px_rgba(0,0,0,0.20)]"
            >
              <span
                aria-hidden="true"
                className="flex size-14 items-center justify-center rounded-2xl border border-[#8bbec6]/25 bg-gradient-to-br from-[#1d5550] to-[#2a7a9e] font-heading text-lg font-bold text-[#fff7dc]"
              >
                {TeamService.getInitials(member.displayName)}
              </span>

              <div>
                <h3 className="font-semibold text-[#fff7dc]">
                  {member.displayName}
                </h3>

                <p className="mt-1 text-xs leading-relaxed text-[#b7d2d6]">
                  {member.fullName}
                </p>
              </div>

              <p className="font-mono text-xs uppercase tracking-wider text-[#8bbec6]">
                {member.role}
              </p>

              <p className="text-sm leading-relaxed text-[#b7d2d6]">
                {member.description}
              </p>
            </li>
          ))}
        </ul>

        <p className="rounded-2xl border border-[#8bbec6]/25 bg-[#10364b] p-6 text-center text-pretty leading-relaxed text-[#d1e4e6]">
          {team.collectiveStatement}
        </p>
      </div>
    </section>
  )
}
