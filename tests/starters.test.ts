import { describe, expect, it } from 'vitest'
import { STARTERS } from '../src/model/starters'
import { generateInstructions } from '../src/geometry/instructions'
import { sanitizeDoc } from '../src/model/doc'

describe('starter gallery', () => {
  it('offers five starters in increasing difficulty', () => {
    expect(STARTERS).toHaveLength(5)
    const levels = STARTERS.map((s) => s.level)
    expect([...levels].sort((a, b) => a - b)).toEqual(levels)
    expect(new Set(STARTERS.map((s) => s.id)).size).toBe(STARTERS.length)
  })

  it('builds every starter into a valid chart', () => {
    for (const s of STARTERS) {
      const doc = s.build()
      expect(doc.placements.length, s.id).toBeGreaterThan(0)
      // must survive the same sanitize-on-read path as saved projects
      expect(() => sanitizeDoc(doc)).not.toThrow()
    }
  })

  it('chain starter is a gentle arc of 15 chains', () => {
    const chain = STARTERS[0]
    expect(chain.id).toBe('chain')
    const doc = chain.build()
    expect(doc.placements.every((p) => p.symbolId === 'ch')).toBe(true)
    expect(doc.placements).toHaveLength(15)
    expect(generateInstructions(doc)).toContain('ch 15')
  })

  it('single-crochet coaster regenerates 6 sc then 12 sc', () => {
    const doc = STARTERS.find((s) => s.id === 'sc-coaster')!.build()
    const text = generateInstructions(doc)
    expect(text).toContain('Start with a magic ring.')
    expect(text).toContain('R1: 6 sc')
    expect(text).toContain('R2: 12 sc')
  })

  it('double-crochet coaster regenerates 12 dc then 24 dc', () => {
    const doc = STARTERS.find((s) => s.id === 'dc-coaster')!.build()
    const text = generateInstructions(doc)
    expect(text).toContain('R1: 12 dc')
    expect(text).toContain('R2: 24 dc')
  })

  it('granny square keeps the classic repeat', () => {
    const doc = STARTERS.find((s) => s.id === 'granny-square')!.build()
    expect(generateInstructions(doc)).toContain('R1: [3 dc, ch 2] × 4')
  })

  it('granny circle has chain spokes in R1 and a doubled round 2', () => {
    const doc = STARTERS.find((s) => s.id === 'granny-circle')!.build()
    const text = generateInstructions(doc)
    expect(text).toContain('R1: [2 dc, ch 2] × 6')
    expect(text).toContain('R2: 24 dc')
  })
})
