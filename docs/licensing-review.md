# #126 授權切換：法律審查盤點

本文件是 Draft PR 的證據與待確認事項，不代表已完成法律審查或正式部署。盤點日期：**2026-10-11（Asia/Taipei）**。

維護者已確認本次以軟體程式碼及其建置／執行文件為範圍，投稿內容另行處理；本次切換不授予額外的商標使用權，品牌素材權利與規範留待法律顧問確認。維護者也指定原始碼入口放在 footer。

## 授權分界

| 項目 | 固定紀錄 |
| --- | --- |
| MIT final tag | [`v0.1.0-mit-final`](https://github.com/g0v/civic-talk-hono/tree/v0.1.0-mit-final) |
| MIT baseline commit | `0cb5f309fa373e69ff60563bdc3fb0201332ceba` |
| Tag 發佈日期 | 2026-10-11；來自 annotated tag 時間，不以 commit 日期代替 |
| 候選切換 commit／日期 | 見 [`NOTICE`](../NOTICE)；main 尚待審查及合併 |
| 原 MIT 著作權 notice | `Copyright (c) 2026 Bestian Tang`；[`LICENSE-MIT`](../LICENSE-MIT) 原封保留 |
| 主授權 | AGPL-3.0-only；不是後續版本任選 MIT／AGPL 的雙重授權 |

## 本 repo 的作者與同意紀錄

以完整、非 shallow 的 Git history 執行 `git shortlog -sne v0.1.0-mit-final`，共 **227** 個 commits（含 merge commits）；Git 作者資料是 attribution 證據，不足以單獨證明權利歸屬。此處不重複公布作者 email，也不改寫歷史。

| Git 作者名稱 | Commits | 可查證同意／尚待確認 |
| --- | ---: | --- |
| Bestian Tang（兩組作者紀錄） | 167 | #126 提案及本次維護者指示；其有權授權的範圍仍由顧問審閱 |
| Link1515／Terry | 45 | [Link1515 回覆](https://github.com/g0v/civic-talk-hono/issues/126#issuecomment-5881817204)；Terry 的 GitHub noreply 記錄含 Link1515 |
| jiangzuojin226-sys | 6 | [同意回覆](https://github.com/g0v/civic-talk-hono/issues/126#issuecomment-5884842263) |
| Lynn | 4 | [clhuang224 同意回覆](https://github.com/g0v/civic-talk-hono/issues/126#issuecomment-5882215174)；Git 作者識別可對照原紀錄 |
| tahodev | 1 | 維護者確認尚未取得同意，可能無法取得；不視為默認同意。Commit `fdbb0e30cc0a6c469f0bc1e4b7b9155bdb98a013`，依既有 MIT 路徑保留來源／notices，待顧問確認 |
| 苗 | 1 | Commit `4cc4333ced68fa249c1f071cc089754d387bf46f` 修改 `src/l10n/en.ts`／`zh-TW.ts`；GitHub commit API 的 author／committer 帳號皆為 null。維護者確認此為另一個 Agent 署名，**不是 shuyanglin**，未取得同意；真正有權授權者及適用的既有 MIT 許可仍待顧問確認 |
| Claude | 3 | Git 工具作者紀錄；不是從名稱即可認定的法律權利人或授權同意 |

[shuyanglin 在 #126 的同意回覆](https://github.com/g0v/civic-talk-hono/issues/126#issuecomment-5884793016)另行保留；維護者確認它**不涵蓋**上表「苗」的 commit。

Git history 另含 Cursor、Codex 與 Claude 的 co-author／session 標記；保留這些 attribution，工具署名不視為權利人授權書。法律顧問須確認實際貢獻者、雇主或其他權利人及必要許可。未回覆與期限屆滿都不是同意證據。

## 移植／參考來源

### 原始 Civic Talk

- 公開來源：[`v-taiwan/civic-talk@e2d516081cfbb25e9a669c5483ae8faf270d1a80`](https://github.com/v-taiwan/civic-talk/tree/e2d516081cfbb25e9a669c5483ae8faf270d1a80)。
- 該版本完整 tree 未見獨立 `LICENSE`；[README](https://github.com/v-taiwan/civic-talk/blob/e2d516081cfbb25e9a669c5483ae8faf270d1a80/README.md) 的 License 節標示 **MIT**，並保留感謝 ronny wang 提供概念與授權社群使用的文字。GitHub license metadata 為 null，故沒有將 metadata 當成「沒有授權」。
- [舊首頁](https://github.com/v-taiwan/civic-talk/blob/e2d516081cfbb25e9a669c5483ae8faf270d1a80/public/index.html) 頁尾標示 `© 2026 vTaiwan · CC-BY-SA 4.0`。軟體 MIT 與網站內容 CC 的具體範圍請顧問確認。
- 本 repo 移植 commit：`9b98f88eac6b8796120cd183fef38ddd251e2679`；涵蓋 `src/api/routes.ts`、`src/db/queries.ts`、`migrations/0001_init.sql`、初始 views／components／l10n／樣式及 `public/vtaiwan-logo.svg` 等，後續多有修改。參見該 commit 的 diff；不是宣稱這些現行檔案全部仍等同舊站。
- 固定來源 SHA 是查核版本；尚未證明它就是移植時本機 sibling checkout 的精確 SHA。來源及已找到的聲明保留於 [`THIRD-PARTY-NOTICES.md`](../THIRD-PARTY-NOTICES.md)，不補造缺少的原作者 copyright notice。

### vTaiwan-hono

- 公開來源：[`g0v/vTaiwan-hono@fb04555cc02f9a4ce1de86622e0ae63c00ee2db6`](https://github.com/g0v/vTaiwan-hono/tree/fb04555cc02f9a4ce1de86622e0ae63c00ee2db6)。該版本 [LICENSE](https://github.com/g0v/vTaiwan-hono/blob/fb04555cc02f9a4ce1de86622e0ae63c00ee2db6/LICENSE) 為 MIT，著作權 notice 與本 repo 的原 MIT 文本完全相同。
- Better Auth 對齊紀錄：本 repo `29ddfdad0e97540f5c350ab347d1aeb05dca6df5`，涉及 `src/auth/createAuth.ts`／`authorization.ts` 等；上游參考路徑為 `src/server/lib/createAuth.ts`／`authorization.ts`。查核 SHA 不冒充精確複製時的 checkout SHA。
- Favicon／OG 匯入 commit：`4cdc54156cebd6b233973c1d6dd2abc3866807e7`。上游查核版本的 **18** 個同路徑檔案 Git blob 與本 baseline 完全相同：`public/browserconfig.xml`、`public/favicon.ico` 及 `public/img/*` 的 16 個檔案。`public/manifest.json` 已客製；兩個 `public/vtaiwan-logo*.svg` 未在該 snapshot 找到相同 blob。
- 檔案相同與 repo MIT notice 是來源證據，但不單獨證明品牌原始圖像的著作權鏈或商標使用權；品牌資產列入下方待確認項目。

### 設計 token 與品牌資產

- 本 repo `912d2a1d890bae47eb6625d5633cedb6f03ed03e` 將設計系統 token 導入 `src/styles/app.css`。原紀錄僅指定 sibling 路徑 `vtaiwan-design-system/project/colors_and_type.css`。
- 維護者已確認來源專案為：[`Tofuswang/vtaiwan-design-system@19152d2f3e6427cd80978fa4899072f967eb1e3c`](https://github.com/Tofuswang/vtaiwan-design-system/tree/19152d2f3e6427cd80978fa4899072f967eb1e3c)。精確匯入時的 checkout SHA 仍未查證；此固定 SHA 是本次盤點版本。
- 查核根／project README、完整 tree 及 token 原檔：未找到明確軟體授權或獨立 LICENSE。project README 說 logo 由使用者提供，並列出其他參考 codebase；這些來源說明不是使用者有權再授權的證明。
- 本次不替 token、logo／favicon／OG 圖補造 AGPL 或 MIT 授權，也不將「商標權保留」誤寫成已解決圖像著作權。維護者希望品牌保留權利、程式碼與配色採彈性使用方式；此政策意圖不是已取得權利人許可的證明。請確認權利人、既有許可及是否需補 notices、取得許可或替換；也不能用新的保留權利聲明撤銷已合法授出的許可。

### 其他可見來源

- `src/components/SignInButtons.vue` 內嵌 Google／GitHub 品牌圖示；來源導入記錄 `636d0f4521e589a08e6c767d01269fc3270e3771`。軟體授權不替代品牌使用規範，請顧問確認來源與使用條件。
- `src/ssr/render.ts` 透過 Google Fonts 載入 Noto Sans TC／Noto Serif TC，沒有將字體檔打包進本 repo；字體原來源條款另行適用。
- `src/views/Issue.vue` 載入外部 `https://polis.tw/embed.js`；Civic Talk 的 AGPL grant 不宣稱重新授權該外部程式。
- `FACT_CHECK_CORE` 為獨立 Service Binding Worker；本 PR 不修改或替該服務重新授權。其與 Civic Talk 的 Corresponding Source 範圍請顧問評估。
- `src/components/AboutFlowIllustration.vue` 是本 repo `cbbc33bc68e3af184da5a76173c0d0d6ff179c55` 新增的 inline SVG，保留該 commit 的 attribution；不將工具 co-author 名稱當成權利歸屬結論。

## npm 依賴

[`licensing-dependencies.tsv`](./licensing-dependencies.tsv) 逐筆記錄 lockfile 的 **349** 個非 root entries：路徑、版本、license metadata、dev／devOptional／optional 標記及 resolved URL（lockfile 未提供時記為 `UNSPECIFIED`）。這是 metadata 盤點，**不是逐一檢查完整著作權 notices 或所有發布產物的法律清單**，也不依 flags 就宣稱某個套件不會進入部署。

| License metadata（原樣保留） | Entries |
| --- | ---: |
| MIT | 283 |
| MIT OR Apache-2.0 | 4 |
| Apache-2.0 | 25 |
| LGPL-3.0-or-later | 10 |
| Apache-2.0 AND LGPL-3.0-or-later AND MIT | 1 |
| Apache-2.0 AND LGPL-3.0-or-later | 3 |
| CC0-1.0 | 1 |
| 0BSD | 2 |
| Python-2.0 | 1 |
| BSD-2-Clause | 2 |
| ISC | 4 |
| MPL-2.0 | 12 |
| BSD-3-Clause | 1 |

五個直接 runtime dependencies（`vue`／`@vue/server-renderer`／`hono`／`better-auth`／`markdown-it`）的 lockfile metadata 皆 MIT，已從安裝套件逐字保存其 license 全文至 `THIRD-PARTY-NOTICES.md`，並核對 installed version 與 lockfile。這不宣稱涵蓋所有轉依賴；對實際 client／Worker bundle 及重散布開發工具所需的其他 notices，仍列為待審。

## 原始碼入口與操作限制

- footer 同時標示軟體 AGPL-3.0-only、意見摘要 CC-BY-SA 4.0 及素材原來源授權；提供固定 commit 的完整 archive 與該 commit 的 LICENSE。
- 兩個 Vite config 共用 Git-derived metadata。`CIVIC_SOURCE_REPOSITORY` 可覆蓋 origin，只接受不含憑證的 GitHub repository URL；沒有有效 Git metadata 或存在未提交的 tracked／untracked 來源時，不提供可能錯誤的固定版本連結。
- `public/styles.css` 是 tracked 生成物，dirty 檢查只排除它；實際 `src/styles/app.css` 仍須提交。其他來源變更不排除。
- `vp run deploy` 無登入憑證地查核固定 commit 是否公開，再 build／deploy。直接執行 `wrangler deploy`、事後修改建置產物或非 Git 建置會繞過此流程；此工具不宣稱是完整法律合規證明。
- 顧問確認 Appropriate Legal Notices、頁尾可見性、建置／安裝／執行來源的完整性、外部服務界線及 notices 的部署方式後，再進行正式站人工驗收。完整 archive 包含 tracked 來源與設定範本；秘密與資料庫個資不應隨原始碼公布。

## 合併／部署前交法律顧問確認

- [ ] 確認 MIT → AGPL-3.0-only 的整體發布方式、保留 notices 與各已授權部分的原許可，包含未另行回覆者的處理。
- [ ] 確認 Git 作者身份／實際權利人、AI 工具 attribution 的處理及必要的雇主或第三方許可；「苗」已確認不是 shuyanglin，須核對 Agent 署名背後的權利來源。
- [ ] 補足舊 Civic Talk 的精確來源、MIT 聲明涵蓋範圍、原作者 notices 與既有內容 CC 聲明的範圍。
- [ ] 確認已辨識的設計 token 來源之實際匯入版本與授權；補足 logo／favicon／OG 圖著作權鏈及商標使用規範，必要時取得許可或替換。
- [ ] 檢查 Google／GitHub 品牌圖示、字體、外部 Polis 與 fact-check-core 的條款／界線。
- [ ] 依實際 bundle 與重散布方式核對所有直接／轉依賴的 notices、Apache／BSD／MPL／LGPL 等相關義務；不能只看 lockfile SPDX。
- [ ] 確認 footer 的 Appropriate Legal Notices、所有相關頁面可見性、免費可取得的 Corresponding Source 與版本對應。
- [ ] 確認 `NOTICE`、README、CONTRIBUTING 的文案及 AGPL-3.0-only 指定；原 MIT tag 不移動，未默認舊分支新增修改的授權。
- [ ] 合併時記錄 main 的實際切換 commit／日期；正式部署須另經維護者授權及驗收，Draft PR 不自動部署。

## 供顧問核對的原文

- [MIT 原文](https://opensource.org/license/mit)：保留著作權與許可 notice。
- [GNU AGPL v3 原文](https://www.gnu.org/licenses/agpl-3.0.txt)／[OSI 顯示版本](https://opensource.org/license/agpl-3-0)：第 1、5、7、13、14 節。
- [SPDX AGPL-3.0-only](https://spdx.org/licenses/AGPL-3.0-only.html)：version 3 only 識別。

這些連結及上方查核結果提供審閱材料，不代替法律顧問的結論。
