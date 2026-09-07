import { describe, expect, it } from 'vitest'
import { applyGuideHandle } from '../src/geometry/handles'
import { guideCenter, guideEndpoints, guidePoints, guideSample, guideSvgPath } from '../src/geometry/guides'
import type { CircleGuide, LineGuide, PolygonGuide, SpiralGuide } from '../src/model/types'

const circle: CircleGuide = { id: 'g1', kind: 'circle', cx: 0, cy: 0, r: 100, visible: true }
const square: PolygonGuide = { id: 'g2', kind: 'polygon', cx: 0, cy: 0, r: 100, n: 4, rot: 45, visible: true }
const spiral: SpiralGuide = { id: 'g3', kind: 'spiral', cx: 0, cy: 0, r0: 10, r1: 120, turns: 3, a0: -90, visible: true }

describe('guides', () => {
  it('samples a closed circle with constant radius', () => {
    const { pts, closed } = guidePoints(circle)
    expect(closed).toBe(true)
    for (const p of pts) expect(Math.hypot(p.x, p.y)).toBeCloseTo(100, 6)
  })

  it('polygon corners land at the requested angles', () => {
    const { pts, closed } = guidePoints(square)
    expect(closed).toBe(true)
    // first corner: 45° in screen space → (70.7, 70.7)
    expect(pts[0].x).toBeCloseTo(70.71, 1)
    expect(pts[0].y).toBeCloseTo(70.71, 1)
    const sample = guideSample(square)
    // perimeter ≈ 4 sides × 141.42
    expect(sample.length).toBeCloseTo(565.69, 1)
  })

  it('spiral radius grows monotonically', () => {
    const sample = guideSample(spiral)
    let lastR = 0
    for (const p of sample.pts) {
      const r = Math.hypot(p.x, p.y)
      expect(r).toBeGreaterThanOrEqual(lastR - 1e-9)
      lastR = r
    }
    expect(lastR).toBeCloseTo(120, 4)
  })

  it('center and endpoints are consistent', () => {
    expect(guideCenter(circle)).toEqual({ x: 0, y: 0 })
    expect(guideEndpoints(circle)).toEqual([])
    const line: LineGuide = { id: 'g4', kind: 'line', x1: 1, y1: 2, x2: 3, y2: 4, visible: true }
    expect(guideEndpoints(line)).toEqual([
      { x: 1, y: 2 },
      { x: 3, y: 4 },
    ])
    expect(guideCenter(line)).toEqual({ x: 2, y: 3 })
  })

  it('emits a valid SVG path', () => {
    const d = guideSvgPath(circle)
    expect(d.startsWith('M ')).toBe(true)
    expect(d.endsWith('Z')).toBe(true)
  })

  it('handles reshape the guide', () => {
    const moved = applyGuideHandle(circle, 'radius', { x: 40, y: 0 }, false)
    expect(moved).toMatchObject({ kind: 'circle', r: 40 })
    const corner = applyGuideHandle(square, 'corner', { x: 0, y: -80 }, false)
    expect(corner).toMatchObject({ r: 80, rot: -90 })
  })
})
