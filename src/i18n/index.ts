import { createI18n } from 'vue-i18n'
import en from './en'
import zhCN from './zh-CN'

const messages = {
  en,
  'zh-CN': zhCN,
}

const i18n = createI18n({
  legacy: false,
  locale: navigator.language.startsWith('zh') ? 'zh-CN' : 'en',
  fallbackLocale: 'en',
  messages,
})

export default i18n
