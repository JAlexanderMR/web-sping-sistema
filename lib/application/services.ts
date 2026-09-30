import type { ContactChannel } from '@/lib/domain/entities'
import type {
  ContactRepository,
  FutureRepository,
  ProjectRepository,
  PrototypeRepository,
  TeamRepository,
} from '@/lib/domain/repositories'

export class ProjectService {
  constructor(private readonly repository: ProjectRepository) {}

  getOverview() {
    return {
      identity: this.repository.getIdentity(),
      problems: this.repository.getProblemPerspectives(),
      pillars: this.repository.getPillars(),
      values: this.repository.getValues(),
    }
  }
}

export class PrototypeService {
  constructor(private readonly repository: PrototypeRepository) {}

  getPrototype() {
    return {
      hardware: this.repository.getHardware(),
      steps: [...this.repository.getCycleSteps()].sort((a, b) => a.order - b.order),
    }
  }
}

export class FutureService {
  constructor(private readonly repository: FutureRepository) {}

  getVision() {
    return {
      roadmap: this.repository.getRoadmap(),
      stages: [...this.repository.getAudienceStages()].sort((a, b) => a.stage - b.stage),
      goals: this.repository.getGoals(),
      impact: this.repository.getImpact(),
      industryPlans: this.repository.getIndustryPlans(),
    }
  }
}

export class ContactService {
  constructor(private readonly repository: ContactRepository) {}

  getContact() {
    const info = this.repository.getContactInfo()
    const digits = info.advisor.phone.replace(/\D/g, '')
    const { municipality, department, country } = info.location
    const place = `${municipality}, ${department}, ${country}`

    const channels: ContactChannel[] = [
      {
        kind: 'whatsapp',
        label: 'WhatsApp',
        value: info.advisor.phone,
        href: `https://wa.me/${digits}?text=${encodeURIComponent('Hola, quiero saber más sobre SPING.')}`,
      },
      { kind: 'phone', label: 'Teléfono', value: info.advisor.phone, href: `tel:+${digits}` },
      { kind: 'email', label: 'Correo', value: info.email, href: `mailto:${info.email}` },
      {
        kind: 'location',
        label: 'Ubicación',
        value: place,
        href: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place)}`,
      },
    ]

    return { info, channels }
  }
}

export class TeamService {
  constructor(private readonly repository: TeamRepository) {}

  getTeam() {
    return this.repository.getProfile()
  }

  static getInitials(name: string) {
    return name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('')
  }
}
