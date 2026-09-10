import '../src/craft' // register the knit craft before anything touches the registry
import { describe, expect, it } from 'vitest'
import type { Placement } from '@dimcraft/core/model/types'
import { createEmptyDoc, uid } from '@dimcraft/core/model/doc'
import { chartFromWrittenRows, parseWrittenRows } from '../src/geometry/patternParser'
import { followSteps, gridInfo, writtenInstructions } from '../src/geometry/rows'

const CELL = 24

function cell(symbolId: string, r: number, c: number): Placement {
  return { id: uid(), symbolId, x: c * CELL, y: (1 - r) * CELL, rotation: 0, scale: 1, flip: false }
}

describe('written-row parser', () => {
  it("round-trips the app's own generated instructions", () => {
    const source = createEmptyDoc('lace')
    source.placements = [
      cell('k', 1, 0), cell('k', 1, 1), cell('k2tog', 1, 2), cell('yo', 1, 3), cell('k', 1, 4), cell('k', 1, 5),
      cell('k', 2, 0), cell('k', 2, 1), cell('k', 2, 2), cell('k', 2, 3), cell('k', 2, 4), cell('k', 2, 5),
    ]
    const text = writtenInstructions(source).join('\n')
    const { doc } = chartFromWrittenRows(text)
    expect(doc).not.toBeNull()
    // the regenerated chart carries the same symbols in the same columns
    expect(doc!.placements.map((p) => [p.symbolId, p.x, p.y]).sort()).toEqual(
      source.placements.map((p) => [p.symbolId, p.x, p.y]).sort(),
    )
  })

  it('inverts wrong-side rows into right-side chart symbols', () => {
    const { doc } = chartFromWrittenRows('Row 1 (RS): k4\nRow 2 (WS): p4\nRow 3: k2, p2\nRow 4: p2, k2')
    expect(doc).not.toBeNull()
    // left → right along the row
    const byRow = (r: number) =>
      doc!
        .placements.filter((p) => p.y === (1 - r) * CELL)
        .sort((a, b) => a.x - b.x)
        .map((p) => p.symbolId)
    // row 1 (RS): k stays k; row 2 (WS): "p4" worked = knit cells on the chart
    expect(byRow(1)).toEqual(['k', 'k', 'k', 'k'])
    expect(byRow(2)).toEqual(['k', 'k', 'k', 'k'])
    // no explicit marker: parity decides — row 3 is RS and its text reads
    // right-to-left, so the k2 fill lands on the right half
    expect(byRow(3)).toEqual(['p', 'p', 'k', 'k'])
    // row 4 is a wrong-side row read left-to-right: "p2, k2" → k,k,p,p
    expect(byRow(4)).toEqual(['k', 'k', 'p', 'p'])
  })

  it('inverts decreases, cables and twists with their WS words', () => {
    const { doc } = chartFromWrittenRows('Row 2 (WS): p2tog, ssp, C4F, LT, yo')
    const ids = doc!.placements.map((p) => p.symbolId)
    // worked on the WS → chart shows the RS twins
    expect(ids).toEqual(['k2tog', 'ssk', 'c4b', 'rt', 'yo'])
    // the cable occupies four columns, the twist two
    const xs = doc!.placements.map((p) => p.x)
    expect(xs).toEqual([0, CELL, 2 * CELL, 6 * CELL, 8 * CELL])
  })

  it('expands counts and ×N repeats', () => {
    const parsed = parseWrittenRows('Row 1: k4, p2, C4B ×2')
    expect(parsed.rows[0].cells.map((c) => c.symbolId)).toEqual([
      'k', 'k', 'k', 'k', 'p', 'p', 'c4b', 'c4b',
    ])
    expect(parsed.cols).toBe(14)
  })

  it('ignores colourway names and collects unreadable tokens as issues', () => {
    const parsed = parseWrittenRows('Row 1: k3 MC, p2 CC1, wobble')
    expect(parsed.rows[0].cells.map((c) => c.symbolId)).toEqual(['k', 'k', 'k', 'p', 'p'])
    expect(parsed.issues).toEqual(['Row 1: could not read “wobble”.'])
  })
})

describe('in the round', () => {
  const doc = createEmptyDoc('tube')
  doc.placements = [
    cell('k', 1, 0), cell('p', 1, 1),
    cell('k', 2, 0), cell('p', 2, 1),
  ]

  it('reads every row as a right-side row', () => {
    expect(writtenInstructions(doc)).toEqual(['Row 1 (RS): p1, k1', 'Row 2 (WS): p1, k1'])
    doc.inTheRound = true
    expect(writtenInstructions(doc)).toEqual(['Row 1 (RS): p1, k1', 'Row 2 (RS): p1, k1'])
  })

  it('follow steps walk right-side words on every row', () => {
    doc.inTheRound = true
    const steps = followSteps(doc)
    expect(steps.map((s) => s.text)).toEqual(['Row 1 (RS): p1, k1', 'Row 2 (RS): p1, k1'])
  })

  it('numbers print on the right for every row', () => {
    doc.inTheRound = true
    const info = gridInfo(doc)
    expect(info.rows.map((r) => r.side)).toEqual(['RS', 'RS'])
  })
})