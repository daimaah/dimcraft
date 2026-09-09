import { beforeEach, describe, expect, it } from 'vitest'
import { useStore } from '../src/state/store'
import { cornersBBox, placementCorners } from '@dimcraft/core/geometry/transform'
import { getDefMap } from '../src/symbols/registry'
import type { ChartDoc } from '@dimcraft/core/model/types'

beforeEach(() => {
  useStore.getState().newProject('Test')
})

describe('legacy project migration', () => {
  it('opening a project saved without new fields fills them in instead of crashing', () => {
    useStore.getState().openProject({
      id: 'proj-legacy',
      name: 'Legacy',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      doc: { schemaVersion: 1, title: 'Legacy', placements: [], guides: [] } as unknown as ChartDoc,
    })
    const doc = useStore.getState().doc
    expect(Array.isArray(doc.lines)).toBe(true)
    expect(Array.isArray(doc.brackets)).toBe(true)
    expect(Array.isArray(doc.texts)).toBe(true)
    expect(useStore.getState().projectName).toBe('Legacy')
  })
})

function stampThreeSpread() {
  const st = useStore.getState()
  st.stampPlacement(0, 0)
  st.stampPlacement(60, 0)
  st.stampPlacement(120, 0)
  const ids = useStore.getState().doc.placements.map((p) => p.id)
  useStore.setState({ selPlacements: ids })
}

describe('align selection', () => {
  it('align left lines up the left edge of every bounding box', () => {
    stampThreeSpread()
    useStore.getState().alignSelection('x', 'min')
    const doc = useStore.getState().doc
    const defMap = getDefMap(doc)
    const minXs = doc.placements.map((p) => cornersBBox(placementCorners(p, defMap.get(p.symbolId)!)).x)
    for (const x of minXs) expect(x).toBeCloseTo(minXs[0], 6)
    // left edge of the last stitch moves to the first stitch's left edge
    expect(doc.placements[2].x).toBeCloseTo(0, 6)
  })

  it('align centers horizontally', () => {
    stampThreeSpread()
    useStore.getState().alignSelection('x', 'center')
    const doc = useStore.getState().doc
    expect(doc.placements.map((p) => p.x)).toEqual([60, 60, 60])
  })

  it('align middle vertically keeps x positions', () => {
    stampThreeSpread()
    useStore.getState().alignSelection('y', 'center')
    const doc = useStore.getState().doc
    expect(doc.placements.map((p) => p.x)).toEqual([0, 60, 120])
    expect(doc.placements.every((p) => p.y === 0)).toBe(true)
  })

  it('is a no-op with fewer than two selected and pushes undo history', () => {
    stampThreeSpread()
    const before = useStore.getState().doc
    useStore.getState().alignSelection('x', 'max')
    expect(useStore.getState().doc).not.toBe(before)
    useStore.getState().undo()
    expect(useStore.getState().doc).toBe(before)
  })
})

describe('backstitch lines', () => {
  it('draws, selects, and moves a line', () => {
    useStore.getState().addLineFromPoints({ x: 0, y: 0 }, { x: 100, y: 40 })
    const st = useStore.getState()
    expect(st.doc.lines).toHaveLength(1)
    expect(st.selLines).toEqual([st.doc.lines[0].id])
    useStore.getState().applyDragPositions({
      placements: [],
      texts: [],
      brackets: [],
      lines: [{ id: st.doc.lines[0].id, points: [{ x: 10, y: 10 }, { x: 110, y: 50 }] }],
    })
    expect(useStore.getState().doc.lines[0].points[1]).toEqual({ x: 110, y: 50 })
  })

  it('inserts a point at the middle of the longest segment', () => {
    const st = useStore.getState()
    st.addLineFromPoints({ x: 0, y: 0 }, { x: 10, y: 0 })
    useStore.getState().updateLineLive(useStore.getState().doc.lines[0].id, {
      points: [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 12, y: 1 },
      ],
    })
    const id = useStore.getState().doc.lines[0].id
    useStore.getState().insertLinePoint(id)
    const pts = useStore.getState().doc.lines[0].points
    expect(pts).toHaveLength(4)
    // longest segment was (0,0)→(10,0); midpoint (5,0) inserted after index 0
    expect(pts[1]).toEqual({ x: 5, y: 0 })
  })

  it('cannot reduce a line below two points', () => {
    useStore.getState().addLineFromPoints({ x: 0, y: 0 }, { x: 10, y: 0 })
    const id = useStore.getState().doc.lines[0].id
    useStore.getState().removeLastLinePoint(id)
    expect(useStore.getState().doc.lines[0].points).toHaveLength(2)
  })

  it('hiding placements removes them from exports, legend and bounds', async () => {
    const st = useStore.getState()
    st.stampPlacement(0, 0)
    st.stampPlacement(100, 100)
    const doc = useStore.getState().doc
    const hide = doc.placements[1].id
    useStore.getState().setPlacementsVisible([hide], false)

    const after = useStore.getState().doc
    expect(after.placements).toHaveLength(2) // still in the document
    expect(after.placements[1].visible).toBe(false)

    const { buildExportSvg } = await import('../src/export/svg')
    const { svg } = buildExportSvg(after, { includeLegend: false })
    expect((svg.match(/<g transform="translate\(/g) ?? []).length).toBe(1)

    const { contentBBox } = await import('@dimcraft/core/geometry/bounds')
    const { getDefMap } = await import('../src/symbols/registry')
    const bbox = contentBBox(after, getDefMap(after), { includeLegend: false })
    expect(bbox!.w).toBeLessThan(50) // only the stitch at the origin remains
  })

  it('deletes via selection and undo restores it', () => {
    useStore.getState().addLineFromPoints({ x: 0, y: 0 }, { x: 10, y: 0 })
    const id = useStore.getState().doc.lines[0].id
    useStore.setState({ selLines: [id] })
    useStore.getState().deleteSelection()
    expect(useStore.getState().doc.lines).toHaveLength(0)
    useStore.getState().undo()
    expect(useStore.getState().doc.lines).toHaveLength(1)
  })
})
