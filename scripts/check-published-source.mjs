import { verifyBuildArtifacts } from './build-artifacts.mjs'
import { readSourceIdentity, verifyPublishedSource } from './source-metadata.mjs'

function assertSourceUnchanged(before, after) {
  if (before.identity === null || before.identity !== after.identity || JSON.stringify(before.metadata) !== JSON.stringify(after.metadata)) {
    throw new Error('原始碼 identity 或 dirty 狀態在部署檢查期間改變；請重跑 build 與完整查核。')
  }
}

try {
  const before = readSourceIdentity()
  if (before.identity === null) throw new Error('無法確認 Git source identity；請從完整 Git checkout 建置。')
  const sourceUrl = await verifyPublishedSource(before.metadata)
  const afterPublication = readSourceIdentity()
  assertSourceUnchanged(before, afterPublication)

  const artifacts = verifyBuildArtifacts({ metadata: afterPublication.metadata })
  assertSourceUnchanged(afterPublication, readSourceIdentity())
  console.log(`已確認公開來源與本次部署產物：${sourceUrl}`)
  console.log(`Worker：${artifacts.workerArtifactSha256}；client：${artifacts.clientArtifactSha256}；ASSETS：${artifacts.assetsArtifactSha256}`)
} catch (error) {
  console.error(`部署前原始碼／產物檢查失敗：${error instanceof Error ? error.message : String(error)}`)
  process.exitCode = 1
}
