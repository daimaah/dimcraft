import type { Guide, Vec } from '../model/types'
import { buildSample, type PathSample } from './pathSample'

const D2R = Math.PI / 180
const fmt = (v: number) => (Math.round(v * 100) / 100).toString()

export const DEFAULT_ARC_A0 = -210
export const DEFAULT_ARC_A1 = 30

/** Dense polyline approximation of any guide, plus whether it is a closed loop. */
export function guidePoints(g: Guide): { pts: Vec[]; closed: boolean } {
  switch (g.kind) {
    case 'circle': {
      const pts: Vec[] = []
      const N = 128
      for (let i = 0; i < N; i++) {
        const a = (-90 + (i / N) * 360) * D2R
        pts.push({ x: g.cx + g.r * Math.cos(a), y: g.cy + g.r * Math.sin(a) })
      }
      return { pts, closed: true }
    }
    case 'arc': {
      const pts: Vec[] = []
      let sweep = g.a1 - g.a0
      if (sweep <= 0) sweep += 360
      const N = Math.max(8, Math.round((sweep / 360) * 128))
      for (let i = 0; i <= N; i++) {
        const a = (g.a0 + (sweep * i) / N) * D2R
        pts.push({ x: g.cx + g.r * Math.cos(a), y: g.cy + g.r * Math.sin(a) })
      }
      return { pts, closed: false }
    }
    case 'spiral': {
      const pts: Vec[] = []
      const turns = Math.max(0.05, g.turns)
      const N = Math.max(16, Math.round(turns * 64))
      for (let i = 0; i <= N; i++) {
        const t = i / N
        const a = (g.a0 + 360 * turns * t) * D2R
        const r = g.r0 + (g.r1 - g.r0) * t
        pts.push({ x: g.cx + r * Math.cos(a), y: g.cy + r * Math.sin(a) })
      }
      return { pts, closed: false }
    }
    case 'line':
      return {
        pts: [
          { x: g.x1, y: g.y1 },
          { x: g.x2, y: g.y2 },
        ],
        closed: false,
      }
    case 'polygon': {
      const n = Math.max(3, Math.round(g.n))
      const corners: Vec[] = []
      for (let k = 0; k < n; k++) {
        const a = (g.rot + (k * 360) / n) * D2R
        corners.push({ x: g.cx + g.r * Math.cos(a), y: g.cy + g.r * Math.sin(a) })
      }
      const pts: Vec[] = []
      for (let k = 0; k < n; k++) {
        const a = corners[k]
        const b = corners[(k + 1) % n]
        const segLen = Math.hypot(b.x - a.x, b.y - a.y)
        const steps = Math.max(2, Math.ceil(segLen / 6))
        for (let s = 0; s < steps; s++) {
          const t = s / steps
          pts.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t })
        }
      }
      return { pts, closed: true }
    }
  }
}

export function guideSample(g: Guide): PathSample {
  const { pts, closed } = guidePoints(g)
  return buildSample(pts, closed)
}

export function isClosedGuide(g: Guide): boolean {
  return g.kind === 'circle' || g.kind === 'polygon'
}

/** Centre used for radial rotation; lines use their midpoint. */
export function guideCenter(g: Guide): Vec {
  switch (g.kind) {
    case 'circle':
    case 'arc':
    case 'spiral':
    case 'polygon':
      return { x: g.cx, y: g.cy }
    case 'line':
      return { x: (g.x1 + g.x2) / 2, y: (g.y1 + g.y2) / 2 }
  }
}

export function guideEndpoints(g: Guide): Vec[] {
  switch (g.kind) {
    case 'line':
      return [
        { x: g.x1, y: g.y1 },
        { x: g.x2, y: g.y2 },
      ]
    case 'arc': {
      const p0 = g.a0 * D2R
      const p1 = g.a1 * D2R
      return [
        { x: g.cx + g.r * Math.cos(p0), y: g.cy + g.r * Math.sin(p0) },
        { x: g.cx + g.r * Math.cos(p1), y: g.cy + g.r * Math.sin(p1) },
      ]
    }
    case 'spiral': {
      const a = g.a0 * D2R
      const endAngle = a + 360 * g.turns * D2R
      return [
        { x: g.cx + g.r0 * Math.cos(a), y: g.cy + g.r0 * Math.sin(a) },
        { x: g.cx + g.r1 * Math.cos(endAngle), y: g.cy + g.r1 * Math.sin(endAngle) },
      ]
    }
    case 'circle':
    case 'polygon':
      return []
  }
}

export function guideSvgPath(g: Guide): string {
  const { pts, closed } = guidePoints(g)
  if (pts.length === 0) return ''
  let d = `M ${fmt(pts[0].x)} ${fmt(pts[0].y)}`
  for (let i = 1; i < pts.length; i++) d += ` L ${fmt(pts[i].x)} ${fmt(pts[i].y)}`
  if (closed) d += ' Z'
  return d
}
