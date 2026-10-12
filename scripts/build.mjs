import { randomUUID } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { copyFileSync, existsSync, mkdirSync, rmSync } from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import { artifactSha256, deployConfigPath, resolveDeployTarget, sourceManifestName, verifyClientAssetCopies, writeSourceManifest } from './build-artifacts.mjs'
import { projectRoot, readSourceIdentity, sourceSnapshotEnv, sourceSnapshotRunEnv } from './source-metadata.mjs'

const require = createRequire(import.meta.url)
const vp = path.join(path.dirname(require.resolve('vite-plus/package.json')), 'bin/vp')

function runVp(args, env = process.env) {
  // 直接以 Node 執行 CLI，避免 Windows 的 npm.cmd／vp.cmd 與 shell 路徑解析差異。
  const result = spawnSync(process.execPath, [vp, ...args], { cwd: projectRoot, env, stdio: 'inherit' })
  if (result.error) throw result.error
  if (result.status !== 0) process.exit(result.status ?? 1)
}

const initial = readSourceIdentity(projectRoot)
const publicDir = path.join(projectRoot, 'public')
rmSync(path.join(publicDir, 'licenses/worker.txt'), { force: true })

runVp(['exec', 'tailwindcss', '-i', './src/styles/app.css', '-o', './public/styles.css'])
const snapshotEnv = {
  ...process.env,
  [sourceSnapshotEnv]: JSON.stringify(initial.metadata),
  [sourceSnapshotRunEnv]: randomUUID(),
}
runVp(['build', '-c', 'vite.client.config.mts'], snapshotEnv)

const clientManifest = {
  schema: 1,
  kind: 'client',
  source: initial.metadata,
  artifactSha256: artifactSha256(publicDir),
}
writeSourceManifest(publicDir, clientManifest)

// 舊 redirect 不能指向上次 build；worker build 必須重新產生本次部署設定。
mkdirSync(path.dirname(deployConfigPath), { recursive: true })
rmSync(deployConfigPath, { force: true })
runVp(['build'], snapshotEnv)

const target = resolveDeployTarget(deployConfigPath)
if (path.resolve(target.assetsDirectory) === path.resolve(publicDir)) throw new Error('Worker ASSETS directory 不可與 client build source 目錄相同。')
if (artifactSha256(publicDir) !== clientManifest.artifactSha256) throw new Error('client bundle 在 worker build 期間被修改。')
verifyClientAssetCopies(publicDir, target.assetsDirectory)
const workerNotice = path.join(target.workerDirectory, 'licenses/worker.txt')
const deployedWorkerNotice = path.join(target.assetsDirectory, 'licenses/worker.txt')
if (!existsSync(workerNotice)) throw new Error('Worker bundle 未輸出必要套件 notices。')
// 必須等 Cloudflare 所有 environments 建完，否則 client fallback 會清掉副本。
mkdirSync(path.dirname(deployedWorkerNotice), { recursive: true })
copyFileSync(workerNotice, deployedWorkerNotice)
// dev 使用 public 而非部署 ASSETS；兩份 notices 都必須在 public 可取得。
copyFileSync(workerNotice, path.join(publicDir, 'licenses/worker.txt'))
clientManifest.artifactSha256 = artifactSha256(publicDir)
const finalClientManifest = writeSourceManifest(publicDir, clientManifest)
copyFileSync(finalClientManifest, path.join(target.assetsDirectory, sourceManifestName))
verifyClientAssetCopies(publicDir, target.assetsDirectory)

const workerManifest = {
  schema: 1,
  kind: 'worker',
  source: initial.metadata,
  artifactSha256: artifactSha256(target.workerDirectory),
  clientArtifactSha256: clientManifest.artifactSha256,
  assetsArtifactSha256: artifactSha256(target.assetsDirectory),
}
const final = readSourceIdentity(projectRoot)
const identityChanged = (initial.identity === null) !== (final.identity === null) || (initial.identity !== null && final.identity !== initial.identity)
if (identityChanged || JSON.stringify(final.metadata) !== JSON.stringify(initial.metadata)) {
  throw new Error('原始碼 identity 或 dirty 狀態在 build 期間改變；本次建置不得用於部署，請重跑 build。')
}
writeSourceManifest(target.workerDirectory, workerManifest)
console.log(`Build metadata：${initial.metadata.commit ?? 'unknown'}${initial.metadata.dirty ? ' (dirty)' : ''}`)
console.log(`Source manifests：public/${sourceManifestName}、${path.relative(projectRoot, path.join(target.workerDirectory, sourceManifestName))}`)
