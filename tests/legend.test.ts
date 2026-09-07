import { describe, expect, it } from 'vitest'
import { legendItems } from '../src/geometry/legend'
import { getDefMap } from '../src/symbols/registry'
import { createEmptyDoc, uid } from '../src/model/doc'
import type { ChartDoc, Placement } from '../src/model/types'

const place = (symbolId: string): Placement => ({
  id: uid('p'),
  symbolId,
  x: 0,
  y: 0,
  rotation: 0,
  scale: 1,
  flip: false,
})

describe('legend aggregation', () => {
  it('counts symbols in order of first appearance', () => {
    const doc: ChartDoc = createEmptyDoc()
    doc.placements = [place('dc'), place('ch'), place('dc'), place('dc'), place('tr')]
    const items = legendItems(doc, getDefMap(doc))
    expect(items.map((i) => [i.symbolId, i.count])).toEqual([
      ['dc', 3],
      ['ch', 1],
      ['tr', 1],
    ])
    expect(items[0].label).toBe('dc')
  })

  it('applies per-document label overrides', () => {
    const doc = createEmptyDoc()
    doc.placements = [place('ch')]
    doc.labelOverrides['ch'] = 'chain'
    const items = legendItems(doc, getDefMap(doc))
    expect(items[0].label).toBe('chain')
  })

  it('ignores unknown symbol ids', () => {
    const doc = createEmptyDoc()
    doc.placements = [place('nope'), place('sc')]
    const items = legendItems(doc, getDefMap(doc))
    expect(items).toHaveLength(1)
    expect(items[0].symbolId).toBe('sc')
  })
})
