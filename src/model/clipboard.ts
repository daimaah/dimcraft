import type { ChartDoc, Guide, Placement, RepeatBracket, StitchLine, TextElement } from './types'
import { createEmptyDoc, uid } from './doc'

/**
 * Cross-project clipboard: a chart fragment (selected placements, guides,
 * lines, brackets, texts) saved to localStorage so it survives switching
 * projects — and even browser restarts. Guides referenced by copied
 * placements travel along so layer tags stay meaningful after a paste.
 */

export const CLIPBOARD_KEY = 'dimcrochet.clipboard'

export interface ChartClipboard {
  app: 'dimcrochet-clipboard'
  version: 1
  /** title of the chart the fragment was copied from */
  sourceTitle?: string
  placements: Placement[]
  guides: Guide[]
  lines: StitchLine[]
  brackets: RepeatBracket[]
  texts: TextElement[]
}

export interface Selection {
  selPlacements: string[]
  selGuides: string[]
  selBrackets: string[]
  selTexts: string[]
  selLines: string[]
}

// localStorage can be unavailable (node tests, storage errors) — fall back to memory
let memory: string | null = null

export function saveClipboard(clip: ChartClipboard): void {
  const json = JSON.stringify(clip)
  try {
    localStorage.setItem(CLIPBOARD_KEY, json)
  } catch {
    /* storage unavailable */
  }
  memory = json
}

export function loadClipboard(): ChartClipboard | null {
  let json: string | null = null
  try {
    json = localStorage.getItem(CLIPBOARD_KEY)
  } catch {
    /* storage unavailable */
  }
  json = json ?? memory
  if (!json) return null
  try {
    const parsed = JSON.parse(json) as ChartClipboard
    if (parsed?.app !== 'dimcrochet-clipboard' || parsed.version !== 1 || !Array.isArray(parsed.placements)) {
      return null
    }
    return parsed
  } catch {
    return null
  }
}

export function hasClipboard(): boolean {
  return loadClipboard() !== null
}

/** Snapshot the selected elements (plus guides the placements reference). */
export function buildClipboard(doc: ChartDoc, sel: Selection): ChartClipboard | null {
  const ps = new Set(sel.selPlacements)
  const gs = new Set(sel.selGuides)
  const bs = new Set(sel.selBrackets)
  const ts = new Set(sel.selTexts)
  const ls = new Set(sel.selLines)
  if (!ps.size && !gs.size && !bs.size && !ts.size && !ls.size) return null

  const placements = doc.placements.filter((p) => ps.has(p.id))
  const guides = doc.guides.filter((g) => gs.has(g.id))
  // placements tagged with a guide carry that guide along (layers stay intact)
  for (const p of placements) {
    if (p.guideTag) {
      const g = doc.guides.find((gd) => gd.id === p.guideTag)
      if (g && !guides.includes(g)) guides.push(g)
    }
  }
  return {
    app: 'dimcrochet-clipboard',
    version: 1,
    sourceTitle: doc.title,
    placements,
    guides,
    lines: doc.lines.filter((l) => ls.has(l.id)),
    brackets: doc.brackets.filter((b) => bs.has(b.id)),
    texts: doc.texts.filter((t) => ts.has(t.id)),
  }
}

export interface PasteResult {
  doc: ChartDoc
  selected: {
    selPlacements: string[]
    selGuides: string[]
    selBrackets: string[]
    selTexts: string[]
    selLines: string[]
  }
}

/** Append a clipboard fragment to a doc with fresh ids and a small offset. */
export function pasteClipboardInto(doc: ChartDoc, clip: ChartClipboard, dx = 20, dy = 20): PasteResult {
  // guides first: placements' layer tags remap onto the fresh guide ids
  const guideMap = new Map<string, string>()
  for (const g of clip.guides) guideMap.set(g.id, uid('g'))
  const groupMap = new Map<string, string>()
  for (const p of clip.placements) {
    if (p.groupId && !groupMap.has(p.groupId)) groupMap.set(p.groupId, uid('grp'))
  }

  const placements = clip.placements.map((p) => ({
    ...p,
    id: uid('p'),
    x: p.x + dx,
    y: p.y + dy,
    groupId: p.groupId ? groupMap.get(p.groupId) : undefined,
    guideTag: p.guideTag ? (guideMap.get(p.guideTag) ?? p.guideTag) : undefined,
  }))
  const guides = clip.guides.map((g) => ({ ...g, id: guideMap.get(g.id)! }))
  const lines = clip.lines.map((l) => ({ ...l, id: uid('l') }))
  const brackets = clip.brackets.map((b) => ({ ...b, id: uid('b') }))
  const texts = clip.texts.map((t) => ({ ...t, id: uid('t') }))

  return {
    doc: {
      ...doc,
      placements: [...doc.placements, ...placements],
      guides: [...doc.guides, ...guides],
      lines: [...doc.lines, ...lines],
      brackets: [...doc.brackets, ...brackets],
      texts: [...doc.texts, ...texts],
    },
    selected: {
      selPlacements: placements.map((p) => p.id),
      selGuides: guides.map((g) => g.id),
      selBrackets: brackets.map((b) => b.id),
      selTexts: texts.map((t) => t.id),
      selLines: lines.map((l) => l.id),
    },
  }
}

/** Convenience for the gallery: a brand-new doc holding the clipboard contents. */
export function docFromClipboard(): ChartDoc | null {
  const clip = loadClipboard()
  if (!clip) return null
  const name = clip.sourceTitle ? `Pasted: ${clip.sourceTitle}` : 'Pasted chart'
  return pasteClipboardInto(createEmptyDoc(name), clip, 0, 0).doc
}
