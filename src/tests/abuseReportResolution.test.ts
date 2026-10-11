import { readFileSync, readdirSync } from 'node:fs'
import { DatabaseSync, type SQLInputValue } from 'node:sqlite'
import { Hono } from 'hono'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import type { AuthContext } from '../auth/authorization'
import { registerApiRoutes } from '../api/routes'
import type * as Authorization from '../auth/authorization'

const auth = vi.hoisted(() => ({ context: null as AuthContext | null, banUser: vi.fn(), unbanUser: vi.fn() }))
vi.mock('../auth/authorization', async importOriginal => ({
  ...(await importOriginal<typeof Authorization>()),
  tryGetAuthContext: async () => auth.context,
}))
vi.mock('../auth/createAuth', () => ({ createAuth: () => ({ api: { banUser: auth.banUser, unbanUser: auth.unbanUser } }) }))

const migrations = readdirSync(new URL('../../migrations/', import.meta.url))
  .filter(name => name.endsWith('.sql'))
  .sort()
  .map(name => readFileSync(new URL(`../../migrations/${name}`, import.meta.url), 'utf8'))
const targets = { issue: 'ct_issues', material: 'ct_materials', briefing: 'ct_briefings', opinion: 'ct_opinions' } as const
type Target = keyof typeof targets
let sqlite: DatabaseSync
let db: D1Database
let accounts: Map<string, boolean>

beforeEach(() => {
  sqlite = new DatabaseSync(':memory:')
  for (const sql of migrations) sqlite.exec(sql)
  sqlite.exec("INSERT INTO ct_opinions (id, issue_id, summary, author_id) VALUES (1, 1, '測試意見', 'poster')")
  for (const table of Object.values(targets)) sqlite.exec(`UPDATE ${table} SET author_id = 'poster', abuse_flagged = 1 WHERE id = 1`)
  db = {
    prepare(sql: string) {
      return {
        bind(...values: SQLInputValue[]) {
          return {
            async first() {
              return sqlite.prepare(sql).get(...values) ?? null
            },
            async run() {
              return sqlite.prepare(sql).run(...values)
            },
          }
        },
      }
    },
  } as unknown as D1Database
  auth.context = {
    user: { id: 'reviewer', name: 'Reviewer', email: 'reviewer@example.com', image: null },
    role: 'admin',
    banned: false,
    nameChangeCooldownDays: null,
  }
  accounts = new Map([
    ['reporter', false],
    ['poster', true],
  ])
  auth.banUser.mockReset().mockImplementation(async ({ body }: { body: { userId: string } }) => {
    accounts.set(body.userId, true)
  })
  auth.unbanUser.mockReset().mockImplementation(async ({ body }: { body: { userId: string } }) => {
    accounts.set(body.userId, false)
  })
})
afterEach(() => sqlite.close())

function seedReport(target: Target = 'material', source: 'user' | 'ai' = 'user', reason = 'spam') {
  const ai = source === 'ai'
  sqlite
    .prepare(`INSERT INTO ct_abuse_reports
    (id, reporter_id, reporter_email, reason, ${target}_id, source, policy_code, submission_type, content_snapshot, target_user_id, pending_target_key)
    VALUES (1, ?, 'reporter@example.com', ?, 1, ?, ?, ?, ?, ?, ?)`)
    .run(ai ? 'poster' : 'reporter', reason, source, ai ? 'spam' : null, ai ? target : null, ai ? '{}' : null, ai ? 'poster' : null, `${target}:1`)
  sqlite.prepare(`UPDATE ${targets[target]} SET abuse_flagged = ? WHERE id = 1`).run(ai ? 3 : 1)
}

function resolve(body: object, id = 1) {
  const app = new Hono()
  registerApiRoutes(app as never)
  return app.request(
    `/api/admin/abuse-reports/${id}/resolve`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
    { DB: db } as never
  )
}
function state(target: Target = 'material') {
  const report = sqlite.prepare('SELECT review_status, pending_target_key FROM ct_abuse_reports WHERE id = 1').get()
  return {
    review_status: report?.review_status,
    pending_target_key: report?.pending_target_key,
    flag: sqlite.prepare(`SELECT abuse_flagged FROM ${targets[target]} WHERE id = 1`).get()?.abuse_flagged,
  }
}
function expectNoAccountChanges(before: Map<string, boolean>) {
  expect(accounts).toEqual(before)
  expect(auth.banUser).not.toHaveBeenCalled()
  expect(auth.unbanUser).not.toHaveBeenCalled()
}

// 真正執行業務 migrations 與 SQL；認證生命週期留在 Better Auth 邊界之外。
describe('濫用回報不停權裁判', () => {
  for (const target of Object.keys(targets) as Target[]) {
    for (const action of ['false_report', 'confirmed_abuse'] as const) {
      it(`${target} ${action} 不變更帳號停權，但仍結案並更新內容`, async () => {
        seedReport(target)
        const before = new Map(accounts)
        const response = await resolve({ action, banUser: false })
        expect(response.status).toBe(200)
        expect(await response.json()).toEqual({ ok: true })
        expect(state(target)).toEqual({ review_status: action === 'false_report' ? 'resolved_false' : 'resolved_abuse', pending_target_key: null, flag: action === 'false_report' ? 0 : 2 })
        expectNoAccountChanges(before)
      })
    }
  }

  for (const action of ['false_report', 'confirmed_abuse'] as const) {
    for (const banUser of [undefined, true]) {
      it(`${action} banUser=${banUser} 保留原本停權對象`, async () => {
        seedReport()
        auth.context!.role = 'super-admin'
        accounts.set('poster', false)
        const response = await resolve({ action, banUser })
        expect(response.status).toBe(200)
        expect(accounts).toEqual(
          new Map([
            ['reporter', action === 'false_report'],
            ['poster', action === 'confirmed_abuse'],
          ])
        )
        expect(state().review_status).toBe(action === 'false_report' ? 'resolved_false' : 'resolved_abuse')
      })
    }
  }

  for (const banUser of ['false', 0, null]) {
    it(`拒絕非布林選項 ${JSON.stringify(banUser)}，不結案或停權`, async () => {
      seedReport()
      const before = new Map(accounts)
      const response = await resolve({ action: 'confirmed_abuse', banUser })
      expect(response.status).toBe(400)
      expect(state()).toEqual({ review_status: 'pending', pending_target_key: 'material:1', flag: 1 })
      expectNoAccountChanges(before)
    })
  }

  it('已結案不可再次裁判或追加停權', async () => {
    seedReport()
    await resolve({ action: 'false_report', banUser: false })
    const before = new Map(accounts)
    expect((await resolve({ action: 'confirmed_abuse' })).status).toBe(409)
    expect(state()).toEqual({ review_status: 'resolved_false', pending_target_key: null, flag: 0 })
    expectNoAccountChanges(before)
  })

  it('原停權操作失敗時維持待審與內容狀態', async () => {
    seedReport()
    auth.banUser.mockRejectedValueOnce({ statusCode: 403, body: { message: 'Cannot ban this user' } })
    const before = new Map(accounts)
    expect((await resolve({ action: 'confirmed_abuse' })).status).toBe(403)
    expect(state()).toEqual({ review_status: 'pending', pending_target_key: 'material:1', flag: 1 })
    expect(accounts).toEqual(before)
  })

  for (const source of ['user', 'ai'] as const) {
    it(`${source} 誤報不降低其他審核來源或已確認違規的遮蔽`, async () => {
      seedReport('material', source)
      sqlite.exec('UPDATE ct_materials SET abuse_flagged = 2 WHERE id = 1')
      expect((await resolve({ action: 'false_report', banUser: false })).status).toBe(200)
      expect(state().flag).toBe(2)
    })
  }

  it('AI 誤報維持原本不停權並解除 AI 遮蔽', async () => {
    seedReport('material', 'ai')
    const before = new Map(accounts)
    expect((await resolve({ action: 'false_report' })).status).toBe(200)
    expect(state()).toEqual({ review_status: 'resolved_false', pending_target_key: null, flag: 0 })
    expectNoAccountChanges(before)
  })

  for (const action of ['false_report', 'confirmed_broken'] as const) {
    it(`失效連結 ${action} 維持原本不停權裁判`, async () => {
      seedReport('material', 'user', 'broken_link')
      const before = new Map(accounts)
      expect((await resolve({ action })).status).toBe(200)
      expect(state()).toEqual({ review_status: action === 'false_report' ? 'resolved_false' : 'resolved_broken', pending_target_key: null, flag: action === 'false_report' ? 0 : 2 })
      expectNoAccountChanges(before)
    })
  }

  for (const access of ['anonymous', 'user', 'banned'] as const) {
    it(`${access} 不能使用不停權裁判`, async () => {
      seedReport()
      if (access === 'anonymous') auth.context = null
      else if (access === 'user') auth.context!.role = 'user'
      else auth.context!.banned = true
      const before = new Map(accounts)
      expect((await resolve({ action: 'confirmed_abuse', banUser: false })).status).toBe(access === 'anonymous' ? 401 : 403)
      expect(state().review_status).toBe('pending')
      expectNoAccountChanges(before)
    })
  }
})
