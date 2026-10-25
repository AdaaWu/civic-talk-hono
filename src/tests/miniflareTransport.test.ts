import { Miniflare, convertV4MiniflareOptions } from 'miniflare'
import { describe, expect, it } from 'vite-plus/test'

describe('本機 Worker 的拒絕請求與連線重用', () => {
  it('未讀取串流 POST body 就回 401 後，下一個請求仍能正常回應', async () => {
    const runtime = new Miniflare(
      convertV4MiniflareOptions({
        modules: true,
        compatibilityDate: '2026-04-17',
        script: `export default {
          fetch(request) {
            if (request.method === 'POST') return new Response('Unauthorized', { status: 401 })
            return new Response('Available')
          }
        }`,
      })
    )

    try {
      // 重複跨過拒絕回應的連線邊界，避免只驗到第一次新建連線成功。
      for (let round = 0; round < 10; round++) {
        const rejected = await runtime.dispatchFetch('http://localhost/', {
          method: 'POST',
          body: new Blob(['{}']).stream(),
          duplex: 'half',
        })
        expect(rejected.status).toBe(401)
        expect(await rejected.text()).toBe('Unauthorized')

        const next = await runtime.dispatchFetch('http://localhost/')
        expect(next.status).toBe(200)
        expect(await next.text()).toBe('Available')
      }
    } finally {
      await runtime.dispose()
    }
  }, 20_000)
})
