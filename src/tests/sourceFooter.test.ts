import { renderToString } from '@vue/server-renderer'
import { createSSRApp } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vite-plus/test'
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

const repositoryUrl = 'https://github.com/example/civic-talk-fork'
const revision = 'a'.repeat(40)
const archiveUrl = `${repositoryUrl}/archive/${revision}.tar.gz`
const sourceLicenseUrl = `${repositoryUrl}/blob/${revision}/LICENSE`
const fallbackLicenseUrl = 'https://www.gnu.org/licenses/agpl-3.0.html'
const originalMetadata = { ...sourceMetadata }
const sourceCases = [
  {
    name: 'clean',
    metadata: { repositoryUrl, commit: revision, dirty: false, sourceUrl: archiveUrl, licenseUrl: sourceLicenseUrl },
    expectedSourceUrl: archiveUrl,
    expectedLicenseUrl: sourceLicenseUrl,
  },
  {
    name: 'dirty',
    metadata: { repositoryUrl, commit: revision, dirty: true, sourceUrl: null, licenseUrl: null },
    expectedSourceUrl: null,
    expectedLicenseUrl: fallbackLicenseUrl,
  },
  {
    name: 'no git',
    metadata: { repositoryUrl: null, commit: null, dirty: true, sourceUrl: null, licenseUrl: null },
    expectedSourceUrl: null,
    expectedLicenseUrl: fallbackLicenseUrl,
  },
  {
    name: 'null URLs',
    metadata: { repositoryUrl, commit: revision, dirty: false, sourceUrl: null, licenseUrl: null },
    expectedSourceUrl: null,
    expectedLicenseUrl: fallbackLicenseUrl,
  },
]

afterEach(() => Object.assign(sourceMetadata, originalMetadata))

describe('footer source and license notices', () => {
  for (const sourceCase of sourceCases) {
    it.each(['zh-TW', 'en'] as const)(`renders ${sourceCase.name} metadata correctly in %s SSR`, async locale => {
      Object.assign(sourceMetadata, sourceCase.metadata)
      const app = createSSRApp(AppFooter)
      provideI18n(app, locale)
      const html = await renderToString(app)

      if (sourceCase.expectedSourceUrl) {
        expect(html).toContain(`href="${sourceCase.expectedSourceUrl}"`)
      } else {
        expect(html).not.toContain('/archive/')
      }
      expect(html).toContain(`href="${sourceCase.expectedLicenseUrl}"`)
      expect(html).toContain('href="/licenses/client.txt"')
      expect(html).toContain('href="/licenses/worker.txt"')
      expect(html).toContain('Copyright (c) 2026 Bestian Tang')
      expect(html).toContain('AGPL-3.0-only')
      expect(html).toContain('CC-BY-SA 4.0')
    })
  }
})
