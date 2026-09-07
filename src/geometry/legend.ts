import type { ChartDoc, SymbolDef } from '../model/types'

export interface LegendItem {
  symbolId: string
  label: string
  count: number
}

/**
 * Aggregate used symbols for the legend, ordered by first appearance in the
 * placement list. Label precedence: doc override → symbol def label.
 */
export function legendItems(doc: ChartDoc, defMap: Map<string, SymbolDef>): LegendItem[] {
  const order: string[] = []
  const counts = new Map<string, number>()
  for (const p of doc.placements) {
    const c = counts.get(p.symbolId) ?? 0
    if (c === 0) order.push(p.symbolId)
    counts.set(p.symbolId, c + 1)
  }
  return order
    .filter((id) => defMap.has(id))
    .map((symbolId) => ({
      symbolId,
      label: doc.labelOverrides[symbolId] ?? defMap.get(symbolId)!.label,
      count: counts.get(symbolId) ?? 0,
    }))
}
