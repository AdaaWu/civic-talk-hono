<script setup lang="ts">
// 首頁與歡迎框共用的原創裝飾插畫（#175）；不承載角色標籤或操作提示。
// 所有配色沿用設計 token，靜態 SVG 不需要動畫、外部素材或瀏覽器 API。
defineProps<{
  variant: 'garden' | 'seedling' | 'tending'
}>()
</script>

<template>
  <svg
    class="pointer-events-none select-none"
    :viewBox="variant === 'garden' ? '0 0 240 180' : '0 0 64 48'"
    fill="none"
    stroke="currentColor"
    stroke-width="2.5"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <template v-if="variant === 'garden'">
      <ellipse cx="122" cy="151" rx="94" ry="14" class="fill-vt-white/5" stroke="none" />
      <path d="M33 149c37-12 134-12 178 0" class="stroke-vt-white/35" />
      <path d="M121 140V66" class="stroke-vt-jade-green" stroke-width="4" />
      <path d="M121 105c-31 0-47-18-45-43 29-1 46 16 45 43Z" class="fill-vt-jade-green stroke-vt-jade-green" />
      <path d="M121 83c0-32 18-51 47-51 2 30-16 51-47 51Z" class="fill-vt-jade-green stroke-vt-jade-green" />
      <path d="m91 77 29 27m1-22 31-34" class="stroke-vt-white/55" stroke-width="2" />
      <path d="M64 143v-28m0 13c-18 0-28-10-28-25 17-1 28 9 28 25Zm0-12c0-18 11-28 28-27 0 17-11 27-28 27Z" class="fill-vt-wheat-yellow/25 stroke-vt-wheat-yellow" />
      <path d="M180 143v-18m0 7c-15 0-22-8-22-20 14 0 22 8 22 20Zm0-8c0-15 8-24 22-24 1 14-7 24-22 24Z" class="fill-vt-jade-green/25 stroke-vt-jade-green" />
      <path d="M108 144c5-7 18-7 26 0" class="stroke-vt-white/55" />
      <path d="M45 59v10m-5-5h10M193 56v8m-4-4h8" class="stroke-vt-wheat-yellow" />
      <circle cx="84" cy="37" r="3" class="fill-vt-white/55" stroke="none" />
      <circle cx="211" cy="86" r="3" class="fill-vt-wheat-yellow" stroke="none" />
      <circle cx="156" cy="161" r="2" class="fill-vt-white/35" stroke="none" />
    </template>

    <template v-else-if="variant === 'seedling'">
      <path d="M12 42c11-4 29-4 40 0" />
      <path d="M32 39V18" class="stroke-vt-jade-green" />
      <path d="M32 30c-13 0-20-7-20-17 12-1 20 6 20 17Zm0-10c0-11 7-18 19-18 0 11-7 18-19 18Z" class="fill-vt-green-tint stroke-vt-jade-green" />
      <path d="m19 19 12 10m2-10L44 9" class="stroke-vt-jade-green" stroke-width="1.5" />
      <path d="M8 5v6M5 8h6" class="stroke-vt-wheat-yellow" stroke-width="2" />
      <circle cx="53" cy="32" r="2" class="fill-vt-wheat-yellow" stroke="none" />
    </template>

    <template v-else>
      <!-- 志願者：手托土堆與幼苗，右側鏟子以不同輪廓區別公民的小芽。 -->
      <path d="M24 29V16m0 7c-8 0-13-5-13-12 8 0 13 4 13 12Zm0-7c0-8 5-13 13-13 0 8-5 13-13 13Z" class="fill-vt-green-tint stroke-vt-jade-green" stroke-width="2" />
      <path d="M10 34c4-2 5-6 10-6 3-4 8-4 11 0 5 0 7 4 9 6Z" class="fill-vt-yellow-tint stroke-vt-wheat-yellow" stroke-width="2" />
      <path d="M19 32h1m9-2h1" class="stroke-vt-wheat-yellow" stroke-width="1.5" />
      <path d="M11 37h7l7 3h11l9-6a3 3 0 0 1 4 4l-11 8H23l-12-4" class="fill-vt-bg-1" stroke-width="2" />
      <path d="M18 37h11a3 3 0 0 1 0 6h-7" stroke-width="2" />
      <path d="M3 35h8v11H3Z" class="fill-vt-green-tint stroke-vt-jade-green" stroke-width="2" />
      <path d="M48 3h12v4a6 6 0 0 1-12 0Zm6 10v12" class="stroke-vt-wheat-yellow" stroke-width="2" />
      <path d="M48 25h12v5c0 5-3 8-6 10-3-2-6-5-6-10Z" class="fill-vt-yellow-tint stroke-vt-wheat-yellow" stroke-width="2" />
    </template>
  </svg>
</template>
