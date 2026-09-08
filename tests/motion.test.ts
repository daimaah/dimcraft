import { describe, expect, it } from 'vitest'
import { STITCH_MOTIONS, motionFor } from '../src/motion/stitches'
import { applyStep, baseScene, simulate } from '../src/motion/engine'
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
