import { readFileSync } from 'node:fs'
import { compileFunction } from 'node:vm'
import { compileScript, compileTemplate, parse } from '@vue/compiler-sfc'
import { renderToString } from '@vue/server-renderer'
import * as Vue from 'vue'
import type { Component, ComponentOptions, RenderFunction } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vite-plus/test'
import { provideI18n } from '../l10n'
import MaterialDetail from '../views/MaterialDetail.vue'
import OpinionDetail from '../views/OpinionDetail.vue'

const issue = {
  id: 1,
  title: '測試議題',
  description: '議題說明',
  status: 'published',
  tags: [],
  polis_id: null,
  created_at: '2026-10-21 00:00:00',
  last_activity_at: '2026-10-21 00:00:00',
  abuse_flagged: 0,
  author_name: null,
  author_email: null,
} as const

const author = { created_at: issue.created_at, abuse_flagged: 0, author_name: null, author_email: null } as const
const cases = [
  {
    name: 'MaterialDetail',
    component: MaterialDetail,
    path: '/issues/1/source/2',
    props: {
      issueId: 1,
      materialId: 2,
      initialData: { issue, material: { ...author, id: 2, issue_id: 1, source_name: '測試來源', source_url: null, content: '素材內文', stance: 'neutral', verified_count: 1 } },
    },
  },
  {
    name: 'OpinionDetail',
    component: OpinionDetail,
    path: '/issues/1/comment/3',
    props: { issueId: 1, opinionId: 3, initialData: { issue, opinion: { ...author, id: 3, issue_id: 1, summary: '意見內文' } } },
  },
]

// Vitest 的 SFC import 使用 SSR 模板；另編譯真正的 client 模板，避免拿 SSR 輸出和自己比較。
// 這裡僅驗證掛載前的渲染契約，不模擬 DOM，也不宣稱執行了瀏覽器 hydration。
function clientTemplate(name: string, component: Component): Component {
  const filename = new URL(`../views/${name}.vue`, import.meta.url)
  const { descriptor } = parse(readFileSync(filename, 'utf8'), { filename: filename.pathname })
  const { bindings } = compileScript(descriptor, { id: name })
  const compiled = compileTemplate({
    source: descriptor.template!.content,
    filename: filename.pathname,
    id: name,
    compilerOptions: { mode: 'function', bindingMetadata: bindings },
  })
  if (compiled.errors.length) throw new Error(compiled.errors.map(String).join('\n'))
  const render = compileFunction(compiled.code, ['Vue'])(Vue) as RenderFunction
  return { ...(component as ComponentOptions), ssrRender: undefined, render }
}

async function render(component: Component, props: Record<string, unknown>) {
  const app = Vue.createSSRApp(component, props)
  provideI18n(app, 'zh-TW')
  const warnings: string[] = []
  app.config.warnHandler = message => warnings.push(message)
  const html = await renderToString(app)
  const shareField = html.match(/<code\b[^>]*>([\s\S]*?)<\/code>/)
  expect(shareField, '應呈現分享網址欄位，而非載入中或找不到內容').not.toBeNull()
  return { shareText: shareField![1]!.trim(), warnings }
}

afterEach(() => vi.unstubAllGlobals())

describe('detail share URL before mount', () => {
  for (const entry of cases) {
    it(`${entry.name} keeps the SSR and client first-frame share field empty without Vue warnings`, async () => {
      vi.stubGlobal('window', undefined)
      const server = await render(entry.component, entry.props)
      expect(server.shareText).toBe('')
      expect(server.warnings).toEqual([])

      const readLocation = vi.fn(() => ({ href: `https://civic.example${entry.path}?from=share#detail` }))
      vi.stubGlobal('window', {
        get location() {
          return readLocation()
        },
      })
      const client = await render(clientTemplate(entry.name, entry.component), entry.props)
      expect(client.shareText).toBe(server.shareText)
      expect(client.warnings).toEqual([])
      expect(readLocation, '分享網址應等掛載後才讀取，避免 SSR／client 首幀不同').not.toHaveBeenCalled()
    })
  }
})
