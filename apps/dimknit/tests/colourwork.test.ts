import '../src/craft' // register the knit craft before anything touches the registry
import { beforeEach, describe, expect, it } from 'vitest'
import type { ChartDoc, Placement } from '@dimcraft/core/model/types'
import { createEmptyDoc, uid } from '@dimcraft/core/model/doc'
import { useStore } from '../src/state/store'
import { followSteps, rowInstruction, groupRows, writtenInstructions } from '../src/geometry/rows'

const CELL = 24
const RED = '#aa0000'
const BLUE = '#2f6f9f'

function cell(symbolId: string, r: number, c: number, colour?: string): Placement {
  return {
    id: uid(),
    symbolId,
    x: c * CELL,
    y: -(r - 1) * CELL,
    rotation: 0,
    scale: 1,
    flip: false,
    ...(colour ? { colour } : {}),
  }
}

function doc(rows: Placement[][]): ChartDoc {
  const doc = createEmptyDoc('colourwork test')
  doc.placements = rows.flat()
  doc.yarns = [
    { id: 'y1', colour: RED },
    { id: 'y2', colour: BLUE },
  ]
  return doc
}

beforeEach(() => {
  useStore.getState().newProject('Colourwork test')
})

describe('coloured written instructions', () => {
  it('carries yarn abbreviations after the stitch count', () => {
    const d = doc([
      [cell('k', 1, 0, RED), cell('k', 1, 1, RED), cell('p', 1, 2), cell('k', 1, 3, BLUE)],
    ])
    // RS rows read right-to-left: the blue knit comes first in the text
    expect(rowInstruction(groupRows(d)[0], false, d.yarns)).toBe('Row 1 (RS): k1 CC1, p1, k2 MC')
  })

  it('merges same-stitch runs only within one colour', () => {
    const d = doc([[cell('k', 1, 0, RED), cell('k', 1, 1), cell('k', 1, 2, RED)]])
    expect(rowInstruction(groupRows(d)[0], false, d.yarns)).toBe('Row 1 (RS): k1 MC, k1, k1 MC')
  })

  it('applies the RS/WS duality to coloured cells', () => {
    const d = doc([[cell('k', 1, 0, RED)]])
    expect(rowInstruction(groupRows(d)[0], false, d.yarns)).toBe('Row 1 (RS): k1 MC')
    // a knit cell on a wrong-side row is worked as a purl — same yarn
    const ws = doc([[cell('k', 2, 0, RED), cell('p', 1, 0)]])
    expect(writtenInstructions(ws)).toEqual(['Row 1 (RS): p1', 'Row 2 (WS): p1 MC'])
  })

  it('reads stitches wearing unknown colours as plain stitches', () => {
    const d = createEmptyDoc('x')
    d.placements = [cell('k', 1, 0, '#123456')]
    expect(rowInstruction(groupRows(d)[0])).toBe('Row 1 (RS): k1')
  })

  it('follow steps carry the yarn abbreviation in the row text', () => {
    const d = doc([[cell('k', 1, 0, RED), cell('k', 1, 1, RED)]])
    const steps = followSteps(d)
    expect(steps[0].text).toBe('Row 1 (RS): k2 MC')
  })
})

describe('painting cells (store)', () => {
  it('stamps with the armed colour', () => {
    const st = useStore.getState()
    st.setYarns([{ id: 'y1', colour: RED }])
    st.armColour(RED)
    st.stampPlacement(0, 0)
    const p = useStore.getState().doc.placements[0]
    expect(p.colour).toBe(RED)
  })

  it('stamping an occupied cell re-works it in place, keeping the id', () => {
    const st = useStore.getState()
    st.setYarns([{ id: 'y1', colour: RED }])
    st.stampPlacement(0, 0)
    const first = useStore.getState().doc.placements[0]
    st.armSymbol('p')
    st.armColour(RED)
    st.stampPlacement(0, 0)
    const after = useStore.getState().doc.placements
    expect(after).toHaveLength(1)
    expect(after[0].id).toBe(first.id)
    expect(after[0].symbolId).toBe('p')
    expect(after[0].colour).toBe(RED)
  })

  it('re-stamping the identical stitch adds no undo step', () => {
    const st = useStore.getState()
    st.stampPlacement(0, 0)
    const before = useStore.getState().past.length
    st.stampPlacement(0, 0)
    expect(useStore.getState().past.length).toBe(before)
  })

  it('recolouring a yarn repaints its stitches in the same undo step', () => {
    const st = useStore.getState()
    st.setYarns([{ id: 'y1', colour: RED }])
    st.armColour(RED)
    st.stampPlacement(0, 0)
    st.updateYarn('y1', { colour: BLUE })
    const s = useStore.getState()
    expect(s.doc.placements[0].colour).toBe(BLUE)
    expect(s.doc.yarns![0].colour).toBe(BLUE)
    s.undo()
    const undone = useStore.getState()
    expect(undone.doc.placements[0].colour).toBe(RED)
    expect(undone.doc.yarns![0].colour).toBe(RED)
  })

  it('mirroring keeps the stitch colour', () => {
    const st = useStore.getState()
    st.setYarns([{ id: 'y1', colour: RED }])
    st.armColour(RED)
    st.stampPlacement(0, 0)
    st.armColour(null)
    st.stampPlacement(CELL, 0)
    const ids = useStore.getState().doc.placements.map((p) => p.id)
    useStore.setState({ selPlacements: ids })
    st.mirrorSelection('v')
    const colours = useStore.getState().doc.placements.map((p) => p.colour).sort()
    expect(colours).toEqual([RED, undefined].sort())
  })
})
