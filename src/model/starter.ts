import type { ChartDoc, Placement } from './types'
import { createEmptyDoc, uid } from './doc'

/**
 * Bundled starter chart: round 1 of a classic granny square — a magic ring,
 * 3-dc clusters at the four corners and chains along each side, drawn on a
 * square guide with a "× 4" repeat bracket.
 */
export function createStarterDoc(): ChartDoc {
  const doc = createEmptyDoc('Granny square — round 1')
  const R = 120

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
  for (let k = 0; k < 4; k++) {
    // corner clusters: 3 dc fanned radially at each corner (45° + k·90°)
    const cornerDeg = 45 + k * 90
    const rad = (cornerDeg * Math.PI) / 180
    const px = R * Math.cos(rad)
    const py = R * Math.sin(rad)
    const groupId = uid('grp')
    for (const off of [-24, 0, 24]) {
      placements.push({
        id: uid('p'),
        symbolId: 'dc',
        x: px,
        y: py,
        rotation: cornerDeg + off,
        scale: 1,
        flip: false,
        groupId,
      })
    }
    // side chains: 3 ch along each side, lying tangent to the side
    const sideDeg = k * 90
    const srad = (sideDeg * Math.PI) / 180
    const sx = R * Math.cos(srad)
    const sy = R * Math.sin(srad)
    // tangent direction of the side at its midpoint
    const tx = -Math.sin(srad)
    const ty = Math.cos(srad)
    for (const off of [-24, 0, 24]) {
      placements.push({
        id: uid('p'),
        symbolId: 'ch',
        x: sx + tx * off,
        y: sy + ty * off,
        rotation: sideDeg,
        scale: 1,
        flip: false,
      })
    }
  }
  doc.placements.push(...placements)

  // repeat bracket across the right-hand side: corner cluster → corner cluster
  doc.brackets.push({
    id: uid('b'),
    x1: R * Math.cos((-45 * Math.PI) / 180),
    y1: R * Math.sin((-45 * Math.PI) / 180),
    x2: R * Math.cos((45 * Math.PI) / 180),
    y2: R * Math.sin((45 * Math.PI) / 180),
    side: -1,
    count: 4,
  })

  doc.texts.push({ id: uid('t'), x: -108, y: -172, content: 'Granny square — round 1', size: 20, rotation: 0 })

  doc.legend.x = 152
  doc.legend.y = -158

  return doc
}
