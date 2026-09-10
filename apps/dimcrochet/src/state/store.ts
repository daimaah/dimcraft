import { createStore } from '@dimcraft/core/state/store'
import { crochetCraft } from '../craft'

/** DimCrochet's editor store, bound to the crochet craft module. */
export const useStore = createStore(crochetCraft)
