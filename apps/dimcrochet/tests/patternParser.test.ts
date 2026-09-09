import { describe, expect, it } from 'vitest'
import { generateInstructions } from '../src/geometry/instructions'
import { parsePattern } from '../src/geometry/patternParser'
import { patternToChart } from '../src/geometry/patternToChart'
import { createStarterDoc } from '../src/model/starter'

describe('pattern parser', () => {
  it('parses the canonical starter instructions back into rounds', () => {
    const text = generateInstructions(createStarterDoc())
    const parsed = parsePattern(text)
    expect(parsed.start).toBe('magic-ring')
    expect(parsed.rounds).toHaveLength(1)
    expect(parsed.rounds[0].total).toBe(20)
    expect(parsed.rounds[0].runs.map((r) => [r.symbolId, r.count])).toEqual([
      ['dc', 3],
      ['ch', 2],
      ['dc', 3],
      ['ch', 2],
      ['dc', 3],
      ['ch', 2],
      ['dc', 3],
      ['ch', 2],
    ])
  })

  it('expands bracket repeats with ×N', () => {
    const parsed = parsePattern('R1: [sc, ch 1] × 6')
    expect(parsed.rounds[0].total).toBe(12)
    // alternating runs of one stitch each — faithful to the written unit
    const symbols = parsed.rounds[0].runs.flatMap((r) => Array.from({ length: r.count }, () => r.symbolId))
    expect(symbols).toEqual(Array.from({ length: 12 }, (_, i) => (i % 2 === 0 ? 'sc' : 'ch')))
  })

  it('supports "(…) N times" repeats', () => {
    const parsed = parsePattern('Round 1: (sc, ch 2) 6 times')
    expect(parsed.rounds[0].total).toBe(18)
  })

  it('parses UK terminology via the preset (UK dc = US sc)', () => {
    const parsed = parsePattern('R1: 12 dc', { terminology: 'uk' })
    expect(parsed.rounds[0].runs).toEqual([{ symbolId: 'sc', count: 12 }])
  })

  it('parses Nordic abbreviations', () => {
    const sv = parsePattern('Varv 1: lm, 3 fm, 2 st', { terminology: 'sv' })
    expect(sv.rounds[0].runs).toEqual([
      { symbolId: 'ch', count: 1 },
      { symbolId: 'sc', count: 3 },
      { symbolId: 'dc', count: 2 },
    ])
    const fi = parsePattern('R1: kj, 3 ks, 2 s', { terminology: 'fi' })
    expect(fi.rounds[0].runs).toEqual([
      { symbolId: 'ch', count: 1 },
      { symbolId: 'sc', count: 3 },
      { symbolId: 'dc', count: 2 },
    ])
  })

  it('splits multiple rounds and sums totals', () => {
    const parsed = parsePattern('R1: 8 sc\nR2: 16 dc\nR3: [3 dc, ch 2] × 4')
    expect(parsed.rounds).toHaveLength(3)
    expect(parsed.rounds.map((r) => r.total)).toEqual([8, 16, 20])
  })

  it('collects unknown abbreviations as warnings', () => {
    const parsed = parsePattern('R1: 3 weirdthing, 2 dc')
    expect(parsed.warnings).toContain('weirdthing')
    expect(parsed.rounds[0].total).toBe(2)
  })

  it('detects magic-ring and chain-ring starts', () => {
    expect(parsePattern('Start with a magic ring.\nR1: 12 dc').start).toBe('magic-ring')
    expect(parsePattern('Ch 4, join with sl st to form a ring.\nR1: 12 dc').start).toBe('chain-ring')
    expect(parsePattern('R1: 12 dc').start).toBeNull()
  })

  it('accepts a CrochetPARADE-style pattern with DEFs, colors and anchors', () => {
    const parade = [
      '#Granny square showcase',
      'DEF: p=3ch,ss@1[%,%-4] # Picot stitch',
      'COLOR: Pink',
      '6ch.Ring+1!,ss@[%,0]',
      '[ch,15sc].Ring1[]@Ring,ss@[%,0],COLOR: Violet,sc@Ring1[][0]',
      '$c=0$,@Ring1[][0],[5ch.chain_space[0,c++]+!,sk,>,sc]*8,ss@[-1,-1]',
      '$t=0,c=0$,ch,[sc,hdc,dc,p,tr.Tip[t++],dc,p,hdc,>,sc]@chain_space[0,c++]*8,ss@[%,0]',
      'COLOR: Green',
      '$t=0,c=0$,dc4bobble_start_new@Tip[t],[dc4bobble@Tip[t],<,2ch.chsp[c++]+!,tr4bobble@Tip[t],2ch.chsp[c++]+!,dc4bobble@Tip[t],4ch.chsp[c++]+!,hdc@Tip[++t],4ch.chsp[c++]+!,$t++$]*4,sc@[%,3]',
      'COLOR: Pink',
      '$c=0$,3ch,[3tr@chsp[c++],3ch,3tr@chsp[c++],ch,>,(4dc@chsp[c++],ch)*2]*4,4dc@chsp[c++],ch,3dc@chsp[c++],ss@[%,1]',
      'COLOR: Green',
      'ch,2sk,5sc,[sc,dc@[@],sc@[@],13sc,>,6sc]*4,ss@[%,0]',
      'DOT: start=1',
    ].join('\n')

    const parsed = parsePattern(parade)
    expect(parsed.notes?.some((n) => n.includes('Pink, Violet'))).toBe(true)
    expect(parsed.rounds).toHaveLength(7)
    // round 1: 6 chains + slip stitch
    expect(parsed.rounds[0].total).toBe(7)
    // picot DEF mapped to the picot symbol (petal round: 2 picots × 8)
    const petal = parsed.rounds.find((r) => r.runs.some((run) => run.symbolId === 'picot'))
    expect(petal).toBeDefined()
    const picots = petal!.runs.filter((run) => run.symbolId === 'picot').reduce((s, r) => s + r.count, 0)
    expect(picots).toBe(16)
    // bobble DEFs mapped to bobble
    const bobbles = parsed.rounds.flatMap((r) => r.runs).filter((r) => r.symbolId === 'bobble')
    expect(bobbles.reduce((s, r) => s + r.count, 0)).toBeGreaterThanOrEqual(9)
  })

  it('charts a CrochetPARADE pattern into a round layout', () => {
    const parade = [
      '6ch.Ring+1!,ss@[%,0]',
      '[ch,15sc].Ring1[]@Ring,ss@[%,0]',
      '[5ch.chain_space[0,c++]+!,sk,>,sc]*8,ss@[-1,-1]',
    ].join('\n')
    const parsed = parsePattern(parade)
    const { doc } = patternToChart(parsed, { title: 'Parade flower' })
    expect(doc.placements.length).toBeGreaterThan(20)
    expect(doc.guides.length).toBe(parsed.rounds.length)
  })
})

describe('pattern → chart layout', () => {
  it('places every stitch, one circle guide per round, radii increasing', () => {
    const parsed = parsePattern('R1: 12 dc\nR2: 24 dc')
    const { doc } = patternToChart(parsed, { title: 'Test doily' })
    expect(doc.placements).toHaveLength(36)
    expect(doc.guides).toHaveLength(2)
    const radii = doc.guides.map((g) => (g.kind === 'circle' ? g.r : 0))
    expect([...radii].sort((a, b) => a - b)).toEqual(radii)
    // all stitches tagged per round
    expect(doc.placements.filter((p) => p.guideTag === 'imported-round-1')).toHaveLength(12)
    expect(doc.placements.filter((p) => p.guideTag === 'imported-round-2')).toHaveLength(24)
  })

  it('draws a magic ring and matches stitch rotation to the radial direction', () => {
    const parsed = parsePattern('Start with a magic ring.\nR1: 6 dc')
    const { doc } = patternToChart(parsed, {})
    expect(doc.placements[0].symbolId).toBe('magicring')
    // 6 stitches starting at -90°: first right-side stitch sits at -30°, rotated 60°
    const right = doc.placements.slice(1).reduce((a, b) => (b.x > a.x ? b : a))
    expect(right.rotation).toBeCloseTo(60, 0)
  })

  it('applies terminology overrides so the legend matches the pasted language', () => {
    const parsed = parsePattern('R1: 12 dc', { terminology: 'uk' })
    const { doc } = patternToChart(parsed, { terminology: 'uk' })
    expect(doc.labelOverrides['sc']).toBe('dc')
    expect(doc.labelOverrides['dc']).toBe('tr')
  })

  it('round-trips: instructions → chart → same instructions', () => {
    const original = createStarterDoc()
    const text1 = generateInstructions(original)
    const parsed = parsePattern(text1)
    const chart = patternToChart(parsed, { title: 'Round trip' }).doc
    const text2 = generateInstructions(chart)
    const line1 = text1.split('\n').find((l) => l.startsWith('R1'))
    const line2 = text2.split('\n').find((l) => l.startsWith('R1'))
    expect(line2).toBe(line1)
  })
})

describe('asterisk repeats', () => {
  it('expands "*…*; repeat from * N more times" to N+1 passes', () => {
    const parsed = parsePattern('R3: *2 dc, ch 1*; repeat from * 3 more times')
    expect(parsed.warnings).not.toContain('asterisk-repeat')
    expect(parsed.rounds[0].repeat).toEqual({ runs: [{ symbolId: 'dc', count: 2 }, { symbolId: 'ch', count: 1 }], times: 4 })
    expect(parsed.rounds[0].total).toBe(12)
  })

  it('reads "repeat from * N times" as N+1 passes and says so', () => {
    const parsed = parsePattern('R2: *5 sc*; repeat from * 3 times')
    expect(parsed.rounds[0].total).toBe(20)
    expect(parsed.notes?.join(' ')).toContain('N+1 passes')
  })

  it('supports "*…* N times" and "once/twice" multipliers', () => {
    expect(parsePattern('R1: *3 tr* 4 times').rounds[0].total).toBe(12)
    expect(parsePattern('R1: *sc, ch 2* twice').rounds[0].total).toBe(6)
  })

  it('warns when the repeat runs to the end without a count', () => {
    const parsed = parsePattern('R2: *sc, ch 1*; repeat from * to end')
    expect(parsed.warnings).toContain('asterisk-repeat-to-end')
    expect(parsed.rounds[0].total).toBe(2)
  })

  it('mixes asterisk units with a lead-in ("Ch 1, *2 dc…*")', () => {
    const parsed = parsePattern('R1: ch 1, *2 dc*; repeat from * 5 more times')
    expect(parsed.rounds[0].runs[0]).toEqual({ symbolId: 'ch', count: 1 })
    expect(parsed.rounds[0].total).toBe(1 + 2 * 6)
  })
})

describe('increases and decreases', () => {
  it('parses tog abbreviations into decrease symbols (dc2tog used to mis-parse)', () => {
    const parsed = parsePattern('R1: dc2tog, sc2tog, hdc2tog')
    expect(parsed.warnings).toEqual([])
    expect(parsed.rounds[0].runs.map((r) => r.symbolId)).toEqual(['dc2tog', 'sc2tog', 'hdc2tog'])
  })

  it('understands "2 sc together" and full-name forms', () => {
    expect(parsePattern('R1: 2 sc together').rounds[0].runs).toEqual([{ symbolId: 'sc2tog', count: 1 }])
    expect(parsePattern('R1: single crochet 2 together').rounds[0].runs).toEqual([{ symbolId: 'sc2tog', count: 1 }])
    expect(parsePattern('R1: half double crochet 2 together').rounds[0].runs).toEqual([{ symbolId: 'hdc2tog', count: 1 }])
  })

  it('maps amigurumi "dec" to sc2tog and "inc" to 2 sc', () => {
    expect(parsePattern('R1: dec, inc').rounds[0].runs).toEqual([
      { symbolId: 'sc2tog', count: 1 },
      { symbolId: 'sc', count: 2 },
    ])
  })

  it('expands "2 sc in each st" against the previous round', () => {
    const parsed = parsePattern('R1: 12 sc\nR2: 2 sc in each st')
    expect(parsed.rounds[1].total).toBe(24)
    expect(parsed.notes?.join(' ')).toContain('12')
  })

  it('expands "inc in each st" to double the previous round', () => {
    const parsed = parsePattern('R1: 6 sc\nR2: inc in each st')
    expect(parsed.rounds[1].total).toBe(12)
  })

  it('warns when an in-each round has no base to expand from', () => {
    const parsed = parsePattern('R1: 2 sc in each st')
    expect(parsed.warnings).toContain('increase-base-unknown')
  })

  it('charts an increase round with pairs side by side, and decreases place normally', () => {
    const parsed = parsePattern('Start with a magic ring.\nR1: 6 sc\nR2: [2 sc, sc2tog] × 2')
    const { doc } = patternToChart(parsed, {})
    const r2 = doc.placements.filter((p) => p.guideTag === 'imported-round-2')
    // 2 sc + sc2tog per unit × 2: the pair shares one base angle, so both
    // carry the same radial rotation
    expect(r2).toHaveLength(6)
    const sc2 = r2.filter((p) => p.symbolId === 'sc')
    expect(sc2).toHaveLength(4)
    expect(Math.abs(sc2[0].rotation - sc2[1].rotation)).toBeLessThan(0.01)
    expect(r2.filter((p) => p.symbolId === 'sc2tog')).toHaveLength(2)
  })
})
