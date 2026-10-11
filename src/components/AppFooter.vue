<script setup lang="ts">
import { useI18n } from '../l10n'
import { sourceMetadata } from '../source'

const { t } = useI18n()
</script>

<template>
  <footer class="mt-16 border-t border-border bg-vt-bg-1">
    <div class="container py-10">
      <div class="mb-4">
        <img src="/vtaiwan-logo.svg" alt="vTaiwan" class="h-7 w-auto dark:hidden" />
        <img src="/vtaiwan-logo-dark.svg" alt="vTaiwan" class="hidden h-7 w-auto dark:block" />
      </div>
      <p class="mb-4 max-w-xl text-sm text-muted">
        {{ t('footer_desc') }}
      </p>
      <div class="mb-3 h-px bg-border" />
      <div class="text-xs text-muted">{{ t('footer_copy') }}</div>
      <p class="mt-2 text-xs text-muted">{{ t('footer_content_license') }}</p>
      <p class="mt-2 text-xs text-muted">{{ t('footer_software') }}</p>
      <div class="mt-3 flex flex-wrap gap-4 text-sm">
        <a v-if="sourceMetadata.sourceUrl" :href="sourceMetadata.sourceUrl" rel="noopener noreferrer">{{ t('footer_source') }}</a>
        <span v-else class="text-muted">{{ t('footer_source_unavailable') }}</span>
        <a :href="sourceMetadata.licenseUrl ?? 'https://www.gnu.org/licenses/agpl-3.0.html'" target="_blank" rel="noopener noreferrer">
          {{ t('footer_license') }}
        </a>
        <a href="/licenses/client.txt">{{ t('footer_client_licenses') }}</a>
        <a href="/licenses/worker.txt">{{ t('footer_worker_licenses') }}</a>
        <a href="https://www.vtaiwan.tw" target="_blank" rel="noopener noreferrer">vtaiwan.tw</a>
        <a href="https://make.vtaiwan.tw" target="_blank" rel="noopener noreferrer">make.vtaiwan.tw</a>
        <a href="/about">{{ t('nav_about') }}</a>
        <a href="/terms">{{ t('footer_terms') }}</a>
        <a href="/privacy">{{ t('footer_privacy') }}</a>
        <a href="https://github.com/g0v/civic-talk-hono/issues/" target="_blank" rel="noopener noreferrer">
          {{ t('footer_feedback') }}
        </a>
      </div>
    </div>
  </footer>
</template>
