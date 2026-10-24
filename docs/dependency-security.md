# 依賴安全修補

2026-10-11（Asia/Taipei）安裝後的 npm audit 列出 13 個受影響套件（4 moderate、6 high、3 critical，包含間接影響），當時採同系列修補版本，保留 Vite+／Vite core 0.2.4 與既有應用架構。下表是當時的修補紀錄；2026-10-25 已遷移至 Vite+ 1.4.0，Vitest override 的移除見下節。

| 依賴                            | 修補方式                                      | 原因                                                                                                                                                                            |
| ------------------------------- | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Vue／SSR／SFC compiler          | 最低版本提高至 3.5.42，lockfile 同步為 3.5.43 | [SSR 屬性名稱的 XSS 公告](https://github.com/vuejs/core/security/advisories/GHSA-g2v6-rqmx-r4w6)；npm audit 將低於 3.5.42 判為受影響版本                                        |
| Vite+ 的 Vitest 家族            | scoped overrides 統一為 4.1.11                | Vite+ 0.2.4 固定 4.1.10；[Vitest 官方公告](https://github.com/vitest-dev/vitest/security/advisories/GHSA-82fw-gwwq-j7x9) 指定 4.1.11 為修補版；各內部套件維持相同版本           |
| oxfmt 的 tinypool               | override 為 2.1.2                             | 兩份 oxfmt 固定 2.1.0；[tinypool 官方公告](https://github.com/tinylibs/tinypool/security/advisories/GHSA-85c8-ppgw-ccpr) 指定 2.1.2 修復 prototype pollution 導致的程式執行風險 |
| Tailwind CLI 的 @parcel/watcher | scoped override 為 2.5.6                      | CLI 4.3.3 固定 2.5.1；新版改用 picomatch，移除 micromatch → braces 漏洞依賴鏈，維持 2.5 系列                                                                                    |

不要以 `npm audit fix --force` 取代這些修補：當時自動建議包括 Vite+ 1.1.0 與 Tailwind CLI 4.3.0，會超出目前宣告範圍或回退版本。日後上游工具內建安全版本時，再移除對應 override；須確認整個 lockfile 沒有殘留受影響版本，且 `npm audit`、`vp check --no-fmt --no-lint`、`vp test` 與 `vp run build` 均通過。

安裝後原有 lockfile 已更新 Hono 至 4.13.13。新版 [CSRF middleware 豁免 OPTIONS](https://github.com/honojs/hono/commit/eea9735)，讓未註冊的跨來源 preflight 從 403 變為 API fallback 的 JSON 404。使用者同意採用新版行為；測試確認回 `{ error: 'Not found' }`、沒有 CORS 放行標頭且不觸發核心 Worker。實際 POST 的登入／CSRF 防護維持原有流程；404 本身不能取代這些防護。

套件升級也更新 [`licensing-dependencies.tsv`](./licensing-dependencies.tsv)、[`licensing-review.md`](./licensing-review.md) 的數量與根目錄 [`THIRD-PARTY-NOTICES.md`](../THIRD-PARTY-NOTICES.md) 的直接依賴版本。直接 runtime 套件的 LICENSE 全文已逐字核對，內容未變；整體 AGPL-3.0-only、歷史 MIT attribution 與第三方授權維持原有範圍。實際 client／Worker notices 由完整 build 重新產生，不能手改生成物。

2026-10-21 的 lockfile 修訂（`1daeb33`）更新 `markdown-it` 15.0.2 → 15.0.3、`argparse` 3.0.0 → 3.0.3 與其下的 `entities` 8.0.0 → 8.1.0，但未同步授權盤點，導致 main CI 在 `Check dependency license inventory` 失敗，測試與 build 尚未執行。本次依同一份 lockfile 重產 TSV，將 `argparse` 的 license metadata 由 `Python-2.0` 同步為 `PSF-2.0`，並更新直接依賴 notices 版本；`markdown-it` 15.0.3 的 LICENSE 與原保存全文一致。套件總數不變，不移除或放寬 CI 查核。

## 2026-10-25：Vite+ 1.4.0 遷移後的 CI 修復

`vp migrate` 更新 lockfile 後，CI 在授權清單一致性檢查失敗，尚未執行測試與 build。重新產生 `licensing-dependencies.tsv`，並同步 `licensing-review.md` 的統計；維持原有 CI 查核，不略過授權盤點。

乾淨安裝另揭露舊的 `overrides.vite-plus` 仍將 Vitest 家族固定為 4.1.11，與 Vite+ 1.4.0 的 Vitest 5 整合不相容，`vp test` 啟動時出現 `Cannot read properties of undefined (reading 'cacheDir')`。移除這組舊安全修補 override，使用 Vite+ 內建的 Vitest 5.0.5；lockfile 中已無 Vitest 4.1.x。其餘 overrides 不變，不回退工具鏈或修改應用邏輯。

專案 `devEngines.packageManager` 現在要求 npm `^12.0.1`。本機若仍優先使用 npm 11，可用 `vp env exec --package-manager npm@12.0.1 npm install` 安裝，不需改系統預設或降低專案版本要求。

此次 `npm audit` 仍回報 5 個受影響套件（3 moderate、2 high），涉及 Wrangler／Miniflare 的 `undici` 依賴鏈及 `zod`；沒有 Vitest 項目。這不是原 CI 的失敗步驟，本次不以 `audit fix --force` 回退 Cloudflare 工具，也不擴大升級範圍；不能將本次 CI 修復視為 audit 零告警。
