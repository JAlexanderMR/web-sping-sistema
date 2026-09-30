'use client'

import { useEffect, useMemo, useState } from 'react'
import { SortingCycle } from '@/lib/application/sorting-cycle'
import { HumidityThresholdClassifier } from '@/lib/infrastructure/humidity-classifier'
import type { CycleStep } from '@/lib/domain/entities'

const STEP_DURATION_MS = 1300

export function useSortingSimulator(steps: CycleStep[]) {
  const cycle = useMemo(() => new SortingCycle(steps, new HumidityThresholdClassifier()), [steps])
  const [state, setState] = useState(() => cycle.initialState())

  useEffect(() => {
    if (!state.running) return
    const timer = setTimeout(() => setState((prev) => cycle.advance(prev)), STEP_DURATION_MS)
    return () => clearTimeout(timer)
  }, [state, cycle])

  return {
    state,
    currentStep: cycle.currentStep(state),
    lcdMessage: cycle.lcdMessage(state),
    deposit: (humidity: number) => setState((prev) => cycle.start(prev, humidity)),
  }
}
