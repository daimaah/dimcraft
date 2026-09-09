import { describe, expect, it } from 'vitest'
import { legendItems } from '@dimcraft/core/geometry/legend'
import { getDefMap } from '../src/symbols/registry'
import { createEmptyDoc, uid } from '@dimcraft/core/model/doc'
import type { ChartDoc, Placement } from '@dimcraft/core/model/types'

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

  it('appends a backstitch entry when line-work exists', () => {
    const doc = createEmptyDoc()
    doc.placements = [place('sc')]
    doc.lines = [
      { id: 'l1', points: [{ x: 0, y: 0 }, { x: 10, y: 0 }], closed: false, width: 2.2 },
      { id: 'l2', points: [{ x: 0, y: 5 }, { x: 10, y: 5 }], closed: false, width: 2.2 },
    ]
    const items = legendItems(doc, getDefMap(doc))
    expect(items).toHaveLength(2)
    expect(items[1]).toMatchObject({ symbolId: '__line', label: 'backstitch', count: 2 })
    // label override applies to the line entry too
    doc.labelOverrides['__line'] = 'surface slip stitch'
    expect(legendItems(doc, getDefMap(doc))[1].label).toBe('surface slip stitch')
  })
})
