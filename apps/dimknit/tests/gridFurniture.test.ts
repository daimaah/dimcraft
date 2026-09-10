import '../src/craft' // register the knit craft before anything touches the registry
import { beforeEach, describe, expect, it } from 'vitest'
import type { ChartDoc, Placement } from '@dimcraft/core/model/types'
import { createEmptyDoc, uid } from '@dimcraft/core/model/doc'
import { useStore } from '../src/state/store'
import { gridInfo } from '../src/geometry/rows'

const CELL = 24

function cell(r: number, c: number): Placement {
  // row 1 is the bottom band (y = 0); higher rows sit at negative y
  return { id: uid(), symbolId: 'k', x: c * CELL, y: (1 - r) * CELL, rotation: 0, scale: 1, flip: false }
}

function gridDoc(): ChartDoc {
  const doc = createEmptyDoc('grid test')
  // three rows of three stitches
  doc.placements = [
    cell(1, 0), cell(1, 1), cell(1, 2),
    cell(2, 0), cell(2, 1), cell(2, 2),
    cell(3, 0), cell(3, 1), cell(3, 2),
  ]
  return doc
}

beforeEach(() => {
  useStore.getState().newProject('Grid test')
})

describe('gridInfo', () => {
  it('reports rows bottom-up with sides and sorted occupied columns', () => {
    const doc = gridDoc()
    const info = gridInfo(doc)
    expect(info.rows.map((r) => r.index)).toEqual([1, 2, 3])
    expect(info.rows.map((r) => r.side)).toEqual(['RS', 'WS', 'RS'])
    expect(info.rows.map((r) => r.y)).toEqual([0, -CELL, -2 * CELL])
    expect(info.colXs).toEqual([0, CELL, 2 * CELL])
  })
})

describe('insert / delete rows', () => {
  it('inserts an empty band above the pivot, shifting the rows above up', () => {
    useStore.setState({ doc: gridDoc() })
    useStore.getState().insertGridRow(0, false) // pivot = row 1 (bottom)
    const doc = useStore.getState().doc
    expect(doc.placements.filter((p) => p.y === 0)).toHaveLength(3) // pivot untouched
    expect(doc.placements.filter((p) => p.y === -CELL)).toHaveLength(0) // new empty band
    expect(doc.placements.filter((p) => p.y === -2 * CELL)).toHaveLength(3) // old row 2
    expect(doc.placements.filter((p) => p.y === -3 * CELL)).toHaveLength(3) // old row 3
  })

  it('inserts an empty band below the pivot, shifting the rows below down', () => {
    useStore.setState({ doc: gridDoc() })
    useStore.getState().insertGridRow(-CELL, true) // pivot = row 2
    const doc = useStore.getState().doc
    expect(doc.placements.filter((p) => p.y === -CELL)).toHaveLength(3) // pivot untouched
    expect(doc.placements.filter((p) => p.y === 0)).toHaveLength(0) // new empty band
    expect(doc.placements.filter((p) => p.y === CELL)).toHaveLength(3) // old row 1 moved down
  })

  it('deletes the pivot row and closes the gap', () => {
    useStore.setState({ doc: gridDoc() })
    useStore.getState().deleteGridRow(0) // delete row 1 (bottom)
    const doc = useStore.getState().doc
    expect(doc.placements).toHaveLength(6)
    expect(doc.placements.filter((p) => p.y === 0)).toHaveLength(3) // old row 2 closed the gap
    expect(doc.placements.filter((p) => p.y === -CELL)).toHaveLength(3) // old row 3
    expect(doc.placements.filter((p) => p.y === -2 * CELL)).toHaveLength(0)
  })

  it('skips the undo step when there is nothing to delete', () => {
    useStore.setState({ doc: gridDoc() })
    useStore.getState().deleteGridRow(999)
    expect(useStore.getState().doc.placements).toHaveLength(9)
    expect(useStore.getState().past).toHaveLength(0)
  })
})

describe('insert / delete columns', () => {
  it('inserts an empty column left of the pivot', () => {
    useStore.setState({ doc: gridDoc() })
    useStore.getState().insertGridCol(CELL, false) // pivot = column 2
    const doc = useStore.getState().doc
    expect(doc.placements.filter((p) => p.x === -CELL)).toHaveLength(3) // old column 1 shifted left
    expect(doc.placements.filter((p) => p.x === 0)).toHaveLength(0) // new empty column
    expect(doc.placements.filter((p) => p.x === CELL)).toHaveLength(3)
    expect(doc.placements.filter((p) => p.x === 2 * CELL)).toHaveLength(3)
  })

  it('inserts an empty column right of the pivot', () => {
    useStore.setState({ doc: gridDoc() })
    useStore.getState().insertGridCol(0, true) // pivot = column 1
    const doc = useStore.getState().doc
    expect(doc.placements.filter((p) => p.x === 0)).toHaveLength(3)
    expect(doc.placements.filter((p) => p.x === CELL)).toHaveLength(0) // new empty column
    expect(doc.placements.filter((p) => p.x === 2 * CELL)).toHaveLength(3)
  })

  it('deletes the pivot column and closes the gap', () => {
    useStore.setState({ doc: gridDoc() })
    useStore.getState().deleteGridCol(CELL)
    const doc = useStore.getState().doc
    expect(doc.placements).toHaveLength(6)
    expect(doc.placements.filter((p) => p.x === 0)).toHaveLength(3)
    expect(doc.placements.filter((p) => p.x === CELL)).toHaveLength(3) // old column 3 closed the gap
    expect(doc.placements.filter((p) => p.x === 2 * CELL)).toHaveLength(0)
  })
})

describe('numbering store action', () => {
  it('toggles rows and cols independently', () => {
    const st = useStore.getState()
    st.setNumbering({ rows: true })
    expect(useStore.getState().doc.numbering).toEqual({ rows: true, cols: false })
    st.setNumbering({ cols: true })
    expect(useStore.getState().doc.numbering).toEqual({ rows: true, cols: true })
  })
})
