import type { ChartDoc, SymbolDef } from '../model/types'
import { guidePoints } from './guides'
import { legendItems, yarnLegendItems } from './legend'
import { cornersBBox, placementCorners, textCorners, unionBBox, type BBox } from './transform'

export const LEGEND_W = 190
export const LEGEND_ROW_H = 26
// headroom below the legend title: the title's 15px text (baseline y=16,
// descenders to ~20) must clear the first row's symbol which scales up to
// rowY-9 — 26 collided, this adds the missing air
export const LEGEND_HEAD = 34

export function legendSize(doc: ChartDoc, defMap: Map<string, SymbolDef>): { w: number; h: number } {
  const rows = legendItems(doc, defMap).length + yarnLegendItems(doc).length
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
    if (p.visible === false) continue
    const def = defMap.get(p.symbolId)
    if (def) boxes.push(cornersBBox(placementCorners(p, def)))
  }
  for (const t of doc.texts) boxes.push(cornersBBox(textCorners(t)))
  for (const l of doc.lines) {
    if (l.points.length === 0) continue
    const xs = l.points.map((p) => p.x)
    const ys = l.points.map((p) => p.y)
    const pad = l.width
    boxes.push({
      x: Math.min(...xs) - pad,
      y: Math.min(...ys) - pad,
      w: Math.max(...xs) - Math.min(...xs) + pad * 2,
      h: Math.max(...ys) - Math.min(...ys) + pad * 2,
    })
  }
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
