import { execFileSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vite-plus/test'
import { readSourceMetadata, resolveSourceMetadata, verifyPublishedSource } from '../../scripts/source-metadata.mjs'

const revision = 'a'.repeat(40)
const clean = resolveSourceMetadata({ repository: 'https://github.com/example/civic-talk-fork.git', commit: revision, dirty: false })
const temporaryRepositories: string[] = []

afterEach(() => {
  vi.unstubAllEnvs()
  for (const cwd of temporaryRepositories.splice(0)) rmSync(cwd, { recursive: true, force: true })
})

function repository() {
  const cwd = mkdtempSync(join(tmpdir(), 'civic-source-test-'))
  temporaryRepositories.push(cwd)
  const git = (...args: string[]) => execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim()
  mkdirSync(join(cwd, 'public'))
  mkdirSync(join(cwd, 'src'))
  writeFileSync(join(cwd, 'src/app.css'), '/* source */\n')
  writeFileSync(join(cwd, 'public/styles.css'), '/* generated */\n')
  git('init')
  git('remote', 'add', 'origin', 'git@github.com:example/civic-talk-fork.git')
  git('add', '.')
  git('-c', 'user.name=Source Test', '-c', 'user.email=source-test@example.invalid', 'commit', '-m', 'baseline')
  vi.stubEnv('CIVIC_SOURCE_REPOSITORY', '')
  return { cwd, git }
}

describe('build source metadata', () => {
  it.each(['https://github.com/example/civic-talk-fork.git', 'git@github.com:example/civic-talk-fork.git', 'ssh://git@github.com/example/civic-talk-fork.git'])(
    'uses the fork and fixed revision for %s',
    repository => {
      const source = resolveSourceMetadata({ repository, commit: revision, dirty: false })
      expect(source.sourceUrl).toBe(`https://github.com/example/civic-talk-fork/archive/${revision}.tar.gz`)
      expect(source.licenseUrl).toBe(`https://github.com/example/civic-talk-fork/blob/${revision}/LICENSE`)
    }
  )

  it.each([
    'https://secret@github.com/example/fork',
    'https://github.com/example/fork?token=secret',
    'javascript:alert(1)',
    'https://github.com.evil.test/example/fork',
    'https://github.com/example/..',
  ])('rejects unsafe or credentialed URLs: %s', repository => {
    const source = resolveSourceMetadata({ repository, commit: revision, dirty: false })
    expect(source.repositoryUrl).toBeNull()
    expect(source.sourceUrl).toBeNull()
    expect(source.licenseUrl).toBeNull()
  })

  it('does not claim that a dirty or unknown revision matches published source', () => {
    expect(resolveSourceMetadata({ repository: clean.repositoryUrl!, commit: revision, dirty: true }).sourceUrl).toBeNull()
    expect(resolveSourceMetadata({ repository: clean.repositoryUrl!, commit: 'main', dirty: false }).sourceUrl).toBeNull()
  })

  it('keeps generated CSS changes usable but detects actual source and untracked files', () => {
    const { cwd } = repository()
    const initial = readSourceMetadata(cwd)
    expect(initial.dirty).toBe(false)
    expect(initial.sourceUrl).toContain('/example/civic-talk-fork/archive/')
    writeFileSync(join(cwd, 'public/styles.css'), '/* regenerated */\n')
    expect(readSourceMetadata(cwd)).toEqual(initial)
    writeFileSync(join(cwd, 'src/new.ts'), 'export const value = 1\n')
    expect(readSourceMetadata(cwd).sourceUrl).toBeNull()
    rmSync(join(cwd, 'src/new.ts'))
    writeFileSync(join(cwd, 'src/app.css'), '/* changed source */\n')
    expect(readSourceMetadata(cwd).sourceUrl).toBeNull()
  })

  it('allows an explicit public repository without changing the revision', () => {
    const { cwd, git } = repository()
    vi.stubEnv('CIVIC_SOURCE_REPOSITORY', 'https://github.com/another/public-fork')
    const source = readSourceMetadata(cwd)
    expect(source.sourceUrl).toBe(`https://github.com/another/public-fork/archive/${git('rev-parse', 'HEAD')}.tar.gz`)
  })

  it('does not invent source metadata when Git is unavailable', () => {
    const cwd = mkdtempSync(join(tmpdir(), 'civic-no-git-'))
    temporaryRepositories.push(cwd)
    expect(readSourceMetadata(cwd).sourceUrl).toBeNull()
    expect(readSourceMetadata(cwd).dirty).toBe(true)
  })
})

describe('deployment publication check', () => {
  it('checks a matching commit without supplying GitHub credentials', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ sha: revision })))
    expect(await verifyPublishedSource(clean, fetcher)).toBe(clean.sourceUrl)
    const [url, init] = fetcher.mock.calls[0]
    expect(url).toBe(`https://api.github.com/repos/example/civic-talk-fork/commits/${revision}`)
    expect(new Headers(init?.headers).has('Authorization')).toBe(false)
    expect(init?.signal).toBeInstanceOf(AbortSignal)
  })

  it.each([
    [404, '找不到原始碼 commit'],
    [500, '請稍後再試'],
    [403, '拒絕本次匿名查核'],
  ])('stops publication checks for HTTP %s with the appropriate reason', async (status, reason) => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status }))
    const error = await verifyPublishedSource(clean, fetcher).catch(error => error as Error)
    expect(error).toBeInstanceOf(Error)
    expect((error as Error).message).toContain(`HTTP ${status}`)
    expect((error as Error).message).toContain(reason)
    if (status !== 404) expect((error as Error).message).not.toContain('push')
  })

  it('reports an exhausted anonymous API quota and Taiwan reset time without asking for another push', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(null, {
        status: 403,
        headers: { 'x-ratelimit-remaining': '0', 'x-ratelimit-reset': '1791681676' },
      })
    )
    const error = await verifyPublishedSource(clean, fetcher).catch(error => error as Error)
    expect(error).toBeInstanceOf(Error)
    expect((error as Error).message).toContain('匿名 API 請求額度已用完')
    expect((error as Error).message).toContain('2026/10/11')
    expect((error as Error).message).toContain('09:21:16（台灣時間）')
    expect((error as Error).message).not.toContain('push')
    expect(fetcher).toHaveBeenCalledTimes(1)
    expect(new Headers(fetcher.mock.calls[0][1]?.headers).has('Authorization')).toBe(false)
  })

  it.each(['', 'invalid', '9999999999999999999'])('handles an absent or invalid quota reset timestamp: %s', async reset => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(null, {
        status: 403,
        headers: { 'x-ratelimit-remaining': '0', ...(reset ? { 'x-ratelimit-reset': reset } : {}) },
      })
    )
    await expect(verifyPublishedSource(clean, fetcher)).rejects.toThrow('請等 GitHub API 額度重置後再試')
  })

  it.each([
    { status: 429, headers: new Headers({ 'retry-after': '120' }), body: null, reason: '請等待 120 秒後再試' },
    { status: 403, headers: new Headers(), body: JSON.stringify({ message: 'You have exceeded a secondary rate limit.' }), reason: '至少等待一分鐘' },
    { status: 429, headers: new Headers(), body: null, reason: '至少等待一分鐘' },
  ])('reports temporary API throttling for HTTP $status and preserves the deployment stop', async ({ status, headers, body, reason }) => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(body, { status, headers }))
    const error = await verifyPublishedSource(clean, fetcher).catch(error => error as Error)
    expect(error).toBeInstanceOf(Error)
    expect((error as Error).message).toContain('API 請求暫受限制')
    expect((error as Error).message).toContain(reason)
    expect((error as Error).message).not.toContain('push')
    expect(fetcher).toHaveBeenCalledTimes(1)
  })

  it('rejects a different returned revision', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ sha: 'b'.repeat(40) })))
    await expect(verifyPublishedSource(clean, fetcher)).rejects.toThrow('不一致')
  })

  it('rejects dirty/unversioned sources before any network access', async () => {
    const fetcher = vi.fn<typeof fetch>()
    await expect(verifyPublishedSource(resolveSourceMetadata({}), fetcher)).rejects.toThrow('提交')
    expect(fetcher).not.toHaveBeenCalled()
  })
})
