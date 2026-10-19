# Civic Talk（Hono + Vue SSR）

公共議題審議平台，**受原始版 [Civic Talk](https://github.com/v-taiwan/civic-talk) 啟發**，由該版靜態站移植而來：**Hono + Vue 3 SSR/hydration + Tailwind v4 + Cloudflare Workers / D1**。

內容生成仍由志願者使用自己的 AI token 完成，平台只產生 prompt 並收回結果；例外是投稿安全審查會呼叫外部 moderation 服務，素材事實查核則由 Civic Talk Worker 透過 Cloudflare Service Binding 呼叫不公開的 `fact-check-core` Worker。

## 軟體授權

本專案的軟體與建置／執行文件整體採 **GNU Affero General Public License version 3 only（AGPL-3.0-only）**，完整條款見 [`LICENSE`](./LICENSE)。既有 MIT 部分與其他元件保留各自授權及 notices，詳見 [`NOTICE`](./NOTICE) 與 [`THIRD-PARTY-NOTICES.md`](./THIRD-PARTY-NOTICES.md)。

截至 [`v0.1.0-mit-final`](https://github.com/g0v/civic-talk-hono/tree/v0.1.0-mit-final)（含該版本，commit `0cb5f309fa373e69ff60563bdc3fb0201332ceba`）已依 MIT 發布的軟體，仍可依 MIT 使用；原文保留於 [`LICENSE-MIT`](./LICENSE-MIT)。後續整體軟體版本採 AGPL-3.0-only，這不撤銷既有 MIT 權利，也不將新 AGPL 貢獻提供為可任選 MIT 的版本。

首個 AGPL 正式版以 `v0.2.0` tag 界定；合併後由維護者將該 tag 指向實際 merge commit，不預填尚未存在的 SHA 或發布日期。2026-10-11 維護者兼法務已核准本次切換；來源盤點、限制與決策紀錄見 [`docs/licensing-review.md`](./docs/licensing-review.md)。核准不代表已合併、建立 tag 或部署。

**軟體與投稿內容分開**：公民意見摘要維持平台現有條款的 **CC-BY-SA 4.0**，素材依原來源授權；這是依現有條款澄清 footer 的內容範圍，不撤銷先前已合法授出的 CC 許可。本次不替其他內容、資料或外部服務輸出新增一體適用的授權。軟體授權切換不授予額外的商標使用權，未釐清的品牌圖像與設計來源也不因更換 `LICENSE` 就被視為已取得許可。

修改版透過網路提供服務時，需依 AGPL 向使用者提供該運行版本的 Corresponding Source。footer 的原始碼入口指向建置 commit 的 archive；部署前查核與 fork 設定見 [`deploy_notes.md`](./deploy_notes.md)。新增貢獻與舊分支的來源／授權處理見 [`CONTRIBUTING.md`](./CONTRIBUTING.md)。

## 目前狀態

已部署於 **<https://civic.vtaiwan.tw>**（Cloudflare Workers，Worker 名稱 `civic-talk`，首次部署 2026-08-05）。

已在正式站驗過（2026-08-11）：

- 首頁與 `/api/issues` 皆 200、未登入打 `/api/me` 與 `/api/admin/stats` 得 401、`/api/auth/admin/list-users` 得 404（本站刻意不開成員管理端點）、`/index.html` 301 導向 `/`。
- **Google 與 GitHub 登入都成功**、`admin` 角色進得了後台、登入後投稿成功。

**同一個 email 的 Google／GitHub 帳號整合也已在正式站實測成功**（使用者確認 2026-10-16，見 [#5 留言](https://github.com/g0v/civic-talk-hono/issues/5#issuecomment-6225088110)）。

⚠️ 尚未實證：四種寫入是否都落下完整作者快照（含管理端取得完整快照）。

功能面重點：

- **投稿與志願者工具需登入**：建立議題、投稿素材、投稿意見、送出說明頁與產生志願者 prompt 都要先登入（任何未停權的登入者皆可，不看角色）。
- **歡迎導覽（#163）**：首頁 Welcome 彈框的角色說明後提供「瞭解更多」行內文字連結，前往 `/about`；桌機與手機皆顯示，並同步繁中、英文與日文。
- **素材投稿先做事實查核**：素材表單呼叫同源 `POST /api/fact-check`；Civic Talk 驗證登入與停權狀態後，以 Service Binding 轉送到沒有公開 route 的 `fact-check-core`，不需要前端 token 或跨站 CORS。查核完成且結果允許前不顯示張貼按鈕；送出時仍由 Civic Talk API 執行條款與投稿安全審查。
- **具名投稿與 email opt-in**：四種內容都保存投稿當下的作者快照；前台固定顯示 `author_name`，email 只在該筆內容明確同意公開時才顯示。
- **條款同意落庫**：三類具名投稿由伺服器端驗證同意並寫入條款版本與時間。
- **全站登入狀態**：`AppHeader` 顯示登入者與登出，未登入時提供 Google／GitHub 登入面板。
- **管理權限走角色**：Better Auth session 的 `admin`／`super-admin`；角色由 [`../vTaiwan-hono`](../vTaiwan-hono) 管理，本站只讀。
- **議題標籤與搜尋（#95）**：建立議題時可輸入自訂標籤，以 `, ` 分隔；去除開頭 `#` 與首尾空白，忽略空值，並忽略大小寫去重、保留第一個字樣。管理員可在既有議題編輯視窗增刪標籤，清空欄位即可全部移除。首頁議題卡於手機底部另起一排、桌機右下角顯示標籤；搜尋同時比對標題、簡介與標籤（含 `#tag` 寫法），並以所有未隱藏議題的標籤提供原生 autocomplete 建議。`?search=...` 可還原搜尋，輸入時以 `replaceState` 更新網址；議題預覽、返回清單與上一頁／下一頁保留搜尋及其他 query／hash。角色過濾與排序規則不變。
- **使用者回報（#148）**：桌機以相同圖示＋「使用者回報」文字合成單一按鈕，手機頂列使用回報圖示，點擊開啟 modal、不換頁。手機 Navbar 維持單列，登入頭像位於角色切換左側，右端依序為「公民／志願者 → 回報圖示 → 漢堡選單」。三種分類與描述必填，免登入匿名送出，關閉後保留當頁回報草稿。回報只保存分類、描述、頁面路徑＋query、ID 與時間，僅管理員可瀏覽；不讀取或保存回報者帳號，也不額外收集 IP／瀏覽器資料。回報視窗與後台提供另開 GitHub issues 的連結，不自動傳送回報內容。
  - 回報按鈕在 `sm`（640px）起就顯示圖示＋文字，不必等到桌機導覽列展開；小於 640px 僅顯示圖示。所有寬度均維持同一列與同一個按鈕。
  - 點擊回報 modal 外圍霧面、按 Escape 或關閉鈕可收起視窗，分類與未送出描述仍保留；點擊框內內容或留白不會誤關閉。送出期間這些關閉操作皆暫停，請求結束（含失敗或 15 秒逾時）後恢復。
  - 手機回報視窗（#151）使用動態視窗高度；一般高度下由描述欄位填滿剩餘空間、長文在欄位內捲動。短螢幕、長網址或錯誤提示使內容放不下時，改由表單內層捲動，保留可用的輸入高度並讓操作按鈕可達；彈窗本身不捲動。桌機維持五列輸入框，兩種版面皆可垂直調整欄位尺寸。
  - 管理後台的「使用者回報」排在第一個分頁；`/admin` 未指定或帶無效 `tab` 時預設顯示回報。其他分頁使用明確的 `?tab=reports|moderation|issues|materials|opinions`，`?tab=feedback` 仍可直接開啟回報；切換回報時省略 `tab`，其他 query、hash 與上一頁／下一頁狀態照常保留。
- **三語介面（#136）**：桌機標頭與手機選單可直接選擇繁體中文、English、日本語。掛載後優先恢復 `localStorage.civic_lang` 的手動偏好（保留舊值 `zh`）；沒有有效偏好或儲存不可用時，依 `navigator.languages` 順序選第一個支援的語言，清單為空時改用 `navigator.language`。`en-*`／`ja-*` 分別使用英文／日文，`zh-*` 使用繁中，皆不支援時回繁中；自動偵測不寫入手動偏好。SSR 維持繁中，因此初次載入可能先短暫顯示中文，再於掛載後切換；停用 JavaScript 時維持繁中。日期與 `OPINION.md` 引導文件跟隨語言，使用者投稿的原始內容不自動翻譯。
  - 三語 navbar 統一在 1280px 起展開桌機導覽，以下使用漢堡選單；桌機容器同步加寬、長名稱截斷並可懸停查看全文，避免登入後的管理連結與使用者資訊擠版。下拉選單與桌機登入面板沿用相同斷點。手機透過較小 logo 與水平間距維持單列；日語桌機仍以 `isJapanese` 使用較小字級，志願者表單標籤在日語手機版也使用較小字級；中英版不縮字，footer 正常換行。首頁排序在所有寬度均使用帶「優先顯示：」三語標籤的下拉選單（#161），保留最新、最多關注與最少關注三種排序。

## 開發

```bash
cp .dev.vars.example .dev.vars   # 填入 Better Auth 與 Google／GitHub OAuth 憑證
npm install
npx wrangler d1 migrations apply vtaiwan-civic-talks --local
vp run dev
```

> 登入功能在 `vp run dev` 下**測不了**：Better Auth 的資料表在遠端的 `vtaiwan-auth`，本機模擬庫是空的。要實測登入請用 `vp run dev:remote`。

常用指令：

| 指令                          | 說明                                                       |
| ----------------------------- | ---------------------------------------------------------- |
| `vp run dev`                  | 先完整 build（含 CSS 與 notices），再啟動本機 Worker + HMR |
| `vp run dev:remote`           | 先完整 build（含 notices），再連遠端 D1；實測登入用這個    |
| `vp run css`                  | 由 `src/styles/app.css` 建置 `public/styles.css`           |
| `vp run css:watch`            | 監看並自動重建 Tailwind CSS                                |
| `vp run build`                | 依序建置 CSS、client bundle、server bundle                 |
| `vp check --no-fmt --no-lint` | tsc 型別檢查                                               |
| `vp test`                     | 執行自動化測試（Vitest，`src/tests/`）                     |
| `vp exec wrangler types`      | 產生 Cloudflare 綁定型別                                   |

開發伺服器的 `/licenses/client.txt` 與 `/licenses/worker.txt` 使用啟動前 production build 產生的 notices 快照，兩份檔案都以 UTF-8 提供；更動套件或 imports 後請重啟 `dev`／`dev:remote` 更新。頁面仍由 Vite 原始碼提供 HMR，不會切成 production bundle 執行。

依賴安全修補與 `package.json` overrides 的原因、移除條件見 [`docs/dependency-security.md`](./docs/dependency-security.md)。更新套件後也須重產授權盤點：`node scripts/licensing-dependencies.mjs`，再跑型別檢查、測試與完整 build，讓第三方 notices 對應實際產物。

樣式 token 以 `vtaiwan-design-system/project/colors_and_type.css` 為穩定來源，透過 Tailwind v4 的 `vt-*` utilities 使用，例如 `text-vt-democratic-red`、`bg-vt-bg-2`、`font-vt-serif`。

議題頁的「瀏覽意見」使用 `.btn-jade-green`（翠玉綠底），「AI 幫幫忙」使用 `.btn-wheat-yellow`（麥穗黃底），兩者皆為白字、懸停時加深；樣式定義於 `src/styles/app.css`，分別沿用 `--color-vt-jade-green` 與 `--color-vt-wheat-yellow` token。意見入口在 `sm`（640px）以上顯示放大、直排置中的「發表意見／AI 幫幫忙／瀏覽意見／返回議題」，AI 入口直接切換既有 `action=ai_help`；窄螢幕維持「繼續／瀏覽意見／返回議題」三個按鈕。發表意見表單下方的操作按鈕仍在 `sm` 以上寬度橫排置中，手機維持直向排列。

議題頁在寬度超過 600px 時提供「概覽／共識／爭點／立場地圖／意見（公民）或行動（志願者）」三語文字頁籤；前四項切換說明輪播，公民的第五項進入公民意見，志願者的「行動」切到手機第五張的同一張導航卡，提供公民意見、素材庫與志願者工具三個入口。桌機左右箭頭位於輪播高度的 30%，下方圓點為 16px；手機維持原有控制。輪播頁面以 `tab=consensus|disputes|positions|actions` 保存，省略 `tab` 為概覽；志願者的 `actions` 還原第五張導航卡，公民則停在最後一張立場地圖。`step=comments|materials|volunteer` 仍控制操作版面，重新整理與上一頁／下一頁會還原對應狀態。

暗黑模式的輪播左右箭頭使用白色，懸停時維持白色，停用時保留半透明；最後一張的「前往公民意見」箭頭也沿用此設定。淺色模式維持套件原有箭頭色彩。

議題頁的表單、意見投票與標頭登入入口共用目前的導覽網址；頁籤、步驟、意見操作、搜尋與上一頁／下一頁都會同步登入 `callbackURL`，保留目前 query 與 hash，不會回到首次開啟的舊版面。

匿名點擊某筆意見的投票按鈕，或投票時遇到 session 過期，會把登入回跳定位設為 `#opinion-<id>`。回到意見列表後，等待登入狀態與意見資料載入，展開該筆長文／待審核內容並捲到投票控制；已確認違規或暫時隱藏的內容不會被展開。回跳不會自動投票，使用者須再按一次確認；意見已移除或定位無效時不強制捲動。

## 路由

| 路徑                             | 說明                                                            |
| -------------------------------- | --------------------------------------------------------------- |
| `/`                              | 議題列表／新增議題（新增需登入）                                |
| `/issues/:id`                    | 議題說明、素材、志願者工具、意見、Polis                         |
| `/issues/:id/source/:materialId` | 素材詳情（獨立分享連結，含 OG meta）                            |
| `/issues/:id/comment/:opinionId` | 意見詳情（獨立分享連結，含 OG meta）                            |
| `/contribute/:id`                | 素材投稿（需登入）                                              |
| `/about`                         | 關於                                                            |
| `/privacy`                       | 隱私政策（作者快照、公開選擇與帳號刪除的說明）                  |
| `/terms`                         | 使用條款（投稿時同意的版本）                                    |
| `/admin`                         | 管理後台（Google／GitHub 登入，需 `admin`／`super-admin` 角色） |

舊網址 `/index.html`、`/issue.html?id=`、`/contribute.html?id=`、`/about.html`、`/admin.html` 會導向新路由。

### 議題標籤 API

- `POST /api/issues` 可帶 `tags: string[]`，省略時保存空陣列；標籤一併納入既有投稿安全審查。`PUT /api/issues/:id` 仍需 `admin`／`super-admin`，可帶 `tags: string[]` 更新，省略時保留原標籤、`[]` 明確清除；非字串陣列回 `400 { "error": "..." }`。其餘必填欄位、成功回應與授權規則不變。
- 議題列表與詳情的議題物件新增 `tags: string[]`。AI 暫時隱藏議題在公開回應中的標籤為 `[]`，管理端列表仍可讀取原值；首頁卡片及 autocomplete 不顯示暫時隱藏或確認違規的標籤。

### 使用者回報 API

- `POST /api/feedback`：免登入；JSON `{ category, description, page_path }`，`category` 為 `bug`／`usability`／`suggestion`，描述去除首尾空白後須為 1–10,000 個 Unicode code points；`page_path` 為最多 4,096 個 code points 的同源相對路徑＋query，不含 origin 或 hash。成功 `201 { "ok": true }`，無效資料 `400 { "error": "..." }`。表單送出不帶 session cookie，仍沿用全域 CSRF 防護，不開放跨來源寫入。
- 回報表單的請求上限為 15 秒；逾時沿用失敗提示並解除送出鎖定，保留分類與完整描述，允許關閉／重開或手動重試，不自動重送。逾時僅中止瀏覽器等候，不保證伺服器尚未寫入。
- `GET /api/admin/feedback`：需未停權的 `admin`／`super-admin`，未登入 `401`、無權限 `403`；回傳 `{ id, category, description, page_path, created_at }[]`，依時間與 ID 由新到舊排列，回應為 `private, no-store` 並帶 `Vary: Cookie`，無公開查詢端點。
- `/admin?tab=feedback`：只供瀏覽，包含載入／錯誤重試／空清單狀態；分頁與 URL 雙向同步，保留其他 query 並支援上一頁／下一頁。描述以跳脫過的純文字呈現，保留換行，不執行 HTML。

## 資料

- 業務資料庫：D1 `vtaiwan-civic-talks`（binding：`DB`）；業務表一律 `ct_` 前綴：`ct_issues`、`ct_materials`、`ct_briefings`、`ct_opinions`
- `migrations/0001`–`0006`（初始 schema、作者快照、條款同意）**本機與遠端皆已套用**
- `migrations/0014_user_feedback.sql` 新增 `ct_feedback`；本機與遠端皆已套用。2026-10-16 經使用者授權套用遠端 0014，查核 pending 清單為空、schema 與索引符合預期，新增業務表僅 `ct_feedback`； Worker已部部，正式站功能已上線。
- `migrations/0015_issue_tags.sql` 為 `ct_issues` 新增 `tags` JSON 文字欄位，舊議題預設 `[]`、不新增資料表。本機與遠端皆已套用：2026-10-20 經使用者授權套用遠端 0015，查核 pending 清單為空、資料表清單未變，16 筆既有議題的 tags 皆為 `[]`。此次未部署 Worker。
- 認證資料庫：D1 `vtaiwan-auth`（binding：`DB_AUTH`），schema 由 `../vTaiwan-hono` 維護——本 repo **只讀不改**，🚫 不對它跑任何 migration
- 遠端 migration 需先取得授權：`npx wrangler d1 migrations apply vtaiwan-civic-talks --remote`

## 部署

```bash
vp run deploy    # = build + 建置產物／公開原始碼檢查 + wrangler deploy（需授權）
```

環境設定（機密、`BETTER_AUTH_URL`、OAuth callback 網址）、部署實際上傳的內容、煙霧測試清單與**絕對不能跑的 D1 指令**見 [`deploy_notes.md`](./deploy_notes.md)。

更完整的 agent／架構指引見 [`AGENTS.md`](./AGENTS.md)。
