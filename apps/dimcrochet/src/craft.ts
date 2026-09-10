import { registerCraft, type CraftModule, type PaletteToolDef } from '@dimcraft/core/craft'
import { BUILT_IN_SYMBOLS } from './symbols/definitions'
import { BUILTIN_SETS } from './symbols/sets'
import { TERMINOLOGY_PRESETS, applyTerminologyToDoc } from './symbols/terminology'
import { followSteps } from './geometry/instructions'

/** Tools of the floating action bar, in default display order. */
const PALETTE_TOOLS: PaletteToolDef[] = [
  { id: 'select', icon: 'select', label: 'Select & move', key: 'V' },
  { id: 'pan', icon: 'hand', label: 'Pan view', key: 'H' },
  { id: 'place', icon: 'place', label: 'Place symbol', key: 'P' },
  { id: 'line', icon: 'guide-line', label: 'Backstitch line', key: 'L' },
  { id: 'guide-circle', icon: 'guide-circle', label: 'Circle guide', key: '1' },
  { id: 'guide-arc', icon: 'guide-arc', label: 'Arc guide', key: '2' },
  { id: 'guide-spiral', icon: 'guide-spiral', label: 'Spiral guide', key: '3' },
  { id: 'guide-line', icon: 'guide-line', label: 'Line guide', key: '4' },
  { id: 'guide-polygon', icon: 'guide-polygon', label: 'Polygon guide', key: '5' },
  { id: 'bracket', icon: 'bracket', label: 'Repeat bracket', key: 'B' },
  { id: 'text', icon: 'text', label: 'Text label', key: 'T' },
]

/**
 * DimCrochet's craft: crochet — a diagram of the finished fabric, rounds
 * growing outward from the centre, read counterclockwise (right-handed).
 */
export const crochetCraft: CraftModule = {
  craft: 'crochet',
  baseSymbols: BUILT_IN_SYMBOLS,
  builtinSets: BUILTIN_SETS,
  defaultSymbolId: 'dc',
  applyTerminology: applyTerminologyToDoc,
  followSteps,
  paletteTools: PALETTE_TOOLS,
  terminologyPresets: TERMINOLOGY_PRESETS,
  symbolPacks: true,
  gauge: {
    label: 'Units / 10 cm',
    hint: (set, sizeHint) =>
      set
        ? `Gauge set — chart${sizeHint ? ` ${sizeHint}` : ''}. Enable “True scale” in the PDF export to print at this size.`
        : 'Optional gauge: how many chart units span 10 cm. Enables true-scale PDF printing.',
  },
}

registerCraft(crochetCraft)
