import type { Vec } from '../model/types'

export interface PathSample {
  pts: Vec[]
  /** cumulative arc length, cum[0] === 0 */
  cum: number[]
  length: number
  closed: boolean
}

const dist = (a: Vec, b: Vec) => Math.hypot(b.x - a.x, b.y - a.y)

export function buildSample(pts: Vec[], closed: boolean): PathSample {
  const cum: number[] = [0]
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + dist(pts[i - 1], pts[i]))
  let length = cum[cum.length - 1]
  if (closed && pts.length > 1) length += dist(pts[pts.length - 1], pts[0])
  return { pts, cum, length, closed }
}

function wrap(s: PathSample, d: number): number {
  const L = s.length
  if (L <= 0) return 0
  let x = d % L
  if (x < 0) x += L
  return x
}

function segmentAt(s: PathSample, d: number): { i: number; t: number } {
  const { cum, pts, closed } = s
  const last = cum.length - 1
  if (d >= cum[last]) {
    // past the final sample: wrap around on closed paths
    if (closed && pts.length > 1) return { i: last, t: 0 }
    return { i: Math.max(0, last - 1), t: 1 }
  }
  // binary search for the segment containing d
  let lo = 0
  let hi = last - 1
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1
    if (cum[mid] <= d) lo = mid
    else hi = mid - 1
  }
  const segLen = cum[lo + 1] - cum[lo]
  return { i: lo, t: segLen <= 0 ? 0 : (d - cum[lo]) / segLen }
}

function clampToPath(s: PathSample, d: number): number {
  if (s.closed) return wrap(s, d)
  return Math.min(Math.max(d, 0), s.length)
}

export function pointAt(s: PathSample, d: number): Vec {
  if (s.pts.length === 0) return { x: 0, y: 0 }
  if (s.pts.length === 1) return s.pts[0]
  const x = clampToPath(s, d)
  const { i, t } = segmentAt(s, x)
  const a = s.pts[i]
  const b = s.pts[(i + 1) % s.pts.length]
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }
}

/** Unit tangent (direction of increasing arc length) at distance d. */
export function tangentAt(s: PathSample, d: number): Vec {
  const { pts, closed } = s
  if (pts.length < 2) return { x: 1, y: 0 }
  const x = clampToPath(s, d)
  let i: number
  if (x >= s.cum[s.cum.length - 1]) {
    i = closed ? s.cum.length - 1 : s.cum.length - 2
  } else {
    i = segmentAt(s, x).i
  }
  let a = pts[i]
  let b = pts[(i + 1) % pts.length]
  let dx = b.x - a.x
  let dy = b.y - a.y
  if (dx === 0 && dy === 0 && pts.length > 2) {
    a = pts[(i - 1 + pts.length) % pts.length]
    b = pts[(i + 1) % pts.length]
    dx = b.x - a.x
    dy = b.y - a.y
  }
  const len = Math.hypot(dx, dy) || 1
  return { x: dx / len, y: dy / len }
}
