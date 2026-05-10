import { ref, onUnmounted } from 'vue'
import type { Step, TimerPhase } from '@/types'

export interface StepTiming {
  stepId: string
  label: string
  plannedDurationMs: number
  actualDurationMs: number
  pausedDurationMs: number
  status: 'completed' | 'skipped' | 'interrupted'
}

/**
 * Compute total active elapsed time (excluding pauses).
 * Sum of completed steps' actual durations + current step's active elapsed.
 */
function computeTotalElapsed(
  timings: StepTiming[],
  currentElapsedMs: number,
): number {
  let total = 0
  for (const t of timings) {
    total += t.actualDurationMs
  }
  total += currentElapsedMs
  return total
}

export function useTimer(steps: Step[]) {
  const phase = ref<TimerPhase>('idle')
  const currentStepIndex = ref(0)
  const stepRemainingMs = ref(0)
  const stepElapsedMs = ref(0)
  const totalElapsedMs = ref(0)
  const isStepPaused = ref(false)
  const stepTimings = ref<StepTiming[]>([])
  const startedAt = ref(0)

  let worker: Worker | null = null
  let workerPauseRefCount = 0

  worker = new Worker(
    new URL('../services/timer-worker.ts', import.meta.url),
    { type: 'module' },
  )

  worker.onmessage = (event: MessageEvent) => {
    const msg = event.data

    switch (msg.type) {
      case 'tick': {
        stepRemainingMs.value = msg.remainingMs
        stepElapsedMs.value = msg.elapsedMs
        if (typeof msg.stepIndex === 'number') {
          currentStepIndex.value = msg.stepIndex
        }
        totalElapsedMs.value = computeTotalElapsed(
          stepTimings.value,
          stepElapsedMs.value,
        )
        break
      }

      case 'stepComplete': {
        const idx: number = msg.stepIndex
        stepTimings.value.push({
          stepId: steps[idx]?.id ?? '',
          label: steps[idx]?.label ?? '',
          plannedDurationMs: steps[idx]?.durationMs ?? 0,
          actualDurationMs: msg.actualElapsedMs ?? steps[idx]?.durationMs ?? 0,
          pausedDurationMs: msg.pausedDurationMs ?? 0,
          status: 'completed',
        })
        // Advance past the completed step so the UI immediately shows it as done,
        // without waiting for the next tick (~200ms later).
        // Zero-duration step completions that follow will advance further.
        if (currentStepIndex.value <= idx) {
          currentStepIndex.value = idx + 1
        }
        totalElapsedMs.value = computeTotalElapsed(stepTimings.value, 0)
        break
      }

      case 'procedureComplete': {
        phase.value = 'completed'
        totalElapsedMs.value = computeTotalElapsed(stepTimings.value, 0)
        break
      }

      case 'paused': {
        isStepPaused.value = true
        break
      }

      case 'resumed': {
        isStepPaused.value = false
        break
      }
    }
  }

  function start(): void {
    phase.value = 'running'
    currentStepIndex.value = 0
    stepRemainingMs.value = 0
    stepElapsedMs.value = 0
    totalElapsedMs.value = 0
    isStepPaused.value = false
    stepTimings.value = []
    startedAt.value = Date.now()
    workerPauseRefCount = 0

    worker?.postMessage({
      type: 'start',
      steps: steps.map(s => ({
        id: s.id,
        label: s.label,
        durationMs: s.durationMs,
        notes: s.notes,
      })),
    })
  }

  /** Start the timer from a specific step, skipping all earlier steps. */
  function startFrom(index: number): void {
    phase.value = 'running'
    currentStepIndex.value = index
    stepRemainingMs.value = 0
    stepElapsedMs.value = 0
    totalElapsedMs.value = 0
    isStepPaused.value = false
    startedAt.value = Date.now()
    workerPauseRefCount = 0

    // Mark steps before index as skipped so they appear in history
    stepTimings.value = []
    for (let i = 0; i < index; i++) {
      stepTimings.value.push({
        stepId: steps[i]?.id ?? '',
        label: steps[i]?.label ?? '',
        plannedDurationMs: steps[i]?.durationMs ?? 0,
        actualDurationMs: 0,
        pausedDurationMs: 0,
        status: 'skipped' as const,
      })
    }

    worker?.postMessage({
      type: 'start',
      steps: steps.map(s => ({
        id: s.id,
        label: s.label,
        durationMs: s.durationMs,
        notes: s.notes,
      })),
      startIndex: index,
    })
  }

  function pause(): void {
    if (phase.value !== 'running') return
    phase.value = 'paused'
    workerPauseRefCount++
    if (workerPauseRefCount === 1) {
      worker?.postMessage({ type: 'pause' })
    }
  }

  function resume(): void {
    if (phase.value !== 'paused') return
    phase.value = 'running'
    workerPauseRefCount--
    if (workerPauseRefCount === 0) {
      worker?.postMessage({ type: 'resume' })
    }
  }

  function stop(): void {
    workerPauseRefCount = 0
    worker?.postMessage({ type: 'stop' })
    phase.value = 'idle'
    totalElapsedMs.value = computeTotalElapsed(stepTimings.value, stepElapsedMs.value)
  }

  /** Pause the current step without changing the outer procedure phase. */
  function pauseStep(): void {
    if (isStepPaused.value) return
    isStepPaused.value = true
    workerPauseRefCount++
    if (workerPauseRefCount === 1) {
      worker?.postMessage({ type: 'pause' })
    }
  }

  /** Resume the current step without changing the outer procedure phase. */
  function resumeStep(): void {
    if (!isStepPaused.value) return
    isStepPaused.value = false
    workerPauseRefCount--
    if (workerPauseRefCount === 0) {
      worker?.postMessage({ type: 'resume' })
    }
  }

  /** Skip directly to a given step index. Marks skipped steps in history. */
  function skipTo(index: number): void {
    if (phase.value !== 'running' && phase.value !== 'paused') return

    // Record steps we're jumping past as skipped
    const currentIdx = currentStepIndex.value
    for (let i = currentIdx; i < index; i++) {
      const alreadyRecorded = stepTimings.value.some(t => t.stepId === steps[i]?.id)
      if (!alreadyRecorded && steps[i]) {
        stepTimings.value.push({
          stepId: steps[i].id,
          label: steps[i].label,
          plannedDurationMs: steps[i].durationMs,
          actualDurationMs: 0,
          pausedDurationMs: 0,
          status: 'skipped' as const,
        })
      }
    }

    currentStepIndex.value = index
    isStepPaused.value = false
    workerPauseRefCount = 0
    phase.value = 'running'

    worker?.postMessage({ type: 'skipTo', stepIndex: index })
  }

  function getSummaryData(): {
    steps: StepTiming[]
    totalElapsedMs: number
    status: 'completed' | 'interrupted'
  } {
    return {
      steps: stepTimings.value,
      totalElapsedMs: totalElapsedMs.value,
      status: phase.value === 'completed' ? 'completed' : 'interrupted',
    }
  }

  onUnmounted(() => {
    worker?.postMessage({ type: 'stop' })
    worker?.terminate()
  })

  return {
    phase,
    currentStepIndex,
    stepRemainingMs,
    stepElapsedMs,
    totalElapsedMs,
    isStepPaused,
    stepTimings,
    startedAt,
    start,
    startFrom,
    pause,
    resume,
    stop,
    pauseStep,
    resumeStep,
    skipTo,
    getSummaryData,
  }
}
