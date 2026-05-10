<script setup lang="ts">
import { onMounted } from 'vue'
import { RouterView, useRouter, useRoute } from 'vue-router'
import { useToast } from '@/composables/useToast'
import Toast from '@/components/Toast.vue'
import { useDarkMode } from '@/composables/useDarkMode'
import { recipeService } from '@/services/recipe-service'

const { toasts, removeToast } = useToast()

const router = useRouter()
const route = useRoute()
const { init } = useDarkMode()

onMounted(async () => {
  init()

  // Seed any built-in recipes not yet in the database
  await recipeService.seedMissingBuiltins()
})
</script>

<template>
  <div class="flex flex-col h-[100dvh]">
    <!-- Global toast container -->
    <div class="fixed top-4 right-14 z-[9999] flex flex-col gap-2 pointer-events-none">
      <Toast
        v-for="t in toasts"
        :key="t.id"
        :message="t.message"
        :type="t.type"
        @close="removeToast(t.id)"
      />
    </div>

    <main class="flex-1 overflow-y-auto">
      <RouterView />
    </main>
    <!-- Bottom Navigation -->
    <nav class="flex items-center justify-around border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-2 py-1 safe-area-bottom gap-1">
      <button
        @click="router.push('/')"
        :class="['flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg transition-colors min-w-0',
          route.path === '/' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400']"
      >
        <span class="text-lg leading-none">📋</span>
        <span class="text-[10px]">Recipes</span>
      </button>
      <button
        @click="router.push('/history')"
        :class="['flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg transition-colors min-w-0',
          route.path === '/history' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400']"
      >
        <span class="text-lg leading-none">📊</span>
        <span class="text-[10px]">History</span>
      </button>
    </nav>
  </div>
</template>

<style scoped>
.safe-area-bottom {
  padding-bottom: env(safe-area-inset-bottom);
}
</style>
