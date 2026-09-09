import type { ChartDoc, Vec } from '../model/types'
import { guideCenter, guideEndpoints } from './guides'

export type SnapKind = 'guide-end' | 'guide-center' | 'anchor' | 'grid'

export interface SnapTarget {
  pos: Vec
  kind: SnapKind
}

export function collectSnapTargets(doc: ChartDoc): SnapTarget[] {
  const targets: SnapTarget[] = []
  for (const g of doc.guides) {
    targets.push({ pos: guideCenter(g), kind: 'guide-center' })
    for (const e of guideEndpoints(g)) targets.push({ pos: e, kind: 'guide-end' })
  }
  for (const p of doc.placements) {
    if (p.visible === false) continue
    targets.push({ pos: { x: p.x, y: p.y }, kind: 'anchor' })
  }
  return targets
}

export function nearestTarget(pos: Vec, targets: SnapTarget[], radius: number): SnapTarget | null {
  let best: SnapTarget | null = null
  let bestD = radius
  for (const t of targets) {
    const d = Math.hypot(t.pos.x - pos.x, t.pos.y - pos.y)
    if (d <= bestD) {
      best = t
      bestD = d
    }
  }
  return best
}

export function snapToGrid(pos: Vec, grid: number): Vec {
  return { x: Math.round(pos.x / grid) * grid, y: Math.round(pos.y / grid) * grid }
}

const samePos = (a: Vec, b: Vec) => Math.abs(a.x - b.x) < 0.01 && Math.abs(a.y - b.y) < 0.01

/**
 * Snap a position, preferring structural targets (guide points, anchors) over
 * the grid. `ignore` skips a target the dragged element sits on (its own anchor).
 */
export function applySnap(
  pos: Vec,
  targets: SnapTarget[],
  radius: number,
  grid: number | null,
  ignore?: Vec,
): { pos: Vec; kind: SnapKind | null; target: SnapTarget | null } {
  for (const t of targets) {
    if (ignore && samePos(t.pos, ignore)) continue
    if (Math.hypot(t.pos.x - pos.x, t.pos.y - pos.y) <= radius) {
      return { pos: t.pos, kind: t.kind, target: t }
    }
  }
  if (grid) return { pos: snapToGrid(pos, grid), kind: 'grid', target: null }
  return { pos, kind: null, target: null }
}
