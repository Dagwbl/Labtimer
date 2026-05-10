import { z } from 'zod'

// ── Domain Models ────────────────────────────────────────────────────────────

/** Recipe — a named procedure with ordered steps */
export interface Recipe {
  id: string
  name: string
  description: string
  createdAt: number
  updatedAt: number
}

/** Step — a single timed step within a recipe */
export interface Step {
  id: string
  recipeId: string
  order: number
  label: string
  durationMs: number
  notes: string
}

// ── Timer Engine ─────────────────────────────────────────────────────────────

export type TimerPhase = 'idle' | 'running' | 'paused' | 'stepTransition' | 'completed'

/** TimerState — runtime state of the timer engine */
export interface TimerState {
  phase: TimerPhase
  currentStepIndex: number
  stepPaused: boolean
  elapsedMs: number
  stepEndTime: number
  startedAt: number
  pausedAt: number | null
}

// ── Experiment History ───────────────────────────────────────────────────────

export type StepRecordStatus = 'completed' | 'skipped' | 'interrupted'
export type ExperimentStatus = 'completed' | 'interrupted' | 'cancelled'

/** ExperimentRecord — saved history of a completed run */
export interface ExperimentRecord {
  id: string
  recipeId: string
  recipeName: string
  startedAt: number
  completedAt: number
  totalDurationMs: number
  steps: Array<{
    stepId: string
    label: string
    plannedDurationMs: number
    actualDurationMs: number
    pausedDurationMs: number
    status: StepRecordStatus
  }>
  status: ExperimentStatus
}

// ── Import / Export ──────────────────────────────────────────────────────────

/** RecipeExport — JSON/YAML interchange format */
export interface RecipeExport {
  formatVersion: number
  exportedAt: string
  recipe: {
    name: string
    description: string
    steps: Array<{
      label: string
      durationSec: number
      notes: string
    }>
  }
}

// ── Zod Schemas (Import Validation) ─────────────────────────────────────────

/** Validates the RecipeExport interchange format on import */
export const RecipeExportSchema = z.object({
  formatVersion: z.number().int().positive(),
  exportedAt: z.string(),
  recipe: z.object({
    name: z.string().min(1, 'Recipe name is required'),
    description: z.string(),
    steps: z.array(
      z.object({
        label: z.string().min(1, 'Step label is required'),
        durationSec: z.number().positive('Duration must be a positive number'),
        notes: z.string(),
      }),
    ).min(1, 'Recipe must have at least one step'),
  }),
})
