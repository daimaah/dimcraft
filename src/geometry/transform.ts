import { FRAME, type Placement, type SymbolDef, type TextElement, type Vec } from '../model/types'
import { uid } from '../model/doc'

export interface BBox {
  x: number
  y: number
  w: number
  h: number
}

export function rotatePointAround(p: Vec, c: Vec, deg: number): Vec {
  const r = (deg * Math.PI) / 180
  const cos = Math.cos(r)
  const sin = Math.sin(r)
  const dx = p.x - c.x
  const dy = p.y - c.y
  return { x: c.x + dx * cos - dy * sin, y: c.y + dx * sin + dy * cos }
}

/** Transform string placing a symbol frame so its anchor lands on (x, y). */
export function placementTransform(p: Placement): string {
  const sx = p.scale * (p.flip ? -1 : 1)
  return `translate(${p.x} ${p.y}) rotate(${p.rotation}) scale(${sx} ${p.scale}) translate(${-FRAME.ax} ${-FRAME.ay})`
}

/** World-space corners of a placement's symbol bounding box. */
export function placementCorners(p: Placement, def: SymbolDef): Vec[] {
  const b = def.bbox
  const local: Vec[] = [
    { x: b.x, y: b.y },
    { x: b.x + b.w, y: b.y },
    { x: b.x + b.w, y: b.y + b.h },
    { x: b.x, y: b.y + b.h },
  ]
  // frame coords are relative to the anchor (FRAME.ax, FRAME.ay); shift so the
  // anchor lands on (p.x, p.y) before applying scale/flip about the anchor
  const ax = FRAME.ax
  const ay = FRAME.ay
  const sx = p.scale * (p.flip ? -1 : 1)
  return local.map((v) => {
    const wx = p.x + (v.x - ax) * sx
    const wy = p.y + (v.y - ay) * p.scale
    return p.rotation === 0 ? { x: wx, y: wy } : rotatePointAround({ x: wx, y: wy }, { x: p.x, y: p.y }, p.rotation)
  })
}

export function textCorners(t: TextElement): Vec[] {
  const w = estimateTextWidth(t)
  const h = t.size
  const local: Vec[] = [
    { x: 0, y: -h * 0.8 },
    { x: w, y: -h * 0.8 },
    { x: w, y: h * 0.25 },
    { x: 0, y: h * 0.25 },
  ]
  return local.map((v) => rotatePointAround({ x: t.x + v.x, y: t.y + v.y }, { x: t.x, y: t.y }, t.rotation))
}

/** Rough width estimate for layout (real metrics need a browser). */
export function estimateTextWidth(t: TextElement): number {
  return t.content.length * t.size * 0.58
}

export function unionBBox(boxes: BBox[]): BBox | null {
  if (boxes.length === 0) return null
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const b of boxes) {
    minX = Math.min(minX, b.x)
    minY = Math.min(minY, b.y)
    maxX = Math.max(maxX, b.x + b.w)
    maxY = Math.max(maxY, b.y + b.h)
  }
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY }
}

export function cornersBBox(corners: Vec[]): BBox {
  const xs = corners.map((c) => c.x)
  const ys = corners.map((c) => c.y)
  const minX = Math.min(...xs)
  const minY = Math.min(...ys)
  return { x: minX, y: minY, w: Math.max(...xs) - minX, h: Math.max(...ys) - minY }
}

export function bboxCenter(b: BBox): Vec {
  return { x: b.x + b.w / 2, y: b.y + b.h / 2 }
}

export function bboxesIntersect(a: BBox, b: BBox): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
}

export interface MirrorResult {
  x: number
  y: number
  rotation: number
  flip: boolean
}

/** Reflect a placement across a vertical (axis='v') or horizontal (axis='h') line through `about`. */
export function mirrorPlacement(p: Placement, axis: 'h' | 'v', about: Vec): MirrorResult {
  if (axis === 'v') {
    return { x: 2 * about.x - p.x, y: p.y, rotation: norm360(-p.rotation), flip: !p.flip }
  }
  return { x: p.x, y: 2 * about.y - p.y, rotation: norm360(180 - p.rotation), flip: !p.flip }
}

export function norm360(deg: number): number {
  return ((deg % 360) + 360) % 360
}

/** Evenly redistribute centres between the two extremes along an axis. */
export function distributeCentres(values: number[], axis: 'x' | 'y'): number[] {
  if (values.length < 3) return [...values]
  const sortedIdx = values.map((v, i) => [v, i] as const).sort((a, b) => a[0] - b[0])
  const min = sortedIdx[0][0]
  const max = sortedIdx[sortedIdx.length - 1][0]
  const out = [...values]
  sortedIdx.forEach(([_, idx], rank) => {
    out[idx] = min + ((max - min) * rank) / (sortedIdx.length - 1)
  })
  void axis
  return out
}

/** Duplicate placements with a small offset, returning fresh ids. */
export function duplicatePlacements(ps: Placement[], dx = 16, dy = 16): Placement[] {
  return ps.map((p) => ({ ...p, id: uid('p'), x: p.x + dx, y: p.y + dy, guideTag: undefined }))
}
