import type { IssueListItem } from '../db/queries'

export type HomeLifecycleTab = 'open' | 'closed'

/** SSR 與瀏覽器歷史共用的結案頁籤；預設顯示進行中。 */
export function readHomeLifecycleTab(url: URL): HomeLifecycleTab {
  return url.searchParams.get('tab') === 'closed' ? 'closed' : 'open'
}

/** 切換頁籤時保留搜尋、預覽、其他 query 與 hash。 */
export function homeLifecycleUrl(currentUrl: URL, tab: HomeLifecycleTab): URL {
  const nextUrl = new URL(currentUrl)
  if (tab === 'closed') nextUrl.searchParams.set('tab', 'closed')
  else nextUrl.searchParams.delete('tab')
  return nextUrl
}

/** 先依結案狀態分類，再沿用角色、搜尋與排序流程。 */
export function filterHomeIssuesByLifecycle(issues: readonly IssueListItem[], tab: HomeLifecycleTab): IssueListItem[] {
  const isClosed = tab === 'closed'
  return issues.filter(issue => (issue.is_closed === 1) === isClosed)
}
