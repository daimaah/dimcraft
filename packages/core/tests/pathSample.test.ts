import { describe, expect, it } from 'vitest'
import { buildSample, pointAt, tangentAt, type PathSample } from '../src/geometry/pathSample'

const line: PathSample = buildSample(
  [
    { x: 0, y: 0 },
    { x: 100, y: 0 },
    { x: 100, y: 100 },
  ],
  false,
)

describe('path sampling', () => {
  it('computes cumulative length', () => {
    expect(line.length).toBeCloseTo(200)
  })

  it('returns points on the path', () => {
    expect(pointAt(line, 50)).toEqual({ x: 50, y: 0 })
    expect(pointAt(line, 150)).toEqual({ x: 100, y: 50 })
    expect(pointAt(line, 0)).toEqual({ x: 0, y: 0 })
  })

  it('clamps beyond the end of open paths', () => {
    const p = pointAt(line, 999)
    expect(p.x).toBeCloseTo(100)
    expect(p.y).toBeCloseTo(100)
  })

  it('wraps on closed paths', () => {
    const tri = buildSample(
      [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { x: 0, y: 100 },
      ],
      true,
    )
    // length = 100 + 141.42 + 141.42; point slightly past the end wraps to the start segment
    const p = pointAt(tri, tri.length + 10)
    expect(p.y).toBeCloseTo(0)
    expect(p.x).toBeGreaterThanOrEqual(0)
    expect(p.x).toBeLessThanOrEqual(10)
  })

  it('returns unit tangents along the direction of travel', () => {
    expect(tangentAt(line, 10)).toEqual({ x: 1, y: 0 })
    const t = tangentAt(line, 160)
    expect(t.x).toBeCloseTo(0)
    expect(t.y).toBeCloseTo(1)
  })
})
