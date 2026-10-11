import { execFileSync } from 'node:child_process'
import { cpSync, mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vite-plus/test'
import { artifactSha256, verifyBuildArtifacts, writeSourceManifest } from '../../scripts/build-artifacts.mjs'
import {
  readSourceIdentity,
  readSourceMetadata,
  resolveSourceMetadata,
  sourceDefines,
  sourceSnapshotEnv,
  sourceSnapshotRunEnv,
  verifyPublishedSource,
} from '../../scripts/source-metadata.mjs'

const revision = 'a'.repeat(40)
const branchRevision = 'b'.repeat(40)
const clean = resolveSourceMetadata({ repository: 'https://github.com/example/civic-talk-fork.git', commit: revision, dirty: false })
const temporaryDirectories: string[] = []

afterEach(() => {
  vi.unstubAllEnvs()
  for (const cwd of temporaryDirectories.splice(0)) rmSync(cwd, { recursive: true, force: true })
})

function temporaryDirectory(prefix: string) {
  const cwd = mkdtempSync(path.join(tmpdir(), prefix))
  temporaryDirectories.push(cwd)
  return cwd
}

function repository(remote = 'git@github.com:example/civic-talk-fork.git') {
  const cwd = temporaryDirectory('civic-source-test-')
  const git = (...args: string[]) => execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim()
  vi.stubEnv('GIT_CONFIG_NOSYSTEM', '1')
  vi.stubEnv('GIT_CONFIG_GLOBAL', '/dev/null')
  mkdirSync(path.join(cwd, 'public'))
  mkdirSync(path.join(cwd, 'src'))
  writeFileSync(path.join(cwd, 'src/app.css'), '/* source */\n')
  writeFileSync(path.join(cwd, 'public/styles.css'), '/* generated */\n')
  git('init')
  git('remote', 'add', 'origin', remote)
  git('add', '.')
  git('config', '--local', 'commit.gpgsign', 'true')
  git('-c', 'user.name=Source Test', '-c', 'user.email=source-test@example.invalid', '-c', 'commit.gpgsign=false', 'commit', '-m', 'baseline')
  vi.stubEnv('CIVIC_SOURCE_REPOSITORY', '')
  return { cwd, git }
}

function branchResponse(branch = 'main', sha = branchRevision) {
  return new Response(JSON.stringify({ ref: `refs/heads/${branch}`, object: { type: 'commit', sha } }))
}

// 只使用官方 compare schema 的欄位；該回應沒有 head_commit。
function compareResponse(status: string, baseCommit = revision) {
  const ahead = status === 'ahead' || status === 'diverged'
  const behind = status === 'behind' || status === 'diverged'
  return new Response(JSON.stringify({
    status,
    base_commit: { sha: baseCommit },
    merge_base_commit: { sha: status === 'behind' ? branchRevision : status === 'diverged' ? 'c'.repeat(40) : baseCommit },
    ahead_by: ahead ? 1 : 0,
    behind_by: behind ? 1 : 0,
    total_commits: ahead ? 1 : 0,
    commits: ahead ? [{ sha: branchRevision }] : [],
  }))
}

function requestUrl(input: Parameters<typeof fetch>[0]) {
  return typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
}

function artifactFixture() {
  const cwd = temporaryDirectory('civic-artifacts-test-')
  const publicDir = path.join(cwd, 'public')
  const workerDirectory = path.join(cwd, 'dist/worker')
  const assetsDirectory = path.join(cwd, 'dist/client')
  const redirectPath = path.join(cwd, '.wrangler/deploy/config.json')
  mkdirSync(path.join(publicDir, 'js'), { recursive: true })
  mkdirSync(path.join(publicDir, 'licenses'), { recursive: true })
  writeFileSync(path.join(publicDir, 'js/civic.js'), 'client bundle')
  writeFileSync(path.join(publicDir, 'licenses/client.txt'), 'client notices')
  const clientManifest = { schema: 1, kind: 'client', source: clean, artifactSha256: artifactSha256(publicDir) }
  writeSourceManifest(publicDir, clientManifest)

  mkdirSync(workerDirectory, { recursive: true })
  writeFileSync(path.join(workerDirectory, 'index.js'), 'worker bundle')
  mkdirSync(path.join(workerDirectory, 'licenses'), { recursive: true })
  writeFileSync(path.join(workerDirectory, 'licenses/worker.txt'), 'worker notices')
  writeFileSync(path.join(workerDirectory, 'wrangler.json'), JSON.stringify({ main: 'index.js', assets: { directory: '../client', binding: 'ASSETS' } }))
  mkdirSync(path.dirname(redirectPath), { recursive: true })
  writeFileSync(redirectPath, JSON.stringify({ configPath: '../../dist/worker/wrangler.json' }))

  cpSync(publicDir, assetsDirectory, { recursive: true })
  mkdirSync(path.join(assetsDirectory, 'licenses'), { recursive: true })
  writeFileSync(path.join(assetsDirectory, 'licenses/worker.txt'), 'worker notices')
  const workerManifest = {
    schema: 1,
    kind: 'worker',
    source: clean,
    artifactSha256: artifactSha256(workerDirectory),
    clientArtifactSha256: clientManifest.artifactSha256,
    assetsArtifactSha256: artifactSha256(assetsDirectory),
  }
  writeSourceManifest(workerDirectory, workerManifest)
  return { cwd, publicDir, workerDirectory, assetsDirectory, redirectPath }
}

describe('原始碼 metadata 與 Git identity', () => {
  it.each(['https://github.com/example/civic-talk-fork.git', 'git@github.com:example/civic-talk-fork.git', 'ssh://git@github.com/example/civic-talk-fork.git'])(
    '由安全 GitHub remote %s 組成固定 revision 連結',
    repository => {
      const source = resolveSourceMetadata({ repository, commit: revision, dirty: false })
      expect(source.repositoryUrl).toBe('https://github.com/example/civic-talk-fork')
      expect(source.sourceUrl).toBe(`https://github.com/example/civic-talk-fork/archive/${revision}.tar.gz`)
      expect(source.licenseUrl).toBe(`https://github.com/example/civic-talk-fork/blob/${revision}/LICENSE`)
    }
  )

  it.each(['https://secret@github.com/example/fork', 'https://github.com/example/fork?token=secret', 'javascript:alert(1)', 'https://github.com.evil.test/example/fork'])(
    '不接受含憑證或非 GitHub URL：%s',
    repository => {
      const source = resolveSourceMetadata({ repository, commit: revision, dirty: false })
      expect(source.repositoryUrl).toBeNull()
      expect(source.sourceUrl).toBeNull()
      expect(source.licenseUrl).toBeNull()
    }
  )

  it('Git remote get-url 展開 insteadOf，未知 SSH alias 需安全 override 且不猜 GitHub repository', async () => {
    const { cwd, git } = repository('alias:civic-talk-fork.git')
    git('config', '--local', 'url.https://github.com/example/.insteadOf', 'alias:')
    expect(readSourceMetadata(cwd).repositoryUrl).toBe('https://github.com/example/civic-talk-fork')

    git('remote', 'set-url', 'origin', 'unknown:civic-talk-fork.git')
    const unresolved = readSourceMetadata(cwd)
    expect(unresolved.repositoryUrl).toBeNull()
    expect(unresolved.sourceUrl).toBeNull()
    const fetcher = vi.fn<typeof fetch>()
    await expect(verifyPublishedSource(unresolved, fetcher)).rejects.toThrow('不會猜測 SSH host alias')
    expect(fetcher).not.toHaveBeenCalled()
  })

  it('不把無效 origin 或 credentialed override 寫進診斷', async () => {
    const { cwd } = repository()
    const secret = 'https://user:secret@github.com/private/repo'
    vi.stubEnv('CIVIC_SOURCE_REPOSITORY', secret)
    const source = readSourceMetadata(cwd)
    const fetcher = vi.fn<typeof fetch>()
    const check = verifyPublishedSource(source, fetcher)
    await expect(check).rejects.toThrow('CIVIC_SOURCE_REPOSITORY')
    await expect(check).rejects.not.toThrow(secret)
    expect(fetcher).not.toHaveBeenCalled()
  })

  it('dirty 與未知 revision 不會假稱公開來源', () => {
    expect(resolveSourceMetadata({ repository: clean.repositoryUrl!, commit: revision, dirty: true }).sourceUrl).toBeNull()
    expect(resolveSourceMetadata({ repository: clean.repositoryUrl!, commit: 'main', dirty: false }).sourceUrl).toBeNull()
  })
  it('沒有 runner token 的一般 Vite config 不讀取殘留 snapshot', () => {
    vi.stubEnv(sourceSnapshotEnv, JSON.stringify(clean))
    vi.stubEnv(sourceSnapshotRunEnv, '')
    expect(JSON.parse(sourceDefines()['__CIVIC_SOURCE__']).commit).not.toBe(clean.commit)
  })

  it('忽略建置輸出，但識別 dirty source 內容在建置期間的變化', () => {
    const { cwd } = repository()
    const initial = readSourceIdentity(cwd)
    expect(initial.metadata.dirty).toBe(false)
    expect(initial.identity).not.toBeNull()

    mkdirSync(path.join(cwd, 'public/licenses'), { recursive: true })
    writeFileSync(path.join(cwd, 'public/licenses/worker.txt'), 'generated worker notices')
    writeFileSync(path.join(cwd, 'public/styles.css'), '/* regenerated */\n')
    writeFileSync(path.join(cwd, 'public/licenses/client.txt'), 'generated notices')
    expect(readSourceIdentity(cwd).identity).toBe(initial.identity)

    writeFileSync(path.join(cwd, 'src/new.ts'), 'export const value = 1\n')
    const dirty = readSourceIdentity(cwd)
    expect(dirty.metadata.dirty).toBe(true)
    writeFileSync(path.join(cwd, 'src/new.ts'), 'export const value = 2\n')
    const changedAgain = readSourceIdentity(cwd)
    expect(changedAgain.metadata.dirty).toBe(true)
    expect(changedAgain.identity).not.toBe(dirty.identity)
  })

  it('使用經 Git 解析的 origin，並允許安全的公開 repository override', () => {
    const { cwd, git } = repository()
    const expectedCommit = git('rev-parse', 'HEAD')
    const source = readSourceMetadata(cwd)
    expect(source.dirty).toBe(false)
    expect(source.commit).toBe(expectedCommit)
    expect(source.sourceUrl).toContain(`/example/civic-talk-fork/archive/${expectedCommit}.tar.gz`)

    vi.stubEnv('CIVIC_SOURCE_REPOSITORY', 'https://github.com/another/public-fork')
    expect(readSourceMetadata(cwd).sourceUrl).toBe(`https://github.com/another/public-fork/archive/${expectedCommit}.tar.gz`)
  })

  it('Git 不可用時標示未發布來源', () => {
    const cwd = temporaryDirectory('civic-no-git-')
    const source = readSourceMetadata(cwd)
    expect(source.sourceUrl).toBeNull()
    expect(source.dirty).toBe(true)
    expect(readSourceIdentity(cwd).identity).toBeNull()
  })
})

describe('公開 release branch 查核', () => {
  it.each(['ahead', 'identical'])('接受真實 heads 分支上的建置版本：%s', async status => {
    const head = status === 'identical' ? revision : branchRevision
    const fetcher = vi.fn<typeof fetch>().mockResolvedValueOnce(branchResponse('main', head)).mockResolvedValueOnce(compareResponse(status))
    expect(await verifyPublishedSource(clean, fetcher)).toBe(clean.sourceUrl)
    for (const [, init] of fetcher.mock.calls) expect(new Headers(init?.headers).has('Authorization')).toBe(false)
  })

  it('解析含斜線的指定分支，並鎖定 ref 回傳的 SHA 而非再次解讀分支名稱', async () => {
    vi.stubEnv('CIVIC_SOURCE_BRANCH', 'release/v0.2.0')
    const fetcher = vi.fn<typeof fetch>().mockImplementation(async input => {
      const url = requestUrl(input)
      if (url.endsWith('/git/ref/heads/release/v0.2.0')) return branchResponse('release/v0.2.0')
      if (url.endsWith(`/compare/${revision}...${branchRevision}`)) return compareResponse('ahead')
      return new Response(null, { status: 404 })
    })
    expect(await verifyPublishedSource(clean, fetcher)).toBe(clean.sourceUrl)
  })

  it.each(['behind', 'diverged', 'fork-only'])('拒絕不在目標 heads 分支歷史的版本：%s', async status => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValueOnce(branchResponse()).mockResolvedValueOnce(compareResponse(status))
    await expect(verifyPublishedSource(clean, fetcher)).rejects.toThrow('不在指定公開 release branch')
  })

  it('要求 compare 的 base_commit 符合建置 SHA', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValueOnce(branchResponse()).mockResolvedValueOnce(compareResponse('ahead', 'c'.repeat(40)))
    await expect(verifyPublishedSource(clean, fetcher)).rejects.toThrow('比較基準')
  })

  it('大範圍／分頁比較不以 commits 最後一筆推斷發布分支 SHA', async () => {
    const comparison = {
      status: 'ahead',
      base_commit: { sha: revision },
      merge_base_commit: { sha: revision },
      ahead_by: 301,
      behind_by: 0,
      total_commits: 301,
      commits: [{ sha: 'c'.repeat(40) }],
    }
    const fetcher = vi.fn<typeof fetch>().mockResolvedValueOnce(branchResponse()).mockResolvedValueOnce(new Response(JSON.stringify(comparison)))
    expect(await verifyPublishedSource(clean, fetcher)).toBe(clean.sourceUrl)
  })

  it.each(['release branch', revision, revision.slice(0, 7), 'someone:main', 'someone:'.concat(revision), 'refs/pull/131/head', 'refs/tags/v0.2.0'])(
    '不讓 SHA、他人 fork 或非分支 ref 冒充發布分支：%s', async branch => {
      const fetcher = vi.fn<typeof fetch>().mockResolvedValue(compareResponse('identical'))
      vi.stubEnv('CIVIC_SOURCE_BRANCH', branch)
      await expect(verifyPublishedSource(clean, fetcher)).rejects.toThrow('CIVIC_SOURCE_BRANCH')
      await expect(verifyPublishedSource(clean, fetcher, branch)).rejects.toThrow('CIVIC_SOURCE_BRANCH')
      expect(fetcher).not.toHaveBeenCalled()
    }
  )

  it('不把 repository 的 tag 或 fork-network commit 可讀當成存在 heads 分支', async () => {
    const fetcher = vi.fn<typeof fetch>().mockImplementation(async input =>
      requestUrl(input).includes('/git/ref/heads/')
        ? new Response(null, { status: 404 })
        : compareResponse('identical')
    )
    await expect(verifyPublishedSource(clean, fetcher, 'fork-only-release')).rejects.toThrow('HTTP 404')
    expect(fetcher.mock.calls.some(([url]) => requestUrl(url).includes('/compare/'))).toBe(false)
  })

  it.each([
    { ref: 'refs/tags/main', object: { type: 'commit', sha: branchRevision } },
    { ref: 'refs/heads/another', object: { type: 'commit', sha: branchRevision } },
    { ref: 'refs/heads/main', object: { type: 'tag', sha: branchRevision } },
    { ref: 'refs/heads/main', object: { type: 'commit', sha: 'short' } },
    [{ ref: 'refs/heads/main', object: { type: 'commit', sha: branchRevision } }],
  ])('拒絕不精確或無效的 GitHub ref 回應：%j', async ref => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValueOnce(new Response(JSON.stringify(ref))).mockResolvedValue(compareResponse('identical'))
    await expect(verifyPublishedSource(clean, fetcher)).rejects.toThrow('確切 heads branch ref')
    expect(fetcher.mock.calls.some(([url]) => requestUrl(url).includes('/compare/'))).toBe(false)
  })

  it.each([
    [404, '找不到來源'],
    [500, '請稍後再試'],
    [403, '拒絕本次匿名查核'],
  ])('保留匿名 API 的錯誤分類 HTTP %s', async (status, category) => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status }))
    await expect(verifyPublishedSource(clean, fetcher)).rejects.toThrow(category)
  })

  it('保留 rate limit 與重置時間分類，且不加入登入憑證', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 403, headers: { 'x-ratelimit-remaining': '0', 'x-ratelimit-reset': '1791681676' } }))
    await expect(verifyPublishedSource(clean, fetcher)).rejects.toThrow('匿名 API 請求額度已用完')
    expect(new Headers(fetcher.mock.calls[0][1]?.headers).has('Authorization')).toBe(false)
  })
  it('保留 429 與 secondary rate limit 分類，不使用登入憑證', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 429, headers: { 'retry-after': '120' } }))
    await expect(verifyPublishedSource(clean, fetcher)).rejects.toThrow('API 請求暫受限制')
    expect(new Headers(fetcher.mock.calls[0][1]?.headers).has('Authorization')).toBe(false)
  })

  it('分別拒絕 dirty 與沒有有效 commit SHA 的來源，且不發出請求', async () => {
    const fetcher = vi.fn<typeof fetch>()
    await expect(verifyPublishedSource(resolveSourceMetadata({ repository: clean.repositoryUrl!, commit: revision, dirty: true }), fetcher)).rejects.toThrow('未提交')
    await expect(verifyPublishedSource(resolveSourceMetadata({}), fetcher)).rejects.toThrow('40 位 commit SHA')
    expect(fetcher).not.toHaveBeenCalled()
  })
})

describe('部署產物 manifest 與檔案副本', () => {

  it('拒絕 manifest 後被修改的 Worker 部署 assets', () => {
    const fixture = artifactFixture()
    writeFileSync(path.join(fixture.assetsDirectory, 'js/civic.js'), 'tampered client')
    expect(() => verifyBuildArtifacts({ root: fixture.cwd, metadata: clean, redirectPath: fixture.redirectPath, publicDir: fixture.publicDir })).toThrow('部署 ASSETS 自 manifest 產生後已變更')
  })

  it('拒絕 Worker/client/部署副本的 metadata 不一致', () => {
    const fixture = artifactFixture()
    writeSourceManifest(fixture.assetsDirectory, { schema: 1, kind: 'client', source: { ...clean, commit: 'b'.repeat(40) }, artifactSha256: artifactSha256(fixture.publicDir) })
    expect(() => verifyBuildArtifacts({ root: fixture.cwd, metadata: clean, redirectPath: fixture.redirectPath, publicDir: fixture.publicDir })).toThrow('來源 metadata 不一致')
  })

  it('沒有本次 build manifests 時拒絕舊產物', () => {
    const cwd = temporaryDirectory('civic-stale-build-')
    expect(() => verifyBuildArtifacts({ root: cwd, metadata: clean, redirectPath: path.join(cwd, '.wrangler/deploy/config.json'), publicDir: path.join(cwd, 'public') })).toThrow('缺少或無法讀取Wrangler deploy redirect 設定')
  })
})
