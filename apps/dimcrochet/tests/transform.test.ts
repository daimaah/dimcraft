import { describe, expect, it } from 'vitest'
import {
  distributeCentres,
  mirrorPlacement,
  rotatePointAround,
  placementCorners,
  cornersBBox,
  unionBBox,
} from '@dimcraft/core/geometry/transform'
import type { Placement } from '@dimcraft/core/model/types'
import { BUILT_IN_MAP } from '../src/symbols/definitions'

const dc = BUILT_IN_MAP.get('dc')!

const p = (over: Partial<Placement> = {}): Placement => ({
  id: 'p1',
  symbolId: 'dc',
  x: 0,
  y: 0,
  rotation: 0,
  scale: 1,
  flip: false,
  ...over,
})

describe('transform helpers', () => {
  it('mirrors across a vertical axis: position reflects, rotation negates, flip toggles', () => {
    const r = mirrorPlacement(p({ x: 30, y: 10, rotation: 40 }), 'v', { x: 0, y: 0 })
    expect(r.x).toBeCloseTo(-30)
    expect(r.y).toBeCloseTo(10)
    expect(r.rotation).toBe(320)
    expect(r.flip).toBe(true)
  })

  it('mirrors across a horizontal axis: rotation reflects about 180°', () => {
    const r = mirrorPlacement(p({ x: 10, y: 30, rotation: 40 }), 'h', { x: 0, y: 0 })
    expect(r.x).toBeCloseTo(10)
    expect(r.y).toBeCloseTo(-30)
    expect(r.rotation).toBe(140)
    expect(r.flip).toBe(true)
  })

  it('distributes centres evenly between the extremes', () => {
    expect(distributeCentres([0, 10, 80], 'x')).toEqual([0, 40, 80])
    expect(distributeCentres([5, 5, 5], 'y')).toEqual([5, 5, 5])
  })

  it('rotates points around a centre', () => {
    const r = rotatePointAround({ x: 10, y: 0 }, { x: 0, y: 0 }, 90)
    expect(r.x).toBeCloseTo(0)
    expect(r.y).toBeCloseTo(10)
  })

  it('computes world corners of a rotated placement', () => {
    const placement = p({ x: 100, y: 100, rotation: 90 })
    const corners = placementCorners(placement, dc)
    // dc bbox is [6,12,12,18] around anchor (12,30); rotated 90° cw about (100,100)
    const box = cornersBBox(corners)
    expect(box.w).toBeCloseTo(18, 6)
    expect(box.h).toBeCloseTo(12, 6)
    expect(box.x).toBeCloseTo(100, 6)
    expect(box.y).toBeCloseTo(94, 6)
  })

  it('unions bounding boxes', () => {
    const u = unionBBox([
      { x: 0, y: 0, w: 10, h: 10 },
      { x: 20, y: -5, w: 5, h: 5 },
    ])
    expect(u).toEqual({ x: 0, y: -5, w: 25, h: 15 })
    expect(unionBBox([])).toBeNull()
  })
})
