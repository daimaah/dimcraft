import { create, type StoreApi, type UseBoundStore } from 'zustand'
import type {
  ChartDoc,
  EvenPlaceOptions,
  Guide,
  GuideKind,
  ProjectRecord,
  SymbolDef,
  Tool,
  Vec,
} from '../model/types'
import { createEmptyDoc, sanitizeDoc, uid } from '../model/doc'
import { guideCenter, guideSample } from '../geometry/guides'
import { placeEvenly } from '../geometry/placeEvenly'
import { legendItems } from '../geometry/legend'
import { buildClipboard, loadClipboard, pasteClipboardInto, saveClipboard } from '../model/clipboard'
import { contentBBox } from '../geometry/bounds'
import {
  bboxCenter,
  cornersBBox,
  distributeCentres,
  duplicatePlacements,
  mirrorPlacement,
  placementCorners,
  rotatePointAround,
  unionBBox,
} from '../geometry/transform'
import { longestSegment } from '../geometry/handles'
import { getDefMap } from '../symbols/registry'
import type { CraftModule } from '../craft'
import { getCraft } from '../craft'

export interface Viewport {
  x: number
  y: number
  zoom: number
}

export type DialogKind = 'place-evenly' | 'export' | 'preview' | 'instructions' | 'licenses' | 'pattern-import' | 'stitch-motions' | 'options' | 'changelog' | null

export interface DragPositions {
  placements: { id: string; x: number; y: number }[]
  texts: { id: string; x: number; y: number }[]
  brackets: { id: string; x1: number; y1: number; x2: number; y2: number }[]
  lines: { id: string; points: Vec[] }[]
}

const HISTORY_LIMIT = 100
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

interface EditorState {
  projectId: string | null
  projectName: string
  createdAt: number | null
  doc: ChartDoc
  past: ChartDoc[]
  future: ChartDoc[]
  savedAt: number | null

  tool: Tool
  armedSymbolId: string | null
  placingRotation: number
  placingScale: number
  polygonSides: number

  selPlacements: string[]
  selGuides: string[]
  selBrackets: string[]
  selTexts: string[]
  selLines: string[]

  viewport: Viewport
  snapEnabled: boolean
  gridVisible: boolean
  guidesVisible: boolean
  /** mirror the technique animations and follow order for left-handed crocheters */
  lefty: boolean
  /** animate collapsible bars and the zoom indicator in the design view */
  viewAnimations: boolean
  /** floating tool palette customization (layout, position, visibility, order) */
  palette: {
    rows: 1 | 2
    pos: { x: number; y: number } | null
    collapsed: boolean
    /** button ids in display order; null = default order */
    order: string[] | null
    /** hidden button ids */
    hidden: string[]
  }
  /** status bar clock in 24-hour format */
  clock24h: boolean
  /** the drag/collapse island ignores toolbar opacity and stays fully visible */
  islandFullOpacity: boolean
  /** opacity of the floating tool palette at rest, percent (30 minimum stays findable) */
  toolbarOpacity: number
  /** opacity while the pointer hovers the palette (>= resting value) */
  toolbarHoverOpacity: number
  /** symbol id a "show me how" button asked the stitch-motions dialog to open */
  motionRequest: string | null
  leftCollapsed: boolean
  rightCollapsed: boolean

  dialog: DialogKind
  placeEvenlyGuideId: string | null
  dragBase: ChartDoc | null
  cursor: Vec | null
  bracketStart: Vec | null

  setTool: (t: Tool) => void
  armSymbol: (symbolId: string) => void
  setPlacingRotation: (deg: number) => void
  setPlacingScale: (s: number) => void
  setPolygonSides: (n: number) => void
  setCursor: (p: Vec | null) => void
  setSelection: (
    part: Partial<Pick<EditorState, 'selPlacements' | 'selGuides' | 'selBrackets' | 'selTexts' | 'selLines'>>,
  ) => void
  setBracketStart: (p: Vec | null) => void

  stampPlacement: (x: number, y: number) => void
  updatePlacements: (ids: string[], patch: Partial<{ symbolId: string; rotation: number; scale: number; flip: boolean; x: number; y: number }>) => void

  beginDrag: () => void
  applyDragPositions: (payload: DragPositions) => void
  endDrag: () => void

  clearSelection: () => void
  deleteSelection: () => void
  duplicateSelection: () => void
  reorderPlacements: (mode: 'front' | 'back' | 'forward' | 'backward') => void
  copySelection: () => void
  cutSelection: () => void
  pasteClipboard: () => void
  groupSelection: () => void
  ungroupSelection: () => void
  mirrorSelection: (axis: 'h' | 'v') => void
  distributeSelection: (axis: 'x' | 'y') => void
  alignSelection: (axis: 'x' | 'y', mode: 'min' | 'center' | 'max') => void
  rotateSelection: (deltaDeg: number) => void
  nudge: (dx: number, dy: number) => void

  addLineFromPoints: (a: Vec, b: Vec) => void
  updateLine: (id: string, patch: Partial<{ closed: boolean; width: number }>) => void
  updateLineLive: (id: string, patch: Partial<{ points: Vec[]; closed: boolean; width: number }>) => void
  deleteLine: (id: string) => void
  insertLinePoint: (id: string) => void
  removeLastLinePoint: (id: string) => void

  addGuideDrawn: (kind: GuideKind, a: Vec, b: Vec, snap45: boolean) => void
  updateGuide: (id: string, patch: Partial<Guide>) => void
  updateGuideLive: (id: string, patch: Partial<Guide>) => void
  deleteGuide: (id: string) => void
  toggleGuideVisible: (id: string) => void
  placeEvenlyOnGuide: (guideId: string, symbolId: string, opts: EvenPlaceOptions) => void

  addBracketFromPoints: (a: Vec, b: Vec) => void
  updateBracket: (id: string, patch: Partial<{ count: number; label: string | undefined; side: 1 | -1 }>) => void
  deleteBracket: (id: string) => void
  sharedChart: { name: string; doc: ChartDoc; note?: string } | null
  setSharedChart: (s: { name: string; doc: ChartDoc; note?: string } | null) => void

  followActive: boolean
  followRound: number
  followTolerance: number
  /** index into the current round's working order; null = round granularity */
  followStitch: number | null
  followPlaying: boolean
  /** playback rate multiplier: 0.5 | 1 | 2 */
  followSpeed: number
  setFollow: (active: boolean) => void
  setFollowRound: (n: number) => void
  setFollowTolerance: (t: number) => void
  setFollowPlaying: (p: boolean) => void
  setFollowSpeed: (x: number) => void
  /** jump to a round + stitch cursor; persists only round changes to the doc */
  seekFollow: (round: number, stitch: number | null, playing?: boolean) => void

  setPlacementsVisible: (ids: string[], visible: boolean) => void
  setSymbolSet: (id: string) => void
  addCustomSet: (set: { id: string; name: string; artwork: Record<string, string>; license?: string; authors?: string; sourceUrl?: string; notes?: string }) => void
  applyTerminology: (presetId: string) => void
  setLegendLive: (patch: Partial<ChartDoc['legend']>) => void
  setGauge: (unitsPer10cm: number | null) => void

  addTextAt: (x: number, y: number) => void
  updateText: (id: string, patch: Partial<{ content: string; size: number; rotation: number }>) => void
  deleteText: (id: string) => void

  addCustomSymbol: (def: SymbolDef) => void
  removeCustomSymbol: (id: string) => void
  setLabelOverride: (symbolId: string, label: string) => void
  setLegend: (patch: Partial<ChartDoc['legend']>) => void
  setInk: (ink: string) => void

  undo: () => void
  redo: () => void

  setViewport: (vp: Viewport) => void
  zoomAt: (factor: number, screenX: number, screenY: number) => void
  fitView: (width: number, height: number) => void

  setSnap: (v: boolean) => void
  setLefty: (v: boolean) => void
  setViewAnimations: (v: boolean) => void
  setPalette: (patch: Partial<EditorState['palette']>) => void
  resetPalette: () => void
  setClock24h: (v: boolean) => void
  setIslandFullOpacity: (v: boolean) => void
  setToolbarOpacity: (v: number) => void
  setToolbarHoverOpacity: (v: number) => void
  requestMotion: (symbolId: string) => void
  requestMotionDone: () => void
  setGrid: (v: boolean) => void
  setGuidesVisible: (v: boolean) => void
  setLeftCollapsed: (v: boolean) => void
  setRightCollapsed: (v: boolean) => void

  openDialog: (kind: DialogKind, guideId?: string) => void
  closeDialog: () => void

  openProject: (rec: ProjectRecord) => void
  newProject: (name: string, doc?: ChartDoc) => string
  closeProject: () => void
  markSaved: (at: number) => void
}

function mutateDoc(state: EditorState, next: Partial<EditorState> & { doc: ChartDoc }) {
  return {
    ...next,
    past: [...state.past.slice(-(HISTORY_LIMIT - 1)), state.doc],
    future: [] as ChartDoc[],
  }
}

/** The editor store: one instance per app, created at boot with its craft. */
export type EditorStore = UseBoundStore<StoreApi<EditorState>>

// The first store an app creates *is* the app store; core-resident components
// (the canvas) reach it through here instead of an import-cycle-inducing
// singleton export.
let active: EditorStore | null = null

/** The app's store. Throws before createStore() has run. */
export function activeStore(): EditorStore {
  if (!active) throw new Error('No editor store created — the app must call createStore() at boot.')
  return active
}

export const createStore = (craft: CraftModule): EditorStore => {
  const store = create<EditorState>()((set, get) => {
  /** apply a mutation to a cloned doc, pushing history */
  const commit = (mut: (d: ChartDoc) => void, extra: Partial<EditorState> = {}) =>
    set((st) => {
      const doc = structuredClone(st.doc)
      mut(doc)
      return mutateDoc(st, { ...extra, doc })
    })

  /** apply a mutation without touching history (live drag updates) */
  const live = (mut: (d: ChartDoc) => void) =>
    set((st) => {
      const doc = structuredClone(st.doc)
      mut(doc)
      return { doc }
    })

  const clearSel = {
    selPlacements: [] as string[],
    selGuides: [] as string[],
    selBrackets: [] as string[],
    selTexts: [] as string[],
    selLines: [] as string[],
  }

  return {
    projectId: null,
    projectName: 'Untitled chart',
    createdAt: null,
    doc: createEmptyDoc(),
    past: [],
    future: [],
    savedAt: null,

    tool: 'select',
    armedSymbolId: craft.defaultSymbolId,
    placingRotation: 0,
    placingScale: 1,
    polygonSides: 4,

    selPlacements: [],
    selGuides: [],
    selBrackets: [],
    selTexts: [],
    selLines: [],

    viewport: { x: 0, y: 0, zoom: 1 },
    snapEnabled: true,
    gridVisible: true,
    guidesVisible: true,
    lefty: false,
    viewAnimations: true,
    palette: { rows: 1, pos: null, collapsed: false, order: null, hidden: [] },
    clock24h: false,
    islandFullOpacity: true,
    toolbarOpacity: 100,
    toolbarHoverOpacity: 100,
    motionRequest: null,

    dialog: null,
    placeEvenlyGuideId: null,
    dragBase: null,
    cursor: null,
    bracketStart: null,

    setTool: (t) => set({ tool: t }),
    armSymbol: (symbolId) => set({ armedSymbolId: symbolId, tool: 'place' }),
    setPlacingRotation: (deg) => set({ placingRotation: ((deg % 360) + 360) % 360 }),
    setPlacingScale: (s) => set({ placingScale: clamp(s, 0.2, 8) }),
    setPolygonSides: (n) => set({ polygonSides: clamp(Math.round(n), 3, 24) }),
    setCursor: (p) => set({ cursor: p }),
    setSelection: (part) => set(part),
    setBracketStart: (p) => set({ bracketStart: p }),

    stampPlacement: (x, y) =>
      set((st) => {
        const symbolId = st.armedSymbolId
        if (!symbolId) return {}
        const placement = {
          id: uid('p'),
          symbolId,
          x,
          y,
          rotation: st.placingRotation,
          scale: st.placingScale,
          flip: false,
        }
        return mutateDoc(st, {
          doc: { ...st.doc, placements: [...st.doc.placements, placement] },
          selPlacements: [placement.id],
          selGuides: [],
          selBrackets: [],
          selTexts: [],
        })
      }),

    updatePlacements: (ids, patch) =>
      commit((d) => {
        const idSet = new Set(ids)
        d.placements = d.placements.map((p) => (idSet.has(p.id) ? { ...p, ...patch } : p))
      }),

    beginDrag: () => set({ dragBase: get().doc }),

    applyDragPositions: (payload) =>
      live((d) => {
        const pm = new Map(payload.placements.map((e) => [e.id, e]))
        d.placements = d.placements.map((p) => {
          const e = pm.get(p.id)
          return e ? { ...p, x: e.x, y: e.y } : p
        })
        const tm = new Map(payload.texts.map((e) => [e.id, e]))
        d.texts = d.texts.map((t) => {
          const e = tm.get(t.id)
          return e ? { ...t, x: e.x, y: e.y } : t
        })
        const bm = new Map(payload.brackets.map((e) => [e.id, e]))
        d.brackets = d.brackets.map((b) => {
          const e = bm.get(b.id)
          return e ? { ...b, x1: e.x1, y1: e.y1, x2: e.x2, y2: e.y2 } : b
        })
        const lm = new Map(payload.lines.map((e) => [e.id, e]))
        d.lines = d.lines.map((l) => {
          const e = lm.get(l.id)
          return e ? { ...l, points: e.points } : l
        })
      }),

    endDrag: () =>
      set((st) => {
        if (!st.dragBase || st.dragBase === st.doc) return { dragBase: null }
        return {
          past: [...st.past.slice(-(HISTORY_LIMIT - 1)), st.dragBase],
          future: [],
          dragBase: null,
        }
      }),

    clearSelection: () => set({ ...clearSel }),

    deleteSelection: () =>
      set((st) => {
        const { selPlacements, selGuides, selBrackets, selTexts, selLines } = st
        if (!selPlacements.length && !selGuides.length && !selBrackets.length && !selTexts.length && !selLines.length)
          return {}
        const doc = structuredClone(st.doc)
        const ps = new Set(selPlacements)
        const gs = new Set(selGuides)
        const bs = new Set(selBrackets)
        const ts = new Set(selTexts)
        const ls = new Set(selLines)
        doc.placements = doc.placements.filter((p) => !ps.has(p.id))
        doc.guides = doc.guides.filter((g) => !gs.has(g.id))
        doc.brackets = doc.brackets.filter((b) => !bs.has(b.id))
        doc.texts = doc.texts.filter((t) => !ts.has(t.id))
        doc.lines = doc.lines.filter((l) => !ls.has(l.id))
        return mutateDoc(st, { doc, ...clearSel })
      }),

    duplicateSelection: () =>
      set((st) => {
        const sel = new Set(st.selPlacements)
        if (!sel.size) return {}
        const copies = duplicatePlacements(st.doc.placements.filter((p) => sel.has(p.id)))
        return mutateDoc(st, {
          doc: { ...st.doc, placements: [...st.doc.placements, ...copies] },
          selPlacements: copies.map((c) => c.id),
        })
      }),

    /** Stack order: later placements paint on top (SVG document order). */
    reorderPlacements: (mode) =>
      set((st) => {
        const sel = new Set(st.selPlacements)
        if (!sel.size) return {}
        const list = st.doc.placements
        let next: typeof list
        if (mode === 'front' || mode === 'back') {
          const picked = list.filter((p) => sel.has(p.id))
          const rest = list.filter((p) => !sel.has(p.id))
          next = mode === 'front' ? [...rest, ...picked] : [...picked, ...rest]
        } else {
          // one-slot nudge that keeps contiguous selections together
          next = [...list]
          if (mode === 'forward') {
            for (let i = next.length - 2; i >= 0; i--) {
              if (sel.has(next[i].id) && !sel.has(next[i + 1].id)) {
                ;[next[i], next[i + 1]] = [next[i + 1], next[i]]
              }
            }
          } else {
            for (let i = 1; i < next.length; i++) {
              if (sel.has(next[i].id) && !sel.has(next[i - 1].id)) {
                ;[next[i], next[i - 1]] = [next[i - 1], next[i]]
              }
            }
          }
        }
        // at the edge of the stack the order is unchanged — no empty undo step
        if (next.every((p, i) => p === list[i])) return {}
        return mutateDoc(st, { doc: { ...st.doc, placements: next } })
      }),

    // cross-project clipboard: fragment is saved to localStorage so it
    // survives switching projects (and browser restarts)
    copySelection: () =>
      set((st) => {
        const clip = buildClipboard(st.doc, st)
        if (clip) saveClipboard(clip)
        return {}
      }),

    cutSelection: () => {
      const clip = buildClipboard(get().doc, get())
      if (clip) saveClipboard(clip)
      get().deleteSelection()
    },

    pasteClipboard: () =>
      set((st) => {
        const clip = loadClipboard()
        if (!clip) return {}
        const { doc, selected } = pasteClipboardInto(st.doc, clip)
        return mutateDoc(st, { doc, ...selected })
      }),

    groupSelection: () =>
      set((st) => {
        const sel = new Set(st.selPlacements)
        if (sel.size < 2) return {}
        const groupId = uid('g')
        return mutateDoc(st, {
          doc: {
            ...st.doc,
            placements: st.doc.placements.map((p) => (sel.has(p.id) ? { ...p, groupId } : p)),
          },
        })
      }),

    ungroupSelection: () =>
      set((st) => {
        const sel = new Set(st.selPlacements)
        if (!sel.size) return {}
        return mutateDoc(st, {
          doc: {
            ...st.doc,
            placements: st.doc.placements.map((p) => (sel.has(p.id) ? { ...p, groupId: undefined } : p)),
          },
        })
      }),

    mirrorSelection: (axis) =>
      set((st) => {
        const sel = st.doc.placements.filter((p) => st.selPlacements.includes(p.id))
        if (!sel.length) return {}
        const defMap = getDefMap(st.doc)
        const boxes = sel
          .map((p) => {
            const def = defMap.get(p.symbolId)
            return def ? cornersBBox(placementCorners(p, def)) : null
          })
          .filter((b): b is NonNullable<typeof b> => b !== null)
        const center = bboxCenter(unionBBox(boxes) ?? { x: sel[0].x, y: sel[0].y, w: 0, h: 0 })
        // crafts with directional stitches swap them for their mirror image
        // (ssk ↔ k2tog) instead of flipping the artwork
        const swap = axis === 'v' ? getCraft().mirrorSymbol : undefined
        return mutateDoc(st, {
          doc: {
            ...st.doc,
            placements: st.doc.placements.map((p) => {
              if (!st.selPlacements.includes(p.id)) return p
              const m = mirrorPlacement(p, axis, center)
              if (!swap) return { ...p, ...m }
              return { ...p, x: m.x, y: m.y, rotation: m.rotation, flip: false, symbolId: swap(p.symbolId) }
            }),
          },
        })
      }),

    alignSelection: (axis, mode) =>
      set((st) => {
        const sel = st.doc.placements.filter((p) => st.selPlacements.includes(p.id))
        if (sel.length < 2) return {}
        const defMap = getDefMap(st.doc)
        const boxes = new Map<string, import('../geometry/transform').BBox>()
        for (const p of sel) {
          const def = defMap.get(p.symbolId)
          if (def) boxes.set(p.id, cornersBBox(placementCorners(p, def)))
        }
        const all = [...boxes.values()]
        if (all.length < 2) return {}
        const overall = unionBBox(all)!
        const targetMin = axis === 'x' ? overall.x : overall.y
        const targetCenter = axis === 'x' ? overall.x + overall.w / 2 : overall.y + overall.h / 2
        const targetMax = axis === 'x' ? overall.x + overall.w : overall.y + overall.h
        return mutateDoc(st, {
          doc: {
            ...st.doc,
            placements: st.doc.placements.map((p) => {
              const b = boxes.get(p.id)
              if (!b) return p
              const curMin = axis === 'x' ? b.x : b.y
              const curCenter = axis === 'x' ? b.x + b.w / 2 : b.y + b.h / 2
              const curMax = axis === 'x' ? b.x + b.w : b.y + b.h
              const delta =
                mode === 'min' ? targetMin - curMin : mode === 'center' ? targetCenter - curCenter : targetMax - curMax
              return axis === 'x' ? { ...p, x: p.x + delta } : { ...p, y: p.y + delta }
            }),
          },
        })
      }),

    addLineFromPoints: (a, b) =>
      set((st) => {
        const line = { id: uid('l'), points: [a, b], closed: false, width: 2.2 }
        return mutateDoc(st, {
          doc: { ...st.doc, lines: [...st.doc.lines, line] },
          selLines: [line.id],
          selPlacements: [],
          selGuides: [],
          selBrackets: [],
          selTexts: [],
        })
      }),

    updateLine: (id, patch) =>
      commit((d) => {
        d.lines = d.lines.map((l) => (l.id === id ? { ...l, ...patch } : l))
      }),

    updateLineLive: (id, patch) =>
      live((d) => {
        d.lines = d.lines.map((l) => (l.id === id ? { ...l, ...patch } : l))
      }),

    deleteLine: (id) =>
      commit((d) => {
        d.lines = d.lines.filter((l) => l.id !== id)
      }),

    insertLinePoint: (id) =>
      commit((d) => {
        const line = d.lines.find((l) => l.id === id)
        if (!line || line.points.length < 2) return
        const bestIdx = longestSegment(line)
        if (bestIdx < 0) return
        const a = line.points[bestIdx]
        const b = line.points[(bestIdx + 1) % line.points.length]
        const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
        line.points = [...line.points.slice(0, bestIdx + 1), mid, ...line.points.slice(bestIdx + 1)]
      }),

    removeLastLinePoint: (id) =>
      commit((d) => {
        const line = d.lines.find((l) => l.id === id)
        if (!line || line.points.length <= 2) return
        line.points = line.points.slice(0, -1)
      }),

    distributeSelection: (axis) =>
      set((st) => {
        const sel = st.doc.placements.filter((p) => st.selPlacements.includes(p.id))
        if (sel.length < 3) return {}
        const values = sel.map((p) => (axis === 'x' ? p.x : p.y))
        const targets = distributeCentres(values, axis)
        const targetMap = new Map(sel.map((p, i) => [p.id, targets[i]]))
        return mutateDoc(st, {
          doc: {
            ...st.doc,
            placements: st.doc.placements.map((p) => {
              const t = targetMap.get(p.id)
              if (t === undefined) return p
              return axis === 'x' ? { ...p, x: t } : { ...p, y: t }
            }),
          },
        })
      }),

    rotateSelection: (deltaDeg) =>
      set((st) => {
        const sel = st.doc.placements.filter((p) => st.selPlacements.includes(p.id))
        if (!sel.length) return {}
        const xs = sel.map((p) => p.x)
        const ys = sel.map((p) => p.y)
        const c = { x: xs.reduce((a, b) => a + b, 0) / xs.length, y: ys.reduce((a, b) => a + b, 0) / ys.length }
        return mutateDoc(st, {
          doc: {
            ...st.doc,
            placements: st.doc.placements.map((p) => {
              if (!st.selPlacements.includes(p.id)) return p
              const np = rotatePointAround(p, c, deltaDeg)
              return { ...p, x: np.x, y: np.y, rotation: ((p.rotation + deltaDeg) % 360 + 360) % 360 }
            }),
          },
        })
      }),

    nudge: (dx, dy) =>
      set((st) => {
        const sel = new Set([...st.selPlacements, ...st.selTexts])
        if (!sel.size) return {}
        const doc = structuredClone(st.doc)
        doc.placements = doc.placements.map((p) => (sel.has(p.id) ? { ...p, x: p.x + dx, y: p.y + dy } : p))
        doc.texts = doc.texts.map((t) => (sel.has(t.id) ? { ...t, x: t.x + dx, y: t.y + dy } : t))
        return mutateDoc(st, { doc })
      }),

    addGuideDrawn: (kind, a, b, snap45) => {
      const st = get()
      let guide: Guide
      const dist = Math.hypot(b.x - a.x, b.y - a.y)
      const ang = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI
      switch (kind) {
        case 'circle':
          guide = { id: uid('g'), kind: 'circle', cx: a.x, cy: a.y, r: Math.max(2, dist), visible: true }
          break
        case 'polygon':
          guide = {
            id: uid('g'),
            kind: 'polygon',
            cx: a.x,
            cy: a.y,
            r: Math.max(2, dist),
            n: st.polygonSides,
            rot: ang,
            visible: true,
          }
          break
        case 'arc':
          guide = {
            id: uid('g'),
            kind: 'arc',
            cx: a.x,
            cy: a.y,
            r: Math.max(2, dist),
            a0: -210,
            a1: 30,
            visible: true,
          }
          break
        case 'spiral':
          guide = {
            id: uid('g'),
            kind: 'spiral',
            cx: a.x,
            cy: a.y,
            r0: Math.max(2, dist * 0.12),
            r1: Math.max(4, dist),
            turns: 3,
            a0: ang,
            visible: true,
          }
          break
        case 'line': {
          let end = { x: b.x, y: b.y }
          if (snap45) {
            const len = Math.hypot(b.x - a.x, b.y - a.y)
            const step = Math.PI / 4
            const snapped = Math.round(Math.atan2(b.y - a.y, b.x - a.x) / step) * step
            end = { x: a.x + len * Math.cos(snapped), y: a.y + len * Math.sin(snapped) }
          }
          guide = { id: uid('g'), kind: 'line', x1: a.x, y1: a.y, x2: end.x, y2: end.y, visible: true }
          break
        }
      }
      set((s2) =>
        mutateDoc(s2, {
          doc: { ...s2.doc, guides: [...s2.doc.guides, guide] },
          selGuides: [guide.id],
          selPlacements: [],
          selBrackets: [],
          selTexts: [],
        }),
      )
    },

    updateGuide: (id, patch) =>
      commit((d) => {
        d.guides = d.guides.map((g) => (g.id === id ? ({ ...g, ...patch } as Guide) : g))
      }),

    updateGuideLive: (id, patch) =>
      live((d) => {
        d.guides = d.guides.map((g) => (g.id === id ? ({ ...g, ...patch } as Guide) : g))
      }),

    deleteGuide: (id) =>
      commit((d) => {
        d.guides = d.guides.filter((g) => g.id !== id)
      }),

    toggleGuideVisible: (id) =>
      commit((d) => {
        d.guides = d.guides.map((g) => (g.id === id ? { ...g, visible: !g.visible } : g))
      }),

    placeEvenlyOnGuide: (guideId, symbolId, opts) =>
      set((st) => {
        const guide = st.doc.guides.find((g) => g.id === guideId)
        if (!guide) return {}
        const sample = guideSample(guide)
        const spots = placeEvenly(sample, {
          count: opts.count,
          startOffset: opts.startOffset,
          rotationMode: opts.rotationMode,
          center: guideCenter(guide),
        })
        const kept = opts.mode === 'replace' ? st.doc.placements.filter((p) => p.guideTag !== guideId) : st.doc.placements
        const added = spots.map((s) => ({
          id: uid('p'),
          symbolId,
          x: s.pos.x,
          y: s.pos.y,
          rotation: s.angle,
          scale: opts.scale,
          flip: false,
          guideTag: guideId,
        }))
        return mutateDoc(st, {
          doc: { ...st.doc, placements: [...kept, ...added] },
          selPlacements: added.map((a) => a.id),
          selGuides: [],
          selBrackets: [],
          selTexts: [],
        })
      }),

    addBracketFromPoints: (a, b) =>
      set((st) => {
        // auto-count stitches lying near the chord
        const minx = Math.min(a.x, b.x) - 14
        const maxx = Math.max(a.x, b.x) + 14
        const miny = Math.min(a.y, b.y) - 14
        const maxy = Math.max(a.y, b.y) + 14
        const near = st.doc.placements.filter((p) => p.x >= minx && p.x <= maxx && p.y >= miny && p.y <= maxy)
        const count = Math.max(2, near.length)
        const bracket = {
          id: uid('b'),
          x1: a.x,
          y1: a.y,
          x2: b.x,
          y2: b.y,
          side: 1 as const,
          count,
        }
        return mutateDoc(st, {
          doc: { ...st.doc, brackets: [...st.doc.brackets, bracket] },
          selBrackets: [bracket.id],
          selPlacements: [],
          selGuides: [],
          selTexts: [],
        })
      }),

    updateBracket: (id, patch) =>
      commit((d) => {
        d.brackets = d.brackets.map((b) => (b.id === id ? { ...b, ...patch } : b))
      }),

    deleteBracket: (id) =>
      commit((d) => {
        d.brackets = d.brackets.filter((b) => b.id !== id)
      }),

    setLegendLive: (patch) =>
      live((d) => {
        d.legend = { ...d.legend, ...patch }
      }),

    setPlacementsVisible: (ids, visible) =>
      commit((d) => {
        const set = new Set(ids)
        d.placements = d.placements.map((p) => (set.has(p.id) ? { ...p, visible } : p))
      }),

    // follow mode: progress + tolerance live in the doc (autosaved) but are
    // navigation, so they deliberately bypass undo history. The stitch cursor
    // and playback state are session-only, so the chart schema stays untouched.
    sharedChart: null,
    setSharedChart: (s) => set({ sharedChart: s }),

    followActive: false,
    followRound: 0,
    followTolerance: 18,
    followStitch: null,
    followPlaying: false,
    followSpeed: 1,

    setFollow: (active) =>
      set((st) => {
        if (!active) return { followActive: false }
        const f = st.doc.follow
        return {
          followActive: true,
          followRound: f?.round ?? 0,
          followTolerance: f?.tolerance ?? 18,
          followStitch: null,
          followPlaying: false,
        }
      }),

    setFollowRound: (n) =>
      set((st) => {
        const round = Math.max(0, n)
        const doc = structuredClone(st.doc)
        doc.follow = { round, tolerance: st.followTolerance }
        return { followRound: round, doc, followStitch: null, followPlaying: false }
      }),

    setFollowTolerance: (t) =>
      set((st) => {
        const doc = structuredClone(st.doc)
        doc.follow = { round: st.followRound, tolerance: t }
        return { followTolerance: t, doc, followStitch: null, followPlaying: false }
      }),

    setFollowPlaying: (p) => set({ followPlaying: p }),

    setFollowSpeed: (x) => set({ followSpeed: x }),

    seekFollow: (round, stitch, playing) =>
      set((st) => {
        const nav = { followStitch: stitch, ...(playing === undefined ? null : { followPlaying: playing }) }
        if (round === st.followRound) return { ...nav }
        const doc = structuredClone(st.doc)
        doc.follow = { round, tolerance: st.followTolerance }
        return { followRound: round, doc, ...nav }
      }),

    setGauge: (unitsPer10cm) =>
      commit((d) => {
        d.unitsPer10cm = unitsPer10cm && unitsPer10cm > 0 ? unitsPer10cm : null
      }),

    setSymbolSet: (id) =>
      commit((d) => {
        d.symbolSet = id
      }),

    addCustomSet: (set) =>
      commit((d) => {
        d.customSets = [...(d.customSets ?? []).filter((s) => s.id !== set.id), set]
        d.symbolSet = set.id
      }),

    applyTerminology: (presetId) =>
      commit((d) => craft.applyTerminology(d, presetId)),

    addTextAt: (x, y) =>
      set((st) => {
        const t = { id: uid('t'), x, y, content: 'Round 1', size: 16, rotation: 0 }
        return mutateDoc(st, {
          doc: { ...st.doc, texts: [...st.doc.texts, t] },
          selTexts: [t.id],
          selPlacements: [],
          selGuides: [],
          selBrackets: [],
        })
      }),

    updateText: (id, patch) =>
      commit((d) => {
        d.texts = d.texts.map((t) => (t.id === id ? { ...t, ...patch } : t))
      }),

    deleteText: (id) =>
      commit((d) => {
        d.texts = d.texts.filter((t) => t.id !== id)
      }),

    addCustomSymbol: (def) =>
      commit((d) => {
        d.customSymbols = [...d.customSymbols, def]
      }),

    removeCustomSymbol: (id) =>
      commit((d) => {
        if (d.placements.some((p) => p.symbolId === id)) return
        d.customSymbols = d.customSymbols.filter((s) => s.id !== id)
        delete d.labelOverrides[id]
      }),

    setLabelOverride: (symbolId, label) =>
      commit((d) => {
        if (label.trim()) d.labelOverrides[symbolId] = label.trim()
        else delete d.labelOverrides[symbolId]
      }),

    setLegend: (patch) =>
      commit((d) => {
        d.legend = { ...d.legend, ...patch }
      }),

    setInk: (ink) =>
      commit((d) => {
        d.ink = ink
      }),

    undo: () =>
      set((st) => {
        if (!st.past.length) return {}
        const prev = st.past[st.past.length - 1]
        return {
          doc: prev,
          past: st.past.slice(0, -1),
          future: [st.doc, ...st.future.slice(0, HISTORY_LIMIT - 1)],
        }
      }),

    redo: () =>
      set((st) => {
        if (!st.future.length) return {}
        const next = st.future[0]
        return {
          doc: next,
          past: [...st.past.slice(-(HISTORY_LIMIT - 1)), st.doc],
          future: st.future.slice(1),
        }
      }),

    setViewport: (vp) => set({ viewport: vp }),

    zoomAt: (factor, sx, sy) =>
      set((st) => {
        const nz = clamp(st.viewport.zoom * factor, 0.04, 24)
        const k = nz / st.viewport.zoom
        return {
          viewport: {
            zoom: nz,
            x: sx - (sx - st.viewport.x) * k,
            y: sy - (sy - st.viewport.y) * k,
          },
        }
      }),

    fitView: (width, height) =>
      set((st) => {
        const defMap = getDefMap(st.doc)
        const bbox = contentBBox(st.doc, defMap, { includeGuides: true, includeInvisibleGuides: true })
        if (!bbox || bbox.w <= 0 || bbox.h <= 0) {
          return { viewport: { x: width / 2, y: height / 2, zoom: 1 } }
        }
        const zoom = clamp(Math.min((width - 140) / bbox.w, (height - 140) / bbox.h), 0.04, 2.5)
        return {
          viewport: {
            zoom,
            x: width / 2 - (bbox.x + bbox.w / 2) * zoom,
            y: height / 2 - (bbox.y + bbox.h / 2) * zoom,
          },
        }
      }),

    setSnap: (v) => set({ snapEnabled: v }),
    setLefty: (v) => set({ lefty: v }),
    setViewAnimations: (v) => set({ viewAnimations: v }),
    setPalette: (patch) => set((st) => ({ palette: { ...st.palette, ...patch } })),
    resetPalette: () =>
      set({ palette: { rows: 1, pos: null, collapsed: false, order: null, hidden: [] } }),
    setClock24h: (v) => set({ clock24h: v }),
    setIslandFullOpacity: (v) => set({ islandFullOpacity: v }),
    setToolbarOpacity: (v) =>
      set((st) => {
        const rest = Math.round(Math.min(100, Math.max(30, v)))
        // hover opacity always sits at or above the resting value
        const hover = Math.max(rest, st.toolbarHoverOpacity)
        return { toolbarOpacity: rest, toolbarHoverOpacity: hover }
      }),
    setToolbarHoverOpacity: (v) =>
      set((st) => {
        // never below the resting opacity
        const hover = Math.round(Math.min(100, Math.max(st.toolbarOpacity, v)))
        return { toolbarHoverOpacity: hover }
      }),
    requestMotion: (symbolId) => set({ motionRequest: symbolId, dialog: 'stitch-motions' }),
    requestMotionDone: () => set({ motionRequest: null }),
    setGrid: (v) => set({ gridVisible: v }),
    setGuidesVisible: (v) => set({ guidesVisible: v }),
    leftCollapsed: false,
    rightCollapsed: false,
    setLeftCollapsed: (v) => set({ leftCollapsed: v }),
    setRightCollapsed: (v) => set({ rightCollapsed: v }),

    openDialog: (kind, guideId) => set({ dialog: kind, placeEvenlyGuideId: guideId ?? null }),
    closeDialog: () => set({ dialog: null }),

    openProject: (rec) => {
      // migrate docs saved by older versions (missing fields, bad shapes)
      const doc = sanitizeDoc(rec.doc) ?? createEmptyDoc(rec.name || 'Recovered chart')
      doc.title = doc.title || rec.name
      set({
        projectId: rec.id,
        projectName: rec.name,
        createdAt: rec.createdAt ?? Date.now(),
        doc,
        past: [],
        future: [],
        savedAt: rec.updatedAt,
        ...clearSel,
        dialog: null,
        bracketStart: null,
      })
    },

    newProject: (name, doc) => {
      const id = uid('proj')
      set({
        projectId: id,
        projectName: name,
        createdAt: Date.now(),
        doc: doc ?? createEmptyDoc(name),
        past: [],
        future: [],
        savedAt: null,
        ...clearSel,
        dialog: null,
      })
      return id
    },

    closeProject: () =>
      set({
        projectId: null,
        projectName: 'Untitled chart',
        createdAt: null,
        ...clearSel,
        dialog: null,
        bracketStart: null,
      }),

    markSaved: (at) => set({ savedAt: at }),
  }
  })

  // the first store an app creates is *the* app store
  active ??= store
  return store
}

export function legendRowCount(doc: ChartDoc): number {
  return legendItems(doc, getDefMap(doc)).length
}

export function sanitizeProjectFile(text: string): { name: string; doc: ChartDoc } | null {
  try {
    const parsed = JSON.parse(text) as { name?: string; doc?: unknown } | unknown
    const docInput = (parsed as { doc?: unknown })?.doc ?? parsed
    const doc = sanitizeDoc(docInput)
    if (!doc) return null
    const name = (parsed as { name?: string }).name ?? doc.title
    return { name: name || 'Imported chart', doc }
  } catch {
    return null
  }
}
