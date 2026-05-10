/**
 * Timer Web Worker — wall-clock anchored timer for the Lab Timer PWA.
 *
 * Uses setInterval at 200ms with wall clock correction via performance.now()
 * to maintain <200ms accuracy. Workers don't throttle intervals as aggressively
 * as the main thread, making this approach reliable.
 *
 * Timer may pause when device is locked (iOS Safari limitation).
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface WorkerStep {
  id: string;
  label: string;
  durationMs: number;
  notes: string;
}

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

interface TimerState {
  steps: WorkerStep[];
  currentStepIndex: number;
  /** Wall-clock timestamp (performance.now() epoch) when current step ends. */
  stepEndTime: number;
  /** Remaining ms captured at pause time, restored on resume. */
  pausedRemainingMs: number;
  intervalId: ReturnType<typeof setInterval> | null;
  running: boolean;
  paused: boolean;
  /** performance.now() when current pause started, null if not paused. */
  pausedAt: number | null;
  /** Cumulative pause wall-clock time during the current step. */
  stepPausedDurationMs: number;
}

const state: TimerState = {
  steps: [],
  currentStepIndex: 0,
  stepEndTime: 0,
  pausedRemainingMs: 0,
  intervalId: null,
  running: false,
  paused: false,
  pausedAt: null,
  stepPausedDurationMs: 0,
};

// ---------------------------------------------------------------------------
// Interval helpers
// ---------------------------------------------------------------------------

function startInterval(): void {
  if (state.intervalId !== null) {
    clearInterval(state.intervalId);
  }
  state.intervalId = setInterval(onTick, 200);
}

function stopInterval(): void {
  if (state.intervalId !== null) {
    clearInterval(state.intervalId);
    state.intervalId = null;
  }
}

// ---------------------------------------------------------------------------
// Step advancement
// ---------------------------------------------------------------------------

/**
 * Advance to the next non-zero-duration step.
 * Returns true if a valid step was found, false if all steps are exhausted.
 */
function advanceToNextStep(): boolean {
  state.currentStepIndex++;
  state.stepPausedDurationMs = 0;
  state.pausedAt = null;

  while (state.currentStepIndex < state.steps.length) {
    const step = state.steps[state.currentStepIndex];
    if (step.durationMs > 0) {
      state.stepEndTime = performance.now() + step.durationMs;
      return true;
    }
    // Zero-duration step: emit immediate completion and keep advancing
    self.postMessage({
      type: 'stepComplete',
      stepIndex: state.currentStepIndex,
    });
    state.currentStepIndex++;
  }

  return false; // No more steps
}

// ---------------------------------------------------------------------------
// Tick (called every ~200ms via setInterval)
// ---------------------------------------------------------------------------

function onTick(): void {
  if (!state.running || state.paused) return;

  const remaining = state.stepEndTime - performance.now();

  if (remaining <= 0) {
    // Current step is done
    const completedIndex = state.currentStepIndex;
    const step = state.steps[completedIndex];
    self.postMessage({
      type: 'stepComplete',
      stepIndex: completedIndex,
      pausedDurationMs: state.stepPausedDurationMs,
      actualElapsedMs: step.durationMs,
    });

    const hasMore = advanceToNextStep();
    if (!hasMore) {
      self.postMessage({ type: 'procedureComplete' });
      stopInterval();
      state.running = false;
    }
    return;
  }

  const step = state.steps[state.currentStepIndex];
  const elapsedMs = step.durationMs - remaining;

  self.postMessage({
    type: 'tick',
    stepIndex: state.currentStepIndex,
    remainingMs: Math.ceil(remaining),
    elapsedMs: Math.ceil(elapsedMs),
  });
}

// ---------------------------------------------------------------------------
// Message dispatch
// ---------------------------------------------------------------------------

self.onmessage = (event: MessageEvent<{
  type: string;
  steps?: WorkerStep[];
  startTime?: number;
  stepIndex?: number;
  startIndex?: number;
}>): void => {
  const msg = event.data;

  switch (msg.type) {
    case 'start': {
      if (!msg.steps) break;

      state.steps = msg.steps;
      state.currentStepIndex = msg.startIndex ?? 0;
      state.paused = false;
      state.running = true;
      state.pausedAt = null;
      state.stepPausedDurationMs = 0;

      // Use the worker's own performance.now() — do NOT accept startTime from the
      // main thread, as performance.now() epochs can differ between contexts.
      const startTime = performance.now();

      // Skip any leading zero-duration steps from startIndex
      while (state.currentStepIndex < state.steps.length) {
        const step = state.steps[state.currentStepIndex];
        if (step.durationMs > 0) {
          state.stepEndTime = startTime + step.durationMs;
          break;
        }
        state.currentStepIndex++;
      }

      if (state.currentStepIndex >= state.steps.length) {
        // Every step was zero duration — nothing to time
        self.postMessage({ type: 'procedureComplete' });
        state.running = false;
        break;
      }

      startInterval();
      break;
    }

    case 'pause': {
      if (!state.running || state.paused) break;

      state.paused = true;
      state.pausedRemainingMs = Math.max(0, state.stepEndTime - performance.now());
      state.pausedAt = performance.now();
      stopInterval();

      self.postMessage({
        type: 'paused',
        stepIndex: state.currentStepIndex,
        remainingMs: Math.ceil(state.pausedRemainingMs),
      });
      break;
    }

    case 'resume': {
      if (!state.running || !state.paused) break;

      state.paused = false;
      if (state.pausedAt !== null) {
        state.stepPausedDurationMs += performance.now() - state.pausedAt;
        state.pausedAt = null;
      }
      state.stepEndTime = performance.now() + state.pausedRemainingMs;
      startInterval();

      self.postMessage({
        type: 'resumed',
        stepIndex: state.currentStepIndex,
        remainingMs: Math.ceil(state.pausedRemainingMs),
      });
      break;
    }

    case 'stop': {
      stopInterval();
      if (state.paused && state.pausedAt !== null) {
        state.stepPausedDurationMs += performance.now() - state.pausedAt;
      }
      state.running = false;
      state.paused = false;
      state.pausedAt = null;
      state.stepPausedDurationMs = 0;
      state.steps = [];
      break;
    }

    case 'skipTo': {
      if (!state.running) break;

      const targetIndex = msg.stepIndex ?? -1;
      if (targetIndex < 0 || targetIndex >= state.steps.length) break;

      state.currentStepIndex = targetIndex;
      state.paused = false;
      state.pausedAt = null;
      state.stepPausedDurationMs = 0;

      // If the target (or a subsequent zero-duration chain) exhausts all steps
      while (state.currentStepIndex < state.steps.length) {
        const step = state.steps[state.currentStepIndex];
        if (step.durationMs > 0) {
          state.stepEndTime = performance.now() + step.durationMs;
          break;
        }
        // Zero-duration: complete immediately and advance
        self.postMessage({
          type: 'stepComplete',
          stepIndex: state.currentStepIndex,
        });
        state.currentStepIndex++;
      }

      if (state.currentStepIndex >= state.steps.length) {
        self.postMessage({ type: 'procedureComplete' });
        stopInterval();
        state.running = false;
        break;
      }

      // Restart interval to apply new timing
      startInterval();
      break;
    }
  }
};
