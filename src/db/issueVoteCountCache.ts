const ISSUE_VOTE_COUNT_CACHE_TTL_SECONDS = 300
const ISSUE_VOTE_COUNT_CACHE_PATH = '/_civic-talk-cache/issue-vote-counts-v1'

type IssueVoteCount = { issue_id: number; vote_count: number }
type CachedIssueVoteCounts = { expires_at: number; counts: [number, number][] }
type CloudflareCaches = CacheStorage & { readonly default?: Cache }

function defaultCache(): Cache | undefined {
  try {
    return (globalThis as typeof globalThis & { caches?: CloudflareCaches }).caches?.default
  } catch {
    return undefined
  }
}

function cacheKey(requestUrl: string | URL): Request {
  const origin = new URL(requestUrl).origin
  return new Request(new URL(ISSUE_VOTE_COUNT_CACHE_PATH, origin))
}

function cachedCounts(value: unknown): Map<number, number> | null {
  if (value === null || typeof value !== 'object') return null
  const record = value as Partial<CachedIssueVoteCounts>
  if (!Number.isFinite(record.expires_at) || !Array.isArray(record.counts)) return null

  const counts = new Map<number, number>()
  for (const entry of record.counts) {
    if (!Array.isArray(entry) || entry.length !== 2 || !Number.isSafeInteger(entry[0]) || !Number.isSafeInteger(entry[1]) || entry[0] < 0 || entry[1] < 0) return null
    counts.set(entry[0], entry[1])
  }
  return counts
}

async function readCache(cache: Cache, key: Request): Promise<Map<number, number> | null> {
  try {
    const response = await cache.match(key)
    if (!response) return null
    const body: unknown = await response.json()
    const counts = cachedCounts(body)
    if (!counts || typeof body !== 'object' || body === null || (body as CachedIssueVoteCounts).expires_at <= Date.now()) {
      await cache.delete(key)
      return null
    }
    return counts
  } catch {
    return null
  }
}

/** 只快取公開意見的每議題總票數；不含個人識別或投票分布。 */
export async function getPublicIssueVoteCounts(db: D1Database, requestUrl?: string | URL): Promise<Map<number, number>> {
  const key = requestUrl ? cacheKey(requestUrl) : null
  const cache = key ? defaultCache() : undefined

  if (cache && key) {
    const cached = await readCache(cache, key)
    if (cached) return cached
  }

  const { results } = await db
    .prepare(`
      SELECT o.issue_id,
        SUM(
          (SELECT COUNT(*) FROM ct_opinion_votes AS v WHERE v.opinion_id = o.id)
          + CASE WHEN o.author_id IS NOT NULL THEN 1 ELSE 0 END
        ) AS vote_count
      FROM ct_opinions AS o
      WHERE o.abuse_flagged IN (0, 1)
      GROUP BY o.issue_id
    `)
    .all<IssueVoteCount>()

  const rows = (results ?? []).map(row => [row.issue_id, row.vote_count] as [number, number])
  const counts = new Map(rows)

  if (cache && key) {
    const body: CachedIssueVoteCounts = {
      expires_at: Date.now() + ISSUE_VOTE_COUNT_CACHE_TTL_SECONDS * 1000,
      counts: rows,
    }
    try {
      await cache.put(
        key,
        new Response(JSON.stringify(body), {
          headers: {
            'Cache-Control': `public, max-age=${ISSUE_VOTE_COUNT_CACHE_TTL_SECONDS}`,
            'Content-Type': 'application/json; charset=utf-8',
          },
        })
      )
    } catch {
      // Cache API 在本機或測試執行環境不可用時，直接使用本次 D1 結果。
    }
  }

  return counts
}
