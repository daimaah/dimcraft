import { registerCraft, type CraftModule, type PaletteToolDef } from '@dimcraft/core/craft'
import { KNIT_SYMBOLS } from './symbols/definitions'
import { applyTerminologyToDoc } from './symbols/terminology'
import { followSteps, mirrorSymbol } from './geometry/rows'

/** Tools of the floating action bar. Knitting charts are cell grids — the
 *  freeform line/guide/bracket/text tools join when a feature needs them. */
const PALETTE_TOOLS: PaletteToolDef[] = [
  { id: 'select', icon: 'select', label: 'Select & move', key: 'V' },
  { id: 'pan', icon: 'hand', label: 'Pan view', key: 'H' },
  { id: 'place', icon: 'place', label: 'Place stitch', key: 'P' },
]

/**
 * DimKnit's craft: knitting — an operation matrix on a stitch grid, rows
 * read serpentine (RS rows right-to-left, WS rows left-to-right), with each
 * cell worked as its RS symbol on right-side rows and the reverse on
 * wrong-side rows.
 */
export const knitCraft: CraftModule = {
  craft: 'knit',
  baseSymbols: KNIT_SYMBOLS,
  builtinSets: [
    {
      id: 'standard',
      name: 'Standard (CYC-style)',
      description: 'Craft Yarn Council-style knitting chart symbols.',
      license: 'MIT — original artwork for DimKnit',
      artwork: {},
    },
  ],
  defaultSymbolId: 'k',
  applyTerminology: applyTerminologyToDoc,
  followSteps,
  paletteTools: PALETTE_TOOLS,
  mirrorSymbol,
  // one bundled set, no packs, no terminology presets, and no gauge until a
  // feature consumes it (true-scale PDF, gauge-correct cells) — no dead UI
  terminologyPresets: [],
  symbolPacks: false,
  colourwork: true,
  replaceOnStamp: true,
}

registerCraft(knitCraft)
