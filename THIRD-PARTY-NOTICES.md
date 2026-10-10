# Third-party notices and retained MIT attribution

本候選版本的軟體整體主授權為 AGPL-3.0-only；本文件保留沿用的來源、原著作權／許可／免責 notices，並記錄尚未釐清的範圍。它不撤銷 MIT 權利，不替來源不明的作品補造許可，也不是所有轉依賴或正式部署產物的完整法律清單。待審事項見 [`docs/licensing-review.md`](./docs/licensing-review.md)。

## Civic Talk 原 MIT baseline

來源：[`g0v/civic-talk-hono@0cb5f309fa373e69ff60563bdc3fb0201332ceba`](https://github.com/g0v/civic-talk-hono/tree/0cb5f309fa373e69ff60563bdc3fb0201332ceba)，固定 tag `v0.1.0-mit-final`。保留完整原文於 [`LICENSE-MIT`](./LICENSE-MIT)，包含 `Copyright (c) 2026 Bestian Tang`。

涵蓋該版本已依 MIT 發布的軟體部分，後續修改及新貢獻依新的整體發布方式處理，獨立內容與品牌權利另行確認。原 Git 作者／co-author attribution 與歷史保留，盤點表列於 `docs/licensing-review.md`；不宣稱根目錄 copyright line 即代表擁有所有貢獻。

## 原始 Civic Talk

來源：[`v-taiwan/civic-talk@e2d516081cfbb25e9a669c5483ae8faf270d1a80`](https://github.com/v-taiwan/civic-talk/tree/e2d516081cfbb25e9a669c5483ae8faf270d1a80)。該版本 README License 節標示 `MIT`，但完整 tree 未見獨立 LICENSE 或完整 MIT copyright notice；不補造缺少的權利人資訊。README 另載：

> 感謝 ronny wang 提供初步實作的概念並授權社群使用。

本 repo 的主要移植 commit 是 `9b98f88eac6b8796120cd183fef38ddd251e2679`：API／查詢／schema、初始 views／components／l10n／樣式與 logo 等；現行檔案後續多經改寫。查核版本與實際移植 checkout 是否相同、README MIT 聲明的具體範圍，以及舊首頁 `© 2026 vTaiwan · CC-BY-SA 4.0` 聲明，留待法律顧問確認。

## vTaiwan-hono

來源：[`g0v/vTaiwan-hono@fb04555cc02f9a4ce1de86622e0ae63c00ee2db6`](https://github.com/g0v/vTaiwan-hono/tree/fb04555cc02f9a4ce1de86622e0ae63c00ee2db6)。參考範圍包括 Better Auth 設定／授權判斷（本 repo 匯入紀錄 `29ddfdad0e97540f5c350ab347d1aeb05dca6df5`）與 favicon／OG 圖（`4cdc54156cebd6b233973c1d6dd2abc3866807e7`），詳見盤點文件；本次新增程式不宣稱來自該專案。

下列為該固定來源的 LICENSE 原文，其 Git blob 與 Civic Talk 的 `LICENSE-MIT` 相同：

```text
MIT License

Copyright (c) 2026 Bestian Tang

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## 設計／品牌與外部來源

- `src/styles/app.css` token 的移植紀錄指向 sibling `vtaiwan-design-system/project/colors_and_type.css`；維護者確認公開來源專案為 [`Tofuswang/vtaiwan-design-system@19152d2f3e6427cd80978fa4899072f967eb1e3c`](https://github.com/Tofuswang/vtaiwan-design-system/tree/19152d2f3e6427cd80978fa4899072f967eb1e3c)，精確匯入 checkout 尚未確認，亦未找到明確授權。請補來源與許可，不因本候選版的 LICENSE 就視為已取得。
- `public/vtaiwan-logo*.svg`、favicon 與 OG 品牌圖像的原始著作權與品牌使用規範仍待確認。這次授權切換不授予額外的商標使用權；保留商標權不等於已解決圖像著作權。
- Google／GitHub 圖示、Google Fonts 與外部 Polis script 依各來源規範處理；本站軟體 grant 不宣稱涵蓋它們的品牌權利或替其重新授權。

## 直接 runtime dependencies

下列 license 原文從已安裝的對應版本複製，已核對 installed package version 與 lockfile。保留各套件的原 notices，不把它們覆蓋成 AGPL。轉依賴與開發工具的 metadata 見 [`docs/licensing-dependencies.tsv`](./docs/licensing-dependencies.tsv)，實際重散布／部署的完整 notices 仍須另行核對。

### @vue/server-renderer 3.5.33

來源：安裝套件 `@vue/server-renderer@3.5.33` 的 `LICENSE`；npm package [`@vue/server-renderer`](https://www.npmjs.com/package/@vue/server-renderer/v/3.5.33)。

```text
The MIT License (MIT)

Copyright (c) 2018-present, Yuxi (Evan) You

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
```

### better-auth 1.6.25

來源：安裝套件 `better-auth@1.6.25` 的 `LICENSE.md`；npm package [`better-auth`](https://www.npmjs.com/package/better-auth/v/1.6.25)。

```text
The MIT License (MIT)
Copyright (c) 2024 - present, Bereket Engida

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the “Software”), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
the Software, and to permit persons to whom the Software is furnished to do so,
subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED “AS IS”, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE,
ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
DEALINGS IN THE SOFTWARE.
```

### hono 4.13.2

來源：安裝套件 `hono@4.13.2` 的 `LICENSE`；npm package [`hono`](https://www.npmjs.com/package/hono/v/4.13.2)。

```text
MIT License

Copyright (c) 2021 - present, Yusuke Wada and Hono contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

### markdown-it 15.0.0

來源：安裝套件 `markdown-it@15.0.0` 的 `LICENSE`；npm package [`markdown-it`](https://www.npmjs.com/package/markdown-it/v/15.0.0)。

```text
Copyright (c) 2014 Vitaly Puzrin, Alex Kocharin.

Permission is hereby granted, free of charge, to any person
obtaining a copy of this software and associated documentation
files (the "Software"), to deal in the Software without
restriction, including without limitation the rights to use,
copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the
Software is furnished to do so, subject to the following
conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
OTHER DEALINGS IN THE SOFTWARE.
```

### vue 3.5.33

來源：安裝套件 `vue@3.5.33` 的 `LICENSE`；npm package [`vue`](https://www.npmjs.com/package/vue/v/3.5.33)。

```text
The MIT License (MIT)

Copyright (c) 2018-present, Yuxi (Evan) You

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
```
