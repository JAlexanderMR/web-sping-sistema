'use client'

import { Droplets, Sun } from 'lucide-react'
import { useSortingSimulator } from '@/hooks/use-sorting-simulator'
import { CATEGORY_LABELS } from '@/lib/application/sorting-cycle'
import type { CycleStep } from '@/lib/domain/entities'
import { cn } from '@/lib/utils'

const SAMPLES = [
  { label: 'Cáscara de fruta', humidity: 82, icon: Droplets },
  { label: 'Botella plástica', humidity: 12, icon: Sun },
]

export function SortingSimulator({ steps }: { steps: CycleStep[] }) {
  const { state, currentStep, lcdMessage, deposit } = useSortingSimulator(steps)

  return (
    <div className="grid gap-6 rounded-3xl border border-border bg-card p-6 md:p-8 lg:grid-cols-[1fr_1.2fr]">
      <div className="flex flex-col gap-6">
        <div>
          <h3 className="text-xl font-semibold">Simulador del ciclo SPING</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Deposita un residuo y observa cómo el prototipo lo detecta, analiza y clasifica.
          </p>
        </div>

        <div
          role="status"
          aria-live="polite"
          className="rounded-xl border-4 border-secondary bg-steel p-4 font-mono text-sm text-accent shadow-inner"
        >
          <p className="truncate">{lcdMessage}</p>
          <p className="mt-1 text-xs opacity-70">
            {state.running ? `Paso ${currentStep.order}/${steps.length}` : 'Listo'} · SP: {state.points}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {SAMPLES.map((sample) => (
            <button
              key={sample.label}
              type="button"
              disabled={state.running}
              onClick={() => deposit(sample.humidity)}
              className="flex flex-col items-start gap-2 rounded-xl border border-border bg-secondary p-4 text-left transition-colors hover:border-primary disabled:cursor-not-allowed disabled:opacity-50"
            >
              <sample.icon className="size-5 text-accent" aria-hidden="true" />
              <span className="text-sm font-medium">{sample.label}</span>
              <span className="font-mono text-xs text-muted-foreground">Humedad {sample.humidity}%</span>
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3">
          {(['humedo', 'seco'] as const).map((category) => (
            <div
              key={category}
              className={cn(
                'rounded-xl border p-3 text-center text-xs transition-colors',
                state.category === category && state.stepIndex >= 5
                  ? 'border-primary bg-primary/15 text-primary'
                  : 'border-border text-muted-foreground',
              )}
            >
              {CATEGORY_LABELS[category]}
            </div>
          ))}
        </div>
      </div>

      <ol className="grid gap-2 sm:grid-cols-2">
        {steps.map((step, index) => {
          const isActive = index === state.stepIndex
          const isDone = state.running && index < state.stepIndex
          return (
            <li
              key={step.id}
              aria-current={isActive ? 'step' : undefined}
              className={cn(
                'flex gap-3 rounded-xl border p-3 transition-all',
                isActive && 'border-primary bg-primary/10',
                isDone && 'border-primary/30',
                !isActive && !isDone && 'border-border',
              )}
            >
              <span
                className={cn(
                  'flex size-7 shrink-0 items-center justify-center rounded-full font-mono text-xs',
                  isActive || isDone ? 'bg-primary text-primary-foreground' : 'bg-secondary',
                )}
              >
                {step.order}
              </span>
              <div>
                <p className="text-sm font-semibold">{step.title}</p>
                <p className="text-xs leading-relaxed text-muted-foreground">{step.description}</p>
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
