import type { CustomSet, SymbolDef } from '@dimcraft/core/model/types'
import { commonsVariantsPack } from './generated/commons-variants'

/**
 * Bundled symbol sets: alternative artwork per built-in symbol id.
 * Ids not present in a set's artwork fall back to the Standard set,
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

const J = 'fill="none" stroke="@INK@" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"'
const jdot = (cx: number, cy: number, r: number) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="@INK@" stroke="none"/>`

const S = 'fill="none" stroke="@INK@" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"'

export const BUILTIN_SETS: BuiltinSet[] = [
  {
    id: 'standard',
    name: 'Standard (CYC-style)',
    description: 'Craft Yarn Council-style symbols used across Western patterns.',
    license: 'MIT — original artwork for DimCrochet',
    artwork: {},
  },
  {
    id: 'japanese',
    name: 'Japanese-style',
    description: 'Heavier strokes and filled top dots, inspired by Japanese chart traditions. Community-validated packs may add authentic national sets.',
    license: 'MIT — original artwork for DimCrochet',
    artwork: {
      ch: `<ellipse cx="12" cy="23" rx="4.8" ry="7.2" ${J}/>`,
      slst: jdot(12, 27, 3.2),
      sc: `<path d="M 7 21 L 17 31 M 17 21 L 7 31" ${J}/>`,
      hdc: `<path d="M 12 30 L 12 16.5" ${J}/><path d="M 5.8 16.5 L 18.2 16.5" ${J}/>${jdot(12, 15.4, 1.7)}`,
      dc: `<path d="M 12 30 L 12 11.5" ${J}/><path d="M 5.8 11.5 L 18.2 11.5" ${J}/><path d="M 6.8 23.5 L 17.2 18.2" ${J}/>${jdot(12, 10.4, 1.7)}`,
      tr: `<path d="M 12 30 L 12 7.5" ${J}/><path d="M 5.4 7.5 L 18.6 7.5" ${J}/><path d="M 6.8 21.8 L 17.2 16.6" ${J}/><path d="M 7.4 14.4 L 16.6 9.8" ${J}/>${jdot(12, 6.4, 1.7)}`,
      dtr: `<path d="M 12 30 L 12 4" ${J}/><path d="M 5 4 L 19 4" ${J}/><path d="M 6.8 22.6 L 17.2 17.6" ${J}/><path d="M 7.2 15.6 L 16.8 11" ${J}/><path d="M 7.6 8.9 L 16.4 4.7" ${J}/>${jdot(12, 2.9, 1.7)}`,
      trtr: `<path d="M 12 30 L 12 2.4" ${J}/><path d="M 5 2.4 L 19 2.4" ${J}/><path d="M 6.6 23 L 17.4 18.2" ${J}/><path d="M 7 16.2 L 17 11.8" ${J}/><path d="M 7.4 9.6 L 16.6 5.6" ${J}/><path d="M 7.8 4.6 L 16.2 1.2" ${J}/>${jdot(12, 1.2, 1.6)}`,
      magicring: `<circle cx="12" cy="22" r="6.4" ${J}/><path d="M 16.8 17.2 L 19.8 13.6" ${J}/>`,
    },
  },
  {
    id: 'solid',
    name: 'Solid print',
    description: 'Fat filled strokes for high-contrast printing and low vision.',
    license: 'MIT — original artwork for DimCrochet',
    artwork: {
      ch: `<ellipse cx="12" cy="23" rx="4.4" ry="6.6" ${S}/>`,
      slst: `<circle cx="12" cy="27" r="3.4" fill="@INK@" stroke="none"/>`,
      sc: `<path d="M 7 21.5 L 17 31 M 17 21.5 L 7 31" ${S.replace('5"', '4.6"')}/>`,
      hdc: `<path d="M 12 30 L 12 16.5" ${S}/><path d="M 5.5 16.5 L 18.5 16.5" ${S}/>`,
      dc: `<path d="M 12 30 L 12 11.5" ${S}/><path d="M 5.5 11.5 L 18.5 11.5" ${S}/><path d="M 6.5 24 L 17.5 18.5" ${S}/>`,
      tr: `<path d="M 12 30 L 12 7.5" ${S}/><path d="M 5.4 7.5 L 18.6 7.5" ${S}/><path d="M 6.5 22 L 17.5 16.8" ${S}/><path d="M 7.2 14.2 L 16.8 9.8" ${S}/>`,
      dtr: `<path d="M 12 30 L 12 4" ${S}/><path d="M 5 4 L 19 4" ${S}/><path d="M 6.5 22.8 L 17.5 17.8" ${S}/><path d="M 7 15.6 L 17 11.2" ${S}/><path d="M 7.4 8.8 L 16.6 4.8" ${S}/>`,
      trtr: `<path d="M 12 30 L 12 2.4" ${S}/><path d="M 5 2.4 L 19 2.4" ${S}/><path d="M 6.5 23 L 17.5 18.4" ${S}/><path d="M 7 16 L 17 11.8" ${S}/><path d="M 7.2 9.4 L 16.8 5.6" ${S}/><path d="M 7.6 4.4 L 16.4 1.6" ${S}/>`,
      magicring: `<circle cx="12" cy="22" r="6.2" stroke="@INK@" stroke-width="5.4" fill="none"/><path d="M 16.6 17 L 19.6 13.6" fill="none" stroke="@INK@" stroke-width="4.4" stroke-linecap="round"/>`,
    },
  },
  {
    id: commonsVariantsPack.id,
    name: commonsVariantsPack.name,
    description:
      commonsVariantsPack.notes ??
      'International and variant stitch symbols curated from Wikimedia Commons.',
    license: commonsVariantsPack.license ?? 'Per-file free licenses (see attributions)',
    authors: commonsVariantsPack.authors,
    sourceUrl: commonsVariantsPack.sourceUrl,
    notes: commonsVariantsPack.notes,
    artwork: commonsVariantsPack.artwork,
  },
]

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
  return BUILTIN_SETS.find((s) => s.id === id) ?? BUILTIN_SETS[0]
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
