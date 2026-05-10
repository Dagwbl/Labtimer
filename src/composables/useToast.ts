import { reactive } from 'vue'

export interface ToastItem {
  id: number
  message: string
  type: 'success' | 'error' | 'info'
}

const state = reactive<{ items: ToastItem[] }>({ items: [] })
let nextId = 0

export function showToast(message: string, type: 'success' | 'error' | 'info' = 'info') {
  state.items.push({ id: nextId++, message, type })
}

export function removeToast(id: number) {
  const index = state.items.findIndex(t => t.id === id)
  if (index !== -1) state.items.splice(index, 1)
}

export function useToast() {
  return { toasts: state.items, showToast, removeToast }
}
