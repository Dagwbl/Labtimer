<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import type { Recipe } from '@/types'
import { recipeService } from '@/services/recipe-service'
import { importExportService } from '@/services/import-export-service'
import { showToast } from '@/composables/useToast'
import { db } from '@/db'
import { isTimerActive } from '@/services/active-timer'
import RecipeCard from '@/components/RecipeCard.vue'
import { useDarkMode } from '@/composables/useDarkMode'

const router = useRouter()
const { isDark, toggleDark } = useDarkMode()
const recipes = ref<Recipe[]>([])
const stepCounts = ref<Record<string, number>>({})
const loading = ref(true)

onMounted(async () => {
  await loadRecipes()
})

async function loadRecipes() {
  loading.value = true
  recipes.value = await recipeService.listRecipes()

  // Batch load step counts
  const allSteps = await db.steps.toArray()
  const counts: Record<string, number> = {}
  for (const step of allSteps) {
    counts[step.recipeId] = (counts[step.recipeId] || 0) + 1
  }
  stepCounts.value = counts

  loading.value = false
}

function navigateToNew() {
  router.push('/recipe/new')
}

function handleDelete(id: string) {
  const confirmed = window.confirm('Delete this recipe? This action cannot be undone.')
  if (confirmed) {
    recipeService.deleteRecipe(id).then(() => loadRecipes())
  }
}

function handleImport() {
  // Trigger hidden file input for import
  fileInput.value?.click()
}

const fileInput = ref<HTMLInputElement | null>(null)

async function handleExportAll() {
  try {
    const blob = await importExportService.exportAllRecipes()
    importExportService.downloadBlob(blob, 'all-recipes.json')
    showToast('Exported all recipes', 'success')
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Export failed'
    showToast(msg, 'error')
  }
}

async function onFileSelected(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  try {
    const { name } = await importExportService.importRecipe(file)
    showToast(`Imported "${name}"`, 'success')
    await loadRecipes()
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Import failed'
    showToast(msg, 'error')
  } finally {
    input.value = ''
  }
}
</script>

<template>
  <div class="flex flex-col min-h-0 h-full">
    <!-- Header -->
    <header class="bg-gray-50/90 dark:bg-gray-950/90 backdrop-blur-sm border-b border-gray-200 dark:border-gray-800">
      <div class="flex items-center justify-between px-4 h-14">
        <h1 class="text-xl font-bold text-gray-900 dark:text-gray-100">
          My Recipes
        </h1>
        <div class="flex items-center gap-1">
          <button
            v-if="!isTimerActive"
            @click="handleImport"
            class="flex items-center justify-center w-10 h-10 rounded-lg text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-200/60 dark:hover:bg-gray-800/60 transition-colors flex-shrink-0"
            aria-label="Import recipe"
          >
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
          </button>
          <button
            @click="handleExportAll"
            class="flex items-center justify-center w-10 h-10 rounded-lg text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-200/60 dark:hover:bg-gray-800/60 transition-colors flex-shrink-0"
            aria-label="Export all recipes"
          >
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
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
      </div>
    </header>

    <!-- Content area -->
    <div class="flex-1 overflow-y-auto px-4 pb-38">
      <!-- Loading state -->
      <div
        v-if="loading"
        class="flex flex-col items-center justify-center py-24 text-gray-400 dark:text-gray-500"
      >
        <svg class="w-8 h-8 animate-spin mb-3" viewBox="0 0 24 24" fill="none">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <span class="text-sm">Loading recipes…</span>
      </div>

      <!-- Empty state -->
      <div
        v-else-if="recipes.length === 0"
        class="flex flex-col items-center justify-center py-24 text-center"
      >
        <svg class="w-20 h-20 text-gray-300 dark:text-gray-600 mb-6" fill="none" viewBox="0 0 24 24" stroke-width="1" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15a2.25 2.25 0 012.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
        </svg>
        <p class="text-gray-500 dark:text-gray-400 text-sm max-w-[200px]">
          No recipes yet. Tap + to create one.
        </p>
      </div>

      <!-- Recipe list -->
      <div v-else class="pt-4 space-y-3">
        <RecipeCard
          v-for="recipe in recipes"
          :key="recipe.id"
          :recipe="recipe"
          :stepCount="stepCounts[recipe.id] ?? 0"
          :disabled="isTimerActive"
          :onDelete="handleDelete"
        />
      </div>
    </div>

    <!-- Hidden file input for import -->
    <input
      ref="fileInput"
      type="file"
      accept=".json,.yaml,.yml"
      class="hidden"
      @change="onFileSelected"
    />

    <!-- FAB — New Recipe -->
    <button
      @click="navigateToNew"
      :disabled="isTimerActive"
      class="fixed bottom-24 right-6 z-40 w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-300"
      :class="isTimerActive ? 'bg-gray-400 dark:bg-gray-600 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700 active:scale-90'"
      aria-label="New recipe"
    >
      <svg class="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
      </svg>
    </button>
  </div>
</template>
