<script setup lang="ts">
import { computed, ref } from 'vue'

/* ── Props & Emits ────────────────────────────────────────────────── */

const props = defineProps<{
  step: { label: string; durationMs: number; notes: string }
  index: number
  isDraggable?: boolean
}>()

const emit = defineEmits<{
  update: [partial: { label?: string; durationMs?: number; notes?: string }]
  delete: []
}>()

/* ── Duration helpers ─────────────────────────────────────────────── */

function formatDuration(ms: number): string {
  const totalSec = Math.round(ms / 1000)
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  if (h > 0) {
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function parseDuration(str: string): number {
  const parts = str.split(':')
  if (parts.length === 2) {
    const m = parseInt(parts[0], 10)
    const s = parseInt(parts[1], 10)
    if (!isNaN(m) && !isNaN(s)) {
      return (m * 60 + s) * 1000
    }
  }
  if (parts.length === 3) {
    const h = parseInt(parts[0], 10)
    const m = parseInt(parts[1], 10)
    const s = parseInt(parts[2], 10)
    if (!isNaN(h) && !isNaN(m) && !isNaN(s)) {
      return (h * 3600 + m * 60 + s) * 1000
    }
  }
  return 0
}

/* ── Duration presets ─────────────────────────────────────────────── */

const DURATION_PRESETS = [
  { label: '15s', ms: 15000 },
  { label: '30s', ms: 30000 },
  { label: '60s', ms: 60000 },
  { label: '90s', ms: 90000 },
  { label: '2min', ms: 120000 },
  { label: '5min', ms: 300000 },
  { label: '10min', ms: 600000 },
] as const

/* ── Display ──────────────────────────────────────────────────────── */

const durationDisplay = computed(() => formatDuration(props.step.durationMs))

/* ── Validation state ─────────────────────────────────────────────── */

const labelBlurred = ref(false)

function onLabelBlur() {
  labelBlurred.value = true
}

function onLabelInput(e: Event) {
  const value = (e.target as HTMLInputElement).value
  emit('update', { label: value })
}

function onDurationChange(e: Event) {
  const value = (e.target as HTMLInputElement).value
  const ms = parseDuration(value)
  if (ms > 0) {
    emit('update', { durationMs: ms })
  }
}

function selectPreset(ms: number) {
  emit('update', { durationMs: ms })
}

function onNotesInput(e: Event) {
  const value = (e.target as HTMLTextAreaElement).value
  emit('update', { notes: value })
}
</script>

<template>
  <div
    class="relative bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-4 space-y-3 transition-all hover:shadow-md"
  >
    <!-- ═══ Row 1: Drag handle + step number + label ═══ -->
    <div class="flex items-start gap-3">
      <!-- Drag handle -->
      <div
        v-if="isDraggable"
        class="mt-2 flex-shrink-0 cursor-grab active:cursor-grabbing text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
        aria-label="Drag to reorder"
      >
        <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M8 5h2v2H8V5zm6 0h2v2h-2V5zM8 11h2v2H8v-2zm6 0h2v2h-2v-2zm-6 6h2v2H8v-2zm6 0h2v2h-2v-2z" />
        </svg>
      </div>

      <!-- Step number badge -->
      <div
        class="flex-shrink-0 mt-1.5 flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-xs font-semibold"
        aria-hidden="true"
      >
        {{ index + 1 }}
      </div>

      <!-- Label input -->
      <div class="flex-1 min-w-0">
        <input
          :value="step.label"
          type="text"
          @input="onLabelInput"
          @blur="onLabelBlur"
          placeholder="e.g. Mix at slow speed"
          required
          aria-label="Step label"
          class="w-full px-3 py-2 text-sm rounded-lg border bg-gray-50 dark:bg-gray-800 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:focus-visible:ring-blue-400"
          :class="[
            !step.label && labelBlurred
              ? 'border-red-400 dark:border-red-500 focus-visible:ring-red-400'
              : 'border-gray-300 dark:border-gray-600'
          ]"
        />
        <p
          v-if="!step.label && labelBlurred"
          class="mt-1 text-xs text-red-500 dark:text-red-400"
        >
          Label is required
        </p>
      </div>
    </div>

    <!-- ═══ Row 2: Duration picker + Delete button ═══ -->
    <div class="flex items-center gap-2">
      <div class="flex items-center gap-2 flex-1 min-w-0">
        <label class="text-sm font-medium text-gray-600 dark:text-gray-400 whitespace-nowrap">
          Duration
        </label>
        <input
          :value="durationDisplay"
          @change="onDurationChange"
          type="text"
          inputmode="numeric"
          aria-label="Duration in minutes:seconds"
          class="w-24 px-2.5 py-2 text-sm font-mono text-center rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 dark:text-gray-100 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:focus-visible:ring-blue-400"
        />
      </div>

      <!-- Delete button -->
      <button
        @click="emit('delete')"
        class="flex-shrink-0 flex items-center justify-center w-9 h-9 rounded-lg text-red-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
        aria-label="Delete step"
        type="button"
      >
        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>

    <!-- ═══ Row 3: Duration presets ═══ -->
    <div class="flex flex-wrap gap-1.5">
      <button
        v-for="preset in DURATION_PRESETS"
        :key="preset.label"
        @click="selectPreset(preset.ms)"
        type="button"
        class="px-3 py-1.5 text-xs font-medium rounded-md border transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 min-w-[44px]"
        :class="
          step.durationMs === preset.ms
            ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700'
            : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
        "
      >
        {{ preset.label }}
      </button>
    </div>

    <!-- ═══ Row 4: Notes ═══ -->
    <div>
      <textarea
        :value="step.notes"
        @input="onNotesInput"
        placeholder="e.g. Scrape down mortar during first 15s"
        rows="2"
        aria-label="Step notes"
        class="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 resize-y min-h-[44px] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:focus-visible:ring-blue-400"
      />
    </div>
  </div>
</template>
