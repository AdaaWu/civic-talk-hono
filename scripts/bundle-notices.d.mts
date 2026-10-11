import type { Plugin } from 'vite'

export interface BundleNoticesOptions {
  target: 'client' | 'worker'
  /** 專案根目錄，用於解析相對 module IDs 與已安裝套件路徑。 */
  root?: string
}

/** 依 Rollup chunk.modules 產生並輸出完整第三方授權聲明。 */
export declare function bundleNotices(options: BundleNoticesOptions): Plugin
