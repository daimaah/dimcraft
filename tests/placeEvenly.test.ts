import { describe, expect, it } from 'vitest'
import { placeEvenly, angleForUp } from '../src/geometry/placeEvenly'
import { guideSample } from '../src/geometry/guides'
import type { CircleGuide, LineGuide } from '../src/model/types'

const circle: CircleGuide = { id: 'g', kind: 'circle', cx: 0, cy: 0, r: 100, visible: true }
const line: LineGuide = {
  id: 'l',
  kind: 'line',
  x1: 0,
  y1: 0,
  x2: 300,
  y2: 0,
  visible: true,
}

describe('even placement', () => {
  it('spaces 12 stitches at equal 30° steps around a circle, starting at the top', () => {
    const spots = placeEvenly(guideSample(circle), { count: 12, startOffset: 0, rotationMode: 'radial', center: { x: 0, y: 0 } })
    expect(spots).toHaveLength(12)
    const angles = spots.map((s) => (Math.atan2(s.pos.y, s.pos.x) * 180) / Math.PI)
    for (let i = 0; i < 12; i++) {
      const expected = -90 + i * 30
      const a = ((angles[i] - expected) % 360 + 360) % 360
      expect(Math.min(a, 360 - a)).toBeCloseTo(0, 3)
    }
  })

  it('all stitches sit on the circle', () => {
    const spots = placeEvenly(guideSample(circle), { count: 7, startOffset: 0.25, rotationMode: 'upright', center: null })
    // the circle is approximated by a 128-gon, so allow one chord of sagitta
    for (const s of spots) expect(Math.hypot(s.pos.x, s.pos.y)).toBeCloseTo(100, 1)
  })

  it('radial rotation points stitches outward', () => {
    const spots = placeEvenly(guideSample(circle), { count: 4, startOffset: 0, rotationMode: 'radial', center: { x: 0, y: 0 } })
    // stitch at the right side (angle 0°) must have rotation 90° (up = +x)
    const right = spots.find((s) => s.pos.x > 90 && Math.abs(s.pos.y) < 1)
    expect(right).toBeDefined()
    expect(right!.angle).toBeCloseTo(90, 4)
    // stitch at the top is upright
    const top = spots.find((s) => s.pos.y < -90)
    expect(top!.angle).toBeCloseTo(0, 4)
  })

  it('tangent rotation aligns with a horizontal line', () => {
    const spots = placeEvenly(guideSample(line), { count: 3, startOffset: 0, rotationMode: 'tangent' })
    for (const s of spots) expect(s.angle).toBeCloseTo(90, 4)
  })

  it('open paths centre the stitches and honour the offset', () => {
    const spots = placeEvenly(guideSample(line), { count: 3, startOffset: 0, rotationMode: 'upright' })
    expect(spots.map((s) => Math.round(s.pos.x))).toEqual([50, 150, 250])
    const shifted = placeEvenly(guideSample(line), { count: 1, startOffset: 0.25, rotationMode: 'upright' })
    expect(shifted[0].pos.x).toBeCloseTo(225)
  })

  it('angleForUp maps up-vectors to rotations', () => {
    expect(angleForUp({ x: 0, y: -1 })).toBeCloseTo(0)
    expect(angleForUp({ x: 1, y: 0 })).toBeCloseTo(90)
    expect(angleForUp({ x: 0, y: 1 })).toBeCloseTo(180)
  })
})
