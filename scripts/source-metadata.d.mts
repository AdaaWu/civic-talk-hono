import type { SourceMetadata } from '../src/source'

export const projectRoot: string
export function resolveSourceMetadata(input: { repository?: string; commit?: string; dirty?: boolean }): SourceMetadata
export function readSourceMetadata(cwd?: string): SourceMetadata
export function sourceDefines(): Record<string, string>
export function verifyPublishedSource(metadata: SourceMetadata, fetcher?: typeof fetch): Promise<string>
