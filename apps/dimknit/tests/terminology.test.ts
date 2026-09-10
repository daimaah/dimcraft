import '../src/craft' // register the knit craft before anything touches the registry
import { describe, expect, it } from 'vitest'
import { getCraft } from '@dimcraft/core/craft'
import { createEmptyDoc, uid } from '@dimcraft/core/model/doc'
import { TERMINOLOGY_PRESETS, applyTerminologyToDoc } from '../src/symbols/terminology'
import { writtenInstructions } from '../src/geometry/rows'

describe('Finnish terminology preset', () => {
  it('ships the Drops-Finnish abbreviations for the stitch ladder', () => {
    const fi = TERMINOLOGY_PRESETS.find((p) => p.id === 'fi')
    expect(fi?.labels).toMatchObject({ k: 'os', p: 'ns', yo: 'ly', k2tog: '2 oik. yht.' })
  })

  it('applies the Finnish labels as legend overrides', () => {
    const doc = createEmptyDoc('fi test')
    doc.placements = [
      { id: uid(), symbolId: 'k', x: 0, y: 0, rotation: 0, scale: 1, flip: false },
    ]
    applyTerminologyToDoc(doc, 'fi')
    expect(doc.labelOverrides).toMatchObject({ k: 'os', p: 'ns', yo: 'ly' })
    expect(getCraft().followSteps).toBeDefined()
  })

  it('the universal preset clears overrides back to the international forms', () => {
    const doc = createEmptyDoc('universal test')
    doc.labelOverrides = { k: 'os' }
    applyTerminologyToDoc(doc, 'universal')
    expect(doc.labelOverrides).toEqual({})
  })

  it('written instructions read Finnish, two-sided per the Drops definitions', () => {
    const doc = createEmptyDoc('fi rows')
    // RS row: k2, k2tog, yo, k1; WS row: p1, yo, p3
    doc.placements = [
      { id: 'a', symbolId: 'k', x: 0, y: 0, rotation: 0, scale: 1, flip: false },
      { id: 'b', symbolId: 'k', x: 24, y: 0, rotation: 0, scale: 1, flip: false },
      { id: 'c', symbolId: 'k2tog', x: 48, y: 0, rotation: 0, scale: 1, flip: false },
      { id: 'd', symbolId: 'yo', x: 72, y: 0, rotation: 0, scale: 1, flip: false },
      { id: 'e', symbolId: 'k', x: 96, y: 0, rotation: 0, scale: 1, flip: false },
      { id: 'f', symbolId: 'p', x: 0, y: -24, rotation: 0, scale: 1, flip: false },
      { id: 'g', symbolId: 'yo', x: 24, y: -24, rotation: 0, scale: 1, flip: false },
      { id: 'h', symbolId: 'p', x: 48, y: -24, rotation: 0, scale: 1, flip: false },
      { id: 'i', symbolId: 'p', x: 72, y: -24, rotation: 0, scale: 1, flip: false },
      { id: 'j', symbolId: 'p', x: 96, y: -24, rotation: 0, scale: 1, flip: false },
    ]
    applyTerminologyToDoc(doc, 'fi')
    const rows = writtenInstructions(doc)
    // RS rows read right-to-left; WS rows left-to-right, both in Finnish
    // the WS row works the reverses: the k cells read "ns", the p cells "os"
    expect(rows[0]).toBe('Row 1 (RS): os, ly, 2 oik. yht., os ×2')
    expect(rows[1]).toBe('Row 2 (WS): os, ly, os ×3')
  })
})