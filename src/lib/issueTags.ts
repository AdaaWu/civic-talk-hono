/** 正規化議題標籤，忽略大小寫去重並保留首次輸入的字樣。 */
export function normalizeIssueTags(tags: readonly string[]): string[] {
  const normalized: string[] = []
  const seen = new Set<string>()

  for (const input of tags) {
    const tag = input.trim().replace(/^#+/, '').trim()
    if (!tag) continue

    const key = tag.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    normalized.push(tag)
  }

  return normalized
}

/** 解析逗號分隔的標籤，套用共用正規化規則。 */
export function parseIssueTagsInput(input: string): string[] {
  return normalizeIssueTags(input.split(','))
}
