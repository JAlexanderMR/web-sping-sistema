import type { WasteClassifier } from '@/lib/domain/repositories'
import type { CycleStep, WasteCategory } from '@/lib/domain/entities'

export interface CycleState {
  stepIndex: number
  running: boolean
  humidity: number | null
  category: WasteCategory | null
  points: number
  cycles: number
}

export const POINTS_PER_CYCLE = 10

export const CATEGORY_LABELS: Record<WasteCategory, string> = {
  humedo: 'Húmedo / orgánico',
  seco: 'Seco / aprovechable',
}

export class SortingCycle {
  constructor(
    private readonly steps: CycleStep[],
    private readonly classifier: WasteClassifier,
  ) {}

  initialState(): CycleState {
    return { stepIndex: 0, running: false, humidity: null, category: null, points: 0, cycles: 0 }
  }

  start(state: CycleState, humidity: number): CycleState {
    if (state.running) return state
    return { ...state, running: true, stepIndex: 1, humidity, category: null }
  }

  advance(state: CycleState): CycleState {
    if (!state.running) return state
    const nextIndex = state.stepIndex + 1

    if (nextIndex >= this.steps.length) {
      return { ...state, running: false, stepIndex: 0, cycles: state.cycles + 1 }
    }

    const nextStep = this.steps[nextIndex]
    const category =
      nextStep.id === 'procesamiento' && state.humidity !== null
        ? this.classifier.classify({ humidity: state.humidity })
        : state.category
    const points = nextStep.id === 'recompensa' ? state.points + POINTS_PER_CYCLE : state.points

    return { ...state, stepIndex: nextIndex, category, points }
  }

  currentStep(state: CycleState): CycleStep {
    return this.steps[state.stepIndex]
  }

  lcdMessage(state: CycleState): string {
    const step = this.currentStep(state)
    if (step.id === 'deposicion' && state.category) {
      return `Separado: ${CATEGORY_LABELS[state.category]}`
    }
    return step.lcdMessage
  }
}
