<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { locale } = useI18n()

const languages = [
  { code: 'en', label: 'EN' },
  { code: 'zh-CN', label: '中文' },
]

function switchLang(code: string) {
  locale.value = code
}
</script>

<template>
  <div class="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
    <button
      v-for="lang in languages"
      :key="lang.code"
      @click="switchLang(lang.code)"
      :class="[
        'px-3 py-1.5 rounded-md text-sm font-medium transition-colors min-w-[44px]',
        locale === lang.code
          ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
          : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200',
      ]"
    >
      {{ lang.label }}
    </button>
  </div>
</template>
