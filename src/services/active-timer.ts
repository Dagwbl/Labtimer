import { ref } from 'vue'

/**
 * Global reactive flag indicating whether a timer procedure is currently active.
 * Used by RecipeList / RecipeCard to disable recipe management during a run.
 * State is ephemeral (in-memory only) — lost on page refresh, which is acceptable
 * for MVP since the timer worker is also in-memory.
 */
export const isTimerActive = ref(false)

export function setTimerActive(active: boolean): void {
  isTimerActive.value = active
}
