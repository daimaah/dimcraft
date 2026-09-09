import { beforeEach, describe, expect, it } from 'vitest'
import { useStore } from '../src/state/store'
import { createStarterDoc } from '../src/model/starter'
import type { CircleGuide } from '@dimcraft/core/model/types'

const circle: CircleGuide = { id: 'g1', kind: 'circle', cx: 0, cy: 0, r: 100, visible: true }

beforeEach(() => {
  useStore.getState().newProject('Test')
})

describe('store editing operations', () => {
  it('stamps placements with the armed symbol', () => {
    const st = useStore.getState()
    st.armSymbol('tr')
    st.stampPlacement(10, 20)
    const doc = useStore.getState().doc
    expect(doc.placements).toHaveLength(1)
    expect(doc.placements[0]).toMatchObject({ symbolId: 'tr', x: 10, y: 20 })
  })

  it('places N stitches evenly on a guide and tags them', () => {
    const st = useStore.getState()
    useStore.setState({ doc: { ...st.doc, guides: [circle] } })
    useStore.getState().placeEvenlyOnGuide('g1', 'dc', {
      count: 12,
      startOffset: 0,
      scale: 1,
      rotationMode: 'radial',
      mode: 'replace',
    })
    const doc = useStore.getState().doc
    expect(doc.placements).toHaveLength(12)
    for (const p of doc.placements) {
      expect(p.guideTag).toBe('g1')
      expect(Math.hypot(p.x, p.y)).toBeCloseTo(100, 1)
    }
  })

  it('replace mode removes previous stitches from the same guide; append keeps them', () => {
    useStore.setState({ doc: { ...useStore.getState().doc, guides: [circle] } })
    const st = useStore.getState()
    st.placeEvenlyOnGuide('g1', 'dc', { count: 8, startOffset: 0, scale: 1, rotationMode: 'radial', mode: 'replace' })
    useStore.getState().placeEvenlyOnGuide('g1', 'ch', {
      count: 8,
      startOffset: 0,
      scale: 1,
      rotationMode: 'radial',
      mode: 'replace',
    })
    expect(useStore.getState().doc.placements).toHaveLength(8)
    useStore.getState().placeEvenlyOnGuide('g1', 'ch', {
      count: 4,
      startOffset: 0,
      scale: 1,
      rotationMode: 'radial',
      mode: 'append',
    })
    expect(useStore.getState().doc.placements).toHaveLength(12)
  })

  it('undo and redo round-trip document state', () => {
    const st = useStore.getState()
    const before = st.doc
    st.stampPlacement(0, 0)
    expect(useStore.getState().doc.placements).toHaveLength(1)
    useStore.getState().undo()
    expect(useStore.getState().doc).toBe(before)
    useStore.getState().redo()
    expect(useStore.getState().doc.placements).toHaveLength(1)
  })

  it('duplicate offsets copies and selects them', () => {
    const st = useStore.getState()
    st.stampPlacement(0, 0)
    useStore.setState({ selPlacements: [useStore.getState().doc.placements[0].id] })
    useStore.getState().duplicateSelection()
    const doc = useStore.getState().doc
    expect(doc.placements).toHaveLength(2)
    expect(doc.placements[1].x).toBe(16)
    expect(useStore.getState().selPlacements).toHaveLength(1)
  })

  it('group assigns a shared groupId; ungroup clears it', () => {
    const st = useStore.getState()
    st.stampPlacement(0, 0)
    st.stampPlacement(30, 0)
    const ids = useStore.getState().doc.placements.map((p) => p.id)
    useStore.setState({ selPlacements: ids })
    useStore.getState().groupSelection()
    const grouped = useStore.getState().doc.placements.map((p) => p.groupId)
    expect(grouped[0]).toBeDefined()
    expect(grouped[0]).toBe(grouped[1])
    useStore.getState().ungroupSelection()
    expect(useStore.getState().doc.placements[0].groupId).toBeUndefined()
  })

  it('mirrors a selection about its own centre', () => {
    const st = useStore.getState()
    st.stampPlacement(20, 0)
    st.stampPlacement(40, 0)
    const ids = useStore.getState().doc.placements.map((p) => p.id)
    useStore.setState({ selPlacements: ids })
    useStore.getState().mirrorSelection('v')
    const xs = useStore.getState().doc.placements.map((p) => p.x)
    // centre is x=30 → 20↔40 swap
    expect(xs.sort((a, b) => a - b)).toEqual([20, 40])
    expect(useStore.getState().doc.placements.every((p) => p.flip)).toBe(true)
  })

  it('bracket auto-counts stitches near its chord', () => {
    const st = useStore.getState()
    st.stampPlacement(0, 0)
    st.stampPlacement(30, 0)
    st.stampPlacement(60, 0)
    st.stampPlacement(500, 500)
    st.addBracketFromPoints({ x: -10, y: 0 }, { x: 70, y: 0 })
    const doc = useStore.getState().doc
    expect(doc.brackets).toHaveLength(1)
    expect(doc.brackets[0].count).toBe(3)
  })

  it('deleting a guide selection clears it from the document', () => {
    useStore.setState({ doc: { ...useStore.getState().doc, guides: [circle] } })
    useStore.setState({ selGuides: ['g1'] })
    useStore.getState().deleteSelection()
    expect(useStore.getState().doc.guides).toHaveLength(0)
  })

  it('imported packs keep their license provenance', () => {
    useStore.getState().addCustomSet({
      id: 'set-commons',
      name: 'Commons variants',
      artwork: { dc: '<path d="M 2 2" fill="@INK@" stroke-width="1.6"/>' },
      license: 'CC BY-SA 4.0',
      authors: 'Commons contributors',
      sourceUrl: 'https://commons.wikimedia.org/wiki/Category:Crochet_symbols',
      notes: 'Variant symbols.',
    })
    const doc = useStore.getState().doc
    expect(doc.customSets?.[0].license).toBe('CC BY-SA 4.0')
    expect(doc.customSets?.[0].sourceUrl).toContain('commons.wikimedia.org')
    expect(useStore.getState().doc.symbolSet).toBe('set-commons') // selecting an imported pack activates it
  })

  it('starter doc produces a coherent granny square round', () => {
    const doc = createStarterDoc()
    expect(doc.guides[0]).toMatchObject({ kind: 'polygon', n: 4 })
    // magic ring + 4 side clusters × 3 dc + 4 corners × 2 ch  ([3 dc, ch 2] × 4)
    expect(doc.placements).toHaveLength(1 + 12 + 8)
    expect(doc.brackets).toHaveLength(1)
    // cluster dc stitches are parallel: the top cluster's three dc share one rotation
    const top = doc.placements.filter((p) => p.y < -100)
    expect(top).toHaveLength(3)
    expect(new Set(top.map((p) => p.rotation))).toEqual(new Set([0]))
    // and they are offset side by side along the side direction
    const xs = top.map((p) => p.x).sort((a, b) => a - b)
    expect(xs[1] - xs[0]).toBeCloseTo(14, 6)
    // all non-ring stitches sit on or near the square guide ring (r=120)
    const onRing = doc.placements.filter((p) => !(p.x === 0 && p.y === 0))
    for (const p of onRing) {
      expect(Math.hypot(p.x, p.y)).toBeGreaterThan(100)
      expect(Math.hypot(p.x, p.y)).toBeLessThan(160)
    }
  })
})

describe('follow playback state', () => {
  it('seekFollow moves the stitch cursor without rewriting the doc within a round', () => {
    useStore.getState().setFollow(true)
    const before = useStore.getState().doc
    useStore.getState().seekFollow(0, 3, true)
    const s = useStore.getState()
    expect(s.followRound).toBe(0)
    expect(s.followStitch).toBe(3)
    expect(s.followPlaying).toBe(true)
    expect(s.doc).toBe(before)
    // omitting the playing arg keeps playback running
    useStore.getState().seekFollow(0, 4)
    expect(useStore.getState().followPlaying).toBe(true)
  })

  it('seekFollow persists round changes and can pause', () => {
    useStore.getState().setFollow(true)
    useStore.getState().seekFollow(1, 0, true)
    let s = useStore.getState()
    expect(s.followRound).toBe(1)
    expect(s.doc.follow).toMatchObject({ round: 1 })
    useStore.getState().seekFollow(1, 5, false)
    s = useStore.getState()
    expect(s.followStitch).toBe(5)
    expect(s.followPlaying).toBe(false)
  })

  it('round navigation and tolerance changes reset the cursor and stop playback', () => {
    useStore.getState().setFollow(true)
    useStore.getState().seekFollow(0, 2, true)
    useStore.getState().setFollowRound(1)
    let s = useStore.getState()
    expect(s.followStitch).toBeNull()
    expect(s.followPlaying).toBe(false)
    useStore.getState().seekFollow(1, 2, true)
    useStore.getState().setFollowTolerance(10)
    s = useStore.getState()
    expect(s.followStitch).toBeNull()
    expect(s.followPlaying).toBe(false)
  })

  it('re-entering follow mode starts fresh at round granularity', () => {
    useStore.getState().setFollow(true)
    useStore.getState().seekFollow(0, 2, true)
    useStore.getState().setFollow(false)
    useStore.getState().setFollow(true)
    const s = useStore.getState()
    expect(s.followActive).toBe(true)
    expect(s.followStitch).toBeNull()
    expect(s.followPlaying).toBe(false)
  })
})

describe('view animation preference', () => {
  it('defaults on and toggles off', () => {
    expect(useStore.getState().viewAnimations).toBe(true)
    useStore.getState().setViewAnimations(false)
    expect(useStore.getState().viewAnimations).toBe(false)
    useStore.getState().setViewAnimations(true)
    expect(useStore.getState().viewAnimations).toBe(true)
  })
})
