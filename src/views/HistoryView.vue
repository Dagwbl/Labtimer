<script setup lang="ts">
import { ref, onMounted } from 'vue'
import type { ExperimentRecord } from '@/types'
import { historyService } from '@/services/history-service'
import { showToast } from '@/composables/useToast'
import { useDarkMode } from '@/composables/useDarkMode'

const { isDark, toggleDark } = useDarkMode()
const records = ref<ExperimentRecord[]>([])
const expandedId = ref<string | null>(null)
const loading = ref(true)

onMounted(async () => {
  records.value = await historyService.listRecords()
  loading.value = false
})

function toggleExpand(id: string) {
  expandedId.value = expandedId.value === id ? null : id
}

async function deleteRecord(id: string) {
  const confirmed = window.confirm('Delete this history record?')
  if (!confirmed) return
  await historyService.deleteRecord(id)
  records.value = records.value.filter(r => r.id !== id)
}

async function clearAll() {
  const confirmed = window.confirm('Clear all history? This cannot be undone.')
  if (!confirmed) return
  await historyService.clearAll()
  records.value = []
}

async function exportAll() {
  try {
    const blob = await historyService.exportHistoryJSON()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `lab-timer-history-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    showToast('History exported', 'success')
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Export failed'
    showToast(msg, 'error')
  }
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatDuration(ms: number): string {
  const totalSec = Math.floor(ms / 1000)
  const min = Math.floor(totalSec / 60)
  const sec = totalSec % 60
  if (min > 0) return `${min}m ${sec}s`
  return `${sec}s`
}

function statusClass(status: string) {
  return status === 'completed'
    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
    : 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
}
</script>

<template>
  <div class="flex flex-col h-full">
    <!-- Header -->
    <header
      class="bg-gray-50/90 dark:bg-gray-950/90 backdrop-blur-sm border-b border-gray-200 dark:border-gray-800"
    >
      <div class="flex items-center justify-between px-4 h-14">
        <h1 class="text-xl font-bold text-gray-900 dark:text-gray-100">
          Experiment History
        </h1>
        <div class="flex items-center gap-1">
          <button
            @click="exportAll"
            class="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
            aria-label="Export all history"
          >
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            Export All
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
      </div>
    </header>

    <!-- Content -->
    <div class="flex-1 overflow-y-auto px-4 pb-6">
      <!-- Loading state -->
      <div
        v-if="loading"
        class="flex flex-col items-center justify-center py-24 text-gray-400 dark:text-gray-500"
      >
        <svg class="w-8 h-8 animate-spin mb-3" viewBox="0 0 24 24" fill="none">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <span class="text-sm">Loading history&hellip;</span>
      </div>

      <!-- Empty state -->
      <div
        v-else-if="records.length === 0"
        class="flex flex-col items-center justify-center py-24 text-center"
      >
        <svg class="w-20 h-20 text-gray-300 dark:text-gray-600 mb-6" fill="none" viewBox="0 0 24 24" stroke-width="1" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p class="text-gray-500 dark:text-gray-400 text-sm max-w-[220px]">
          No experiments recorded yet. Run a recipe to see history here.
        </p>
      </div>

      <!-- Record list -->
      <div v-else class="pt-4 space-y-3">
        <div
          v-for="record in records"
          :key="record.id"
          class="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden transition-shadow hover:shadow-md"
        >
          <!-- Card header — tap to expand -->
          <button
            @click="toggleExpand(record.id)"
            class="w-full text-left p-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50 active:bg-gray-100 dark:active:bg-gray-800"
          >
            <div class="flex items-start justify-between gap-3">
              <div class="flex-1 min-w-0">
                <h3 class="text-base font-semibold text-gray-900 dark:text-gray-100 truncate">
                  {{ record.recipeName }}
                </h3>
                <div class="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-400 dark:text-gray-500">
                  <span class="inline-flex items-center gap-1">
                    <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {{ formatDate(record.startedAt) }}
                  </span>
                  <span class="inline-flex items-center gap-1">
                    <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {{ formatDuration(record.totalDurationMs) }}
                  </span>
                  <span class="inline-flex items-center gap-1">
                    <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                    {{ record.steps.length }} {{ record.steps.length === 1 ? 'step' : 'steps' }}
                  </span>
                </div>
              </div>
              <span
                :class="['inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium shrink-0 self-start', statusClass(record.status)]"
              >
                {{ record.status === 'completed' ? 'Completed' : 'Interrupted' }}
              </span>
            </div>
          </button>

          <!-- Expanded step breakdown -->
          <transition name="expand">
            <div v-if="expandedId === record.id" class="border-t border-gray-200 dark:border-gray-800">
              <!-- Steps list -->
              <div class="px-4 py-3 space-y-1">
                <div
                  v-for="(step, index) in record.steps"
                  :key="step.stepId"
                  class="flex items-center gap-3 py-2.5"
                >
                  <!-- Status icon -->
                  <span
                    v-if="step.status === 'completed'"
                    class="flex-shrink-0 w-7 h-7 rounded-full bg-green-100 dark:bg-green-900/60 flex items-center justify-center"
                  >
                    <svg class="w-4 h-4 text-green-600 dark:text-green-300" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  </span>
                  <span
                    v-else
                    class="flex-shrink-0 w-7 h-7 rounded-full bg-orange-100 dark:bg-orange-900/60 flex items-center justify-center"
                  >
                    <svg class="w-4 h-4 text-orange-600 dark:text-orange-300" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </span>
                  <!-- Step info -->
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center justify-between gap-2">
                      <p class="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                        <span class="text-gray-400 dark:text-gray-500 font-normal mr-1">{{ index + 1 }}.</span>
                        {{ step.label }}
                      </p>
                      <span
                        class="text-xs font-medium shrink-0"
                        :class="step.status === 'completed' ? 'text-green-600 dark:text-green-400' : 'text-orange-600 dark:text-orange-400'"
                      >
                        {{ step.status === 'completed' ? 'Done' : 'Interrupted' }}
                      </span>
                    </div>
                    <p class="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                      Planned {{ formatDuration(step.plannedDurationMs) }}
                      &middot;
                      Actual {{ formatDuration(step.actualDurationMs) }}
                    </p>
                  </div>
                </div>
              </div>

              <!-- Delete button -->
              <div class="px-4 py-2.5 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
                <span class="text-xs text-gray-400 dark:text-gray-500">
                  {{ formatDate(record.completedAt) }}
                </span>
                <button
                  @click.stop="deleteRecord(record.id)"
                  class="flex items-center gap-1.5 text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 px-2 py-1.5 rounded-lg transition-colors"
                  aria-label="Delete this record"
                >
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                  </svg>
                  Delete
                </button>
              </div>
            </div>
          </transition>
        </div>
      </div>
    </div>

    <!-- Clear All footer -->
    <div v-if="records.length > 0 && !loading" class="px-4 pb-6">
      <button
        @click="clearAll"
        class="w-full flex items-center justify-center gap-2 py-3 text-sm font-medium text-red-600 dark:text-red-400 bg-white dark:bg-gray-900 border border-red-200 dark:border-red-800/50 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 active:scale-[0.98] transition-all"
      >
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
        </svg>
        Clear All History
      </button>
    </div>
  </div>
</template>

<style scoped>
.expand-enter-active,
.expand-leave-active {
  transition: max-height 0.3s ease, opacity 0.25s ease;
  overflow: hidden;
}
.expand-enter-from,
.expand-leave-to {
  max-height: 0;
  opacity: 0;
}
.expand-enter-to,
.expand-leave-from {
  max-height: 1000px;
  opacity: 1;
}
</style>
