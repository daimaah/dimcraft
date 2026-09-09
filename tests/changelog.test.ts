import { describe, expect, it } from 'vitest'
import changelogRaw from '../CHANGELOG.md?raw'
import { changelogBlocks, parseChangelog, recentChangelog } from '../src/export/changelog'

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

describe('version history dialog source', () => {
  it('the shipped CHANGELOG.md yields the current entry plus five older, all blockable', () => {
    const { current, older } = recentChangelog(changelogRaw, '0.6.0', 5)
    expect(current?.version).toBe('0.6.0')
    // the file only holds releases so far; the dialog shows up to five
    expect(older.length).toBeLessThanOrEqual(5)
    expect(older[0]?.version).toBe('0.5.0')

    for (const entry of [current!, ...older]) {
      const blocks = changelogBlocks(entry.body)
      expect(blocks.length).toBeGreaterThan(0)
      for (const b of blocks) {
        if (b.kind === 'heading') expect(b.text).not.toMatch(/^#/)
        else if (b.kind === 'bullets') expect(b.items.length).toBeGreaterThan(0)
      }
    }

    const bullets = changelogBlocks(current!.body).find((b) => b.kind === 'bullets')
    expect(bullets && 'items' in bullets && bullets.items.join(' ')).toContain('Options dialog')
  })

  it('parseChangelog keeps entry bodies free of header lines', () => {
    const entries = parseChangelog(changelogRaw)
    expect(entries[0].version).toBe('0.6.0')
    for (const e of entries) expect(e.body).not.toMatch(/^## \[/m)
  })
})
