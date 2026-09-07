import type { RotationMode, Vec } from '../model/types'
import { pointAt, tangentAt, type PathSample } from './pathSample'

export interface EvenSpot {
  pos: Vec
  /** rotation in degrees so the symbol's "up" (−y) points in the desired direction */
  angle: number
}

export interface EvenOptions {
  count: number
  /** 0..1 phase shift along the path */
  startOffset: number
  rotationMode: RotationMode
  /** guide centre for radial mode (falls back to tangent when absent) */
  center?: Vec | null
}

/** Rotation that points the symbol's up-vector along u. */
export function angleForUp(u: Vec): number {
  return (Math.atan2(u.x, -u.y) * 180) / Math.PI
}

export function placeEvenly(sample: PathSample, opts: EvenOptions): EvenSpot[] {
  const n = Math.max(1, Math.round(opts.count))
  const L = sample.length
  const spots: EvenSpot[] = []
  if (L <= 0) return spots

  for (let i = 0; i < n; i++) {
    // closed loops divide the full circumference; open paths centre each stitch
    let s = sample.closed ? (i / n) * L : ((i + 0.5) / n) * L
    s += opts.startOffset * L
    if (sample.closed) {
      s = ((s % L) + L) % L
    } else {
      s = Math.min(L, Math.max(0, s))
    }
    const pos = pointAt(sample, s)
    let angle = 0
    switch (opts.rotationMode) {
      case 'upright':
        angle = 0
        break
      case 'tangent': {
        const t = tangentAt(sample, s)
        angle = angleForUp(t)
        break
      }
      case 'radial': {
        const c = opts.center
        if (c) {
          const ux = pos.x - c.x
          const uy = pos.y - c.y
          const len = Math.hypot(ux, uy)
          if (len > 1e-6) {
            angle = angleForUp({ x: ux / len, y: uy / len })
            break
          }
        }
        const t = tangentAt(sample, s)
        angle = angleForUp({ x: -t.y, y: t.x })
        break
      }
    }
    spots.push({ pos, angle })
  }
  return spots
}
