import type { ChartDoc } from '@dimcraft/core/model/types'
import { createEmptyDoc, uid } from '@dimcraft/core/model/doc'

/**
 * Bundled starter charts, in increasing difficulty. Each is a small square
 * swatch on a 24 px stitch grid with Row 1 at the bottom — the classic way
 * knitting charts are drawn and read.
 */

export interface KnitStarter {
  id: string
  name: string
  level: string
  blurb: string
  /** 1–5, drives the coloured difficulty chip */
  levelNum: 1 | 2 | 3 | 4 | 5
  make: () => ChartDoc
}

const CELL = 24

/** build a rows × cols swatch from a per-cell symbol chooser (r = row index, bottom-up) */
function swatch(name: string, rows: number, cols: number, at: (r: number, c: number) => string): ChartDoc {
  const doc = createEmptyDoc(name)
  for (let r = 1; r <= rows; r++) {
    // row 1 sits at the bottom: canvas y grows downward, so row 1 keeps the
    // largest y and the engine reads bottom-up
    const y = -(rows - r) * CELL
    for (let c = 0; c < cols; c++) {
      const symbolId = at(r, c)
      if (!symbolId) continue
      doc.placements.push({
        id: uid(),
        symbolId,
        x: (c - (cols - 1) / 2) * CELL,
        y,
        rotation: 0,
        scale: 1,
        flip: false,
      })
    }
  }
  return doc
}

export const KNIT_STARTERS: KnitStarter[] = [
  {
    id: 'stockinette',
    name: 'Stockinette swatch',
    level: 'First steps',
    levelNum: 1,
    blurb:
      'The fabric knitting makes by default: knit the right-side rows, purl the wrong-side rows. On the chart both look like empty cells — the written instructions apply the RS/WS duality for you.',
    make: () => swatch('Stockinette swatch', 8, 8, () => 'k'),
  },
  {
    id: 'rib',
    name: '2×2 rib',
    level: 'Beginner',
    levelNum: 2,
    blurb:
      'The stretchy brim stitch: columns of knit and purl. The chart stripes stay aligned on every row — each wrong-side row works the same columns in reverse, which the instructions spell out.',
    make: () => swatch('2×2 rib swatch', 8, 12, (_r, c) => (c % 4 < 2 ? 'k' : 'p')),
  },
  {
    id: 'seed',
    name: 'Seed stitch',
    level: 'Beginner',
    levelNum: 2,
    blurb:
      'Knits and purls alternating in a checkerboard — the chart’s dots hop one cell every row, which is exactly what your hands do: knit the purls, purl the knits.',
    make: () => swatch('Seed stitch swatch', 8, 10, (r, c) => ((r + c) % 2 === 0 ? 'k' : 'p')),
  },
  {
    id: 'lace',
    name: 'Eyelet lace panel',
    level: 'Confident beginner',
    levelNum: 4,
    blurb:
      'Yarn overs folded into right-slanting decreases — every yarn over adds a stitch and a k2tog takes one away in the same row, so the stitch count never drifts. The app checks that accounting row by row.',
    make: () =>
      swatch('Eyelet lace swatch', 8, 10, (_r, c) => {
        const m = c % 5
        if (m === 1) return 'yo'
        if (m === 2) return 'k2tog'
        return 'k'
      }),
  },
]

/** The Learn-tab starter in one call. */
export function createStarter(id: string): ChartDoc {
  const s = KNIT_STARTERS.find((k) => k.id === id) ?? KNIT_STARTERS[0]
  return s.make()
}

/** default new chart: a small blank stockinette grid to build on */
export function createBlankKnitDoc(): ChartDoc {
  const doc = swatch('Untitled chart', 6, 10, () => 'k')
  doc.title = 'Untitled chart'
  return doc
}
