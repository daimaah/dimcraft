import { beforeEach, describe, expect, it } from 'vitest'
import { useStore } from '../src/state/store'

beforeEach(() => {
  useStore.getState().newProject('Test')
})

function stampThree() {
  const st = useStore.getState()
  st.stampPlacement(0, 0)
  st.stampPlacement(60, 0)
  st.stampPlacement(120, 0)
  return useStore.getState().doc.placements.map((p) => p.id)
}

describe('reorderPlacements', () => {
  it('front/back move the selection to the ends, keeping relative order', () => {
    const [a, b, c] = stampThree()
    const st = useStore.getState()
    useStore.setState({ selPlacements: [a, b] })
    st.reorderPlacements('front')
    expect(useStore.getState().doc.placements.map((p) => p.id)).toEqual([c, a, b])
    st.reorderPlacements('back')
    expect(useStore.getState().doc.placements.map((p) => p.id)).toEqual([a, b, c])
  })

  it('forward/backward nudge one slot, keeping contiguous selections together', () => {
    const [a, b, c] = stampThree()
    const st = useStore.getState()
    useStore.setState({ selPlacements: [a] })
    st.reorderPlacements('forward')
    expect(useStore.getState().doc.placements.map((p) => p.id)).toEqual([b, a, c])
    st.reorderPlacements('backward')
    expect(useStore.getState().doc.placements.map((p) => p.id)).toEqual([a, b, c])
    // a+b move as a block: forward once leaves [c,a,b], twice is a no-op at the edge
    useStore.setState({ selPlacements: [a, b] })
    st.reorderPlacements('forward')
    expect(useStore.getState().doc.placements.map((p) => p.id)).toEqual([c, a, b])
    st.reorderPlacements('forward')
    expect(useStore.getState().doc.placements.map((p) => p.id)).toEqual([c, a, b])
  })

  it('pushes an undo step but not when nothing changed', () => {
    const [a, b, c] = stampThree()
    const st = useStore.getState()
    // c is already the topmost stitch: a no-op command must not push history
    useStore.setState({ selPlacements: [c] })
    const pastBefore = useStore.getState().past.length
    st.reorderPlacements('forward')
    expect(useStore.getState().past.length).toBe(pastBefore)
    expect(useStore.getState().doc.placements.map((p) => p.id)).toEqual([a, b, c])
    // selecting the bottommost one does move, and pushes exactly one step
    useStore.setState({ selPlacements: [a] })
    st.reorderPlacements('forward')
    expect(useStore.getState().past.length).toBe(pastBefore + 1)
    expect(useStore.getState().doc.placements.map((p) => p.id)).toEqual([b, a, c])
  })

  it('undoes cleanly', () => {
    const [a, , c] = stampThree()
    const st = useStore.getState()
    useStore.setState({ selPlacements: [c] })
    st.reorderPlacements('back')
    expect(useStore.getState().doc.placements[0].id).toBe(c)
    useStore.getState().undo()
    const ids = useStore.getState().doc.placements.map((p) => p.id)
    expect(ids[ids.length - 1]).toBe(c)
    expect(ids[0]).toBe(a)
  })

  it('ignores an empty selection', () => {
    stampThree()
    const before = useStore.getState().doc.placements.map((p) => p.id)
    const pastBefore = useStore.getState().past.length
    useStore.getState().reorderPlacements('front')
    expect(useStore.getState().doc.placements.map((p) => p.id)).toEqual(before)
    expect(useStore.getState().past.length).toBe(pastBefore)
  })
})