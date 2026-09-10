import { registerCraft, type CraftModule } from '@dimcraft/core/craft'
import { BUILT_IN_SYMBOLS } from './symbols/definitions'
import { BUILTIN_SETS } from './symbols/sets'
import { applyTerminologyToDoc } from './symbols/terminology'
import { followSteps } from './geometry/instructions'

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
}

registerCraft(crochetCraft)
