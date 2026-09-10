import type { CustomSet, SymbolDef } from '../model/types'
import { getCraft } from '../craft'

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
  artwork: Record<string, string>
}

/** A doc may reference bundled sets by id or carry its own imported packs. */
export function resolveSet(doc: { symbolSet?: string; customSets?: CustomSet[] }): {
  id: string
  name: string
  artwork: Record<string, string>
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
export function applySetToDefs(defs: Map<string, SymbolDef>, artwork: Record<string, string>): Map<string, SymbolDef> {
  const out = new Map(defs)
  for (const [id, content] of Object.entries(artwork)) {
    const existing = out.get(id)
    if (existing) out.set(id, { ...existing, content })
    else out.set(id, { id, name: id, label: id, content, bbox: { x: 3, y: 4, w: 18, h: 26 } })
  }
  return out
}
