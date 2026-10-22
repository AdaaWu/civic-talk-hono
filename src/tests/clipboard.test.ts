import { afterEach, describe, expect, it, vi } from 'vite-plus/test'
import { copyTextWhenReady } from '../client/clipboard'

class DeferredClipboardItem {
  constructor(readonly data: Record<string, Promise<Blob>>) {}
}

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>(done => {
    resolve = done
  })
  return { promise, resolve }
}

afterEach(() => vi.unstubAllGlobals())

describe('非同步 prompt 剪貼簿', () => {
  it('在 prompt 尚未取得時啟動寫入，資料準備完成前不覆蓋原剪貼簿', async () => {
    const ready = deferred<string | null>()
    let clipboard = '原本的文字'
    let started = false
    vi.stubGlobal('ClipboardItem', DeferredClipboardItem)
    vi.stubGlobal('navigator', {
      clipboard: {
        write: async ([item]: DeferredClipboardItem[]) => {
          started = true
          clipboard = await (await item.data['text/plain']).text()
        },
      },
    })

    const copying = copyTextWhenReady(ready.promise)
    expect(started).toBe(true)
    expect(clipboard).toBe('原本的文字')
    ready.resolve('依最新彙整產生的說明頁 prompt')
    expect(await copying).toBe(true)
    expect(clipboard).toBe('依最新彙整產生的說明頁 prompt')
  })

  it('投稿失敗或被隱藏時取消寫入，不以空字串清掉剪貼簿', async () => {
    let clipboard = '原本的文字'
    vi.stubGlobal('ClipboardItem', DeferredClipboardItem)
    vi.stubGlobal('navigator', {
      clipboard: {
        write: async ([item]: DeferredClipboardItem[]) => {
          clipboard = await (await item.data['text/plain']).text()
        },
      },
    })

    expect(await copyTextWhenReady(Promise.resolve(null))).toBe(false)
    expect(clipboard).toBe('原本的文字')
  })

  it('瀏覽器立即拒絕權限時，不必等候尚未完成的 prompt 就回報複製失敗', async () => {
    const ready = deferred<string | null>()
    vi.stubGlobal('ClipboardItem', DeferredClipboardItem)
    vi.stubGlobal('navigator', {
      clipboard: { write: () => Promise.reject(new DOMException('Denied', 'NotAllowedError')) },
    })

    expect(await copyTextWhenReady(ready.promise)).toBe(false)
    ready.resolve('可在 Step 2 手動複製的 prompt')
  })

  it('不支援 ClipboardItem 時，取消準備不呼叫 writeText', async () => {
    const writeText = vi.fn()
    vi.stubGlobal('ClipboardItem', undefined)
    vi.stubGlobal('navigator', { clipboard: { writeText } })
    expect(await copyTextWhenReady(Promise.resolve(null))).toBe(false)
    expect(writeText).not.toHaveBeenCalled()
  })
})
