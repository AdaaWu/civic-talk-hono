import { describe, expect, it } from 'vite-plus/test'
import { HOME_ISSUE_PREVIEW_ACTION, homeIssuePreviewUrl, readHomeIssuePreviewId } from '../lib/homeIssuePreview'
import { collectHomeTagSuggestions, homeIssueListUrl, homeSearchUrl, readHomeSearchQuery } from '../lib/homeSearch'
import type { IssueListItem } from '../db/queries'

function taggedIssue(id: number, tags: string[], abuse_flagged: IssueListItem['abuse_flagged'] = 0): IssueListItem {
  return {
    id,
    title: `Issue ${id}`,
    description: 'Description',
    status: 'published',
    polis_id: null,
    created_at: '2026-08-01 00:00:00',
    tags,
    abuse_flagged,
    author_name: null,
    author_email: null,
    material_count: 0,
    opinion_count: 0,
    last_activity_at: '2026-08-01 00:00:00',
  }
}

describe('home issue preview query state', () => {
  it('reads a valid preview action and issue id', () => {
    const url = new URL(`https://example.com/?action=${HOME_ISSUE_PREVIEW_ACTION}&issue=42`)
    expect(readHomeIssuePreviewId(url)).toBe(42)
  })

  it('ignores incomplete, unrelated, or invalid preview queries', () => {
    expect(readHomeIssuePreviewId(new URL('https://example.com/?issue=42'))).toBeNull()
    expect(readHomeIssuePreviewId(new URL('https://example.com/?action=click_issue_card'))).toBeNull()
    expect(readHomeIssuePreviewId(new URL('https://example.com/?action=click_issue_card&issue=0'))).toBeNull()
    expect(readHomeIssuePreviewId(new URL('https://example.com/?action=click_issue_card&issue=abc'))).toBeNull()
  })

  it('preserves existing query and hash while adding preview state', () => {
    const next = homeIssuePreviewUrl(new URL('https://example.com/?role=volunteer#issues'), 7)
    expect(next.searchParams.get('role')).toBe('volunteer')
    expect(next.searchParams.get('action')).toBe(HOME_ISSUE_PREVIEW_ACTION)
    expect(next.searchParams.get('issue')).toBe('7')
    expect(next.hash).toBe('#issues')
  })
})

describe('home search query state', () => {
  it('reads the request search and updates/clears only search while preserving other URL state', () => {
    const requestUrl = new URL('https://example.com/?role=volunteer&search=%23Housing#issues')
    expect(readHomeSearchQuery(requestUrl)).toBe('#Housing')

    const updated = homeSearchUrl(requestUrl, 'New term')
    expect(updated.searchParams.get('search')).toBe('New term')
    expect(updated.searchParams.get('role')).toBe('volunteer')
    expect(updated.hash).toBe('#issues')

    const cleared = homeSearchUrl(requestUrl, '')
    expect(cleared.searchParams.has('search')).toBe(false)
    expect(cleared.searchParams.get('role')).toBe('volunteer')
    expect(cleared.hash).toBe('#issues')
  })
  it('preserves search and unrelated query/hash when returning from a preview', () => {
    const preview = homeIssuePreviewUrl(new URL('https://example.com/?search=climate&role=volunteer#list'), 7)
    const returned = homeIssueListUrl(preview)
    expect(returned.searchParams.get('search')).toBe('climate')
    expect(returned.searchParams.get('role')).toBe('volunteer')
    expect(returned.searchParams.has('action')).toBe(false)
    expect(returned.searchParams.has('issue')).toBe(false)
    expect(returned.hash).toBe('#list')
  })

  it('restores search and preview values from a browser-history URL', () => {
    const previewUrl = new URL(`https://example.com/?search=climate&action=${HOME_ISSUE_PREVIEW_ACTION}&issue=7`)
    expect(readHomeSearchQuery(previewUrl)).toBe('climate')
    expect(readHomeIssuePreviewId(previewUrl)).toBe(7)

    const listUrl = homeIssueListUrl(previewUrl)
    expect(readHomeSearchQuery(listUrl)).toBe('climate')
    expect(readHomeIssuePreviewId(listUrl)).toBeNull()
  })
})

describe('home tag suggestions', () => {
  it('deduplicates across issues ignoring case and excludes confirmed/AI-hidden issue tags', () => {
    const issues = [taggedIssue(1, ['Civic', 'Policy']), taggedIssue(2, ['cIVIC', 'Community']), taggedIssue(3, ['Removed'], 2), taggedIssue(4, ['Pending moderation'], 3)]
    expect(collectHomeTagSuggestions(issues)).toEqual(['Civic', 'Policy', 'Community'])
  })
})
