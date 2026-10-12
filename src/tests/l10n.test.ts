import { afterEach, describe, it, expect, vi } from 'vite-plus/test'
import { messages as zhTW } from '../l10n/zh-TW'
import { messages as en } from '../l10n/en'
import { messages as ja } from '../l10n/ja'
import { createI18n, formatDate, normalizeLocale, readStoredLocale } from '../l10n'
import type { MessageKey } from '../l10n/zh-TW'

afterEach(() => vi.unstubAllGlobals())

describe('i18n 翻譯完整性', () => {
  for (const [locale, catalog] of Object.entries({ en, ja })) {
    it(`${locale} 的 key 與 zh-TW 完全一致`, () => {
      expect(Object.keys(catalog).sort()).toEqual(Object.keys(zhTW).sort())
    })

    it(`${locale} 保留每段訊息的插值欄位`, () => {
      for (const key of Object.keys(zhTW) as MessageKey[]) {
        const expected = [...new Set(zhTW[key].match(/\{\w+\}/g) ?? [])].sort()
        expect([...new Set(catalog[key].match(/\{\w+\}/g) ?? [])].sort(), key).toEqual(expected)
      }
    })
  }
})

describe('語言偏好與插值', () => {
  it('支援日語並保留舊版中文偏好，未知語言回繁中', () => {
    expect(normalizeLocale('ja')).toBe('ja')
    expect(normalizeLocale('en')).toBe('en')
    expect(normalizeLocale('zh')).toBe('zh-TW')
    expect(normalizeLocale('zh-TW')).toBe('zh-TW')
    for (const raw of [null, undefined, '', 'fr']) expect(normalizeLocale(raw)).toBe('zh-TW')
  })

  it('三語切換可持久化並恢復，html lang 同步且保留 zh 儲存格式', () => {
    const storage = new Map<string, string>()
    vi.stubGlobal('window', {
      localStorage: {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => storage.set(key, value),
      },
    })
    const document = { documentElement: { lang: 'zh-Hant' } }
    vi.stubGlobal('document', document)
    const api = createI18n()
    for (const [locale, stored, lang] of [
      ['ja', 'ja', 'ja'],
      ['en', 'en', 'en'],
      ['zh-TW', 'zh', 'zh-Hant'],
    ] as const) {
      api.setLocale(locale)
      expect(api.locale.value).toBe(locale)
      expect(storage.get('civic_lang')).toBe(stored)
      expect(readStoredLocale()).toBe(locale)
      expect(document.documentElement.lang).toBe(lang)
    }
  })

  it('瀏覽器禁用儲存時仍可切換語言與同步 html lang', () => {
    const unavailable = () => {
      throw new Error('Storage disabled')
    }
    vi.stubGlobal('window', { localStorage: { getItem: unavailable, setItem: unavailable } })
    const document = { documentElement: { lang: 'zh-Hant' } }
    vi.stubGlobal('document', document)
    const api = createI18n()
    api.setLocale('ja')
    expect(api.locale.value).toBe('ja')
    expect(document.documentElement.lang).toBe('ja')
    expect(readStoredLocale()).toBe('zh-TW')
  })

  it('SSR 不讀寫瀏覽器偏好，各實例的語言不互相影響', () => {
    vi.stubGlobal('window', undefined)
    const first = createI18n()
    const second = createI18n()
    first.setLocale('ja')
    expect(first.locale.value).toBe('ja')
    expect(second.locale.value).toBe('zh-TW')
    expect(readStoredLocale()).toBe('zh-TW')
  })

  it('OPINION.md 只替換模板欄位，不改寫投稿內容中的大括號或替換符號', () => {
    const api = createI18n('ja')
    const title = 'title {briefing} {date} $&'
    const briefing = 'body {title} {date} $`'
    const output = api.t('op_md_document', { title, briefing, date: '2026/10/12' })
    expect(output).toContain(title)
    expect(output).toContain(briefing)
    expect(output).toContain('2026/10/12')
  })

  it('日語插值保留未提供的欄位，零值也能替換', () => {
    const api = createI18n('ja')
    const output = api.t('markdown_editor_count_limited', { count: 0 })
    expect(output).toContain('0')
    expect(output).toContain('{limit}')
    expect(api.t('op_md_document', { date: 'DATE' })).toContain('{title}')
  })

  it('日期依語言格式化，空值與無效日期維持既有回應', () => {
    const iso = new Date(2026, 9, 12).toISOString()
    expect(formatDate(iso, 'ja')).toBe('2026/10/12')
    expect(formatDate(iso, 'en')).toBe('10/12/2026')
    expect(formatDate(iso, 'zh-TW')).toBe('2026/10/12')
    expect(formatDate(null, 'ja')).toBe('')
    expect(formatDate('invalid', 'ja')).toBe('invalid')
  })
})
