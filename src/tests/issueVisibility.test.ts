import { describe, expect, it } from 'vite-plus/test'
import { getIssue, listIssues } from '../db/queries'

type IssueRow = {
  id: number
  title: string
  description: string
  status: 'collecting'
  polis_id: string | null
  created_at: string
  tags: string
  is_closed: 0 | 1
  closure_reason: string | null
  closure_changed_at: string | null
  abuse_flagged: 0 | 1 | 2 | 3
  author_name: string | null
  author_email: string | null
}

const rows: IssueRow[] = [
  {
    id: 1,
    title: '公開議題',
    description: '公開描述',
    status: 'collecting',
    polis_id: null,
    created_at: '2026-08-01',
    tags: '["public-tag"]',
    is_closed: 1,
    closure_reason: '議題已完成',
    closure_changed_at: '2026-08-08 00:00:00',
    abuse_flagged: 0,
    author_name: null,
    author_email: null,
  },
  {
    id: 2,
    title: '已確認濫用',
    description: '不應公開',
    status: 'collecting',
    polis_id: null,
    created_at: '2026-08-02',
    tags: '["abuse-tag"]',
    is_closed: 0,
    closure_reason: null,
    closure_changed_at: null,
    abuse_flagged: 2,
    author_name: null,
    author_email: null,
  },
  {
    id: 3,
    title: '審查中議題',
    description: '暫時隱藏',
    status: 'collecting',
    polis_id: null,
    created_at: '2026-08-03',
    tags: '["sensitive-tag"]',
    is_closed: 1,
    closure_reason: '不公開的審查細節',
    closure_changed_at: '2026-08-09 00:00:00',
    abuse_flagged: 3,
    author_name: null,
    author_email: null,
  },
]
function testDb() {
  return {
    prepare(query: string) {
      let id: number | undefined
      const statement = {
        bind(value: number) {
          id = value
          return statement
        },
        async all() {
          if (query.includes('FROM ct_opinion_votes')) return { results: [] }
          const visible = rows.filter(row => query.includes('WHERE abuse_flagged IN (0, 1, 3)') && [0, 1, 3].includes(row.abuse_flagged))
          return { results: visible.map(projectPublicIssue) }
        },
        async first() {
          const row = rows.find(candidate => candidate.id === id && query.includes('AND abuse_flagged IN (0, 1, 3)') && [0, 1, 3].includes(candidate.abuse_flagged))
          return row ? projectPublicIssue(row) : null
        },
      }
      return statement
    },
  } as unknown as D1Database
}

function projectPublicIssue(row: IssueRow) {
  return {
    ...row,
    title: row.abuse_flagged === 3 ? null : row.title,
    closure_reason: row.abuse_flagged === 3 ? null : row.closure_reason,
    description: row.abuse_flagged === 3 ? null : row.description,
    tags: row.abuse_flagged === 3 ? '[]' : row.tags,
  }
}

describe('議題公開內容遮蔽', () => {
  it('listIssues excludes confirmed abuse and masks hidden issue content', async () => {
    const result = await listIssues(testDb())

    expect(result.map(issue => issue.id)).toEqual([1, 3])
    expect(result.find(issue => issue.id === 3)).toMatchObject({ abuse_flagged: 3, title: null, description: null })
    expect(result.find(issue => issue.id === 3)?.tags).toEqual([])
    expect(result.find(issue => issue.id === 1)?.tags).toEqual(['public-tag'])
    expect(result.find(issue => issue.id === 1)).toMatchObject({ is_closed: 1, closure_reason: '議題已完成', closure_changed_at: '2026-08-08 00:00:00' })
    expect(result.find(issue => issue.id === 3)).toMatchObject({ is_closed: 1, closure_reason: null, closure_changed_at: '2026-08-09 00:00:00' })
  })

  it('getIssue excludes confirmed abuse and masks hidden issue content', async () => {
    const db = testDb()

    await expect(getIssue(db, 2)).resolves.toBeNull()
    await expect(getIssue(db, 3)).resolves.toMatchObject({ abuse_flagged: 3, title: null, description: null })
  })
})
