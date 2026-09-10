import { registerCraft, type CraftModule } from '@dimcraft/core/craft'
import { KNIT_SYMBOLS } from './symbols/definitions'
import { applyTerminologyToDoc } from './symbols/terminology'
import { followSteps } from './geometry/rows'

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
}

registerCraft(knitCraft)
