import type { SourceMetadata } from '../src/source'

export const sourceManifestName: string
export const deployConfigPath: string
export function artifactSha256(directory: string, excludedPaths?: string[]): string
export function verifyClientAssetCopies(publicDir: string, assetsDirectory: string): void
export function writeSourceManifest(directory: string, manifest: Record<string, unknown>): string
export function resolveDeployTarget(redirectPath?: string): {
  workerConfigPath: string
  workerMain: string
  workerDirectory: string
  assetsDirectory: string
}
export function verifyBuildArtifacts(options?: { root?: string; metadata?: SourceMetadata; redirectPath?: string; publicDir?: string }): {
  workerConfigPath: string
  workerMain: string
  workerDirectory: string
  assetsDirectory: string
  clientArtifactSha256: string
  workerArtifactSha256: string
  assetsArtifactSha256: string
}
