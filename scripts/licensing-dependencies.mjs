import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = fileURLToPath(new URL('../', import.meta.url))
const outputPath = path.join(projectRoot, 'docs/licensing-dependencies.tsv')
const header = ['lock_path', 'version', 'license_metadata', 'dev', 'dev_optional', 'optional', 'resolved']

function field(value) {
  return String(value).replace(/[\t\r\n]+/g, ' ')
}

function licenseMetadata(value) {
  if (value === undefined || value === null || value === '') return 'UNSPECIFIED'
  if (typeof value === 'string') return field(value)
  return field(JSON.stringify(value))
}

function flag(value) {
  return value === true ? 'true' : 'false'
}

/**
 * 依 npm package-lock v3 的 packages entries 產生穩定排序的 TSV。
 * @param {{ packages?: Record<string, Record<string, unknown>> }} lockfile
 */
export function renderLicensingDependencies(lockfile) {
  if (!lockfile || typeof lockfile.packages !== 'object' || lockfile.packages === null || Array.isArray(lockfile.packages)) {
    throw new TypeError('package-lock.json 缺少有效的 packages 物件。')
  }

  const rows = Object.entries(lockfile.packages)
    .filter(([lockPath]) => lockPath.startsWith('node_modules/'))
    .map(([lockPath, entry]) => {
      const item = entry ?? {}
      return [
        lockPath,
        item.version ?? 'UNSPECIFIED',
        licenseMetadata(item.license),
        flag(item.dev),
        flag(item.devOptional),
        flag(item.optional),
        item.resolved ?? 'UNSPECIFIED',
      ].map(field)
    })
    .sort((left, right) => (left[0] < right[0] ? -1 : left[0] > right[0] ? 1 : 0))

  return [header.join('\t'), ...rows.map(row => row.join('\t')), ''].join('\n')
}

export function licensingDependenciesMatchLockfile(lockfile, current) {
  return current === renderLicensingDependencies(lockfile)
}

async function run(args) {
  if (args.some(argument => argument !== '--check') || args.filter(argument => argument === '--check').length > 1) {
    throw new Error('用法：node scripts/licensing-dependencies.mjs [--check]')
  }

  const lockfile = JSON.parse(await readFile(path.join(projectRoot, 'package-lock.json'), 'utf8'))
  const expected = renderLicensingDependencies(lockfile)
  if (args.includes('--check')) {
    let actual
    try {
      actual = await readFile(outputPath, 'utf8')
    } catch (error) {
      throw new Error(`找不到 ${path.relative(projectRoot, outputPath)}；請執行 node scripts/licensing-dependencies.mjs 重新產生。（${error.message}）`)
    }
    if (!licensingDependenciesMatchLockfile(lockfile, actual)) throw new Error('docs/licensing-dependencies.tsv 與 package-lock.json 不一致；請執行 node scripts/licensing-dependencies.mjs 重新產生。')
    return
  }

  await writeFile(outputPath, expected, 'utf8')
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  run(process.argv.slice(2)).catch(error => {
    console.error(error.message)
    process.exitCode = 1
  })
}
