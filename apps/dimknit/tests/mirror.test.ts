import '../src/craft' // register the knit craft before anything touches the registry
import { beforeEach, describe, expect, it } from 'vitest'
import type { ChartDoc, Placement } from '@dimcraft/core/model/types'
import { createEmptyDoc, uid } from '@dimcraft/core/model/doc'
import { getCraft } from '@dimcraft/core/craft'
import { useStore } from '../src/state/store'
import { mirrorSymbol } from '../src/geometry/rows'

const CELL = 24

function cell(symbolId: string, r: number, c: number): Placement {
  return { id: uid(), symbolId, x: c * CELL, y: -(r - 1) * CELL, rotation: 0, scale: 1, flip: false }
}

function doc2(a: string, b: string): ChartDoc {
  const doc = createEmptyDoc('mirror test')
  doc.placements = [cell(a, 1, 0), cell(b, 1, 1)]
  return doc
}

beforeEach(() => {
  useStore.getState().newProject('Mirror test')
})

describe('knit mirror map', () => {
  it('swaps leaning decreases for their mirror image', () => {
    expect(mirrorSymbol('k2tog')).toBe('ssk')
    expect(mirrorSymbol('ssk')).toBe('k2tog')
    expect(mirrorSymbol('p2tog')).toBe('ssp')
    expect(mirrorSymbol('ssp')).toBe('p2tog')
  })

  it('keeps symmetric stitches as themselves', () => {
    for (const id of ['k', 'p', 'yo', 's2kp2', 'ns']) {
      expect(mirrorSymbol(id)).toBe(id)
    }
  })

  it('exposes the mirror map through the craft seam', () => {
    expect(getCraft().mirrorSymbol?.('k2tog')).toBe('ssk')
  })

  it('gates inspector sections whose backing features knit lacks', () => {
    expect(getCraft().terminologyPresets).toEqual([])
    expect(getCraft().symbolPacks).toBe(false)
  })

  it('opts into the grid crafts: colourwork, cell re-work, rows & columns, gauge', () => {
    expect(getCraft().colourwork).toBe(true)
    expect(getCraft().replaceOnStamp).toBe(true)
    expect(getCraft().rowsAndColumns).toBe(true)
    expect(getCraft().gridInfo).toBeDefined()
    expect(getCraft().gauge).toBeDefined()
  })

  it('offers a grid-appropriate action-bar tool set', () => {
    expect(getCraft().paletteTools.map((t) => t.id)).toEqual(['select', 'pan', 'place', 'bracket'])
  })
})

describe('mirrorSelection', () => {
  it('mirrors the chart horizontally and swaps directional stitches', () => {
    useStore.setState({ doc: doc2('k2tog', 'k') })
    const ids = useStore.getState().doc.placements.map((p) => p.id)
    useStore.setState({ selPlacements: ids })
    useStore.getState().mirrorSelection('v')

    const after = useStore.getState().doc.placements
    const byId = new Map(after.map((p) => [p.id, p]))
    // the decrease cell now holds its mirror-image stitch, drawn unflipped
    expect(byId.get(ids[0])!.symbolId).toBe('ssk')
    expect(byId.get(ids[0])!.flip).toBe(false)
    expect(byId.get(ids[1])!.symbolId).toBe('k')
    // the two cells swapped sides
    expect(byId.get(ids[0])!.x).toBeGreaterThan(byId.get(ids[1])!.x)
  })

  it('is an involution: mirroring twice restores the chart', () => {
    useStore.setState({ doc: doc2('k2tog', 'p') })
    const ids = useStore.getState().doc.placements.map((p) => p.id)
    useStore.setState({ selPlacements: ids })
    const before = useStore.getState().doc.placements.map((p) => ({ ...p }))

    useStore.getState().mirrorSelection('v')
    useStore.getState().mirrorSelection('v')

    const after = new Map(useStore.getState().doc.placements.map((p) => [p.id, p]))
    for (const orig of before) {
      const now = after.get(orig.id)!
      expect(now.symbolId).toBe(orig.symbolId)
      expect(now.x).toBeCloseTo(orig.x, 6)
      expect(now.flip).toBe(orig.flip)
    }
  })

  it('leaves symbols alone on a vertical (top-bottom) mirror', () => {
    useStore.setState({ doc: doc2('k2tog', 'k') })
    const ids = useStore.getState().doc.placements.map((p) => p.id)
    useStore.setState({ selPlacements: ids })
    useStore.getState().mirrorSelection('h')

    const after = new Map(useStore.getState().doc.placements.map((p) => [p.id, p]))
    expect(after.get(ids[0])!.symbolId).toBe('k2tog')
    expect(after.get(ids[0])!.flip).toBe(true)
    expect(after.get(ids[1])!.symbolId).toBe('k')
  })
})
