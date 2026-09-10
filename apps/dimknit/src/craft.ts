import { registerCraft, type CraftModule, type PaletteToolDef } from '@dimcraft/core/craft'
import { DROPS_ARTWORK, FABRIC_ARTWORK, KNIT_SYMBOLS } from './symbols/definitions'
import { applyTerminologyToDoc, TERMINOLOGY_PRESETS } from './symbols/terminology'
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
    {
      id: 'fabric',
      name: 'Fabric (visual)',
      description: 'Knit cells as V-stitch columns and purls as bumps — a visual fabric view; crossings stay symbolic.',
      license: 'MIT — original artwork for DimKnit',
      artwork: FABRIC_ARTWORK,
    },
    {
      id: 'drops',
      name: 'DROPS (Garnstudio-style)',
      description:
        'Symbols as DROPS (Garnstudio) diagrams draw them: crossed purl with a centre dot, oval yarn over, full-cell decrease slashes and a solid triangle for the centred double decrease.',
      license: 'MIT — original artwork for DimKnit, following the published DROPS chart conventions',
      sourceUrl: 'https://www.garnstudio.com/pattern.php?id=9166&cid=11',
      artwork: DROPS_ARTWORK,
    },
  ],
  defaultSymbolId: 'k',
  applyTerminology: applyTerminologyToDoc,
  followSteps,
  paletteTools: PALETTE_TOOLS,
  mirrorSymbol,
  // one bundled set, no packs and no terminology presets, and the gauge stays
  // hidden until set — no dead UI
  terminologyPresets: TERMINOLOGY_PRESETS,
  symbolPacks: false,
  colourwork: true,
  replaceOnStamp: true,
  rowsAndColumns: true,
  roundSupport: true,
  grading: true,
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
