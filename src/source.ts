export interface SourceMetadata {
  repositoryUrl: string | null
  commit: string | null
  dirty: boolean
  sourceUrl: string | null
  licenseUrl: string | null
}

// 兩個 Vite config 使用相同的 build-time 定義；SSR 不讀取瀏覽器狀態。
export const sourceMetadata: SourceMetadata = __CIVIC_SOURCE__
