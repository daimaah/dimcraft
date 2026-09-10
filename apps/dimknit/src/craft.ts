import { registerCraft, type CraftModule, type PaletteToolDef } from '@dimcraft/core/craft'
import { KNIT_SYMBOLS } from './symbols/definitions'
import { applyTerminologyToDoc } from './symbols/terminology'
import { followSteps, gridInfo, mirrorSymbol } from './geometry/rows'

/** Tools of the floating action bar. Knitting charts are cell grids — the
 *  freeform line/text tools join when a feature needs them. */
const PALETTE_TOOLS: PaletteToolDef[] = [
  { id: 'select', icon: 'select', label: 'Select & move', key: 'V' },
  { id: 'pan', icon: 'hand', label: 'Pan view', key: 'H' },
  { id: 'place', icon: 'place', label: 'Place stitch', key: 'P' },
  { id: 'bracket', icon: 'bracket', label: 'Repeat bracket', key: 'B' },
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
  // one bundled set, no packs and no terminology presets, and the gauge stays
  // hidden until set — no dead UI
  terminologyPresets: [],
  symbolPacks: false,
  colourwork: true,
  replaceOnStamp: true,
  rowsAndColumns: true,
  roundSupport: true,
  gridInfo,
  gauge: {
    label: 'Stitches / 10 cm',
    label2: 'Rows / 10 cm',
    // the user enters stitch/row counts; the doc stores chart units per 10 cm
    // (one cell = FRAME.w units), which is what true-scale PDF speaks
    unitScale: 24,
    hint: (set, sizeHint) =>
      set
        ? `Gauge set${sizeHint ? ` — chart ${sizeHint}` : ''}. Enable “True scale” in the PDF export to print at this size; the chart cells already show the stitch aspect.`
        : 'Optional gauge: stitches and rows per 10 cm. Corrects the cell aspect and enables true-scale PDF printing.',
  },
}

registerCraft(knitCraft)
