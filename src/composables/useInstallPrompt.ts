import { ref, computed } from 'vue'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

/** Module-level singleton state shared across all consumers */
const deferredPrompt = ref<BeforeInstallPromptEvent | null>(null)
const _isInstalled = ref(false)

export function useInstallPrompt() {
  const canInstall = computed(() => deferredPrompt.value !== null)

  async function install() {
    const prompt = deferredPrompt.value
    if (!prompt) return

    prompt.prompt()
    const { outcome } = await prompt.userChoice
    if (outcome === 'accepted') {
      _isInstalled.value = true
    }
    deferredPrompt.value = null
  }

  return {
    /** Whether the install prompt is currently available */
    canInstall,
    /** Whether the app has been installed */
    isInstalled: _isInstalled,
    /** Trigger the install prompt */
    install,
  }
}

/**
 * Called once in main.ts to listen for the PWA install prompt event.
 * Stores the event so it can be triggered later via the composable.
 */
export function initInstallPrompt() {
  window.addEventListener('beforeinstallprompt', (e: Event) => {
    e.preventDefault()
    deferredPrompt.value = e as BeforeInstallPromptEvent
  })

  window.addEventListener('appinstalled', () => {
    _isInstalled.value = true
    deferredPrompt.value = null
  })
}
