import { readSourceMetadata, verifyPublishedSource } from './source-metadata.mjs'

try {
  const sourceUrl = await verifyPublishedSource(readSourceMetadata())
  console.log(`已確認本次部署的公開原始碼：${sourceUrl}`)
} catch (error) {
  console.error(`部署前原始碼檢查失敗：${error instanceof Error ? error.message : String(error)}`)
  process.exitCode = 1
}
