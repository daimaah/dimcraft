import { describe, expect, it } from 'vitest'
import { generateInstructions, groupRounds } from '../src/geometry/instructions'
import { createStarterDoc } from '../src/model/starter'
import { createEmptyDoc, uid } from '../src/model/doc'
import type { CircleGuide, Placement } from '../src/model/types'

const circle = (r: number, id = 'g1'): CircleGuide => ({ id, kind: 'circle', cx: 0, cy: 0, r, visible: true })

const ring = (symbolId: string, count: number, r: number, startDeg = -90): Placement[] =>
  Array.from({ length: count }, (_, i) => {
    const a = ((startDeg + (i * 360) / count) * Math.PI) / 180
    return {
      id: uid('p'),
      symbolId,
      x: r * Math.cos(a),
      y: r * Math.sin(a),
      rotation: 0,
      scale: 1,
      flip: false,
    }
  })

describe('written instructions', () => {
  it('renders the starter granny square as [3 dc, ch 2] × 4 with a magic-ring start', () => {
    const text = generateInstructions(createStarterDoc())
    expect(text).toContain('Start with a magic ring.')
    expect(text).toContain('R1: [3 dc, ch 2] × 4')
    expect(text).toContain('Fasten off.')
  })

  it('reads a single even round as one run', () => {
    const doc = createEmptyDoc('Doily')
    doc.guides.push(circle(100))
    doc.placements.push(...ring('dc', 12, 100))
    const text = generateInstructions(doc)
    expect(text).toContain('Doily')
    expect(text).toContain('R1: 12 dc')
  })

  it('orders concentric rounds from inner to outer', () => {
    const doc = createEmptyDoc()
    doc.guides.push(circle(100))
    doc.placements.push(...ring('dc', 16, 110))
    doc.placements.push(...ring('sc', 8, 55))
    const text = generateInstructions(doc)
    const r1 = text.indexOf('R1: 8 sc')
    const r2 = text.indexOf('R2: 16 dc')
    expect(r1).toBeGreaterThan(-1)
    expect(r2).toBeGreaterThan(r1)
  })

  it('lists non-repeating rounds without a repeat unit', () => {
    const doc = createEmptyDoc()
    doc.guides.push(circle(100))
    doc.placements.push(...ring('dc', 3, 100))
    doc.placements.push(...ring('ch', 2, 100, 0))
    const text = generateInstructions(doc)
    // sorted by angle: dc (-90), ch (0), dc (30), dc (150), ch (180) — no repeating period
    expect(text).toContain('R1: 1 dc, ch 1, 2 dc, ch 1')
  })

  it('honours label overrides in the instructions', () => {
    const doc = createEmptyDoc()
    doc.guides.push(circle(100))
    doc.placements.push(...ring('dc', 12, 100))
    doc.labelOverrides['dc'] = 'UK double crochet'
    expect(generateInstructions(doc)).toContain('R1: 12 UK double crochet')
  })

  it('excludes hidden placements', () => {
    const doc = createEmptyDoc()
    doc.guides.push(circle(100))
    const vis = ring('dc', 12, 100)
    const hid = ring('sc', 6, 55).map((p) => ({ ...p, visible: false as const }))
    doc.placements.push(...vis, ...hid)
    const { rounds } = groupRounds(doc)
    expect(rounds).toHaveLength(1)
    expect(rounds[0].items).toHaveLength(12)
  })

  it('handles an empty chart gracefully', () => {
    expect(generateInstructions(createEmptyDoc())).toContain('No stitches yet')
  })
})
