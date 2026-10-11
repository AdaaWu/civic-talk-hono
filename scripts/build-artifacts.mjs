import { createHash } from 'node:crypto'
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { projectRoot, readSourceMetadata } from './source-metadata.mjs'

export const sourceManifestName = 'civic-source-manifest.json'
export const deployConfigPath = path.join(projectRoot, '.wrangler/deploy/config.json')

function filesUnder(directory) {
  const files = []
  const walk = (current, relative = '') => {
    for (const entry of readdirSync(current, { withFileTypes: true }).sort((left, right) => (left.name < right.name ? -1 : left.name > right.name ? 1 : 0))) {
      const childRelative = relative ? `${relative}/${entry.name}` : entry.name
      const child = path.join(current, entry.name)
      if (entry.isSymbolicLink()) throw new Error(`建置產物不可包含 symbolic link：${childRelative}`)
      if (entry.isDirectory()) walk(child, childRelative)
      else if (entry.isFile()) files.push({ absolute: child, relative: childRelative })
    }
  }
  walk(directory)
  return files
}

/** 對目錄中實際存在的檔案計算穩定 SHA-256；排除自我描述 manifest 與不部署的本機 vars。 */
export function artifactSha256(directory, excludedPaths = []) {
  if (!existsSync(directory)) throw new Error(`找不到建置產物目錄：${directory}`)
  const excluded = new Set([sourceManifestName, '.dev.vars', ...excludedPaths].map(value => value.replaceAll(path.sep, '/')))
  const hash = createHash('sha256')
  for (const file of filesUnder(directory)) {
    if (excluded.has(file.relative)) continue
    hash.update(file.relative)
    hash.update('\0')
    hash.update(readFileSync(file.absolute))
    hash.update('\0')
  }
  return hash.digest('hex')
}

/** Cloudflare 可加入自己的資產；所有 public 檔案仍須有逐位元組相同的部署副本。 */
export function verifyClientAssetCopies(publicDir, assetsDirectory) {
  for (const file of filesUnder(publicDir)) {
    const deployed = path.join(assetsDirectory, file.relative)
    if (!existsSync(deployed) || !readFileSync(file.absolute).equals(readFileSync(deployed))) {
      throw new Error(`部署 ASSETS 與 client build 的檔案副本不一致：${file.relative}`)
    }
  }
}

export function writeSourceManifest(directory, manifest) {
  const manifestPath = path.join(directory, sourceManifestName)
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)
  return manifestPath
}

function readJson(filePath, description) {
  try {
    return JSON.parse(readFileSync(filePath, 'utf8'))
  } catch {
    throw new Error(`缺少或無法讀取${description}：${path.relative(projectRoot, filePath)}`)
  }
}

function requireManifest(directory, kind) {
  const manifest = readJson(path.join(directory, sourceManifestName), `${kind}來源 manifest`)
  if (manifest.schema !== 1 || manifest.kind !== kind || !manifest.source || !/^[a-f0-9]{64}$/.test(manifest.artifactSha256 ?? '')) {
    throw new Error(`${kind}來源 manifest 格式無效。`)
  }
  return manifest
}

export function resolveDeployTarget(redirectPath = deployConfigPath) {
  const redirect = readJson(redirectPath, 'Wrangler deploy redirect 設定')
  if (typeof redirect.configPath !== 'string' || !redirect.configPath) throw new Error('Wrangler deploy redirect 未指定 Worker configPath。')
  const workerConfigPath = path.resolve(path.dirname(redirectPath), redirect.configPath)
  const workerConfig = readJson(workerConfigPath, '實際 Worker Wrangler 設定')
  const workerDirectory = path.dirname(workerConfigPath)
  if (typeof workerConfig.main !== 'string' || !workerConfig.main) throw new Error('實際 Worker Wrangler 設定沒有 main。')
  const workerMain = path.resolve(workerDirectory, workerConfig.main)
  if (!existsSync(workerMain)) throw new Error('實際 Worker bundle 的 main 檔案不存在。')
  if (!workerConfig.assets || workerConfig.assets.binding !== 'ASSETS' || typeof workerConfig.assets.directory !== 'string') {
    throw new Error('實際 Worker Wrangler 設定沒有 ASSETS binding directory。')
  }
  return {
    workerConfigPath,
    workerMain,
    workerDirectory,
    assetsDirectory: path.resolve(workerDirectory, workerConfig.assets.directory),
  }
}

/** 依 Wrangler 實際 deploy redirect 檢查 Worker、client 與 ASSETS 產物。 */
export function verifyBuildArtifacts({ root = projectRoot, metadata = readSourceMetadata(root), redirectPath = deployConfigPath, publicDir = path.join(root, 'public') } = {}) {
  const { workerConfigPath, workerMain, workerDirectory, assetsDirectory } = resolveDeployTarget(redirectPath)
  const clientManifest = requireManifest(publicDir, 'client')
  const deployedClientManifest = requireManifest(assetsDirectory, 'client')
  const workerManifest = requireManifest(workerDirectory, 'worker')
  if (
    JSON.stringify(clientManifest.source) !== JSON.stringify(metadata) ||
    JSON.stringify(deployedClientManifest.source) !== JSON.stringify(metadata) ||
    JSON.stringify(workerManifest.source) !== JSON.stringify(metadata)
  ) {
    throw new Error('Worker、client 與部署 ASSETS 的來源 metadata 不一致或不是目前 checkout。')
  }
  if (artifactSha256(publicDir) !== clientManifest.artifactSha256) throw new Error('client bundle 自 manifest 產生後已變更。')
  if (JSON.stringify(clientManifest) !== JSON.stringify(deployedClientManifest)) throw new Error('部署 ASSETS 中的 client manifest 與 client build 不一致。')
  if (workerManifest.clientArtifactSha256 !== clientManifest.artifactSha256) throw new Error('Worker manifest 記錄的 client artifact SHA-256 不一致。')
  if (artifactSha256(workerDirectory) !== workerManifest.artifactSha256) throw new Error('Worker bundle 自 manifest 產生後已變更。')
  if (artifactSha256(assetsDirectory) !== workerManifest.assetsArtifactSha256) throw new Error('部署 ASSETS 自 manifest 產生後已變更。')
  verifyClientAssetCopies(publicDir, assetsDirectory)

  for (const relativePath of ['licenses/client.txt', 'licenses/worker.txt']) {
    if (!existsSync(path.join(assetsDirectory, relativePath))) throw new Error(`部署 ASSETS 缺少必要套件 notices：${relativePath}`)
  }
  const workerNotice = path.join(workerDirectory, 'licenses/worker.txt')
  const assetsNotice = path.join(assetsDirectory, 'licenses/worker.txt')
  if (!existsSync(workerNotice)) throw new Error('Worker bundle 缺少 worker notices。')
  if (readFileSync(workerNotice).compare(readFileSync(assetsNotice)) !== 0) throw new Error('Worker bundle 與部署 ASSETS 的 worker notices 不一致。')

  return {
    workerConfigPath,
    workerMain,
    workerDirectory,
    assetsDirectory,
    clientArtifactSha256: clientManifest.artifactSha256,
    workerArtifactSha256: workerManifest.artifactSha256,
    assetsArtifactSha256: workerManifest.assetsArtifactSha256,
  }
}
