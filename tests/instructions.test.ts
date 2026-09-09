import { describe, expect, it } from 'vitest'
import { checkRoundGrowth, followSteps, generateInstructions, groupRounds } from '../src/geometry/instructions'
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
    expect(text).toContain('R1: [3 dc, ch 2] × 4 (20 sts)')
    expect(text).toContain('Fasten off.')
  })

  it('reads a single even round as one run', () => {
    const doc = createEmptyDoc('Doily')
    doc.guides.push(circle(100))
    doc.placements.push(...ring('dc', 12, 100))
    const text = generateInstructions(doc)
    expect(text).toContain('Doily')
    expect(text).toContain('R1: 12 dc (12 sts)')
  })

  it('orders concentric rounds from inner to outer', () => {
    const doc = createEmptyDoc()
    doc.guides.push(circle(100))
    doc.placements.push(...ring('dc', 16, 110))
    doc.placements.push(...ring('sc', 8, 55))
    const text = generateInstructions(doc)
    const r1 = text.indexOf('R1: 8 sc (8 sts)')
    const r2 = text.indexOf('R2: 16 dc (16 sts)')
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
    expect(text).toContain('R1: 1 dc, ch 1, 2 dc, ch 1 (5 sts)')
  })

  it('honours label overrides in the instructions', () => {
    const doc = createEmptyDoc()
    doc.guides.push(circle(100))
    doc.placements.push(...ring('dc', 12, 100))
    doc.labelOverrides['dc'] = 'UK double crochet'
    expect(generateInstructions(doc)).toContain('R1: 12 UK double crochet (12 sts)')
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

describe('follow steps', () => {
  it('splits the starter into a magic-ring step and one round step with highlight ids', () => {
    const doc = createStarterDoc()
    const steps = followSteps(doc)
    expect(steps).toHaveLength(2)
    expect(steps[0].label).toBe('Start')
    expect(steps[0].text).toBe('Start with a magic ring.')
    expect(steps[0].ids).toHaveLength(1)
    expect(steps[1].label).toBe('R1')
    expect(steps[1].text).toBe('R1: [3 dc, ch 2] × 4 (20 sts)')
    expect(steps[1].ids).toHaveLength(20)
  })

  it('emits one step per detected round for concentric charts', () => {
    const doc = createEmptyDoc()
    doc.guides.push(circle(100))
    doc.placements.push(...ring('sc', 8, 55))
    doc.placements.push(...ring('dc', 16, 110))
    const steps = followSteps(doc)
    expect(steps.map((s) => s.text)).toEqual(['R1: 8 sc (8 sts)', 'R2: 16 dc (16 sts)'])
    expect(steps[0].ids).toHaveLength(8)
    expect(steps[1].ids).toHaveLength(16)
  })

  it('keeps written instructions and follow steps in sync', () => {
    const doc = createStarterDoc()
    const steps = followSteps(doc)
    const text = generateInstructions(doc)
    for (const s of steps) expect(text).toContain(s.text)
  })
})

describe('working order', () => {
  /** angle of a placement id, in degrees */
  const angleOf = (stitches: Placement[], id: string) => {
    const p = stitches.find((s) => s.id === id)!
    return (Math.atan2(p.y, p.x) * 180) / Math.PI
  }

  /** signed angular step from → to, folded into (-180, 180] */
  const signedStep = (from: number, to: number) => {
    const d = (((to - from) % 360) + 540) % 360 - 180
    return d
  }

  it('orders each round counterclockwise for the right-handed default', () => {
    const doc = createEmptyDoc()
    doc.guides.push(circle(100))
    const stitches = ring('dc', 6, 100)
    doc.placements.push(...stitches)
    const steps = followSteps(doc)
    expect(steps).toHaveLength(1)
    const { ids, order } = steps[0]
    expect([...order].sort()).toEqual([...ids].sort())
    // descending atan2 angle = counterclockwise on screen (SVG y is down)
    for (let i = 0; i < order.length; i++) {
      const from = angleOf(stitches, order[i])
      const to = angleOf(stitches, order[(i + 1) % order.length])
      expect(signedStep(from, to)).toBeCloseTo(-60)
    }
  })

  it('mirrors to clockwise for left-handed charts', () => {
    const doc = createEmptyDoc()
    doc.guides.push(circle(100))
    const stitches = ring('dc', 6, 100)
    doc.placements.push(...stitches)
    const order = followSteps(doc, 18, 'cw')[0].order
    for (let i = 0; i < order.length; i++) {
      const from = angleOf(stitches, order[i])
      const to = angleOf(stitches, order[(i + 1) % order.length])
      expect(signedStep(from, to)).toBeCloseTo(60)
    }
  })

  it('does not turn between joined rounds — every round keeps the same direction', () => {
    const doc = createEmptyDoc()
    doc.guides.push(circle(100))
    const inner = ring('sc', 8, 55)
    const outer = ring('dc', 16, 110)
    doc.placements.push(...inner, ...outer)
    const [r1, r2] = followSteps(doc)
    expect(r1.order).toHaveLength(8)
    expect(r2.order).toHaveLength(16)
    // negative signed step = counterclockwise, for both rounds
    expect(signedStep(angleOf(inner, r1.order[0]), angleOf(inner, r1.order[1]))).toBeLessThan(0)
    expect(signedStep(angleOf(outer, r2.order[0]), angleOf(outer, r2.order[1]))).toBeLessThan(0)
  })
})

describe('stitch-count check (flat-circle growth)', () => {
  it('an even sc circle (6, 12, 18, 24) passes', () => {
    const doc = createEmptyDoc()
    doc.guides.push(circle(30), circle(50), circle(70), circle(90))
    doc.placements.push(
      ...ring('sc', 6, 30),
      ...ring('sc', 12, 50),
      ...ring('sc', 18, 70),
      ...ring('sc', 24, 90),
    )
    const { counts, issues } = checkRoundGrowth(doc)
    expect(counts).toEqual([6, 12, 18, 24])
    expect(issues).toEqual([])
    expect(generateInstructions(doc)).not.toContain('Stitch-count check')
  })

  it('flags the round that breaks the constant growth', () => {
    const doc = createEmptyDoc()
    doc.guides.push(circle(30), circle(50), circle(70), circle(90))
    doc.placements.push(
      ...ring('sc', 6, 30),
      ...ring('sc', 12, 50),
      ...ring('sc', 18, 70),
      ...ring('sc', 25, 90), // +7 instead of +6
    )
    const { issues } = checkRoundGrowth(doc)
    expect(issues).toEqual([{ label: 'R4', actual: 25, expected: 24, growth: 6 }])
    const text = generateInstructions(doc)
    expect(text).toContain('Stitch-count check')
    expect(text).toContain('R4 has 25 stitches')
  })

  it('a decrease round ends the run — no false warning', () => {
    const doc = createEmptyDoc()
    doc.guides.push(circle(30), circle(50), circle(70))
    doc.placements.push(
      ...ring('sc', 6, 30),
      ...ring('sc', 12, 50),
      ...ring('sc', 10, 70), // wrong even without decreases...
      ...ring('dc2tog', 5, 90),
    )
    // ...but the decrease in R4 is only checked from R1's run: R2→R3 delta
    // already differs, so R3 is flagged; R4's decrease round ends the run
    const { issues } = checkRoundGrowth(doc)
    expect(issues).toEqual([{ label: 'R3', actual: 10, expected: 18, growth: 6 }])
  })

  it('a change of stitch ends the run — no false warning', () => {
    const doc = createEmptyDoc()
    doc.guides.push(circle(30), circle(50), circle(70))
    doc.placements.push(...ring('sc', 6, 30), ...ring('sc', 12, 50), ...ring('dc', 15, 70))
    const { issues } = checkRoundGrowth(doc)
    expect(issues).toEqual([])
  })

  it('two rounds of one stitch are too few to judge', () => {
    const doc = createEmptyDoc()
    doc.guides.push(circle(30), circle(50))
    doc.placements.push(...ring('sc', 6, 30), ...ring('sc', 20, 50))
    expect(checkRoundGrowth(doc).issues).toEqual([])
  })

  it('granny-square growth (constant delta including chains) passes', () => {
    // blocks of [3 dc, ch 2] per side: rounds add one block per side,
    // so the total delta (stitches + chains) stays constant
    const doc = createEmptyDoc()
    doc.guides.push(circle(40), circle(70), circle(100))
    doc.placements.push(
      ...ring('dc', 12, 40),
      ...ring('ch', 4, 40),
      ...ring('dc', 24, 70),
      ...ring('ch', 4, 70),
      ...ring('dc', 36, 100),
      ...ring('ch', 4, 100),
    )
    const { issues } = checkRoundGrowth(doc)
    expect(issues).toEqual([])
  })
})
