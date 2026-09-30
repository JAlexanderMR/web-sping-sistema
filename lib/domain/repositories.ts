import type {
  AudienceStage,
  ContactInfo,
  CoreValue,
  CycleStep,
  GoalGroup,
  HardwareComponent,
  ImpactArea,
  IndustryPlan,
  Pillar,
  ProblemPerspective,
  ProjectIdentity,
  RoadmapRelease,
  TeamProfile,
  WasteCategory,
  WasteReading,
} from './entities'

export interface ProjectRepository {
  getIdentity(): ProjectIdentity
  getProblemPerspectives(): ProblemPerspective[]
  getPillars(): Pillar[]
  getValues(): CoreValue[]
}

export interface PrototypeRepository {
  getHardware(): HardwareComponent[]
  getCycleSteps(): CycleStep[]
}

export interface FutureRepository {
  getRoadmap(): RoadmapRelease[]
  getAudienceStages(): AudienceStage[]
  getGoals(): GoalGroup[]
  getImpact(): ImpactArea[]
  getIndustryPlans(): IndustryPlan[]
}

export interface TeamRepository {
  getProfile(): TeamProfile
}

export interface ContactRepository {
  getContactInfo(): ContactInfo
}

export interface WasteClassifier {
  classify(reading: WasteReading): WasteCategory
}
