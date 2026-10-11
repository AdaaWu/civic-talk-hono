import { afterEach, describe, expect, it, vi } from 'vite-plus/test'
import { signInWith } from '../client/auth-session'

describe('社群登入錯誤處理', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('Better Auth 收到 HTTP 403 時拒絕登入 Promise，讓介面顯示失敗提示', async () => {
    vi.stubGlobal('window', { location: { origin: 'http://localhost:5173' } })
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({ code: 'INVALID_ORIGIN', message: 'Invalid origin' }, { status: 403 })))

    // 使用真實 Better Auth client，只隔離 HTTP；不可把 client 的回傳行為 mock 掉。
    await expect(signInWith('google', '/issues/1?step=comments#opinion-6')).rejects.toThrow('Invalid origin')
  })
})
