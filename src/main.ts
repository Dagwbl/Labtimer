import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { registerSW } from 'virtual:pwa-register'
import App from './App.vue'
import router from './router'
import i18n from './i18n'
import { initInstallPrompt } from './composables/useInstallPrompt'
import './style.css'

initInstallPrompt()

const updateSW = registerSW({
  onNeedRefresh() {
    if (confirm('New version available. Update now?')) {
      updateSW()
    }
  },
  onOfflineReady() {
    console.log('App ready for offline use')
  },
})

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.use(i18n)
app.mount('#app')
