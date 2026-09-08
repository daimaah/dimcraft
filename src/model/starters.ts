import type { ChartDoc, Placement } from './types'
import { createEmptyDoc, uid } from './doc'
import { createStarterDoc } from './starter'
import { parsePattern } from '../geometry/patternParser'
import { patternToChart } from '../geometry/patternToChart'

export interface StarterDef {
  id: string
  title: string
  /** what the beginner learns, shown on the card */
  tagline: string
  level: 1 | 2 | 3 | 4
  levelLabel: string
  build: () => ChartDoc
}

/** Build a chart from short written instructions via the app's own import pipeline. */
const fromPattern = (title: string, pattern: string): ChartDoc =>
  patternToChart(parsePattern(pattern), { title }).doc

/** A flat foundation chain — the only non-round starter, so it is hand-placed.
 *  The chains sit on a gentle arc equidistant from a hidden circle guide so
 *  round-grouping (and follow mode) reads them as one row. */
const chainDoc = (): ChartDoc => {
  const doc = createEmptyDoc('The chain')
  const n = 15
  const R = 300
  const CY = 300
  // hidden centre guide: makes all chains one "round" for grouping
  doc.guides.push({
    id: uid('g'),
    kind: 'circle',
    cx: 0,
    cy: CY,
    r: R,
    visible: false,
    name: 'Chain arc centre',
  })
  const step = 20 / R // ~20 chart-units of arc per chain
  const spread = ((n - 1) / 2) * step
  const a0 = -Math.PI / 2 - spread
  doc.guides.push({
    id: uid('g'),
    kind: 'arc',
    cx: 0,
    cy: CY,
    r: R,
    a0: ((a0 * 180) / Math.PI + 360) % 360,
    a1: ((-Math.PI / 2 + spread) * 180 / Math.PI + 360) % 360,
    visible: true,
    name: 'Chain line',
  })
  const placements: Placement[] = []
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + (i - (n - 1) / 2) * step
    placements.push({
      id: uid('p'),
      symbolId: 'ch',
      x: R * Math.cos(a),
      y: CY + R * Math.sin(a),
      rotation: 0,
      scale: 1,
      flip: false,
      guideTag: doc.guides[1].id,
    })
  }
  doc.placements.push(...placements)
  doc.texts.push({ id: uid('t'), x: -120, y: -80, content: 'Foundation chain — ch 15', size: 20, rotation: 0 })
  doc.legend.x = 170
  doc.legend.y = -140
  return doc
}

/**
 * Built-in starter charts for total beginners, in increasing difficulty.
 * The round ones are generated through the app's own written-pattern
 * pipeline, so chart and instructions always agree.
 */
export const STARTERS: StarterDef[] = [
  {
    id: 'chain',
    title: 'The chain',
    tagline:
      'Your very first crochet: a simple line of chain stitches. Learn the slip knot and the chain — watch them in ▶ How stitches work, then follow along.',
    level: 1,
    levelLabel: 'First steps',
    build: chainDoc,
  },
  {
    id: 'sc-coaster',
    title: 'First coaster — single crochet',
    tagline:
      'A little coaster: start with a magic ring, then single crochet in the round, doubling every stitch on the second round. Try ▶ How stitches work for “magic ring” and “single crochet”.',
    level: 2,
    levelLabel: 'Beginner',
    build: () =>
      fromPattern(
        'First coaster — single crochet',
        'Start with a magic ring.\nR1: 6 sc\nR2: [2 sc] × 6',
      ),
  },
  {
    id: 'dc-coaster',
    title: 'Double crochet coaster',
    tagline:
      'Same idea, taller stitch: the double crochet. Doubling each round keeps the circle flat — the basic rhythm of every crocheted circle.',
    level: 3,
    levelLabel: 'Easy',
    build: () =>
      fromPattern(
        'Double crochet coaster',
        'Start with a magic ring.\nR1: 12 dc\nR2: [2 dc] × 12',
      ),
  },
  {
    id: 'granny-square',
    title: 'Classic granny square',
    tagline:
      'The motif that built a million blankets: three-dc clusters and corner chains worked into the ring. Learn clusters, then use follow mode to see where each stitch goes.',
    level: 3,
    levelLabel: 'Easy',
    build: createStarterDoc,
  },
  {
    id: 'granny-circle',
    title: 'Granny circle',
    tagline:
      'Double crochets with chain spokes — work round 2 as 2 dc into every stitch below. This is the gateway to doilies, mandalas and circular shawls.',
    level: 4,
    levelLabel: 'Confident beginner',
    build: () =>
      fromPattern(
        'Granny circle',
        'Start with a magic ring.\nR1: [2 dc, ch 2] × 6\nR2: 24 dc',
      ),
  },
]
