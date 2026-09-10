import '../src/craft'
import { describe, expect, it } from 'vitest'
import { sanitizeDoc } from '@dimcraft/core/model/doc'
import { KNIT_STARTERS, createBlankKnitDoc, createStarter } from '../src/model/starters'
import { rowCountIssues } from '../src/geometry/rows'

describe('knit starters', () => {
  it('come in increasing difficulty and all sanitize cleanly', () => {
    expect(KNIT_STARTERS.length).toBeGreaterThanOrEqual(3)
    for (const s of KNIT_STARTERS) {
      const doc = createStarter(s.id)
      expect(doc.title).toBeTruthy()
      expect(sanitizeDoc(doc)).not.toBeNull()
    }
  })

  it('every starter passes the stitch-count accounting check', () => {
    for (const s of KNIT_STARTERS) {
      expect(rowCountIssues(createStarter(s.id)), s.name).toEqual([])
    }
  })

  it('the rib starter alternates knit and purl columns', () => {
    const doc = createStarter('rib')
    const bottom = doc.placements.filter((p) => p.y === Math.max(...doc.placements.map((q) => q.y)))
    expect(bottom).toHaveLength(12)
    expect(bottom[0].symbolId).toBe('k')
    expect(bottom[2].symbolId).toBe('p')
    expect(bottom[4].symbolId).toBe('k')
  })

  it('the default new chart is a small blank stockinette grid', () => {
    const doc = createBlankKnitDoc()
    expect(doc.title).toBe('Untitled chart')
    expect(doc.placements.every((p) => p.symbolId === 'k')).toBe(true)
  })
})
