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

### 同日補修：setup action 在 frozen 安裝前改寫 lockfile

修復版本 `1db2836` 的 [CI run](https://github.com/g0v/civic-talk-hono/actions/runs/40138469273) 仍在授權清單檢查失敗。該版本的 lockfile 與 TSV 原本一致，但 `setup-vp` 的 `run-install` 預設為 `true`，會在明確的 `vp install --frozen-lockfile` 步驟前先執行一般 `vp install`；之後的 frozen 安裝不能還原已改寫的 lockfile。前次本機驗證只跑明確的 frozen 安裝，未包含 setup action 的這次隱含安裝。

以 npm 12.0.1、`CI=true`、Linux／x64 安裝目標，在沒有 `node_modules` 的隔離目錄執行一般 `vp install`，觀察到 78 個 lockfile entries 改變，包括 `devOptional`／`dev` 標記，並使原有 TSV 檢查失敗。這是 macOS 上指定 Linux 目標的安裝煙霧測試，不是 Linux runtime 或 GitHub Actions 已通過的證明。

`.github/workflows/ci.yml` 明確設定 `run-install: false`，只保留後續 frozen 安裝；不在 CI 重產 TSV，也不略過一致性檢查。另一個全新的隔離目錄只執行 frozen 安裝後，lockfile 的 bytes／SHA-256 完全不變，授權清單檢查通過。

另以僅含 tracked 來源與本次修正的全新目錄（無 `node_modules`、無 `.dev.vars`），在 `CI=true` 下依序執行 frozen 安裝、Cloudflare typegen、型別檢查、授權清單檢查、39 檔／344 項測試與完整 build，全部通過。此驗證仍在本機 macOS 執行；修正後的 GitHub Ubuntu workflow 尚須於發布本次變更後驗證。

## 2026-10-25：Zod／Undici 安全修補與應用相容性驗收

- Zod `4.4.3` → `4.6.7`，沿用 Better Auth 現有的 `^4.3.6` 相依範圍；Better Auth／core 保持 `1.6.25`，不更動共用認證 schema。
- 以 `overrides.miniflare.undici: "7.30.1"` 將 Miniflare 的 Undici `7.29.1` 更新至修補版。上游 Miniflare 原生採用安全版本且冷安裝、audit、測試及執行驗收通過後，才移除此 override。
- 執行驗收另發現既有 workerd 連線問題，因而加入 `overrides.miniflare.workerd: "1.20261014.1"`；Wrangler `4.149.0`、Vite plugin `1.63.1`、Miniflare `5.20261006.1-alpha` 保持不變，不以回退工具鏈或改寫登入守門處理。
- 保留使用者原有的 lockfile metadata 變更，同步重產授權 TSV。Miniflare 的 workerd 與 5 個平台 binary 以 scoped override 另行安裝，Wrangler 原有 workerd 相依不變；清單增加 6 個 Apache-2.0 entries，合計 357 筆。bundle notices 由 build 重新產生。

### 已通過

- npm 12.0.1 frozen 冷安裝、Cloudflare typegen、`vp check --no-fmt --no-lint`、授權清單一致性、40 檔／345 項測試、CSS／client／Worker 完整 build。
- `npm audit` 為 **0 vulnerabilities**。另於 macOS 的全新隔離目錄指定 Linux／x64 目標進行 frozen 安裝，lockfile bytes 不變、授權檢查與 audit 均通過；這不代表 GitHub Ubuntu runtime 已驗證。
- 小量安全 smoke：有 `.max(1)` 的 Zod 陣列在超限時提早拒絕；Better Auth 真實 social sign-in schema 接受正常 scopes、拒絕錯誤型別；Undici 拒絕小寫／大寫 SRI 的錯誤內容，以及過多 Content-Encoding 搭配提早斷線的回應，程序未崩潰。
- 本機 SSR 頁面、公開 API、RSS、兩份 notices、素材／意見詳情、404 與舊網址的 301／302 導向；匿名登入守門、錯誤登入輸入 400 與 CSRF 403。最終未加診斷載入器或 runtime 環境覆寫的 dev server 與 production preview 皆通過完整 smoke，包括每輪 5 個並行 POST、共 8 輪，全部回預期 401 JSON。
- 真實 Chromium 檢查首頁與議題頁、登入 provider 面板、投稿與管理端匿名登入牆、三語切換、carousel 與 URL 同步；桌機 1440×1000、手機 390×844 的淺色／深色畫面已檢查，該次瀏覽器驗證未見 hydration mismatch 或 JavaScript error。

### 驗收發現並修復：未讀 POST body 的連線重用錯誤

一般 keep-alive HTTP smoke 曾在匿名 POST 預期 401 時得到 500；Vite／Miniflare 診斷取得 `undici.fetch` 的 `ECONNRESET`。以每輪 5 個 POST、最多 8 輪的本機請求亦可重現；舊 runtime 的 production preview 路徑同樣觀察到此錯誤。

以暫時的 Node 診斷載入器將 Miniflare transport 導向隔離安裝的舊 Undici `7.29.1`，錯誤 stack 確實指向舊版本，相同請求仍失敗，排除僅在 `7.30.1` 新引入的解釋。進一步核對 [workers-sdk #16199](https://github.com/cloudflare/workers-sdk/issues/16199)：該回報包含相同 Miniflare／Vite plugin 版本、未讀串流 body 就回 401／403 的條件，以及 workerd `1.20261014.1` 起排除連線問題的版本對照。

先以隔離安裝的 workerd `1.20261014.1` 驗證實際應用 smoke 通過，再固定 Miniflare 的 workerd 相依。新增 `src/tests/miniflareTransport.test.ts`，使用真實本機 runtime 反覆檢查「拒絕未讀串流 POST 後，下一個 GET 仍成功」：舊 runtime 先以 `fetch failed`／`EPIPE` 失敗，修補後通過，完整測試也通過。沒有加 retry、忽略錯誤、預先讀取未授權 body 或改變 API 授權語意。

此 workerd override 只影響本機開發／測試 runtime，不會決定 Cloudflare 正式站所使用的 runtime 版本。上游 Miniflare 原生採用已修正 runtime 且本回歸測試與實際 dev／preview 驗收通過後，才移除此 override。

### 驗證界線

Zod 升級不會替 Better Auth 未限長的 `scopes` 加上長度限制，不能將 audit 歸零解讀為所有大型輸入資源耗盡風險皆消失。本次沒有做正式站 Google／GitHub OAuth、同 email account linking、已登入的投稿／投票／管理寫入或遠端 Service Binding 實測；未對 DB_AUTH 做 DDL、未套用遠端 migration、未部署。
