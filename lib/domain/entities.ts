export type IconKey =
  | 'leaf'
  | 'cpu'
  | 'education'
  | 'users'
  | 'shield'
  | 'refresh'
  | 'radar'
  | 'droplets'
  | 'chip'
  | 'cog'
  | 'monitor'
  | 'card'
  | 'recycle'
  | 'school'
  | 'home'
  | 'building'
  | 'factory'
  | 'sparkles'
  | 'gamepad'

export interface ProjectIdentity {
  name: string
  slogan: string
  extendedSlogan: string
  foundingQuestion: string
  centralConcept: string
  nameConcept: string
  summary: string
  mission: string
  vision: string
}

export interface ProblemPerspective {
  id: string
  audience: string
  issues: string[]
}

export interface Pillar {
  id: string
  title: string
  description: string
  icon: IconKey
}

export interface CoreValue {
  id: string
  title: string
  description: string
  icon: IconKey
}

export interface HardwareComponent {
  id: string
  name: string
  role: string
  icon: IconKey
}

export interface CycleStep {
  id: string
  order: number
  title: string
  description: string
  lcdMessage: string
}

export type ReleaseStatus = 'actual' | 'proximo' | 'futuro'

export interface RoadmapRelease {
  version: string
  title: string
  status: ReleaseStatus
  features: string[]
}

export interface AudienceStage {
  id: string
  stage: number
  title: string
  audience: string
  goal: string
  icon: IconKey
}

export type GoalHorizon = 'corto' | 'mediano' | 'largo'

export interface GoalGroup {
  horizon: GoalHorizon
  label: string
  goals: string[]
}

export interface ImpactArea {
  id: string
  title: string
  description: string
}

export interface IndustryPlan {
  id: string
  title: string
  description: string
  icon: AudienceStage['icon']
}

export interface TeamMember {
  id: string
  fullName: string
  displayName: string
  role: string
  description: string
}

export interface TeamProfile {
  headline: string
  description: string
  collectiveStatement: string
  members: TeamMember[]
}

export interface ContactAdvisor {
  name: string
  role: string
  phone: string
}

export interface ContactLocation {
  municipality: string
  department: string
  country: string
}

export interface ContactInfo {
  headline: string
  description: string
  advisor: ContactAdvisor
  email: string
  location: ContactLocation
}

export type ContactChannelKind = 'whatsapp' | 'phone' | 'email' | 'location'

export interface ContactChannel {
  kind: ContactChannelKind
  label: string
  value: string
  href?: string
}

export type WasteCategory = 'humedo' | 'seco'

export interface WasteReading {
  humidity: number
}
