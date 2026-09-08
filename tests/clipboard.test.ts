import { beforeEach, describe, expect, it } from 'vitest'
import {
  buildClipboard,
  docFromClipboard,
  hasClipboard,
  loadClipboard,
  pasteClipboardInto,
  saveClipboard,
} from '../src/model/clipboard'
import { useStore } from '../src/state/store'
import { createEmptyDoc } from '../src/model/doc'
import type { CircleGuide, ChartDoc, Placement } from '../src/model/types'

const guide: CircleGuide = { id: 'g-A', kind: 'circle', cx: 0, cy: 0, r: 100, visible: true, name: 'Ring A' }

const placement = (id: string, over: Partial<Placement> = {}): Placement => ({
  id,
  symbolId: 'dc',
  x: 100,
  y: 0,
  rotation: 0,
  scale: 1,
  flip: false,
  ...over,
})

const docWith = (): ChartDoc => {
  const doc = createEmptyDoc('Doc A')
  doc.guides.push(guide)
  doc.placements.push(placement('p1', { guideTag: 'g-A', groupId: 'grp-1' }))
  doc.placements.push(placement('p2', { guideTag: 'g-A', groupId: 'grp-1' }))
  return doc
}

const selection = {
  selPlacements: ['p1', 'p2'],
  selGuides: [],
  selBrackets: [],
  selTexts: [],
  selLines: [],
}

beforeEach(() => {
  useStore.getState().newProject('Test')
})

describe('clipboard model', () => {
  it('carries referenced guides even when only stitches are selected', () => {
    const clip = buildClipboard(docWith(), selection)!
    expect(clip.placements).toHaveLength(2)
    expect(clip.guides.map((g) => g.id)).toEqual(['g-A'])
    expect(clip.sourceTitle).toBe('Doc A')
  })

  it('returns null for an empty selection', () => {
    expect(buildClipboard(docWith(), { ...selection, selPlacements: [] })).toBeNull()
    expect(hasClipboard()).toBe(false)
  })

  it('survives save/load and clears gracefully', () => {
    saveClipboard(buildClipboard(docWith(), selection)!)
    expect(hasClipboard()).toBe(true)
    const loaded = loadClipboard()!
    expect(loaded.placements.map((p) => p.id)).toEqual(['p1', 'p2'])
  })

  it('pastes with fresh ids, remapped tags/groups, and an offset', () => {
    const clip = buildClipboard(docWith(), selection)!
    const target = createEmptyDoc('Doc B')
    const { doc, selected } = pasteClipboardInto(target, clip, 20, 10)
    expect(doc.placements).toHaveLength(2)
    // fresh ids, offset applied
    expect(doc.placements.every((p) => !['p1', 'p2'].includes(p.id))).toBe(true)
    expect(doc.placements[0].x).toBe(120)
    expect(doc.placements[0].y).toBe(10)
    // group kept together under one new id
    expect(doc.placements[0].groupId).toBeTruthy()
    expect(doc.placements[0].groupId).toBe(doc.placements[1].groupId)
    // guide came along and layer tags point at the fresh guide
    const pastedGuide = doc.guides.find((g) => g.id !== 'g-A') as CircleGuide
    expect(pastedGuide.name).toBe('Ring A')
    expect(doc.placements.every((p) => p.guideTag === pastedGuide.id)).toBe(true)
    expect(selected.selPlacements).toHaveLength(2)
  })

  it('names pasted docs after the source chart', () => {
    saveClipboard(buildClipboard(docWith(), selection)!)
    const doc = docFromClipboard()!
    expect(doc.title).toBe('Pasted: Doc A')
  })
})

describe('cross-project copy/paste in the store', () => {
  it('copies in project A and pastes into project B', () => {
    // project A: ring guide + two tagged stitches, both selected
    const st = useStore.getState()
    useStore.setState({ doc: { ...st.doc, guides: [guide], placements: [placement('p1', { guideTag: 'g-A' }), placement('p2', { guideTag: 'g-A' })] } })
    useStore.setState({ selPlacements: ['p1', 'p2'] })
    useStore.getState().copySelection()
    expect(useStore.getState().doc.placements).toHaveLength(2) // copy does not mutate

    // switch to a fresh project B
    useStore.getState().newProject('Project B')
    expect(useStore.getState().doc.placements).toHaveLength(0)
    useStore.getState().pasteClipboard()

    const doc = useStore.getState().doc
    expect(doc.placements).toHaveLength(2)
    expect(doc.placements[0].x).toBe(120) // original x=100 + 20 offset
    // pasted stitches are selected so they can be moved right away
    expect(useStore.getState().selPlacements).toHaveLength(2)

    // paste is one undo step
    useStore.getState().undo()
    expect(useStore.getState().doc.placements).toHaveLength(0)
    useStore.getState().redo()
    expect(useStore.getState().doc.placements).toHaveLength(2)
  })

  it('cut removes the source selection and keeps it on the clipboard', () => {
    const st = useStore.getState()
    useStore.setState({ doc: { ...st.doc, placements: [placement('p1'), placement('p2')] }, selPlacements: ['p1'] })
    useStore.getState().cutSelection()
    expect(useStore.getState().doc.placements.map((p) => p.id)).toEqual(['p2'])
    useStore.getState().newProject('Other')
    useStore.getState().pasteClipboard()
    expect(useStore.getState().doc.placements).toHaveLength(1)
  })
})
