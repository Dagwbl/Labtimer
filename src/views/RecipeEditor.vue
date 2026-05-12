<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import type { Step } from '@/types'
import { recipeService } from '@/services/recipe-service'
import { importExportService } from '@/services/import-export-service'
import { showToast } from '@/composables/useToast'
import { VueDraggable } from 'vue-draggable-plus'
import { useDarkMode } from '@/composables/useDarkMode'

const router = useRouter()
const { isDark, toggleDark } = useDarkMode()
const route = useRoute()
const isEditing = computed(() => route.params.id !== undefined)

interface EditableStep extends Omit<Step, 'id' | 'recipeId'> {
  durationHoursInput: string
  durationMinutesInput: string
  durationSecondsInput: string
}

type DurationField = 'durationHoursInput' | 'durationMinutesInput' | 'durationSecondsInput'

const recipeName = ref('')
const recipeDescription = ref('')
const steps = ref<EditableStep[]>([])
const saving = ref(false)
const loadError = ref('')
const validationError = ref('')
const hasEmptyLabel = computed(() => steps.value.some(s => !s.label.trim()))
const hasZeroDuration = computed(() => steps.value.some(s => s.durationMs <= 0))

onMounted(async () => {
  if (isEditing.value) {
    try {
      const id = route.params.id as string
      const { recipe, steps: loadedSteps } = await recipeService.getRecipe(id)
      recipeName.value = recipe.name
      recipeDescription.value = recipe.description
      steps.value = loadedSteps.map(s => {
        const parts = getDurationParts(s.durationMs)
        return {
          label: s.label,
          durationMs: s.durationMs,
          durationHoursInput: parts.hours,
          durationMinutesInput: parts.minutes,
          durationSecondsInput: parts.seconds,
          notes: s.notes,
          order: s.order,
        }
      })
      if (steps.value.length === 0) {
        addStep()
      }
    } catch {
      loadError.value = 'Recipe not found'
    }
  } else {
    addStep()
  }
})

/* ── Duration helpers ─────────────────────────────────────── */

function getDurationParts(ms: number): { hours: string; minutes: string; seconds: string } {
  const totalSec = Math.floor(Math.max(0, ms) / 1000)
  const hrs = Math.floor(totalSec / 3600)
  const min = Math.floor((totalSec % 3600) / 60)
  const sec = totalSec % 60
  return {
    hours: String(hrs).padStart(2, '0'),
    minutes: String(min).padStart(2, '0'),
    seconds: String(sec).padStart(2, '0'),
  }
}

function setDurationInputs(step: EditableStep, ms: number) {
  const parts = getDurationParts(ms)
  step.durationHoursInput = parts.hours
  step.durationMinutesInput = parts.minutes
  step.durationSecondsInput = parts.seconds
}

function parseDurationInputs(step: EditableStep): number | null {
  const rawHours = step.durationHoursInput.trim()
  const rawMinutes = step.durationMinutesInput.trim()
  const rawSeconds = step.durationSecondsInput.trim()
  if (!rawHours && !rawMinutes && !rawSeconds) return null
  if ([rawHours, rawMinutes, rawSeconds].some(raw => raw && !/^\d+$/.test(raw))) return null

  const hours = rawHours ? Number(rawHours) : 0
  const minutes = rawMinutes ? Number(rawMinutes) : 0
  const seconds = rawSeconds ? Number(rawSeconds) : 0
  if (!Number.isFinite(hours) || !Number.isFinite(minutes) || !Number.isFinite(seconds)) return null

  return Math.max(0, (hours * 3600 + minutes * 60 + seconds) * 1000)
}

/* ── Step actions ─────────────────────────────────────────── */

function addStep() {
  const defaultMs = 30000
  const newStep: EditableStep = {
    label: '',
    durationMs: defaultMs,
    durationHoursInput: '00',
    durationMinutesInput: '00',
    durationSecondsInput: '00',
    notes: '',
    order: steps.value.length,
  }
  setDurationInputs(newStep, defaultMs)
  steps.value.push(newStep)
}

function removeStep(index: number) {
  steps.value.splice(index, 1)
}

function onDurationPartInput(index: number, field: DurationField, e: Event) {
  const target = e.target as HTMLInputElement
  const raw = target.value.replace(/[^\d]/g, '')
  if (field === 'durationMinutesInput' || field === 'durationSecondsInput') {
    const limited = raw.slice(0, 2)
    if (!limited) {
      steps.value[index][field] = ''
      return
    }
    const value = Number(limited)
    steps.value[index][field] = value > 59 ? '59' : limited
    return
  }
  steps.value[index][field] = raw
}

function commitDurationInputs(index: number) {
  const step = steps.value[index]
  const parsed = parseDurationInputs(step)
  if (parsed === null) {
    setDurationInputs(step, step.durationMs)
    return
  }
  step.durationMs = parsed
  setDurationInputs(step, parsed)
}

function onDurationPartBlur(index: number) {
  commitDurationInputs(index)
}

function onDurationKeydown(index: number, e: KeyboardEvent) {
  if (e.key === 'Enter') {
    e.preventDefault()
    commitDurationInputs(index)
    ;(e.target as HTMLInputElement).blur()
  }
  if (e.key === 'Escape') {
    e.preventDefault()
    setDurationInputs(steps.value[index], steps.value[index].durationMs)
    ;(e.target as HTMLInputElement).blur()
  }
}

function onDurationFocus(e: FocusEvent) {
  const target = e.target as HTMLInputElement
  target.select()
}

function syncAllDurationInputs() {
  steps.value.forEach((_step, index) => commitDurationInputs(index))
}

function onLabelInput(index: number, e: Event) {
  const target = e.target as HTMLInputElement
  steps.value[index].label = target.value
}

function onNotesInput(index: number, e: Event) {
  const target = e.target as HTMLTextAreaElement
  steps.value[index].notes = target.value
}

/* ── Save / Cancel / Delete ───────────────────────────────── */

async function save() {
  syncAllDurationInputs()
  const stepPayload = steps.value.map((step, index) => ({
    label: step.label,
    durationMs: step.durationMs,
    notes: step.notes,
    order: index,
  }))
  // Validate: recipe name is required
  if (!recipeName.value.trim()) {
    validationError.value = 'Recipe name is required'
    return
  }
  // Validate: at least one step
  if (steps.value.length === 0) {
    validationError.value = 'Add at least one step before saving'
    return
  }
  // Validate: all steps must have a label
  if (hasEmptyLabel.value) {
    validationError.value = 'All steps must have a label'
    return
  }
  // Validate: all steps must have a positive duration
  if (hasZeroDuration.value) {
    validationError.value = 'All steps must have a duration greater than 0'
    return
  }
  validationError.value = ''
  saving.value = true
  try {
    if (isEditing.value) {
      const id = route.params.id as string
      await recipeService.updateRecipe(id, {
        name: recipeName.value,
        description: recipeDescription.value,
      })
      await recipeService.saveSteps(id, stepPayload)
    } else {
      const recipe = await recipeService.createRecipe({
        name: recipeName.value,
        description: recipeDescription.value,
      })
      await recipeService.saveSteps(recipe.id, stepPayload)
    }
    router.push('/')
  } finally {
    saving.value = false
  }
}

async function deleteRecipe() {
  if (!isEditing.value) return
  const confirmed = window.confirm('Delete this recipe? This action cannot be undone.')
  if (confirmed && route.params.id) {
    await recipeService.deleteRecipe(route.params.id as string)
    router.push('/')
  }
}

function cancel() {
  router.push('/')
}

/* ── Export ─────────────────────────────────────────────── */

const showExportMenu = ref(false)
const exporting = ref(false)

async function doExport(format: 'json' | 'yaml') {
  const id = route.params.id as string
  if (!id) return
  exporting.value = true
  showExportMenu.value = false
  try {
    const fn = format === 'json'
      ? importExportService.exportRecipeAsJSON
      : importExportService.exportRecipeAsYAML
    const blob = await fn(id)
    importExportService.downloadBlob(blob, `recipe-${id}.${format}`)
    showToast(`Exported as ${format.toUpperCase()}`, 'success')
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Export failed'
    showToast(msg, 'error')
  } finally {
    exporting.value = false
  }
}

// referenced in template @click
void doExport
</script>

<template>
  <div class="flex flex-col h-full">
    <!-- ═══ Header ═══ -->
    <header class="bg-gray-50/90 dark:bg-gray-950/90 backdrop-blur-sm border-b border-gray-200 dark:border-gray-800">
      <div class="flex items-center gap-2 px-4 h-14">
        <!-- Back -->
        <button
          @click="cancel"
          class="flex items-center justify-center w-10 h-10 -ml-1 rounded-lg text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-200/60 dark:hover:bg-gray-800/60 transition-colors flex-shrink-0"
          aria-label="Go back"
        >
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
        </button>

        <!-- Step count badge -->
        <span
          v-if="steps.length > 0"
          class="flex-shrink-0 px-2 py-0.5 text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-200/70 dark:bg-gray-800 rounded-full"
        >
          {{ steps.length }} {{ steps.length === 1 ? 'step' : 'steps' }}
        </span>

        <!-- Save -->
        <button
          @click="save"
          :disabled="saving || !recipeName.trim()"
          class="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex-shrink-0"
        >
          <svg v-if="saving" class="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <svg v-else class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
          Save
        </button>

        <!-- Export (edit mode only) -->
        <div v-if="isEditing" class="relative flex-shrink-0">
          <button
            @click="showExportMenu = !showExportMenu"
            :disabled="exporting"
            class="flex items-center justify-center w-10 h-10 rounded-lg text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-200/60 dark:hover:bg-gray-800/60 transition-colors"
            aria-label="Export recipe"
          >
            <svg v-if="exporting" class="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <svg v-else class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
          </button>
          <!-- Export dropdown -->
          <transition name="fade">
            <div
              v-if="showExportMenu"
              class="absolute right-0 top-full mt-1 z-50 min-w-[160px] bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 py-1.5 overflow-hidden"
            >
              <button
                @click="doExport('json')"
                class="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <svg class="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
                Export as JSON
              </button>
              <button
                @click="doExport('yaml')"
                class="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <svg class="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
                Export as YAML
              </button>
            </div>
          </transition>
        </div>
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

        <!-- Delete (edit mode only) -->
        <button
          v-if="isEditing"
          @click="deleteRecipe"
          class="flex items-center justify-center w-10 h-10 rounded-lg text-red-500 hover:text-red-700 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex-shrink-0"
          aria-label="Delete recipe"
        >
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
          </svg>
        </button>
      </div>

    </header>

    <!-- ═══ Load Error ═══ -->
    <div
      v-if="loadError"
      class="flex flex-col items-center justify-center py-24 text-center px-6"
    >
      <svg class="w-16 h-16 text-red-300 dark:text-red-700 mb-4" fill="none" viewBox="0 0 24 24" stroke-width="1" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
      </svg>
      <p class="text-gray-600 dark:text-gray-400 text-sm mb-6">{{ loadError }}</p>
      <button
        @click="cancel"
        class="px-5 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 active:scale-[0.98] transition-all"
      >
        Back to Recipes
      </button>
    </div>

    <!-- ═══ Validation Error ═══ -->
    <div
      v-if="validationError"
      class="mx-4 mt-3 flex items-center gap-2 px-4 py-2.5 text-sm text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg"
    >
      <svg class="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
      </svg>
      <span class="flex-1">{{ validationError }}</span>
      <button @click="validationError = ''" class="flex-shrink-0 text-red-400 hover:text-red-600 dark:hover:text-red-200">&times;</button>
    </div>

    <!-- ═══ Recipe Name & Description ═══ -->
    <div class="px-4 pt-4 pb-2 space-y-2">
      <input
        v-model="recipeName"
        type="text"
        placeholder="Recipe name"
        class="w-full text-lg font-bold text-gray-900 dark:text-gray-100 bg-transparent outline-none placeholder:text-gray-400 dark:placeholder:text-gray-600"
      />
      <input
        v-model="recipeDescription"
        type="text"
        placeholder="Description (optional)"
        class="w-full text-sm text-gray-500 dark:text-gray-400 bg-transparent outline-none placeholder:text-gray-400 dark:placeholder:text-gray-600"
      />
    </div>

    <!-- ═══ Step List ═══ -->
    <div class="flex-1 overflow-y-auto px-4 pb-4">
      <div v-if="steps.length === 0" class="flex flex-col items-center justify-center py-20 text-center">
        <svg class="w-16 h-16 text-gray-300 dark:text-gray-600 mb-4" fill="none" viewBox="0 0 24 24" stroke-width="1" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p class="text-gray-400 dark:text-gray-500 text-sm max-w-[200px]">
          No steps yet. Tap "Add Step" to get started.
        </p>
      </div>

      <VueDraggable
        v-model="steps"
        handle=".drag-handle"
        :animation="200"
        ghost-class="ghost"
        class="space-y-3"
      >
        <div
          v-for="(step, index) in steps"
          :key="index"
          class="relative bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm"
        >
          <!-- Step header: drag handle + number + remove -->
          <div class="flex items-center gap-2 px-4 pt-3 pb-1">
            <span class="drag-handle flex items-center justify-center w-8 h-8 -ml-1 rounded-lg cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex-shrink-0">
              <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <circle cx="9" cy="5" r="1.5" />
                <circle cx="15" cy="5" r="1.5" />
                <circle cx="9" cy="12" r="1.5" />
                <circle cx="15" cy="12" r="1.5" />
                <circle cx="9" cy="19" r="1.5" />
                <circle cx="15" cy="19" r="1.5" />
              </svg>
            </span>
            <span class="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
              Step {{ index + 1 }}
            </span>
            <div class="flex-1" />
            <button
              @click="removeStep(index)"
              class="flex items-center gap-1 px-2 py-1 text-xs font-medium text-red-500 hover:text-red-700 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
            >
              <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
              Remove
            </button>
          </div>

          <!-- Step body -->
          <div class="px-4 pb-4 pt-1 space-y-3">
            <!-- Label -->
            <div>
              <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Label</label>
              <input
                :value="step.label"
                @input="onLabelInput(index, $event)"
                type="text"
                placeholder="e.g. Add reagent, mix solution..."
                class="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 outline-none focus:border-blue-400 dark:focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
              />
            </div>

            <!-- Duration -->
            <div>
              <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                Duration <span class="text-gray-400 dark:text-gray-500 font-normal">(HH:MM:SS)</span>
              </label>
              <div class="flex items-center gap-2">
                <div class="flex items-center gap-1">
                  <input
                    :value="step.durationHoursInput"
                    @input="onDurationPartInput(index, 'durationHoursInput', $event)"
                    @blur="onDurationPartBlur(index)"
                    @keydown="onDurationKeydown(index, $event)"
                    @focus="onDurationFocus"
                    type="text"
                    inputmode="numeric"
                    pattern="[0-9]*"
                    placeholder="HH"
                    aria-label="Hours"
                    class="w-14 px-2 py-2 text-sm text-center font-mono bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-gray-100 outline-none focus:border-blue-400 dark:focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                  />
                  <span class="text-xs text-gray-400">:</span>
                  <input
                    :value="step.durationMinutesInput"
                    @input="onDurationPartInput(index, 'durationMinutesInput', $event)"
                    @blur="onDurationPartBlur(index)"
                    @keydown="onDurationKeydown(index, $event)"
                    @focus="onDurationFocus"
                    type="text"
                    inputmode="numeric"
                    pattern="[0-9]*"
                    maxlength="2"
                    placeholder="MM"
                    aria-label="Minutes"
                    class="w-12 px-2 py-2 text-sm text-center font-mono bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-gray-100 outline-none focus:border-blue-400 dark:focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                  />
                  <span class="text-xs text-gray-400">:</span>
                  <input
                    :value="step.durationSecondsInput"
                    @input="onDurationPartInput(index, 'durationSecondsInput', $event)"
                    @blur="onDurationPartBlur(index)"
                    @keydown="onDurationKeydown(index, $event)"
                    @focus="onDurationFocus"
                    type="text"
                    inputmode="numeric"
                    pattern="[0-9]*"
                    maxlength="2"
                    placeholder="SS"
                    aria-label="Seconds"
                    class="w-12 px-2 py-2 text-sm text-center font-mono bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-gray-100 outline-none focus:border-blue-400 dark:focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                  />
                </div>
              </div>
            </div>

            <!-- Notes -->
            <div>
              <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Notes <span class="text-gray-400 dark:text-gray-500 font-normal">(optional)</span></label>
              <textarea
                :value="step.notes"
                @input="onNotesInput(index, $event)"
                placeholder="Any additional instructions..."
                rows="2"
                class="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 outline-none focus:border-blue-400 dark:focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all resize-none"
              />
            </div>
          </div>
        </div>
      </VueDraggable>
    </div>

    <!-- ═══ Footer ═══ -->
    <div class="sticky bottom-0 z-10 bg-gray-50/90 dark:bg-gray-950/90 backdrop-blur-sm border-t border-gray-200 dark:border-gray-800 px-4 py-3">
      <button
        @click="addStep"
        class="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-blue-600 dark:text-blue-400 bg-white dark:bg-gray-900 border-2 border-dashed border-blue-300 dark:border-blue-700 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-900/10 active:scale-[0.99] transition-all"
      >
        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
        Add Step
      </button>
    </div>
  </div>
</template>

<style scoped>
.ghost {
  opacity: 0.35;
  outline: 2px dashed #60a5fa;
  outline-offset: 2px;
}
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
