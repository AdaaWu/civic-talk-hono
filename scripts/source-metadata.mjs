import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

export const projectRoot = fileURLToPath(new URL('../', import.meta.url))
export const sourceSnapshotEnv = 'CIVIC_BUILD_SOURCE_SNAPSHOT'
export const sourceSnapshotRunEnv = 'CIVIC_BUILD_RUN_ID'
// 只接受 GitHub repository URL；不把 remote URL 中的帳密或其他文字放進 bundle。
export function resolveSourceMetadata({ repository = '', commit = '', dirty = true }) {
  const match = repository.trim().match(/^(?:https:\/\/github\.com\/|git@github\.com:|ssh:\/\/git@github\.com\/)([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+?)(?:\.git)?\/?$/)
  const repositoryUrl = match && !['.', '..'].includes(match[1]) && !['.', '..'].includes(match[2]) ? `https://github.com/${match[1]}/${match[2]}` : null
  const revision = /^[a-f0-9]{40}$/.test(commit) ? commit : null
  const available = repositoryUrl !== null && revision !== null && !dirty
  return {
    repositoryUrl,
    commit: revision,
    dirty,
    sourceUrl: available ? `${repositoryUrl}/archive/${revision}.tar.gz` : null,
    licenseUrl: available ? `${repositoryUrl}/blob/${revision}/LICENSE` : null,
  }
}

function git(cwd, args, encoding = 'utf8') {
  return execFileSync('git', args, {
    cwd,
    ...(encoding === 'buffer' ? {} : { encoding }),
    stdio: ['ignore', 'pipe', 'pipe'],
  })
}

const generatedPaths = [':(exclude)public/styles.css', ':(exclude)public/licenses/client.txt', ':(exclude)public/licenses/worker.txt', ':(exclude)public/civic-source-manifest.json']

export function readSourceMetadata(cwd = projectRoot) {
  let commit
  try {
    commit = git(cwd, ['rev-parse', 'HEAD']).trim()
  } catch {
    return resolveSourceMetadata({})
  }

  const override = process.env.CIVIC_SOURCE_REPOSITORY
  let repository = override || ''
  if (!repository) {
    try {
      // `remote get-url` 會套用 insteadOf；未知 SSH alias 保持未知，不自行猜 host。
      repository = git(cwd, ['remote', 'get-url', 'origin'])
    } catch {
      repository = ''
    }
  }

  let dirty = true
  try {
    // CSS、manifest 與 notices 都是建置輸出；來源、授權文字及其他檔案仍受 dirty 檢查。
    dirty = git(cwd, ['status', '--porcelain', '--untracked-files=all', '--', '.', ...generatedPaths]) !== ''
  } catch {
    dirty = true
  }
  return resolveSourceMetadata({ repository, commit, dirty })
}

export function readSourceIdentity(cwd = projectRoot) {
  const metadata = readSourceMetadata(cwd)
  try {
    const commit = git(cwd, ['rev-parse', 'HEAD'])
    const status = git(cwd, ['status', '--porcelain=v1', '--untracked-files=all', '--', '.', ...generatedPaths])
    const diff = git(cwd, ['diff', '--binary', 'HEAD', '--', '.', ...generatedPaths], 'buffer')
    const untracked = git(cwd, ['ls-files', '--others', '--exclude-standard', '-z', '--', '.', ...generatedPaths], 'buffer')
    const hash = createHash('sha256')
    hash.update(JSON.stringify({ repositoryUrl: metadata.repositoryUrl, commit, dirty: metadata.dirty, status }))
    hash.update(diff)
    for (const relativePath of untracked.toString('utf8').split('\0').filter(Boolean).sort()) {
      hash.update(relativePath)
      hash.update('\0')
      hash.update(readFileSync(join(cwd, relativePath)))
      hash.update('\0')
    }
    return { metadata, identity: hash.digest('hex') }
  } catch {
    return { metadata, identity: null }
  }
}

function buildSourceMetadata() {
  if (process.env[sourceSnapshotRunEnv] && process.env[sourceSnapshotEnv]) {
    try {
      const snapshot = JSON.parse(process.env[sourceSnapshotEnv])
      const normalized = resolveSourceMetadata({ repository: snapshot.repositoryUrl ?? '', commit: snapshot.commit ?? '', dirty: snapshot.dirty })
      if (JSON.stringify(normalized) === JSON.stringify(snapshot)) return snapshot
    } catch {
      // 外部或過期的 runner 值無效時，直接讀取目前 checkout，不沿用舊 metadata。
    }
  }
  return readSourceMetadata()
}

export function sourceDefines() {
  return { __CIVIC_SOURCE__: JSON.stringify(buildSourceMetadata()) }
}

function sourceBranch(branch) {
  if (
    typeof branch !== 'string' ||
    !branch ||
    branch !== branch.trim() ||
    Array.from(branch).some(char => {
      const code = char.charCodeAt(0)
      return code <= 0x20 || code === 0x7f || char === ':'
    }) ||
    /^[a-f0-9]{7,40}$/i.test(branch) ||
    branch.startsWith('refs/')
  ) {
    throw new Error('CIVIC_SOURCE_BRANCH 必須是目標 repository 的分支名稱，不能填 SHA、其他 fork 的 owner:ref 或完整 refs 路徑。')
  }
  return branch
}

async function readPublishedGitHubJson(url, fetcher) {
  const response = await fetcher(url, {
    headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'civic-talk-source-check' },
    signal: AbortSignal.timeout(15000),
  })
  if (!response.ok) {
    if ([403, 429].includes(response.status)) {
      if (response.headers.get('x-ratelimit-remaining') === '0') {
        const reset = response.headers.get('x-ratelimit-reset')
        const resetDate = reset && /^\d+$/.test(reset) ? new Date(Number(reset) * 1000) : null
        const retry =
          resetDate && Number.isFinite(resetDate.getTime())
            ? `請於 ${new Intl.DateTimeFormat('zh-TW', { timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).format(resetDate)}（台灣時間）之後再試。`
            : '請等 GitHub API 額度重置後再試。'
        throw new Error(`GitHub 匿名 API 請求額度已用完（HTTP ${response.status}）；${retry}目前無法確認原始碼公開狀態。`)
      }
      const retryAfter = response.headers.get('retry-after')
      const details = await response.json().catch(() => null)
      const rateLimited = response.status === 429 || (retryAfter && /^\d+$/.test(retryAfter)) || (typeof details?.message === 'string' && /rate limit/i.test(details.message))
      if (rateLimited) {
        const retry = retryAfter && /^\d+$/.test(retryAfter) ? `請等待 ${retryAfter} 秒後再試。` : '請至少等待一分鐘後再試；若持續受限，請延長等待時間。'
        throw new Error(`GitHub API 請求暫受限制（HTTP ${response.status}）；${retry}目前無法確認原始碼公開狀態。`)
      }
      throw new Error(`GitHub 拒絕本次匿名查核（HTTP ${response.status}）；請檢查 GitHub 回應與網路狀態，目前無法確認原始碼是否公開。`)
    }
    if (response.status === 404) {
      throw new Error(`在指定公開 repository 或公開 branch 找不到來源（HTTP 404）；請確認來源設定、版本已 push，及 CIVIC_SOURCE_BRANCH。`)
    }
    throw new Error(`GitHub 無法完成原始碼公開查核（HTTP ${response.status}）；請稍後再試。`)
  }
  return response.json().catch(() => null)
}

export async function verifyPublishedSource(metadata, fetcher = fetch, branch = process.env.CIVIC_SOURCE_BRANCH || 'main') {
  if (!metadata.commit) throw new Error('Git checkout 沒有有效的 40 位 commit SHA，請從完整 Git repository 建置。')
  if (metadata.dirty) throw new Error('本次原始碼 checkout 有未提交變更；dirty build 僅供開發，不能部署。')
  if (!metadata.repositoryUrl) {
    throw new Error('origin 不是支援的公開 GitHub HTTPS／SSH URL，且不會猜測 SSH host alias；請設定公開的 CIVIC_SOURCE_REPOSITORY HTTPS override，不要包含帳密或 token。')
  }
  if (!metadata.sourceUrl) throw new Error('來源 metadata 無效，無法確認公開原始碼。')
  const repoPath = metadata.repositoryUrl.slice('https://github.com/'.length)
  const api = `https://api.github.com/repos/${repoPath}`
  const branchName = sourceBranch(branch)
  const ref = await readPublishedGitHubJson(`${api}/git/ref/heads/${branchName.split('/').map(encodeURIComponent).join('/')}`, fetcher)
  if (ref?.ref !== `refs/heads/${branchName}` || ref.object?.type !== 'commit' || !/^[a-f0-9]{40}$/.test(ref.object?.sha ?? '')) {
    throw new Error('GitHub 沒有回傳目標 repository 的確切 heads branch ref，不能作為發布分支。')
  }

  // 先解析本站 repository 的真實分支，再以固定 SHA 比較；不讓 compare 自行解讀任意 ref。
  const branchCommit = ref.object.sha
  const result = await readPublishedGitHubJson(`${api}/compare/${metadata.commit}...${branchCommit}`, fetcher)
  if (result?.base_commit?.sha !== metadata.commit) {
    throw new Error('公開原始碼比較基準與本次建置 commit 不一致。')
  }
  if (!['ahead', 'identical'].includes(result.status)) {
    throw new Error('本次建置 commit 不在指定公開 release branch 的歷史中（fork-only、分歧或較新版本均不接受）。')
  }
  return metadata.sourceUrl
}
