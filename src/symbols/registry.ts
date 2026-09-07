import { FRAME, type ChartDoc, type SymbolDef } from '../model/types'
import { BUILT_IN_MAP } from './definitions'
import { applySetToDefs, resolveSet } from './sets'

export { BUILT_IN_SYMBOLS, BUILT_IN_MAP } from './definitions'

/** Built-in symbols with the document's symbol set applied (for the palette). */
export function builtInDefsFor(doc: { symbolSet?: string; customSets?: CustomSetLike[] }): SymbolDef[] {
  return [...applySetToDefs(new Map<string, SymbolDef>(BUILT_IN_MAP), resolveSet(doc).artwork).values()]
}

type CustomSetLike = { id: string; name: string; artwork: Record<string, string> }

/** All symbols available in a document: set-styled built-ins plus custom symbols. */
export function getDefMap(doc: ChartDoc): Map<string, SymbolDef> {
  const map = new Map<string, SymbolDef>(BUILT_IN_MAP)
  for (const s of doc.customSymbols) map.set(s.id, s)
  return applySetToDefs(map, resolveSet(doc).artwork)
}

/** Symbol markup with the ink colour baked in. */
export function symbolInner(def: SymbolDef, ink: string): string {
  return def.content.replaceAll('@INK@', ink)
}

/**
 * Normalise an uploaded SVG into a SymbolDef drawn in the shared frame.
 * The artwork is scaled to fit 22×22 and centred with its bottom on the anchor.
 */
export function normalizeCustomSvg(svgText: string, id: string, fallbackName = 'Custom symbol'): SymbolDef | null {
  const doc = new DOMParser().parseFromString(svgText, 'image/svg+xml')
  if (doc.querySelector('parsererror')) return null
  let root = doc.documentElement
  if (!root || root.nodeName.toLowerCase() !== 'svg') {
    const wrapper = new DOMParser().parseFromString(
      `<svg xmlns="http://www.w3.org/2000/svg">${svgText}</svg>`,
      'image/svg+xml',
    )
    if (wrapper.querySelector('parsererror')) return null
    root = wrapper.documentElement
  }

  // strip anything executable or external
  root.querySelectorAll('script, style, foreignObject, image, iframe, object, embed').forEach((n) => n.remove())
  root.querySelectorAll('*').forEach((n) => {
    for (const attr of Array.from(n.attributes)) {
      const name = attr.name.toLowerCase()
      if (name.startsWith('on')) n.attributes.removeNamedItem(attr.name)
      else if ((name === 'href' || name === 'xlink:href') && !attr.value.trim().startsWith('#'))
        n.attributes.removeNamedItem(attr.name)
    }
  })

  const vb = root.getAttribute('viewBox')
  let w = 0
  let h = 0
  if (vb) {
    const parts = vb.split(/[\s,]+/).map(Number)
    if (parts.length === 4 && parts.every((v) => Number.isFinite(v))) {
      w = parts[2]
      h = parts[3]
    }
  }
  if (!w || !h) {
    w = parseFloat(root.getAttribute('width') ?? '') || 24
    h = parseFloat(root.getAttribute('height') ?? '') || 24
  }
  const scale = Math.min(22 / h, 22 / w)
  const sw = w * scale
  const sh = h * scale
  const tx = FRAME.ax - sw / 2
  const ty = FRAME.ay - sh

  const name = root.getAttribute('data-name') ?? fallbackName
  return {
    id,
    name,
    label: name,
    custom: true,
    content: `<g transform="translate(${tx} ${ty}) scale(${scale})">${root.innerHTML}</g>`,
    bbox: { x: tx, y: ty, w: sw, h: sh },
  }
}
