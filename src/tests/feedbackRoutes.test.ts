import { readFileSync, readdirSync } from 'node:fs'
import { DatabaseSync, type SQLInputValue } from 'node:sqlite'
import { Hono } from 'hono'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import * as authorization from '../auth/authorization'
import { registerApiRoutes } from '../api/routes'

const auth = vi.hoisted(() => ({
  current: null as null | {
    user: { id: string; name: string; email: string; image: null }
    role: 'user' | 'admin' | 'super-admin'
    banned: boolean
    nameChangeCooldownDays: number | null
  },
}))

vi.mock('../auth/authorization', () => ({
  isAdminRole: (role: string) => role === 'admin' || role === 'super-admin',
  tryGetAuthContext: vi.fn(async () => auth.current),
}))

const migrations = readdirSync(new URL('../../migrations/', import.meta.url))
  .filter(name => name.endsWith('.sql'))
  .sort()
  .map(name => readFileSync(new URL(`../../migrations/${name}`, import.meta.url), 'utf8'))

let sqlite: DatabaseSync
let db: D1Database

function testApp() {
  const app = new Hono<{ Bindings: { DB: D1Database } }>()
  registerApiRoutes(app as never)
  return app
}

function sqliteD1(): D1Database {
  return {
    prepare(sql: string) {
      return {
        async all<T>() {
          return { results: sqlite.prepare(sql).all() as T[] }
        },
        bind(...values: SQLInputValue[]) {
          const statement = sqlite.prepare(sql)
          return {
            async all<T>() {
              return { results: statement.all(...values) as T[] }
            },
            async first<T>() {
              return (statement.get(...values) ?? null) as T | null
            },
            async run() {
              const result = statement.run(...values)
              return { meta: { changes: Number(result.changes), last_row_id: Number(result.lastInsertRowid) } }
            },
          }
        },
      }
    },
  } as unknown as D1Database
}

beforeEach(() => {
  vi.clearAllMocks()
  sqlite = new DatabaseSync(':memory:')
  for (const migration of migrations) sqlite.exec(migration)
  db = sqliteD1()
  auth.current = null
})

afterEach(() => sqlite.close())

describe('anonymous feedback routes', () => {
  it('stores only the submitted feedback fields without consulting authentication', async () => {
    const response = await testApp().request(
      '/api/feedback',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: 'session=private-cookie', 'User-Agent': 'private-agent' },
        body: JSON.stringify({ category: 'usability', description: '  手機版選單不好操作  ', page_path: '/issues/12?view=map&search=%E6%B0%91' }),
      },
      { DB: db } as never
    )

    expect(response.status).toBe(201)
    await expect(response.json()).resolves.toEqual({ ok: true })
    expect(vi.mocked(authorization.tryGetAuthContext)).not.toHaveBeenCalled()
    expect(
      sqlite
        .prepare('PRAGMA table_info(ct_feedback)')
        .all()
        .map(column => column.name)
    ).toEqual(['id', 'category', 'description', 'page_path', 'created_at'])
    const records = sqlite.prepare('SELECT id, category, description, page_path, created_at FROM ct_feedback').all() as Record<string, unknown>[]
    expect(records).toHaveLength(1)
    expect(records[0]).toMatchObject({
      id: 1,
      category: 'usability',
      description: '手機版選單不好操作',
      page_path: '/issues/12?view=map&search=%E6%B0%91',
    })
    expect(records[0]!.created_at).toEqual(expect.any(String))
  })

  it('accepts the Unicode code point limit without truncating supplementary characters', async () => {
    const description = '😀'.repeat(10_000)
    const response = await testApp().request(
      '/api/feedback',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: 'bug', description, page_path: '/' }),
      },
      { DB: db } as never
    )
    expect(response.status).toBe(201)
    expect(sqlite.prepare('SELECT description FROM ct_feedback').get()).toMatchObject({ description })
  })

  it('rejects malformed, incomplete, oversized, and identity-bearing request bodies', async () => {
    const invalidBodies: unknown[] = [
      null,
      [],
      'feedback',
      17,
      { category: 'other', description: 'text', page_path: '/' },
      { category: 'bug', description: 123, page_path: '/' },
      { category: 'bug', description: ' \n\t ', page_path: '/' },
      { category: 'bug', description: '😀'.repeat(10_001), page_path: '/' },
      { category: 'bug', description: 'text' },
      { category: 'bug', description: 'text', page_path: 42 },
      { category: 'bug', description: 'text', page_path: '/', user_id: 'spoofed-user' },
    ]

    for (const body of invalidBodies) {
      const response = await testApp().request('/api/feedback', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }, { DB: db } as never)
      expect(response.status).toBe(400)
    }
    const malformedJson = await testApp().request('/api/feedback', { method: 'POST', body: '{' }, { DB: db } as never)
    expect(malformedJson.status).toBe(400)
    expect(sqlite.prepare('SELECT COUNT(*) AS count FROM ct_feedback').get()).toMatchObject({ count: 0 })
    expect(vi.mocked(authorization.tryGetAuthContext)).not.toHaveBeenCalled()
  })

  it('rejects unsafe, malformed, external, fragmented, and overlong page paths', async () => {
    const invalidPaths = ['issues/1', '//example.com/path', 'https://example.com/path', '/issues/1#section', '/\\example.com/path', '/issues/%GG', '/issues/1\u0000', `/${'p'.repeat(4096)}`]

    for (const page_path of invalidPaths) {
      const response = await testApp().request(
        '/api/feedback',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ category: 'bug', description: 'valid description', page_path }),
        },
        { DB: db } as never
      )
      expect(response.status).toBe(400)
    }
    expect(sqlite.prepare('SELECT COUNT(*) AS count FROM ct_feedback').get()).toMatchObject({ count: 0 })
  })

  it('requires admin access and returns the private feedback queue newest first', async () => {
    const env = { DB: db } as never
    let response = await testApp().request('/api/admin/feedback', undefined, env)
    expect(response.status).toBe(401)
    expect(response.headers.get('Cache-Control')).toBe('private, no-store')
    expect(response.headers.get('Vary')).toBe('Cookie')

    auth.current = {
      user: { id: 'user-1', name: 'User', email: 'user@example.com', image: null },
      role: 'user',
      banned: false,
      nameChangeCooldownDays: null,
    }
    response = await testApp().request('/api/admin/feedback', undefined, env)
    expect(response.status).toBe(403)
    expect(response.headers.get('Cache-Control')).toBe('private, no-store')
    expect(response.headers.get('Vary')).toBe('Cookie')

    sqlite.prepare('INSERT INTO ct_feedback (category, description, page_path, created_at) VALUES (?, ?, ?, ?)').run('bug', 'older', '/older', '2026-10-14 00:00:00')
    sqlite.prepare('INSERT INTO ct_feedback (category, description, page_path, created_at) VALUES (?, ?, ?, ?)').run('suggestion', 'newer first row', '/newer-a', '2026-10-15 00:00:00')
    sqlite.prepare('INSERT INTO ct_feedback (category, description, page_path, created_at) VALUES (?, ?, ?, ?)').run('usability', 'newer second row', '/newer-b', '2026-10-15 00:00:00')
    auth.current = {
      user: { id: 'admin-1', name: 'Admin', email: 'admin@example.com', image: null },
      role: 'admin',
      banned: false,
      nameChangeCooldownDays: null,
    }

    response = await testApp().request('/api/admin/feedback', { headers: { Origin: 'https://example.org' } }, env)
    expect(response.status).toBe(200)
    expect(response.headers.get('Cache-Control')).toBe('private, no-store')
    expect(response.headers.get('Vary')).toBe('Cookie')
    expect(response.headers.get('Access-Control-Allow-Origin')).toBeNull()
    await expect(response.json()).resolves.toEqual([
      { id: 3, category: 'usability', description: 'newer second row', page_path: '/newer-b', created_at: '2026-10-15 00:00:00' },
      { id: 2, category: 'suggestion', description: 'newer first row', page_path: '/newer-a', created_at: '2026-10-15 00:00:00' },
      { id: 1, category: 'bug', description: 'older', page_path: '/older', created_at: '2026-10-14 00:00:00' },
    ])
  })
})
