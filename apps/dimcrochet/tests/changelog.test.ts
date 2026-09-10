import { describe, expect, it } from 'vitest'
import changelogRaw from '../CHANGELOG.md?raw'
import { changelogBlocks, parseChangelog, recentChangelog, unreleasedChangelog } from '@dimcraft/core/export/changelog'

describe('changelog body blocks', () => {
  it('groups headings, bullets and paragraphs, joining soft-wrapped lines', () => {
    const body = [
      'Interface refinement cycle: the design view becomes',
      'customizable.',
      '',
      '### Added',
      '',
      '- **Options dialog** (gear in the tool palette) with tabs:',
      '  design-view animations on/off, 24-hour clock.',
      '- Draggable dialogs — every dialog can be moved.',
    ].join('\n')
    expect(changelogBlocks(body)).toEqual([
      { kind: 'paragraph', text: 'Interface refinement cycle: the design view becomes customizable.' },
      { kind: 'heading', text: 'Added' },
      {
        kind: 'bullets',
        items: [
          '**Options dialog** (gear in the tool palette) with tabs: design-view animations on/off, 24-hour clock.',
          'Draggable dialogs — every dialog can be moved.',
        ],
      },
    ])
  })

  it('a blank line after a list starts a new paragraph, not a continuation', () => {
    expect(changelogBlocks('- one\n\nFollow-up paragraph.')).toEqual([
      { kind: 'bullets', items: ['one'] },
      { kind: 'paragraph', text: 'Follow-up paragraph.' },
    ])
  })

  it('two adjacent bullet lines stay one list even without a blank line', () => {
    expect(changelogBlocks('- one\n- two')).toEqual([{ kind: 'bullets', items: ['one', 'two'] }])
  })

  it('keeps inline markdown markers intact for the renderer', () => {
    const [only] = changelogBlocks('See `#c=…` links and **bold** lead-ins.')
    expect(only).toEqual({
      kind: 'paragraph',
      text: 'See `#c=…` links and **bold** lead-ins.',
    })
  })
})

describe('unreleased section ("changes coming in next version")', () => {
  const RAW = [
    '# Changelog',
    '',
    '## [Unreleased]',
    '',
    '### Added',
    '',
    '- **Chart URLs** — designs get their own address.',
    '',
    '## [0.6.0] — 2026-09-09',
    '',
    'First stable line.',
  ].join('\n')

  it('surfaces the Unreleased entry only when it has content', () => {
    const entry = unreleasedChangelog(RAW)
    expect(entry?.version).toBe('Unreleased')
    expect(entry?.body).toContain('Chart URLs')
    expect(unreleasedChangelog('# Changelog\n\n## [Unreleased]\n\n## [0.6.0]\n\nbody')).toBeNull()
    expect(unreleasedChangelog('# Changelog\n\n## [0.6.0] — 2026-09-09\n\nbody')).toBeNull()
  })

  it('stays out of the release list the dialog shows below', () => {
    const { current, older } = recentChangelog(RAW, '0.6.0', 5)
    expect(current?.version).toBe('0.6.0')
    expect(older).toHaveLength(0)
  })

  it('its body renders into blocks like any other entry', () => {
    const entry = unreleasedChangelog(RAW)!
    expect(changelogBlocks(entry.body)).toEqual([
      { kind: 'heading', text: 'Added' },
      { kind: 'bullets', items: ['**Chart URLs** — designs get their own address.'] },
    ])
  })
})

describe('version history dialog source', () => {
  it('the shipped CHANGELOG.md yields the current entry plus five older, all blockable', () => {
    const { current, older } = recentChangelog(changelogRaw, '0.8.0', 5)
    expect(current?.version).toBe('0.8.0')
    // the dialog shows up to five entries below the current release
    expect(older.length).toBeLessThanOrEqual(5)
    expect(older[0]?.version).toBe('0.7.0')
    // mid-cycle the shipped [Unreleased] has content, on a release build it's
    // empty — either way whatever is there must block-render for the dialog
    const up = unreleasedChangelog(changelogRaw)
    if (up) expect(changelogBlocks(up.body).length).toBeGreaterThan(0)

    for (const entry of [current!, ...older]) {
      const blocks = changelogBlocks(entry.body)
      expect(blocks.length).toBeGreaterThan(0)
      for (const b of blocks) {
        if (b.kind === 'heading') expect(b.text).not.toMatch(/^#/)
        else if (b.kind === 'bullets') expect(b.items.length).toBeGreaterThan(0)
      }
    }

    const bullets = changelogBlocks(current!.body).find((b) => b.kind === 'bullets')
    expect(bullets && 'items' in bullets && bullets.items.join(' ')).toContain('Per-round colourways')
  })

  it('parseChangelog keeps entry bodies free of header lines', () => {
    const entries = parseChangelog(changelogRaw)
    expect(entries[0].version).toBe('Unreleased')
    expect(entries[1].version).toBe('0.8.0')
    for (const e of entries) expect(e.body).not.toMatch(/^## \[/m)
  })
})
