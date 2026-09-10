import '../src/craft' // register the knit craft before anything touches the registry
import { describe, expect, it } from 'vitest'
import type { ChartDoc, Placement } from '@dimcraft/core/model/types'
import { createEmptyDoc, uid } from '@dimcraft/core/model/doc'
import { followSteps, groupRows, rowCountIssues, rowInstruction, writtenInstructions } from '../src/geometry/rows'

const CELL = 24

function cell(symbolId: string, r: number, c: number): Placement {
  return { id: uid(), symbolId, x: c * CELL, y: -(r - 1) * CELL, rotation: 0, scale: 1, flip: false }
}

/** row-major grid, bottom row first (r = row index, 1-based, bottom-up) */
function gridDoc(rows: string[][]): ChartDoc {
  const doc = createEmptyDoc('test chart')
  doc.placements = rows.map((row, i) => row.map((sym, c) => cell(sym, i + 1, c))).flat()
  return doc
}

describe('groupRows', () => {
  it('clusters cells into rows bottom-up, numbering row 1 at the bottom', () => {
    const doc = gridDoc([
      ['k', 'k', 'k'],
      ['p', 'p', 'p'],
      ['k', 'k', 'k'],
    ])
    const rows = groupRows(doc)
    expect(rows.map((r) => r.index)).toEqual([1, 2, 3])
    expect(rows[0].side).toBe('RS')
    expect(rows[1].side).toBe('WS')
    expect(rows[2].side).toBe('RS')
    // within a row, cells read left → right as drawn
    expect(rows[0].cells[0].x).toBeLessThan(rows[0].cells[1].x)
  })
})

describe('written instructions apply the RS/WS duality', () => {
  it('reads RS rows right-to-left and reverses stitches on WS rows', () => {
    // row 1 (RS, bottom): p k p → worked right-to-left (palindrome here)
    // row 2 (WS): k p k → read left-to-right, each cell reversed: p k p
    const doc = gridDoc([
      ['p', 'k', 'p'],
      ['k', 'p', 'k'],
    ])
    const rows = groupRows(doc)
    expect(rowInstruction(rows[0])).toBe('Row 1 (RS): p1, k1, p1')
    expect(rowInstruction(rows[1])).toBe('Row 2 (WS): p1, k1, p1')
  })

  it('run-length-encodes repeats and names decreases per side', () => {
    const doc = gridDoc([
      ['ssk', 'k', 'k', 'k', 'k2tog'],
      ['yo', 'k', 'k', 'k', 'yo'],
    ])
    const rows = groupRows(doc)
    // row 2 (WS): blank cells become purls, yo stays yo, read left → right
    expect(rowInstruction(rows[1])).toBe('Row 2 (WS): yo, p3, yo')
    // row 1 (RS): worked right-to-left: k2tog first, ssk last
    expect(rowInstruction(rows[0])).toBe('Row 1 (RS): k2tog, k3, ssk')
  })

  it('writtenInstructions lists every row in order', () => {
    const doc = gridDoc([
      ['p', 'p'],
      ['k', 'k'],
    ])
    // row 1 (RS): the two purl dots, right-to-left. row 2 (WS): the blank
    // cells become purls on the wrong side.
    expect(writtenInstructions(doc)).toEqual(['Row 1 (RS): p2', 'Row 2 (WS): p2'])
  })
})

describe('stitch-count accounting', () => {
  it('accepts balanced lace (yo adds what the decrease absorbs)', () => {
    const doc = gridDoc([
      ['k', 'yo', 'k2tog', 'k', 'k'],
      ['k', 'yo', 'k2tog', 'k', 'k'],
      ['k', 'k', 'k2tog', 'k', 'k'],
    ])
    expect(rowCountIssues(doc)).toEqual([])
  })

  it('flags a row that works the wrong number of stitches', () => {
    const doc = gridDoc([
      ['k', 'k', 'k'],
      ['k', 'k', 'k', 'k'],
    ])
    expect(rowCountIssues(doc)).toEqual(['Row 2 works 4 stitches, but row 1 leaves 3.'])
  })
})

describe('followSteps', () => {
  it('produces one step per row with working-order ids and side labels', () => {
    const doc = gridDoc([
      ['p', 'k'],
      ['k', 'p'],
    ])
    const steps = followSteps(doc)
    expect(steps).toHaveLength(2)
    expect(steps[0].label).toBe('Row 1')
    expect(steps[0].text).toBe('Row 1 (RS): k1, p1')
    // RS row: worked right-to-left → first id is the rightmost cell
    const row1 = groupRows(doc)[0]
    expect(steps[0].ids[0]).toBe([...row1.cells].reverse()[0].id)
    expect(steps[1].text).toBe('Row 2 (WS): p1, k1')
  })
})
