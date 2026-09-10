import type { CustomSet, SymbolDef } from '../model/types'
import { getCraft } from '../craft'

/**
 * One bundled artwork override: plain SVG content in frame coordinates, or
 * an object that also carries the glyph's visible bbox. The bbox frames the
 * palette tile, the legend swatch and the selection ring, so a set that
 * redraws a symbol at a different size (a purl dot grown into a full crossed
 * cell) overrides it; plain strings keep the base symbol's bbox. Imported
 * packs stay string-only — the persisted interchange format doesn't change.
 */
export type ArtworkOverride = string | { content: string; bbox?: SymbolDef['bbox'] }

/**
 * Bundled symbol sets: alternative artwork per built-in symbol id.
 * Ids not present in a set's artwork fall back to the first bundled set,
 * so a set only has to redefine the stitches it draws differently.
 */
export interface BuiltinSet {
  id: string
  name: string
  description: string
  license: string
  authors?: string
  sourceUrl?: string
  notes?: string
  artwork: Record<string, ArtworkOverride>
}

/** A doc may reference bundled sets by id or carry its own imported packs. */
export function resolveSet(doc: { symbolSet?: string; customSets?: CustomSet[] }): {
  id: string
  name: string
  artwork: Record<string, ArtworkOverride>
  license?: string
  authors?: string
  sourceUrl?: string
  notes?: string
} {
  const id = doc.symbolSet ?? 'standard'
  const custom = doc.customSets?.find((s) => s.id === id)
  if (custom) return { ...custom }
  const bundled = getCraft().builtinSets
  return bundled.find((s) => s.id === id) ?? bundled[0]
}

/** A set may also *add* symbols: unknown ids become new palette entries. */
export function applySetToDefs(defs: Map<string, SymbolDef>, artwork: Record<string, ArtworkOverride>): Map<string, SymbolDef> {
  const out = new Map(defs)
  for (const [id, override] of Object.entries(artwork)) {
    const content = typeof override === 'string' ? override : override.content
    const bbox = typeof override === 'string' ? undefined : override.bbox
    const existing = out.get(id)
    if (existing) out.set(id, { ...existing, content, ...(bbox ? { bbox } : {}) })
    else out.set(id, { id, name: id, label: id, content, bbox: bbox ?? { x: 3, y: 4, w: 18, h: 26 } })
  }
  return out
}
