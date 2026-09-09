import { describe, expect, it } from 'vitest'
import { STITCH_MOTIONS, motionFor, motionForAny, genericMotion } from '../src/motion/stitches'
import { applyStep, baseScene, ringLayout, slotX, simulate, type Scene } from '../src/motion/engine'
import type { MotionKind, MotionStep, StitchMotion } from '../src/motion/types'

const kinds = (m: StitchMotion): MotionKind[] => m.steps.map((s) => s.kind)
const ladder = (m: StitchMotion): number[] => m.steps.map((s) => s.loopsOnHook)
const byName = (name: string): StitchMotion => {
  const m = motionFor(name)
  if (!m) throw new Error(`motion ${name} missing`)
  return m
}

describe('stitch motion data', () => {
  it('covers the core stitches with well-formed steps', () => {
    expect(STITCH_MOTIONS.map((m) => m.symbolId)).toEqual(
      expect.arrayContaining(['ch', 'slst', 'sc', 'hdc', 'dc', 'tr', 'dc2tog', 'magicring']),
    )
    for (const m of STITCH_MOTIONS) {
      expect(m.steps.length).toBeGreaterThan(0)
      for (const s of m.steps) {
        expect(s.caption.length).toBeGreaterThan(5)
        expect(s.loopsOnHook).toBeGreaterThanOrEqual(0)
        expect(s.loopsOnHook).toBeLessThanOrEqual(5)
        if (s.kind === 'pullThrough') expect(s.through).toBeGreaterThanOrEqual(1)
      }
    }
  })

  it('ends every stitch with one working loop on the hook', () => {
    for (const m of STITCH_MOTIONS) {
      expect(ladder(m).at(-1)).toBe(1)
    }
  })

  it('decomposes double crochet exactly like the standard instructions', () => {
    const dc = byName('dc')
    expect(kinds(dc)).toEqual(['yarnOver', 'insert', 'pullUp', 'yarnOver', 'pullThrough', 'yarnOver', 'pullThrough'])
    expect(dc.steps.filter((s) => s.kind === 'pullThrough').map((s) => s.through)).toEqual([2, 2])
    expect(ladder(dc)).toEqual([2, 2, 3, 4, 2, 3, 1])
  })

  it('starts treble crochet with two yarn overs and works off three sets of two', () => {
    const tr = byName('tr')
    expect(kinds(tr).slice(0, 3)).toEqual(['yarnOver', 'yarnOver', 'insert'])
    expect(ladder(tr)).toEqual([2, 3, 3, 4, 5, 3, 4, 2, 3, 1])
  })

  it('finishes half double crochet through all three loops at once', () => {
    const hdc = byName('hdc')
    const pts = hdc.steps.filter((s) => s.kind === 'pullThrough')
    expect(pts).toHaveLength(1)
    expect(pts[0].through).toBe(3)
    expect(ladder(hdc)).toEqual([2, 2, 3, 4, 1])
  })

  it('works single crochet with no leading yarn over', () => {
    const sc = byName('sc')
    expect(kinds(sc)[0]).toBe('insert')
    expect(kinds(sc)).toEqual(['insert', 'pullUp', 'yarnOver', 'pullThrough'])
  })

  it('decreases across two different stitches', () => {
    const dec = byName('dc2tog')
    const inserts = dec.steps.filter((s) => s.kind === 'insert')
    expect(inserts.map((s) => s.target)).toEqual(['A', 'B'])
    expect(dec.steps.at(-1)).toMatchObject({ kind: 'pullThrough', through: 3 })
  })

  it('builds the magic ring through the ring centre and closes with a chain', () => {
    const mr = byName('magicring')
    expect(mr.steps.some((s) => s.kind === 'ringShow')).toBe(true)
    expect(mr.steps.find((s) => s.kind === 'insert')?.target).toBe('ring')
    expect(mr.steps.some((s) => s.kind === 'chain')).toBe(true)
  })

  it('teaches the chain as repeated yarn over + pull through', () => {
    const ch = byName('ch')
    const body = kinds(ch).slice(1)
    expect(body).toEqual(['yarnOver', 'chain', 'yarnOver', 'chain', 'yarnOver', 'chain', 'hold'])
    expect(ch.steps[0].kind).toBe('slipKnot')
  })
})

describe('family stitches (shells, texture, decreases)', () => {
  const FAMILY_IDS = [
    'picot', 'shell', 'popcorn', 'puff', 'bobble', 'fpdc', 'bpdc', 'crosseddc', 'blo', 'flo',
    'sc2tog', 'sc3tog', 'hdc2tog', 'hdg3tog', 'tr3tog', 'dc5tog', 'st2tog-v1', 'st3tog', 'ring',
    'crochet-picot', 'crochet-popcorn', 'crochet-puff-stitch', 'crochet-raised-double-front',
    'crochet-dc2tog', 'crochet-dc3tog', 'crochet-decrease', 'crochet-increase', 'dc5sh', 'sc2sh',
  ]

  it('resolves every family id to a motion that ends with one working loop', () => {
    for (const id of FAMILY_IDS) {
      const m = motionForAny(id, id)
      expect(m, `no motion for ${id}`).toBeTruthy()
      expect(ladder(m!).at(-1), `${id} must end with 1 loop`).toBe(1)
      expect(m!.approximate, `${id} should be authored, not approximate`).toBeFalsy()
    }
  })

  it('simulates every family motion to the declared end state', () => {
    for (const id of FAMILY_IDS) {
      const s = simulate(motionForAny(id, id)!.steps)
      expect(s.loops, `${id} must end with 1 loop`).toBe(1)
    }
  })

  it('works shells as N stitches into the same stitch', () => {
    const sh = motionForAny('dc5sh', '5-dc shell')!
    expect(sh.approximate).toBeFalsy()
    const inserts = sh.steps.filter((s) => s.kind === 'insert')
    expect(inserts).toHaveLength(5)
    for (const ins of inserts) expect(ins.target).toBe('A')
    expect(ladder(sh).at(-1)).toBe(1)
    const crossed = motionForAny('sc2sh-x', 'crossed 2-sc shell')!
    expect(crossed.approximate).toBe(true)
  })

  it('joins multi-stitch decreases across targets A, B and C', () => {
    const dec = motionForAny('tr3tog', '3 tr together')!
    const inserts = dec.steps.filter((s) => s.kind === 'insert')
    expect(inserts.map((s) => s.target)).toEqual(['A', 'B', 'C'])
    expect(ladder(dec).at(-1)).toBe(1)
    // the standard hdc2tog closes through all five loops
    const hdc2 = motionForAny('hdc2tog', 'hdc2tog')!
    expect(hdc2.steps.at(-1)?.through).toBe(5)
  })

  it('gives post stitches and loop variants their own insertion captions', () => {
    const fpdc = motionForAny('fpdc', 'FPdc')!
    expect(fpdc.steps.find((s) => s.kind === 'insert')?.caption).toMatch(/front to BACK/)
    const bpdc = motionForAny('bpdc', 'BPdc')!
    expect(bpdc.steps.find((s) => s.kind === 'insert')?.caption).toMatch(/BACK to FRONT/)
    const blo = motionForAny('blo', 'blo')!
    expect(blo.steps.find((s) => s.kind === 'insert')?.caption).toMatch(/BACK loop/)
  })
})

describe('generic fallback motion', () => {
  it('approximates by stitch height from the id', () => {
    const dc = genericMotion('some-dc-thing', 'thing')
    expect(dc.approximate).toBe(true)
    // dc formula: one yarn over, pull up, then two pull-through-2 rounds
    expect(kinds(dc).slice(1, 4)).toEqual(['yarnOver', 'insert', 'pullUp'])
    expect(dc.steps.filter((s) => s.kind === 'pullThrough').map((s) => s.through)).toEqual([2, 2])
    const tr = genericMotion('fancy-tr', 'fancy')
    expect(tr.steps.filter((s) => s.kind === 'yarnOver')).toHaveLength(5) // 2 leading wraps + 3 closing
    const dtr = genericMotion('dtr', 'dtr')
    expect(dtr.steps.filter((s) => s.kind === 'pullThrough')).toHaveLength(4)
    const hdc = genericMotion('half-something', 'half')
    expect(hdc.steps.at(-1)).toMatchObject({ kind: 'pullThrough', through: 3 })
  })

  it('covers any palette symbol, ending with one loop', () => {
    for (const id of ['crochet-basic-tunisian-stitch', 'crochet-broomstick', 'start', 'end', 'weird-id']) {
      const m = motionForAny(id, id)!
      expect(m.approximate).toBe(true)
      expect(simulate(m.steps).loops).toBe(1)
    }
  })

  it('prefers authored motions over the fallback', () => {
    expect(motionForAny('dc', 'dc')!.approximate).toBeFalsy()
    expect(motionForAny('magicring', 'magic ring')!.steps[0].kind).toBe('ringShow')
  })
})

describe('motion choreography', () => {
  it('reaches the declared end state for every stitch', () => {
    for (const m of STITCH_MOTIONS) {
      const s = simulate(m.steps)
      expect(s.loops).toBe(1)
      if (m.symbolId === 'ch') expect(s.chains).toBe(3)
      if (m.symbolId === 'magicring') expect(s.ring).toBe(1)
    }
  })

  it('animates every step at intermediate progress without leaving the scene', () => {
    for (const m of STITCH_MOTIONS) {
      for (const step of m.steps as MotionStep[]) {
        for (const t of [0, 0.25, 0.5, 0.75, 1]) {
          const s = baseScene()
          expect(() => applyStep(step, t, s)).not.toThrow()
          expect(Number.isFinite(s.hook.x)).toBe(true)
          expect(Number.isFinite(s.yarnMid.x)).toBe(true)
        }
      }
    }
  })
})

describe('loop slot layout', () => {
  it('fits up to 8 loops along the shaft, tip-most first, without piling at the tip', () => {
    for (let n = 1; n <= 8; n++) {
      const xs = Array.from({ length: n }, (_, i) => slotX(i, n))
      for (let i = 1; i < n; i++) expect(xs[i]).toBeGreaterThan(xs[i - 1])
      expect(xs[n - 1]).toBeLessThanOrEqual(52)
    }
    expect(slotX(0, 1)).toBe(16)
  })

  it('keeps the authored spacing for counts up to four', () => {
    expect([0, 1, 2, 3].map((i) => slotX(i, 4))).toEqual([16, 28, 40, 50])
    expect([0, 1, 2].map((i) => slotX(i, 3))).toEqual([16, 28, 40])
  })

  it('moves loops continuously across every step boundary (no teleports)', () => {
    const motions: StitchMotion[] = [
      ...STITCH_MOTIONS,
      motionForAny('puff', 'puff')!,
      motionForAny('bobble', 'bo')!,
      motionForAny('tr3tog', '3 tr together')!,
      genericMotion('some-trtr-thing', 'thing'), // 6-loop fallback
    ]
    const cumulative = (steps: MotionStep[], upto: number): Scene => {
      const s = baseScene()
      s.loops = steps[0]?.kind === 'ringShow' ? 0 : 1
      for (let k = 0; k < upto; k++) {
        s.loops = steps[k].loopsOnHook
        if (steps[k].kind === 'chain') s.chains++
        if (steps[k].kind === 'ringShow') s.ring = 1
        if (steps[k].kind === 'slipKnot') s.knot = 0.22
      }
      return s
    }
    for (const m of motions) {
      for (let i = 0; i < m.steps.length - 1; i++) {
        const a = cumulative(m.steps, i)
        applyStep(m.steps[i], 1, a)
        const b = cumulative(m.steps, i + 1)
        applyStep(m.steps[i + 1], 0, b)
        const xsOf = (s: Scene): number[] => {
          const xs = ringLayout(s).filter((r) => r.opacity > 0.05).map((r) => r.x)
          // a pull-up that has landed contributes the front ring of the next count
          if (s.forming && s.forming.k >= 1) xs.push(slotX(0, s.loops + 1))
          return xs.sort((p, q) => p - q)
        }
        expect(xsOf(a), `${m.symbolId} boundary ${i}: ${m.steps[i].kind} -> ${m.steps[i + 1].kind}`).toEqual(xsOf(b))
      }
    }
  })

  it('leaves pull-through with the declared loop count even when it must keep one loop', () => {
    // slip stitch draws through "the stitch and the loop" yet exactly one
    // ring survives — the wrap glides to the tip-most slot
    const slst = byName('slst')
    const pt = slst.steps.findIndex((s) => s.kind === 'pullThrough')
    const s = baseScene()
    for (let k = 0; k < pt; k++) s.loops = slst.steps[k].loopsOnHook
    applyStep(slst.steps[pt], 1, s)
    const visible = ringLayout(s).filter((r) => r.opacity > 0.05)
    expect(visible).toHaveLength(1)
    expect(visible[0].x).toBe(slotX(0, 1))
  })
})
