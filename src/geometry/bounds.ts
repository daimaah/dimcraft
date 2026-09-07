import type { ChartDoc, SymbolDef } from '../model/types'
import { guidePoints } from './guides'
import { legendItems } from './legend'
import { cornersBBox, placementCorners, textCorners, unionBBox, type BBox } from './transform'

export const LEGEND_W = 190
export const LEGEND_ROW_H = 26
export const LEGEND_HEAD = 26

export function legendSize(doc: ChartDoc, defMap: Map<string, SymbolDef>): { w: number; h: number } {
  const rows = legendItems(doc, defMap).length
  return { w: LEGEND_W * doc.legend.scale, h: (LEGEND_HEAD + rows * LEGEND_ROW_H + 8) * doc.legend.scale }
}

export interface BoundsOptions {
  includeGuides?: boolean
  includeLegend?: boolean
  includeInvisibleGuides?: boolean
}

/** Bounding box of everything that will appear on the chart/export. */
export function contentBBox(doc: ChartDoc, defMap: Map<string, SymbolDef>, opts: BoundsOptions = {}): BBox | null {
  const boxes: BBox[] = []
  for (const p of doc.placements) {
    const def = defMap.get(p.symbolId)
    if (def) boxes.push(cornersBBox(placementCorners(p, def)))
  }
  for (const t of doc.texts) boxes.push(cornersBBox(textCorners(t)))
  for (const b of doc.brackets) {
    boxes.push({
      x: Math.min(b.x1, b.x2) - 8,
      y: Math.min(b.y1, b.y2) - 40,
      w: Math.abs(b.x2 - b.x1) + 16,
      h: Math.abs(b.y2 - b.y1) + 56,
    })
  }
  if (opts.includeLegend !== false && doc.legend.visible) {
    const s = legendSize(doc, defMap)
    boxes.push({ x: doc.legend.x, y: doc.legend.y, w: s.w, h: s.h })
  }
  if (opts.includeGuides) {
    for (const g of doc.guides) {
      if (!g.visible && !opts.includeInvisibleGuides) continue
      const { pts } = guidePoints(g)
      if (pts.length === 0) continue
      const xs = pts.map((p) => p.x)
      const ys = pts.map((p) => p.y)
      boxes.push({ x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) })
    }
  }
  return unionBBox(boxes)
}
