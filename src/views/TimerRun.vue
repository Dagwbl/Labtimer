<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, shallowRef } from 'vue'
import { useRouter, useRoute, onBeforeRouteLeave } from 'vue-router'
import type { Step, TimerPhase, ExperimentRecord } from '@/types'
import { recipeService } from '@/services/recipe-service'
import { historyService } from '@/services/history-service'
import { useTimer } from '@/composables/useTimer'
import { useSound } from '@/composables/useSound'
import { setTimerActive } from '@/services/active-timer'
import { useDarkMode } from '@/composables/useDarkMode'

const router = useRouter()
const route = useRoute()
const { notifyStepComplete } = useSound()
const { isDark, toggleDark } = useDarkMode()

// ── Recipe state ────────────────────────────────────────────────────────────

const recipeName = ref('')
const steps = ref<Step[]>([])
const loading = ref(true)
const error = ref('')

// ── Step-completion bounce state ────────────────────────────────────────────

const justCompletedIndex = ref(-1)

// ── Timer (created lazily after steps load) ─────────────────────────────────

const timer = shallowRef<ReturnType<typeof useTimer> | null>(null)

// Derived reactive state (top-level auto-unwrapped refs for template)
const phase = computed<TimerPhase>(() => timer.value?.phase.value ?? 'idle')
const currentStepIndex = computed(() => timer.value?.currentStepIndex.value ?? 0)
const stepRemainingMs = computed(() => timer.value?.stepRemainingMs.value ?? 0)
const totalElapsedMs = computed(() => timer.value?.totalElapsedMs.value ?? 0)
const isStepPaused = computed(() => timer.value?.isStepPaused.value ?? false)

// ── Load recipe on mount ────────────────────────────────────────────────────

onMounted(async () => {
  try {
    const id = route.params.id as string
    const { recipe, steps: loadedSteps } = await recipeService.getRecipe(id)
    if (loadedSteps.length === 0) {
      error.value = 'This recipe has no steps'
      loading.value = false
      return
    }
    recipeName.value = recipe.name
    steps.value = loadedSteps
    // Create the timer composable now that steps are available
    timer.value = useTimer(loadedSteps)
  } catch (e) {
    error.value = 'Failed to load recipe'
  }
  loading.value = false
})

// Warn when navigating away during an active timer
onBeforeRouteLeave((_to, _from, next) => {
  if (phase.value === 'running' || phase.value === 'paused') {
    if (!window.confirm('A timer is still running. Leaving will interrupt the current procedure. Continue?')) {
      next(false)
      return
    }
    savedCompletion = true
    timer.value?.stop()
    saveInterruptedRecord()
    setTimerActive(false)
  }
  next()
})

// Clean up active timer flag when leaving the page
onUnmounted(() => {
  setTimerActive(false)
})

// ── Detect step completion via stepTimings growth ──────────────────────────

watch(() => timer.value?.stepTimings.value.length ?? 0, (newLen, oldLen) => {
  if (newLen > oldLen && timer.value) {
    const completedIdx = newLen - 1
    justCompletedIndex.value = completedIdx
    notifyStepComplete()
    // Clear the animation class after the bounce finishes
    setTimeout(() => {
      if (justCompletedIndex.value === completedIdx) {
        justCompletedIndex.value = -1
      }
    }, 500)
  }
})

// ── Detect procedure completion ────────────────────────────────────────────

// Using lastStepCompleted flag to avoid double-saving
let savedCompletion = false

watch(phase, (newPhase, oldPhase) => {
  if (newPhase === 'completed' && oldPhase !== 'completed') {
    setTimerActive(false)
    if (!savedCompletion) {
      savedCompletion = true
      // Wait a tick for transition overlay to render, then auto-save
      setTimeout(() => {
        saveCompletedRecord()
      }, 0)
    }
  }
})

// ── Compute celebration visibility ─────────────────────────────────────────

const showCelebration = computed(() => phase.value === 'completed')

// ── Step status helper ─────────────────────────────────────────────────────

type StepDisplayStatus = 'completed' | 'active' | 'upcoming'

function getStepStatus(index: number): StepDisplayStatus {
  if (index < currentStepIndex.value) return 'completed'
  if (index === currentStepIndex.value) return 'active'
  return 'upcoming'
}

// ── Format helpers ─────────────────────────────────────────────────────────

function formatTime(ms: number): string {
  const totalSec = Math.max(0, Math.ceil(ms / 1000))
  const hrs = Math.floor(totalSec / 3600)
  const min = Math.floor((totalSec % 3600) / 60)
  const sec = totalSec % 60
  if (hrs > 0) {
    return `${hrs}:${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
  }
  return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}

function formatElapsed(ms: number): string {
  const totalSec = Math.floor(ms / 1000)
  const hrs = Math.floor(totalSec / 3600)
  const min = Math.floor((totalSec % 3600) / 60)
  const sec = totalSec % 60
  if (hrs > 0) return `${hrs}h ${min}m ${sec}s`
  if (min > 0) return `${min}m ${sec}s`
  return `${sec}s`
}

function progressPercent(): number {
  if (phase.value !== 'running' && phase.value !== 'paused') return 0
  const step = steps.value[currentStepIndex.value]
  if (!step || step.durationMs === 0) return 0
  return ((step.durationMs - stepRemainingMs.value) / step.durationMs) * 100
}

// ── Timer control handlers ─────────────────────────────────────────────────

function handleStart() {
  timer.value?.start()
  setTimerActive(true)
}

function handleStartFrom(index: number) {
  timer.value?.startFrom(index)
  setTimerActive(true)
}

function handlePause() {
  timer.value?.pause()
}

function handleResume() {
  timer.value?.resume()
}

function handleStop() {
  savedCompletion = true
  timer.value?.stop()
  saveInterruptedRecord()
  setTimerActive(false)
  router.push('/')
}

function handleStepPause() {
  if (isStepPaused.value) {
    timer.value?.resumeStep()
  } else {
    timer.value?.pauseStep()
  }
}

function handleSkipTo(index: number) {
  timer.value?.skipTo(index)
}

function handleReRun() {
  savedCompletion = false
  // Reset and restart without page reload
  timer.value?.start()
  setTimerActive(true)
}

function handleBack() {
  // If timer is running, confirm stop
  if (phase.value === 'running' || phase.value === 'paused') {
    if (!window.confirm('Stop the current procedure and go back?')) return
    savedCompletion = true
    timer.value?.stop()
    saveInterruptedRecord()
    setTimerActive(false)
  }
  router.push('/')
}

// ── History save helpers ───────────────────────────────────────────────────

function buildSummaryData() {
  return timer.value?.getSummaryData() ?? {
    steps: [],
    totalElapsedMs: 0,
    status: 'interrupted' as const,
  }
}

function saveCompletedRecord() {
  const summary = buildSummaryData()
  if (steps.value.length === 0) return
  const record: ExperimentRecord = {
    id: crypto.randomUUID(),
    recipeId: route.params.id as string,
    recipeName: recipeName.value,
    startedAt: timer.value?.startedAt.value ?? Date.now(),
    completedAt: Date.now(),
    totalDurationMs: summary.totalElapsedMs,
    steps: steps.value.map((s, i) => ({
      stepId: s.id,
      label: s.label,
      plannedDurationMs: s.durationMs,
      actualDurationMs: summary.steps[i]?.actualDurationMs ?? 0,
      pausedDurationMs: summary.steps[i]?.pausedDurationMs ?? 0,
      status: 'completed' as const,
    })),
    status: 'completed' as const,
  }
  historyService.saveRecord(record)
}

function saveInterruptedRecord() {
  const summary = buildSummaryData()
  if (steps.value.length === 0) return
  const record: ExperimentRecord = {
    id: crypto.randomUUID(),
    recipeId: route.params.id as string,
    recipeName: recipeName.value,
    startedAt: timer.value?.startedAt.value ?? Date.now(),
    completedAt: Date.now(),
    totalDurationMs: summary.totalElapsedMs,
    steps: steps.value.map((s, i) => ({
      stepId: s.id,
      label: s.label,
      plannedDurationMs: s.durationMs,
      actualDurationMs: i === currentStepIndex.value
        ? timer.value?.stepElapsedMs.value ?? 0
        : (summary.steps[i]?.actualDurationMs ?? 0),
      pausedDurationMs: summary.steps[i]?.pausedDurationMs ?? 0,
      status: i < currentStepIndex.value ? 'completed' : 'interrupted',
    })),
    status: 'interrupted',
  }
  historyService.saveRecord(record)
}
</script>

<template>
  <div class="flex flex-col h-full">
    <!-- ═══ Header ═══ -->
    <header
      class="bg-gray-50/90 dark:bg-gray-950/90 backdrop-blur-sm border-b border-gray-200 dark:border-gray-800"
    >
      <div class="flex items-center gap-2 px-4 h-14">
        <!-- Back -->
        <button
          @click="handleBack"
          class="flex items-center justify-center w-10 h-10 -ml-1 rounded-lg text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-200/60 dark:hover:bg-gray-800/60 transition-colors flex-shrink-0"
          aria-label="Go back"
        >
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
        </button>

        <!-- Spacer to push menu to the right -->
        <div class="flex-1" />

        <!-- Elapsed time (only when timer is active) -->
        <span
          v-if="timer && phase !== 'idle' && phase !== 'completed'"
          class="flex-shrink-0 text-sm font-mono tabular-nums text-gray-500 dark:text-gray-400"
        >
          {{ formatElapsed(totalElapsedMs) }}
        </span>

        <!-- Stop button (running/paused) -->
        <button
          v-if="timer && (phase === 'running' || phase === 'paused')"
          @click="handleStop"
          class="flex items-center justify-center w-9 h-9 rounded-lg text-red-500 hover:text-red-700 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex-shrink-0"
          aria-label="Stop procedure"
          title="Stop"
        >
          <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M6 6h12v12H6z" />
          </svg>
        </button>

        <!-- Pause / Resume button (running/paused) -->
        <button
          v-if="phase === 'running'"
          @click="handlePause"
          class="flex items-center justify-center w-9 h-9 rounded-lg text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-200/60 dark:hover:bg-gray-800/60 transition-colors flex-shrink-0"
          aria-label="Pause"
          title="Pause"
        >
          <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
          </svg>
        </button>
        <button
          v-else-if="phase === 'paused'"
          @click="handleResume"
          class="flex items-center justify-center w-9 h-9 rounded-lg text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors flex-shrink-0"
          aria-label="Resume"
          title="Resume"
        >
          <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
        </button>

        <button
          @click="toggleDark"
          class="flex items-center justify-center w-10 h-10 rounded-lg text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-200/60 dark:hover:bg-gray-800/60 transition-colors flex-shrink-0"
          :aria-label="isDark ? 'Switch to light mode' : 'Switch to dark mode'"
        >
          <svg v-if="isDark" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
          </svg>
          <svg v-else class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
          </svg>
        </button>
      </div>
    </header>

    <!-- ═══ Content area ═══ -->
    <div class="flex-1 overflow-y-auto">
      <!-- ── Loading ── -->
      <div
        v-if="loading"
        class="flex flex-col items-center justify-center py-24 text-gray-400 dark:text-gray-500"
      >
        <svg class="w-8 h-8 animate-spin mb-3" viewBox="0 0 24 24" fill="none">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <span class="text-sm">Loading recipe&hellip;</span>
      </div>

      <!-- ── Error ── -->
      <div
        v-else-if="error"
        class="flex flex-col items-center justify-center py-24 text-center px-6"
      >
        <svg class="w-16 h-16 text-red-300 dark:text-red-700 mb-4" fill="none" viewBox="0 0 24 24" stroke-width="1" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
        </svg>
        <p class="text-gray-600 dark:text-gray-400 text-sm mb-6">{{ error }}</p>
        <button
          @click="handleBack"
          class="px-5 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 active:scale-[0.98] transition-all"
        >
          Back to Recipes
        </button>
      </div>

      <!-- ── Idle state ── -->
      <div
        v-else-if="phase === 'idle' && !loading && !error"
        class="flex flex-col items-center justify-center text-center px-6 pt-4"
      >
        <h1 class="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          {{ recipeName }}
        </h1>
        <p class="text-sm text-gray-500 dark:text-gray-400 mb-2">
          {{ steps.length }} {{ steps.length === 1 ? 'step' : 'steps' }} &middot; Total ~{{ formatElapsed(steps.reduce((acc, s) => acc + s.durationMs, 0)) }}
        </p>
        <button
          @click="handleStart"
          class="flex items-center gap-2 px-8 py-3.5 text-base font-semibold text-white bg-blue-600 rounded-xl shadow-lg hover:bg-blue-700 active:scale-[0.97] transition-all focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-300"
        >
          <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
          Start Procedure
        </button>

        <!-- Step preview in idle state -->
        <div class="mt-10 w-full max-w-md space-y-2">
          <p class="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">Steps</p>
          <div
            v-for="(step, index) in steps"
            :key="step.id"
            class="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800"
          >
            <span class="flex-shrink-0 w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-xs font-medium text-gray-500 dark:text-gray-400">
              {{ index + 1 }}
            </span>
            <span class="flex-1 min-w-0 text-sm text-gray-700 dark:text-gray-300 truncate">
              {{ step.label }}
            </span>
            <span class="flex-shrink-0 text-xs font-mono text-gray-400 dark:text-gray-500 mr-1">
              {{ formatTime(step.durationMs) }}
            </span>
            <button
              @click="handleStartFrom(index)"
              class="flex items-center justify-center w-8 h-8 rounded-full text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors flex-shrink-0"
              :aria-label="'Start from step ' + (index + 1)"
              :title="'Start from ' + step.label"
            >
              <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <!-- ── Running / Paused state ── -->
      <div
        v-else-if="timer && (phase === 'running' || phase === 'paused')"
        class="px-4 pt-4 pb-6"
      >
        <!-- Steps progress list -->
        <div class="space-y-2">
          <div
            v-for="(step, index) in steps"
            :key="step.id"
            :class="[
              'relative rounded-xl border transition-all',
              getStepStatus(index) === 'active'
                ? 'overflow-hidden border-blue-200 dark:border-blue-800 shadow-sm'
                : getStepStatus(index) === 'completed'
                  ? 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 opacity-70'
                  : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 opacity-50',
            ]"
          >
            <!-- Completed step -->
            <div v-if="getStepStatus(index) === 'completed'" class="flex items-center gap-2 px-4 py-3">
              <span
                class="flex-shrink-0 w-7 h-7 rounded-full bg-green-100 dark:bg-green-900/60 flex items-center justify-center"
                :class="{ 'step-just-completed': justCompletedIndex === index }"
              >
                <svg class="w-4 h-4 text-green-600 dark:text-green-300" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              </span>
              <span class="flex-1 min-w-0 text-sm text-gray-500 dark:text-gray-400 line-through truncate">
                {{ step.label }}
              </span>
              <button
                @click="handleSkipTo(index)"
                class="flex items-center justify-center w-8 h-8 rounded-full text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors flex-shrink-0"
                :aria-label="'Restart from step ' + (index + 1)"
                :title="'Restart from ' + step.label"
              >
                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </button>
            </div>

            <!-- Active step -->
            <div v-else-if="getStepStatus(index) === 'active'" class="relative">
              <!-- Progress gradient overlay -->
              <div
                class="absolute inset-y-0 left-0 transition-all duration-200 ease-linear pointer-events-none"
                :style="{
                  width: Math.min(progressPercent(), 100) + '%',
                  background: 'radial-gradient( circle farthest-corner at -0.1% 100.8%,  rgba(0,234,255,1) 0.2%, rgba(0,124,255,1) 59.1%, rgba(198,0,255,1) 100.2% )',
                }"
              />
              <div class="relative z-10 px-4 py-3">
                <div class="flex items-center gap-3">
                  <span class="flex-shrink-0 w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center">
                    <span class="text-xs font-bold text-white">{{ index + 1 }}</span>
                  </span>
                  <span class="flex-1 min-w-0 text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                    {{ step.label }}
                  </span>
                  <span class="flex-shrink-0 text-lg font-mono font-bold tabular-nums text-blue-700 dark:text-blue-300">
                    {{ formatTime(stepRemainingMs) }}
                  </span>
                  <!-- Per-step pause button -->
                  <button
                    @click="handleStepPause"
                    class="flex items-center justify-center w-8 h-8 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-200/60 dark:hover:bg-gray-700/60 transition-colors flex-shrink-0"
                    :aria-label="isStepPaused ? 'Resume step' : 'Pause step'"
                  >
                    <svg v-if="isStepPaused" class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                    <svg v-else class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                    </svg>
                  </button>
                </div>

                <!-- Paused indicator -->
                <div
                  v-if="isStepPaused"
                  class="mt-2 inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/40 rounded-full"
                >
                  <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                  </svg>
                  Step Paused
                </div>
              </div>
            </div>

            <!-- Upcoming step -->
            <div v-else class="flex items-center gap-2 px-4 py-3">
              <span class="flex-shrink-0 w-7 h-7 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                <span class="text-xs font-medium text-gray-400 dark:text-gray-500">{{ index + 1 }}</span>
              </span>
              <span class="flex-1 min-w-0 text-sm text-gray-400 dark:text-gray-500 truncate">
                {{ step.label }}
              </span>
              <button
                @click="handleSkipTo(index)"
                class="flex items-center justify-center w-8 h-8 rounded-full text-blue-500 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors flex-shrink-0"
                :aria-label="'Skip to step ' + (index + 1)"
                :title="'Skip to ' + step.label"
              >
                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        <!-- Current step notes -->
        <div
          v-if="steps[currentStepIndex]?.notes"
          class="mt-4 p-4 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800"
        >
          <p class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
            Step Notes
          </p>
          <p class="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
            {{ steps[currentStepIndex].notes }}
          </p>
        </div>
      </div>

      <!-- ── Completed / Celebration ── -->
      <div
        v-else-if="showCelebration"
        class="flex flex-col items-center justify-center py-24 text-center px-6 relative overflow-hidden"
      >
        <!-- Confetti-like decoration -->
        <div class="confetti-container" aria-hidden="true">
          <span class="confetti confetti--1" />
          <span class="confetti confetti--2" />
          <span class="confetti confetti--3" />
          <span class="confetti confetti--4" />
          <span class="confetti confetti--5" />
          <span class="confetti confetti--6" />
          <span class="confetti confetti--7" />
          <span class="confetti confetti--8" />
        </div>

        <!-- Large checkmark -->
        <div class="w-24 h-24 rounded-full bg-green-100 dark:bg-green-900/60 flex items-center justify-center mb-6 animate-bounce-in">
          <svg class="w-12 h-12 text-green-600 dark:text-green-300" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        </div>

        <h2 class="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          Procedure Complete!
        </h2>
        <p class="text-sm text-gray-500 dark:text-gray-400 mb-2">
          {{ recipeName }}
        </p>
        <p class="text-xs text-gray-400 dark:text-gray-500 mb-8">
          Completed in {{ formatElapsed(totalElapsedMs) }} &middot; {{ steps.length }} {{ steps.length === 1 ? 'step' : 'steps' }}
        </p>

        <div class="flex gap-3">
          <button
            @click="handleReRun"
            class="flex items-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-blue-600 rounded-xl shadow-lg hover:bg-blue-700 active:scale-[0.97] transition-all focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-300"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
            </svg>
            Re-run
          </button>
          <button
            @click="handleBack"
            class="flex items-center gap-2 px-6 py-3 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 active:scale-[0.97] transition-all"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
            </svg>
            Back to List
          </button>
        </div>
      </div>
    </div>

  </div>
</template>

<style scoped>
/* ── Step-completed bounce animation ── */
@keyframes step-bounce {
  0% {
    transform: scale(1);
  }
  40% {
    transform: scale(1.35);
  }
  100% {
    transform: scale(1);
  }
}

.step-just-completed {
  animation: step-bounce 0.45s ease-out forwards;
}

/* ── Bounce-in animation for celebration checkmark ── */
@keyframes bounce-in {
  0% {
    transform: scale(0);
    opacity: 0;
  }
  50% {
    transform: scale(1.25);
  }
  70% {
    transform: scale(0.9);
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

.animate-bounce-in {
  animation: bounce-in 0.6s ease-out forwards;
}

/* ── Confetti styles ── */
.confetti-container {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
}

.confetti {
  position: absolute;
  width: 8px;
  height: 8px;
  border-radius: 2px;
  opacity: 0;
  animation: confetti-fall 2.5s ease-out forwards;
}

.confetti--1 {
  top: -10px;
  left: 10%;
  background: #3b82f6;
  animation-delay: 0s;
  width: 6px;
  height: 6px;
}

.confetti--2 {
  top: -10px;
  left: 25%;
  background: #22c55e;
  animation-delay: 0.15s;
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.confetti--3 {
  top: -10px;
  left: 45%;
  background: #f59e0b;
  animation-delay: 0.3s;
  width: 7px;
  height: 7px;
}

.confetti--4 {
  top: -10px;
  left: 60%;
  background: #ef4444;
  animation-delay: 0.1s;
  width: 9px;
  height: 9px;
  border-radius: 50%;
}

.confetti--5 {
  top: -10px;
  left: 75%;
  background: #8b5cf6;
  animation-delay: 0.4s;
  width: 6px;
  height: 6px;
}

.confetti--6 {
  top: -10px;
  left: 88%;
  background: #ec4899;
  animation-delay: 0.2s;
  width: 8px;
  height: 8px;
}

.confetti--7 {
  top: -10px;
  left: 35%;
  background: #06b6d4;
  animation-delay: 0.35s;
  width: 5px;
  height: 5px;
  border-radius: 50%;
}

.confetti--8 {
  top: -10px;
  left: 55%;
  background: #f97316;
  animation-delay: 0.25s;
  width: 7px;
  height: 7px;
}

@keyframes confetti-fall {
  0% {
    transform: translateY(0) rotate(0deg) scale(0);
    opacity: 1;
  }
  20% {
    transform: translateY(30px) rotate(180deg) scale(1);
    opacity: 1;
  }
  100% {
    transform: translateY(300px) rotate(720deg) scale(0.5);
    opacity: 0;
  }
}
</style>
