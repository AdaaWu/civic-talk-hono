<script setup lang="ts">
import { useI18n } from '../l10n'
import { sourceMetadata } from '../source'

const { t } = useI18n()
</script>

<template>
  <a v-if="sourceMetadata.sourceUrl" :href="sourceMetadata.sourceUrl" rel="noopener noreferrer">{{ t('footer_source') }}</a>
  <span v-else class="text-muted">{{ t('footer_source_unavailable') }}</span>
  <a :href="sourceMetadata.licenseUrl ?? 'https://www.gnu.org/licenses/agpl-3.0.html'" target="_blank" rel="noopener noreferrer">
    {{ t('footer_license') }}
  </a>
  <a href="/licenses/client.txt">{{ t('footer_client_licenses') }}</a>
  <a href="/licenses/worker.txt">{{ t('footer_worker_licenses') }}</a>
</template>
