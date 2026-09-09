import type { ChartDoc, Placement } from '@dimcraft/core/model/types'
import { createEmptyDoc, uid } from '@dimcraft/core/model/doc'

/**
 * Bundled starter chart: round 1 of a classic granny square, following the
 * standard chart convention ([3 dc, ch 2] × 4 into the ring):
 *  - a magic ring in the centre
 *  - four 3-dc clusters, one per side (top/right/bottom/left). The three dc
 *    are drawn parallel, side by side along the side direction, bases on the
 *    ring — the way granny clusters are drawn on real charts.
 *  - a ch-2 loop at each of the four diagonal corners
 *  - a "× 4" repeat bracket over one [3 dc, ch 2] unit
 */
export function createStarterDoc(): ChartDoc {
  const doc = createEmptyDoc('Granny square — round 1')
  const R = 120
  const rad = (deg: number) => (deg * Math.PI) / 180
  const ringPoint = (deg: number, r: number) => ({ x: r * Math.cos(rad(deg)), y: r * Math.sin(rad(deg)) })

  doc.guides.push({
    id: 'g-square',
    kind: 'polygon',
    cx: 0,
    cy: 0,
    r: R,
    n: 4,
    rot: 45,
    visible: true,
    name: 'Square guide',
  })

  doc.placements.push({ id: uid('p'), symbolId: 'magicring', x: 0, y: 0, rotation: 0, scale: 1, flip: false })

  const placements: Placement[] = []

  // 3-dc clusters on the four side midpoints — dc parallel, offset along the
  // side (tangent), all pointing radially outward
  for (const phi of [0, 90, 180, 270]) {
    const base = ringPoint(phi, R)
    const rotation = ((phi + 90) % 360 + 360) % 360
    const tx = -Math.sin(rad(phi))
    const ty = Math.cos(rad(phi))
    const groupId = uid('grp')
    for (const off of [-14, 0, 14]) {
      placements.push({
        id: uid('p'),
        symbolId: 'dc',
        x: base.x + tx * off,
        y: base.y + ty * off,
        rotation,
        scale: 1,
        flip: false,
        groupId,
      })
    }
  }

  // ch-2 corner loops on the four diagonals, lying along the corner bisector
  for (const phi of [45, 135, 225, 315]) {
    const base = ringPoint(phi, R)
    const rotation = ((phi + 90) % 360 + 360) % 360
    const dx = Math.cos(rad(phi))
    const dy = Math.sin(rad(phi))
    for (const off of [-7, 7]) {
      placements.push({
        id: uid('p'),
        symbolId: 'ch',
        x: base.x + dx * off,
        y: base.y + dy * off,
        rotation,
        scale: 1,
        flip: false,
      })
    }
  }
  doc.placements.push(...placements)

  // repeat bracket across the top cluster: the [3 dc, ch 2] unit repeats 4×
  doc.brackets.push({
    id: uid('b'),
    x1: -14,
    y1: -R,
    x2: 14,
    y2: -R,
    side: -1,
    count: 4,
  })

  doc.texts.push({ id: uid('t'), x: -108, y: -218, content: 'Granny square — round 1', size: 20, rotation: 0 })

  doc.legend.x = 152
  doc.legend.y = -158

  return doc
}
