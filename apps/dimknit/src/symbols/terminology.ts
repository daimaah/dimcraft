import type { ChartDoc } from '@dimcraft/core/model/types'

/**
 * Knitting abbreviations are broadly universal (k, p, yo, k2tog, ssk…),
 * unlike the crochet US/UK ladder — so v1 ships a single identity preset
 * and the terminology action simply clears any hand-edited overrides.
 */

export function applyTerminologyToDoc(doc: ChartDoc, _presetId: string): void {
  doc.labelOverrides = {}
}

export const TERMINOLOGY_PRESETS = [{ id: 'universal', name: 'Universal knitting abbreviations' }] as const
