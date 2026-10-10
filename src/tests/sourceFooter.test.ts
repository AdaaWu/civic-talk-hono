import { renderToString } from '@vue/server-renderer'
import { createSSRApp } from 'vue'
import { describe, expect, it, vi } from 'vite-plus/test'
import { provideI18n } from '../l10n'
import { sourceMetadata } from '../source'
import AppFooter from '../components/AppFooter.vue'

vi.mock('../source', () => ({
  sourceMetadata: {
    repositoryUrl: 'https://github.com/example/civic-talk-fork',
    commit: 'a'.repeat(40),
    dirty: false,
    sourceUrl: `https://github.com/example/civic-talk-fork/archive/${'a'.repeat(40)}.tar.gz`,
    licenseUrl: `https://github.com/example/civic-talk-fork/blob/${'a'.repeat(40)}/LICENSE`,
  },
}))

describe('footer source and license notices', () => {
  it.each(['zh-TW', 'en'] as const)('provides the fixed version and distinct software/content notices during %s SSR', async locale => {
    const app = createSSRApp(AppFooter)
    provideI18n(app, locale)
    const html = await renderToString(app)
    expect(html).toContain(`href="${sourceMetadata.sourceUrl}"`)
    expect(html).toContain(`href="${sourceMetadata.licenseUrl}"`)
    expect(html).toContain('AGPL-3.0-only')
    expect(html).toContain('CC-BY-SA 4.0')
    expect(html).not.toContain('/archive/main')
    expect(html).toContain(locale === 'zh-TW' ? '下載本版本原始碼' : 'Download source for this version')
    expect(html).toContain(locale === 'zh-TW' ? '不提供任何擔保' : 'without warranty')
  })
})
