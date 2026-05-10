<script setup lang="ts">
import { ref, onMounted } from 'vue'

const props = withDefaults(defineProps<{
  message: string
  type?: 'success' | 'error' | 'info'
  durationMs?: number
}>(), {
  type: 'info',
  durationMs: 3000,
})

const emit = defineEmits<{ close: [] }>()
const visible = ref(true)

onMounted(() => {
  setTimeout(() => {
    visible.value = false
    setTimeout(() => emit('close'), 300) // wait for fade-out
  }, props.durationMs)
})
</script>

<template>
  <transition name="toast-slide">
    <div
      v-if="visible"
      :class="[
        'flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg border backdrop-blur-sm text-sm font-medium min-w-[240px] max-w-[360px] pointer-events-auto',
        type === 'success'
          ? 'bg-green-600/95 border-green-500 text-white'
          : type === 'error'
            ? 'bg-red-600/95 border-red-500 text-white'
            : 'bg-blue-600/95 border-blue-500 text-white',
      ]"
    >
      <!-- Icon -->
      <svg v-if="type === 'success'" class="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" />
      </svg>
      <svg v-else-if="type === 'error'" class="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
      </svg>
      <svg v-else class="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" d="M12 16v-4m0 0V8m0 4h.005M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>

      <span class="flex-1 min-w-0">{{ message }}</span>

      <!-- Close button -->
      <button
        @click="visible = false; emit('close')"
        class="shrink-0 p-0.5 rounded-lg opacity-70 hover:opacity-100 transition-opacity"
        aria-label="Dismiss"
      >
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  </transition>
</template>

<style scoped>
.toast-slide-enter-active {
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
.toast-slide-leave-active {
  transition: all 0.3s ease;
}
.toast-slide-enter-from {
  opacity: 0;
  transform: translateX(100%) scale(0.9);
}
.toast-slide-leave-to {
  opacity: 0;
  transform: translateX(50%) scale(0.9);
}
</style>
