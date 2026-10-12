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

⚠️ 尚未實證的兩項：**同一個 email 用兩種 provider 登入是否落到同一個帳號**、四種寫入是否都落下完整作者快照（含管理端取得完整快照）。

功能面重點：

- **投稿與志願者工具需登入**：建立議題、投稿素材、投稿意見、送出說明頁與產生志願者 prompt 都要先登入（任何未停權的登入者皆可，不看角色）。
- **素材投稿先做事實查核**：素材表單呼叫同源 `POST /api/fact-check`；Civic Talk 驗證登入與停權狀態後，以 Service Binding 轉送到沒有公開 route 的 `fact-check-core`，不需要前端 token 或跨站 CORS。查核完成且結果允許前不顯示張貼按鈕；送出時仍由 Civic Talk API 執行條款與投稿安全審查。
- **具名投稿與 email opt-in**：四種內容都保存投稿當下的作者快照；前台固定顯示 `author_name`，email 只在該筆內容明確同意公開時才顯示。
- **條款同意落庫**：三類具名投稿由伺服器端驗證同意並寫入條款版本與時間。
- **全站登入狀態**：`AppHeader` 顯示登入者與登出，未登入時提供 Google／GitHub 登入面板。
- **管理權限走角色**：Better Auth session 的 `admin`／`super-admin`；角色由 [`../vTaiwan-hono`](../vTaiwan-hono) 管理，本站只讀。

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

議題頁意見入口的「瀏覽意見」使用 `.btn-wheat-yellow`（麥穗黃底、白字，懸停時加深），與紅色「繼續」及透明底「返回議題」區隔；樣式定義於 `src/styles/app.css`，沿用 `--color-vt-wheat-yellow` token。

議題頁在寬度超過 600px 時提供「概覽／共識／爭點／立場地圖／意見（公民）或行動（志願者）」雙語文字頁籤；前四項切換說明輪播，公民的第五項進入公民意見，志願者的「行動」切到手機第五張的同一張導航卡，提供公民意見、素材庫與志願者工具三個入口。桌機左右箭頭位於輪播高度的 30%，下方圓點為 16px；手機維持原有控制。輪播頁面以 `tab=consensus|disputes|positions|actions` 保存，省略 `tab` 為概覽；志願者的 `actions` 還原第五張導航卡，公民則停在最後一張立場地圖。`step=comments|materials|volunteer` 仍控制操作版面，重新整理與上一頁／下一頁會還原對應狀態。

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

## 資料

- 業務資料庫：D1 `vtaiwan-civic-talks`（binding：`DB`）；業務表一律 `ct_` 前綴：`ct_issues`、`ct_materials`、`ct_briefings`、`ct_opinions`
- `migrations/0001`–`0006`（初始 schema、作者快照、條款同意）**本機與遠端皆已套用**
- 認證資料庫：D1 `vtaiwan-auth`（binding：`DB_AUTH`），schema 由 `../vTaiwan-hono` 維護——本 repo **只讀不改**，🚫 不對它跑任何 migration
- 遠端 migration 需先取得授權：`npx wrangler d1 migrations apply vtaiwan-civic-talks --remote`

## 部署

```bash
vp run deploy    # = build + 建置產物／公開原始碼檢查 + wrangler deploy（需授權）
```

環境設定（機密、`BETTER_AUTH_URL`、OAuth callback 網址）、部署實際上傳的內容、煙霧測試清單與**絕對不能跑的 D1 指令**見 [`deploy_notes.md`](./deploy_notes.md)。

更完整的 agent／架構指引見 [`AGENTS.md`](./AGENTS.md)。
