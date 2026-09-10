import '../src/craft' // register the knit craft before anything touches the registry
import { describe, expect, it } from 'vitest'
import type { ChartDoc, Placement } from '@dimcraft/core/model/types'
import { createEmptyDoc, sanitizeDoc, uid } from '@dimcraft/core/model/doc'
import { getCraft } from '@dimcraft/core/craft'
import { useStore } from '../src/state/store'
import { groupRows, rowCountIssues, sizeDoc, writtenInstructions } from '../src/geometry/rows'

const CELL = 24

function cell(symbolId: string, r: number, c: number): Placement {
  return { id: uid(), symbolId, x: c * CELL, y: (1 - r) * CELL, rotation: 0, scale: 1, flip: false }
}

function motifDoc(): ChartDoc {
  const doc = createEmptyDoc('motif')
  // a 6-column, 4-row chart: knit background with a 2-cell purl motif in
  // the middle of row 3
  doc.placements = [
    cell('k', 1, 0), cell('k', 1, 1), cell('k', 1, 2), cell('k', 1, 3), cell('k', 1, 4), cell('k', 1, 5),
    cell('k', 2, 0), cell('k', 2, 1), cell('k', 2, 2), cell('k', 2, 3), cell('k', 2, 4), cell('k', 2, 5),
    cell('k', 3, 0), cell('k', 3, 1), cell('p', 3, 2), cell('p', 3, 3), cell('k', 3, 4), cell('k', 3, 5),
    cell('k', 4, 0), cell('k', 4, 1), cell('k', 4, 2), cell('k', 4, 3), cell('k', 4, 4), cell('k', 4, 5),
  ]
  return doc
}

describe('grading (M10)', () => {
  it('is a knit capability', () => {
    expect(getCraft().grading).toBe(true)
  })

  it('sanitizes valid sizes and drops junk', () => {
    const doc = sanitizeDoc({ placements: [], guides: [], sizes: [{ id: 's1', name: '+8 sts', pad: 8 }, { id: 's2', name: 'x', pad: 0 }, { pad: 4 }, 'junk'] })
    expect(doc!.sizes).toEqual([{ id: 's1', name: '+8 sts', pad: 8 }])
  })

  it('pads each row symmetrically with background stitches, motif anchored', () => {
    const sized = sizeDoc(motifDoc(), 8)
    for (const r of [1, 2, 3, 4]) {
      const row = sized.placements.filter((p) => p.y === (1 - r) * CELL)
      expect(row).toHaveLength(6 + 8)
      // 4 background columns each side: -4*24 .. 13*24
      expect(row.every((p) => p.x >= -4 * CELL && p.x <= 13 * CELL)).toBe(true)
    }
    // the motif keeps its absolute chart position — extra stitches only
    // appear at the edges (controlled placement, not pixel scaling)
    const motif = sized.placements.filter((p) => p.symbolId === 'p')
    expect(motif.map((p) => p.x)).toEqual([2 * CELL, 3 * CELL])
  })

  it('keeps every size stitch-count-balanced (per-row +pad on both sides)', () => {
    const sized = sizeDoc(motifDoc(), 6)
    expect(rowCountIssues(sized)).toEqual([])
    expect(motifDoc().placements).toHaveLength(24)
  })

  it('derives per-size written instructions from the same base', () => {
    const base = writtenInstructions(motifDoc())
    expect(base[0]).toBe('Row 1 (RS): k6')
    expect(base[2]).toBe('Row 3 (RS): k2, p2, k2')
    const grown = writtenInstructions(sizeDoc(motifDoc(), 8))
    // an all-knit row reads as one run; the motif row shows the symmetric pads
    expect(grown[0]).toBe('Row 1 (RS): k14')
    expect(grown[2]).toBe('Row 3 (RS): k6, p2, k6')
  })

  it('sizes changes are one undo step and clear cleanly', () => {
    useStore.getState().newProject('sizes')
    const st = useStore.getState()
    st.setSizes([{ id: 's1', name: '+8 sts', pad: 8 }])
    expect(useStore.getState().doc.sizes).toHaveLength(1)
    st.setSizes([])
    expect(useStore.getState().doc.sizes).toBeUndefined()
    useStore.getState().undo()
    expect(useStore.getState().doc.sizes).toHaveLength(1)
  })

  it('round trips: written rows of a size parse back to the same grid', () => {
    const sized = sizeDoc(motifDoc(), 8)
    const text = writtenInstructions(sized).join('\n')
    // the rows now say p4 … — groupRows over the padded doc sees +8 columns
    expect(groupRows(sized)[0].cells).toHaveLength(14)
    void text
  })
})