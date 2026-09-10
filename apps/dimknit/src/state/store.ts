import { createStore } from '@dimcraft/core/state/store'
import { knitCraft } from '../craft'

/** DimKnit's editor store, bound to the knit craft module. */
export const useStore = createStore(knitCraft)
