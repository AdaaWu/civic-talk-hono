import type { IssueListItem } from '../db/queries'

/** 讀取首頁 SSR 與瀏覽器共用的搜尋 query。 */
export function readHomeSearchQuery(url: URL): string {
  return url.searchParams.get('search') ?? ''
}

/** 同步搜尋值，同時保留其他 query 與 hash。 */
export function homeSearchUrl(currentUrl: URL, search: string): URL {
  const nextUrl = new URL(currentUrl)
  if (search.trim()) nextUrl.searchParams.set('search', search)
  else nextUrl.searchParams.delete('search')
  return nextUrl
}

/** 返回首頁清單，只移除預覽狀態，保留搜尋與其他網址狀態。 */
export function homeIssueListUrl(currentUrl: URL): URL {
  const nextUrl = new URL(currentUrl)
  nextUrl.searchParams.delete('action')
  nextUrl.searchParams.delete('issue')
  return nextUrl
}

/** 收集公開標籤建議，忽略大小寫去重並保留首次出現的字樣。 */
export function collectHomeTagSuggestions(issues: readonly IssueListItem[]): string[] {
  const seen = new Set<string>()
  const suggestions: string[] = []

  for (const issue of issues) {
    if (issue.abuse_flagged === 2 || issue.abuse_flagged === 3) continue
    for (const tag of issue.tags) {
      const key = tag.toLowerCase()
      if (!key || seen.has(key)) continue
      seen.add(key)
      suggestions.push(tag)
    }
  }

  return suggestions
}
