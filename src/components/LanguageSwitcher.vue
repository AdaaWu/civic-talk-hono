<script setup lang="ts">
import { computed } from 'vue'
import { supportedLocales, useI18n } from '../l10n'

const { t, locale, setLocale } = useI18n()
const selectedLocale = computed({
  get: () => locale.value,
  set: setLocale,
})
</script>

<template>
  <select v-model="selectedLocale" :aria-label="t('language_select')" class="btn btn-ghost btn-sm cursor-pointer">
    <option v-for="language in supportedLocales" :key="language.code" :value="language.code">
      {{ t(language.labelKey) }}
    </option>
  </select>
</template>
