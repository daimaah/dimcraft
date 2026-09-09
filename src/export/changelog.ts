/** Parse CHANGELOG.md into version entries (Keep-a-Changelog style headers). */
export interface ChangelogEntry {
  version: string
  date: string | null
  body: string
}

export function parseChangelog(raw: string): ChangelogEntry[] {
  const lines = raw.split('\n')
  const entries: ChangelogEntry[] = []
  let current: ChangelogEntry | null = null
  for (const line of lines) {
    const m = /^## \[([^\]]+)\](?:\s+—\s+(\d{4}-\d{2}-\d{2}))?\s*$/.exec(line)
    if (m) {
      current = { version: m[1], date: m[2] ?? null, body: '' }
      entries.push(current)
      continue
    }
    if (current) current.body += (current.body ? '\n' : '') + line
  }
  return entries
}

/**
 * The entry for `current`, plus up to `olderCount` previous versions — the
 * in-app view intentionally does not show the entire history.
 */
export function recentChangelog(
  raw: string,
  current: string,
  olderCount = 5,
): { current: ChangelogEntry | null; older: ChangelogEntry[] } {
  const all = parseChangelog(raw).filter((e) => e.version.toLowerCase() !== 'unreleased')
  const idx = all.findIndex((e) => e.version === current || current.startsWith(`${e.version}.`))
  if (idx === -1) return { current: null, older: all.slice(0, olderCount) }
  return { current: all[idx], older: all.slice(idx + 1, idx + 1 + olderCount) }
}

/** One renderable block of an entry's markdown body. */
export type ChangelogBlock =
  | { kind: 'heading'; text: string }
  | { kind: 'paragraph'; text: string }
  | { kind: 'bullets'; items: string[] }

/**
 * Group an entry's markdown body into blocks: `### ` headings, `- ` bullet
 * lists and plain paragraphs. Soft-wrapped markdown lines (including bullet
 * continuations) are joined back into the block they belong to; a blank line
 * ends the current paragraph or list.
 */
export function changelogBlocks(body: string): ChangelogBlock[] {
  const blocks: ChangelogBlock[] = []
  let afterBlank = true
  const last = () => blocks[blocks.length - 1]
  for (const raw of body.split('\n')) {
    const line = raw.trim()
    if (!line) {
      afterBlank = true
      continue
    }
    if (line.startsWith('### ')) {
      blocks.push({ kind: 'heading', text: line.slice(4).trim() })
    } else if (line.startsWith('- ')) {
      if (afterBlank || last()?.kind !== 'bullets') blocks.push({ kind: 'bullets', items: [] })
      const list = last() as Extract<ChangelogBlock, { kind: 'bullets' }>
      list.items.push(line.slice(2).trim())
    } else if (!afterBlank && last()?.kind === 'paragraph') {
      ;(last() as Extract<ChangelogBlock, { kind: 'paragraph' }>).text += ` ${line}`
    } else if (!afterBlank && last()?.kind === 'bullets') {
      const list = last() as Extract<ChangelogBlock, { kind: 'bullets' }>
      list.items[list.items.length - 1] += ` ${line}`
    } else {
      blocks.push({ kind: 'paragraph', text: line })
    }
    afterBlank = false
  }
  return blocks
}
