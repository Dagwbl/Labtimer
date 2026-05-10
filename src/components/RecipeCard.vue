<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import type { Recipe } from '@/types'
import { importExportService } from '@/services/import-export-service'
import { recipeService } from '@/services/recipe-service'
import { showToast } from '@/composables/useToast'

const props = defineProps<{
  recipe: Recipe
  stepCount?: number
  disabled?: boolean
  onDelete?: (id: string) => void
}>()

const router = useRouter()
const showMenu = ref(false)
const showExportSub = ref(false)
const menuContainerRef = ref<HTMLElement | null>(null)
const totalDurationMs = ref(0)

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function formatDuration(ms: number): string {
  const totalSecs = Math.round(ms / 1000)
  const hours = Math.floor(totalSecs / 3600)
  const minutes = Math.floor((totalSecs % 3600) / 60)
  const secs = totalSecs % 60
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`
}

async function loadTotalDuration() {
  try {
    const { steps } = await recipeService.getRecipe(props.recipe.id)
    totalDurationMs.value = steps.reduce((sum, step) => sum + step.durationMs, 0)
  } catch (err) {
    // Silently fail if unable to load
    totalDurationMs.value = 0
  }
}

function navigateToEdit() {
  showMenu.value = false
  router.push(`/recipe/${props.recipe.id}/edit`)
}

function navigateToRun() {
  showMenu.value = false
  router.push(`/recipe/${props.recipe.id}/run`)
}

async function doExport(format: 'json' | 'yaml') {
  showMenu.value = false
  showExportSub.value = false
  try {
    const fn = format === 'json'
      ? importExportService.exportRecipeAsJSON
      : importExportService.exportRecipeAsYAML
    const blob = await fn(props.recipe.id)
    importExportService.downloadBlob(blob, `recipe-${props.recipe.id}.${format}`)
    showToast(`Exported "${props.recipe.name}" as ${format.toUpperCase()}`, 'success')
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Export failed'
    showToast(msg, 'error')
  }
}

function handleDelete() {
  showMenu.value = false
  if (props.onDelete) {
    props.onDelete(props.recipe.id)
  }
}

function toggleMenu(e: MouseEvent) {
  e.stopPropagation()
  showMenu.value = !showMenu.value
  if (!showMenu.value) showExportSub.value = false
}

function onDocumentClick(e: Event) {
  if (
    showMenu.value &&
    menuContainerRef.value &&
    !menuContainerRef.value.contains(e.target as Node)
  ) {
    showMenu.value = false
    showExportSub.value = false
  }
}

function onCardKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault()
    navigateToEdit()
  }
}

onMounted(() => {
  document.addEventListener('click', onDocumentClick)
  loadTotalDuration()
})
onUnmounted(() => document.removeEventListener('click', onDocumentClick))
</script>

<template>
  <div class="relative bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 transition-all hover:shadow-md">
    <!-- Card body — tap to run -->
    <div
      role="button"
      tabindex="0"
      class="w-full text-left p-4 pr-12 rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 cursor-pointer transition-transform active:scale-[0.98]"
      @click="navigateToRun"
      @keydown="onCardKeydown"
    >
      <!-- Recipe name -->
      <h3 class="text-base font-semibold text-gray-900 dark:text-gray-100 truncate">
        {{ recipe.name }}
      </h3>

      <!-- Description preview (max 2 lines) -->
      <p
        v-if="recipe.description"
        class="mt-1 text-sm text-gray-500 dark:text-gray-400 line-clamp-2"
      >
        {{ recipe.description }}
      </p>

      <!-- Meta row -->
      <div class="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-400 dark:text-gray-500">
        <span class="inline-flex items-center gap-1">
          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
          {{ stepCount ?? 0 }} {{ stepCount === 1 ? 'step' : 'steps' }}
        </span>
        <!-- Duration -->
        <span class="inline-flex items-center gap-1">
          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 1118 0z" />
          </svg>
          {{ formatDuration(totalDurationMs) }}
        </span>
        <!-- Updated at -->
        <span class="inline-flex items-center gap-1">
          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 1118 0z" />
          </svg>
          {{ formatDate(recipe.updatedAt) }}
        </span>
      </div>
    </div>

    <!-- Three-dot menu trigger -->
    <div ref="menuContainerRef" class="absolute top-2 right-2 z-10">
      <button
        @click.stop="toggleMenu"
        class="flex items-center justify-center w-10 h-10 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        aria-label="Recipe actions"
        :aria-expanded="showMenu"
      >
        <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <circle cx="12" cy="5" r="1.5" />
          <circle cx="12" cy="12" r="1.5" />
          <circle cx="12" cy="19" r="1.5" />
        </svg>
      </button>

      <!-- Dropdown menu -->
      <transition name="fade">
        <div
          v-if="showMenu"
          class="absolute right-0 top-full mt-1 z-50 min-w-[168px] bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 py-1.5 overflow-hidden"
          @click.stop
        >
          <button
            @click="navigateToEdit"
            :disabled="disabled"
            class="w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors"
            :class="disabled ? 'text-gray-400 dark:text-gray-600 cursor-not-allowed' : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'"
          >
            <svg class="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 11-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 1115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
            </svg>
            Edit
          </button>
          <button
            @click="navigateToRun"
            :disabled="disabled"
            class="w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors"
            :class="disabled ? 'text-gray-400 dark:text-gray-600 cursor-not-allowed' : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'"
          >
            <svg class="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
            </svg>
            Run
          </button>
          <div class="relative">
            <button
              @click="showExportSub = !showExportSub"
              :disabled="disabled"
              class="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <svg class="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
              Export
              <svg class="w-3.5 h-3.5 ml-auto" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </button>
            <transition name="fade">
              <div
                v-if="showExportSub"
                class="absolute left-full top-0 ml-1 z-[60] min-w-[148px] bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 py-1.5 overflow-hidden"
              >
                <button
                  @click="doExport('json')"
                  class="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  Export as JSON
                </button>
                <button
                  @click="doExport('yaml')"
                  class="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  Export as YAML
                </button>
              </div>
            </transition>
          </div>
          <div class="border-t border-gray-200 dark:border-gray-700 my-1"></div>
          <button
            @click="handleDelete"
            :disabled="disabled"
            class="w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors"
            :class="disabled ? 'text-gray-400 dark:text-gray-600 cursor-not-allowed' : 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20'"
          >
            <svg class="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 11-2.244 2.077H8.084a2.25 2.25 0 11-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
            </svg>
            Delete
          </button>
        </div>
      </transition>
    </div>
  </div>
</template>

<style scoped>
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
