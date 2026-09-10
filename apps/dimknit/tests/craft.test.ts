import { describe, expect, it } from 'vitest'
import { getCraft } from '@dimcraft/core/craft'
import { createStarter } from '../src/model/starters'
import '../src/craft'

describe('knit craft module', () => {
  it('registers itself as the active craft', () => {
    expect(getCraft().craft).toBe('knit')
    expect(getCraft().defaultSymbolId).toBe('k')
  })

  it('ships the CYC-style palette with the duality cells and texture stitches', () => {
    const ids = getCraft().baseSymbols.map((d) => d.id)
    expect(ids).toEqual(['k', 'p', 'yo', 'k2tog', 'ssk', 's2kp2', 'ns', 'c4b', 'c4f', 'rt', 'lt', 'm1r', 'm1l'])
  })

  it('offers the DROPS-style bundled set with the full-cell glyphs', () => {
    const drops = getCraft().builtinSets.find((s) => s.id === 'drops')
    expect(drops).toBeDefined()
    expect(Object.keys(drops!.artwork).sort()).toEqual(['k2tog', 'p', 's2kp2', 'ssk', 'yo'])
    // the crossed purl outgrows the standard dot's bbox, so it carries its own
    const p = drops!.artwork.p as { content: string; bbox: { w: number } }
    expect(p.bbox.w).toBeGreaterThan(6)
  })

  it('produces follow steps through the craft module interface', () => {
    const doc = createStarter('rib')
    const steps = getCraft().followSteps(doc, 20, 'ccw')
    expect(steps.length).toBe(8)
    expect(steps[0].text).toMatch(/^Row 1 \(RS\):/)
  })
})
