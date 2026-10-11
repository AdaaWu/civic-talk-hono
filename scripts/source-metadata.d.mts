import type { SourceMetadata } from '../src/source'

export const projectRoot: string
export const sourceSnapshotEnv: string
export const sourceSnapshotRunEnv: string
export function resolveSourceMetadata(input: { repository?: string; commit?: string; dirty?: boolean }): SourceMetadata
export function readSourceMetadata(cwd?: string): SourceMetadata
export function readSourceIdentity(cwd?: string): { metadata: SourceMetadata; identity: string | null }
export function sourceDefines(): Record<string, string>
export function verifyPublishedSource(metadata: SourceMetadata, fetcher?: typeof fetch, branch?: string): Promise<string>
