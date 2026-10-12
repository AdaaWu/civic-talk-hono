# 依賴安全修補

2026-10-11（Asia/Taipei）安裝後的 npm audit 列出 13 個受影響套件（4 moderate、6 high、3 critical，包含間接影響），以下採同系列修補版本，保留 Vite+／Vite core 0.2.4 與既有應用架構。

| 依賴                            | 修補方式                                      | 原因                                                                                                                                                                            |
| ------------------------------- | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Vue／SSR／SFC compiler          | 最低版本提高至 3.5.42，lockfile 同步為 3.5.43 | [SSR 屬性名稱的 XSS 公告](https://github.com/vuejs/core/security/advisories/GHSA-g2v6-rqmx-r4w6)；npm audit 將低於 3.5.42 判為受影響版本                                        |
| Vite+ 的 Vitest 家族            | scoped overrides 統一為 4.1.11                | Vite+ 0.2.4 固定 4.1.10；[Vitest 官方公告](https://github.com/vitest-dev/vitest/security/advisories/GHSA-82fw-gwwq-j7x9) 指定 4.1.11 為修補版；各內部套件維持相同版本           |
| oxfmt 的 tinypool               | override 為 2.1.2                             | 兩份 oxfmt 固定 2.1.0；[tinypool 官方公告](https://github.com/tinylibs/tinypool/security/advisories/GHSA-85c8-ppgw-ccpr) 指定 2.1.2 修復 prototype pollution 導致的程式執行風險 |
| Tailwind CLI 的 @parcel/watcher | scoped override 為 2.5.6                      | CLI 4.3.3 固定 2.5.1；新版改用 picomatch，移除 micromatch → braces 漏洞依賴鏈，維持 2.5 系列                                                                                    |

不要以 `npm audit fix --force` 取代這些修補：當時自動建議包括 Vite+ 1.1.0 與 Tailwind CLI 4.3.0，會超出目前宣告範圍或回退版本。日後上游工具內建安全版本時，再移除對應 override；須確認整個 lockfile 沒有殘留受影響版本，且 `npm audit`、`vp check --no-fmt --no-lint`、`vp test` 與 `vp run build` 均通過。

安裝後原有 lockfile 已更新 Hono 至 4.13.13。新版 [CSRF middleware 豁免 OPTIONS](https://github.com/honojs/hono/commit/eea9735)，讓未註冊的跨來源 preflight 從 403 變為 API fallback 的 JSON 404。使用者同意採用新版行為；測試確認回 `{ error: 'Not found' }`、沒有 CORS 放行標頭且不觸發核心 Worker。實際 POST 的登入／CSRF 防護維持原有流程；404 本身不能取代這些防護。

套件升級也更新 [`licensing-dependencies.tsv`](./licensing-dependencies.tsv)、[`licensing-review.md`](./licensing-review.md) 的數量與根目錄 [`THIRD-PARTY-NOTICES.md`](../THIRD-PARTY-NOTICES.md) 的直接依賴版本。直接 runtime 套件的 LICENSE 全文已逐字核對，內容未變；整體 AGPL-3.0-only、歷史 MIT attribution 與第三方授權維持原有範圍。實際 client／Worker notices 由完整 build 重新產生，不能手改生成物。
