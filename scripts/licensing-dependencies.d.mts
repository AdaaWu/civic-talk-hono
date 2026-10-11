export interface LicensingLockfileEntry {
  version?: unknown
  license?: unknown
  dev?: unknown
  devOptional?: unknown
  optional?: unknown
  resolved?: unknown
  [key: string]: unknown
}

export interface LicensingLockfile {
  packages: Record<string, LicensingLockfileEntry>
}

/** 依 npm package-lock packages entries 產生穩定排序的 TSV。 */
export declare function renderLicensingDependencies(lockfile: LicensingLockfile): string

/** 判斷現有 TSV 是否逐位元組符合 package-lock 的產生結果。 */
export declare function licensingDependenciesMatchLockfile(lockfile: LicensingLockfile, current: string): boolean
