<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { useI18n } from '../l10n'
import { renderSafeMarkdown } from '../markdown/renderSafeMarkdown'

type EditorMode = 'markdown' | 'plain'
type EditorTab = 'write' | 'preview'

const props = withDefaults(
  defineProps<{
    modelValue: string
    id: string
    label: string
    rows?: number
    placeholder?: string
    readonly?: boolean
    mode?: EditorMode
    maxChars?: number
  }>(),
  { rows: 4, placeholder: '', readonly: false, mode: 'markdown' }
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const inputValue = computed({
  get: () => props.modelValue,
  set: (value: string) => emit('update:modelValue', value),
})

const { t } = useI18n()
const activeTab = ref<EditorTab>('write')
const textarea = ref<HTMLTextAreaElement | null>(null)
const writeTab = ref<HTMLButtonElement | null>(null)
const previewTab = ref<HTMLButtonElement | null>(null)
const announcementCount = ref(countCodePoints(props.modelValue))
const announcementLimit = ref<number | undefined>(props.maxChars)
let announcementTimer: ReturnType<typeof setTimeout> | undefined

function countCodePoints(value: string): number {
  let count = 0
  for (const _character of value) count += 1
  return count
}

const charCount = computed(() => countCodePoints(props.modelValue))
const isOverLimit = computed(() => props.maxChars !== undefined && charCount.value > props.maxChars)
const isNearLimit = computed(() => props.maxChars !== undefined && props.maxChars > 0 && !isOverLimit.value && charCount.value >= props.maxChars * 0.9)
const renderedPreview = computed(() => (activeTab.value === 'preview' && props.mode === 'markdown' ? renderSafeMarkdown(props.modelValue.trim()) : ''))
const isPreviewEmpty = computed(() => !props.modelValue.trim())
const panelId = computed(() => `${props.id}-panel`)
const writeTabId = computed(() => `${props.id}-write-tab`)
const previewTabId = computed(() => `${props.id}-preview-tab`)
const limitMessageId = computed(() => `${props.id}-limit-message`)
const counterText = computed(() =>
  props.maxChars === undefined ? t('markdown_editor_count_plain', { count: charCount.value }) : t('markdown_editor_count_limited', { count: charCount.value, limit: props.maxChars })
)
const announcementText = computed(() => {
  const countText =
    announcementLimit.value === undefined
      ? t('markdown_editor_count_plain', { count: announcementCount.value })
      : t('markdown_editor_count_accessible_limit', { count: announcementCount.value, limit: announcementLimit.value })
  if (announcementLimit.value === undefined) return countText
  if (announcementCount.value > announcementLimit.value) {
    return `${countText} ${t('markdown_editor_soft_limit', { limit: announcementLimit.value })}`
  }
  if (announcementLimit.value > 0 && announcementCount.value >= announcementLimit.value * 0.9) {
    return `${countText} ${t('markdown_editor_near_limit', { limit: announcementLimit.value })}`
  }
  return countText
})

watch([charCount, () => props.maxChars], () => {
  if (announcementTimer !== undefined) clearTimeout(announcementTimer)
  announcementTimer = setTimeout(() => {
    announcementCount.value = charCount.value
    announcementLimit.value = props.maxChars
    announcementTimer = undefined
  }, 800)
})

onBeforeUnmount(() => {
  if (announcementTimer !== undefined) clearTimeout(announcementTimer)
})

function activateTab(tab: EditorTab, moveFocus = false): void {
  activeTab.value = tab
  if (moveFocus) {
    void nextTick(() => (tab === 'write' ? writeTab.value : previewTab.value)?.focus())
  }
}

function onTabKeydown(event: KeyboardEvent, currentTab: EditorTab): void {
  let nextTab: EditorTab | undefined
  if (event.key === 'ArrowRight') nextTab = currentTab === 'write' ? 'preview' : 'write'
  else if (event.key === 'ArrowLeft') nextTab = currentTab === 'write' ? 'preview' : 'write'
  else if (event.key === 'Home') nextTab = 'write'
  else if (event.key === 'End') nextTab = 'preview'
  if (nextTab) {
    event.preventDefault()
    activateTab(nextTab, true)
  }
}

async function focus(): Promise<void> {
  activeTab.value = 'write'
  await nextTick()
  textarea.value?.focus()
}

defineExpose({ focus })
</script>

<template>
  <div class="min-w-0">
    <div role="tablist" :aria-label="t('markdown_editor_tabs_label')" class="mb-2 flex min-w-0 gap-1 border-b border-border">
      <button
        :id="writeTabId"
        ref="writeTab"
        type="button"
        role="tab"
        :aria-controls="panelId"
        :aria-selected="activeTab === 'write'"
        :tabindex="activeTab === 'write' ? 0 : -1"
        class="btn btn-ghost btn-sm rounded-b-none"
        :class="activeTab === 'write' ? 'border-b-2 border-teal font-semibold text-teal' : 'text-muted'"
        @click="activateTab('write')"
        @keydown="onTabKeydown($event, 'write')"
      >
        {{ t('markdown_editor_write') }}
      </button>
      <button
        :id="previewTabId"
        ref="previewTab"
        type="button"
        role="tab"
        :aria-controls="panelId"
        :aria-selected="activeTab === 'preview'"
        :tabindex="activeTab === 'preview' ? 0 : -1"
        class="btn btn-ghost btn-sm rounded-b-none"
        :class="activeTab === 'preview' ? 'border-b-2 border-teal font-semibold text-teal' : 'text-muted'"
        @click="activateTab('preview')"
        @keydown="onTabKeydown($event, 'preview')"
      >
        {{ t('markdown_editor_preview') }}
      </button>
    </div>

    <div v-if="activeTab === 'write'" :id="panelId" role="tabpanel" :aria-labelledby="writeTabId" class="min-w-0">
      <textarea
        :id="id"
        ref="textarea"
        v-model="inputValue"
        :rows="rows"
        :placeholder="placeholder"
        :readonly="readonly"
        :aria-readonly="readonly"
        :aria-label="label"
        :aria-describedby="isOverLimit || isNearLimit ? limitMessageId : undefined"
        class="block min-h-24 w-full min-w-0 resize-y break-words"
      />
    </div>
    <div v-else :id="panelId" role="tabpanel" :aria-labelledby="previewTabId" class="min-w-0 break-words [overflow-wrap:anywhere]">
      <p v-if="isPreviewEmpty" class="m-0 text-muted">{{ t('markdown_editor_preview_empty') }}</p>
      <div v-else-if="mode === 'markdown'" class="markdown-content min-w-0" v-html="renderedPreview" />
      <div v-else class="min-w-0 whitespace-pre-line break-words">{{ modelValue }}</div>
    </div>

    <div class="mt-1 flex min-w-0 flex-wrap items-start justify-between gap-x-3 gap-y-1 text-sm">
      <p v-if="isOverLimit" :id="limitMessageId" class="m-0 min-w-0 text-red">
        {{ t('markdown_editor_soft_limit', { limit: maxChars ?? 0 }) }}
      </p>
      <p v-else-if="isNearLimit" :id="limitMessageId" class="m-0 min-w-0 text-amber">
        {{ t('markdown_editor_near_limit', { limit: maxChars ?? 0 }) }}
      </p>
      <span class="ml-auto shrink-0" :class="isOverLimit ? 'text-red' : isNearLimit ? 'text-amber' : 'text-muted'">
        {{ counterText }}
      </span>
    </div>
    <span class="sr-only" aria-live="polite" aria-atomic="true">{{ announcementText }}</span>
  </div>
</template>
