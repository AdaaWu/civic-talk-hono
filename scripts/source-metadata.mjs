import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

export const projectRoot = fileURLToPath(new URL('../', import.meta.url))

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

export function readSourceMetadata(cwd = projectRoot) {
  try {
    const git = args => execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim()
    const repository = process.env.CIVIC_SOURCE_REPOSITORY || git(['config', '--get', 'remote.origin.url'])
    const commit = git(['rev-parse', 'HEAD'])
    // styles.css 是 tracked 生成物；實際來源 app.css 仍受 dirty 檢查。
    const dirty = git(['status', '--porcelain', '--untracked-files=all', '--', '.', ':(exclude)public/styles.css']) !== ''
    return resolveSourceMetadata({ repository, commit, dirty })
  } catch {
    return resolveSourceMetadata({})
  }
}

export function sourceDefines() {
  return { __CIVIC_SOURCE__: JSON.stringify(readSourceMetadata()) }
}

export async function verifyPublishedSource(metadata, fetcher = fetch) {
  if (!metadata.sourceUrl || !metadata.repositoryUrl || !metadata.commit || metadata.dirty) {
    throw new Error('請先提交所有原始碼變更，並設定有效的 GitHub origin 或 CIVIC_SOURCE_REPOSITORY。')
  }
  const repoPath = metadata.repositoryUrl.slice('https://github.com/'.length)
  // 無 Authorization header：確認使用者不用登入或 token 就能取得這個 commit。
  const response = await fetcher(`https://api.github.com/repos/${repoPath}/commits/${metadata.commit}`, {
    headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'civic-talk-source-check' },
    signal: AbortSignal.timeout(15000),
  })
  if (!response.ok) throw new Error(`原始碼 commit 尚未公開或 GitHub 無法確認（HTTP ${response.status}）；請先 push 到公開 repository。`)
  const result = await response.json()
  if (result.sha !== metadata.commit) throw new Error('公開原始碼版本與本次建置 commit 不一致。')
  return metadata.sourceUrl
}
