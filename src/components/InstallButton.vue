<script setup lang="ts">
import { useInstallPrompt } from '@/composables/useInstallPrompt'

const { canInstall, isInstalled, install } = useInstallPrompt()
</script>

<template>
  <button
    v-if="canInstall && !isInstalled"
    @click="install"
    class="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-full bg-blue-600 px-6 py-3 text-sm font-medium text-white shadow-lg transition-all active:scale-95 hover:bg-blue-700"
  >
    <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
    </svg>
    Install App
  </button>
</template>
