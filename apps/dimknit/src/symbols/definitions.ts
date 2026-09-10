import type { SymbolDef } from '@dimcraft/core/model/types'

/**
 * Standard knitting symbols per the Craft Yarn Council chart standard.
 * Every symbol is drawn inside the shared 24×32 frame (anchor at (12, 30))
 * so it drops straight into the common registry, legend and custom-SVG
 * machinery; the visible cell artwork occupies the 24×24 band just above
 * the anchor so grid cells read as squares at 24 px pitch.
 *
 * Charts show the stitch as it looks on the RIGHT SIDE:
 *   - a blank cell is a knit on RS / purl on WS
 *   - a dotted cell is a purl on RS / knit on WS
 * The written-instruction engine (geometry/rows.ts) applies that duality
 * when it reads rows out for WS rows.
 *
 * Multi-stitch symbols span their true chart width so a cable chart reads
 * like a printed one: a 4-stitch cable covers 4 cells (96 units) with its
 * anchor on the LEFT cell, a 2-stitch twist covers 2. `content` stays in
 * frame coordinates; the bbox tells selection, bounds, legend and the row
 * accounting how many stitch columns the symbol owns.
 *
 * Crossing conventions (right cross = C4B/RT): the front strand runs from
 * the bottom-left cell up to the top-right cell and is drawn continuous;
 * the back strand is broken where it passes underneath.
 */

const STROKE = 'fill="none" stroke="@INK@" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"'

/** faint cell outline so blank (knit) cells stay visible on the canvas and legend */
const CELL = 'x="2.5" y="6.5" width="19" height="23" fill="none" stroke="@INK@" stroke-opacity="0.22"'

function def(id: string, name: string, label: string, content: string, bbox: [number, number, number, number]): SymbolDef {
  return { id, name, label, content, bbox: { x: bbox[0], y: bbox[1], w: bbox[2], h: bbox[3] } }
}

const CELL_W = 24
const INSET = 2.5

function wideDef(id: string, name: string, label: string, content: string, cells: number): SymbolDef {
  return {
    id,
    name,
    label,
    content,
    bbox: { x: INSET, y: 6.5, w: cells * CELL_W - INSET * 2, h: 23 },
  }
}

/** One cable strand between the bottom and top of the cell band. */
function strand(x0: number, x1: number): string {
  return `<path d="M ${x0} 29 L ${x1} 9" ${STROKE}/>`
}

/** A strand broken where the other passes over it: two segments meeting the
 *  crossing zone at 42% / 58% of the way along, leaving a visible gap. */
function brokenStrand(x0: number, x1: number): string {
  const ax = x0 + (x1 - x0) * 0.42
  const bx = x0 + (x1 - x0) * 0.58
  return `<path d="M ${x0} 29 L ${ax} 16.5 M ${bx} 22 L ${x1} 9" ${STROKE}/>`
}

export const KNIT_SYMBOLS: SymbolDef[] = [
  // blank cell — knit on RS, purl on WS
  def('k', 'Knit', 'k', `<rect ${CELL}/>`, [2.5, 6.5, 19, 23]),

  // dot — purl on RS, knit on WS
  def('p', 'Purl', 'p', `<circle cx="12" cy="18" r="3" fill="@INK@" stroke="none"/>`, [9, 15, 6, 6]),

  // yarn over — an open circle, same on both sides
  def('yo', 'Yarn over', 'yo', `<circle cx="12" cy="18" r="5.4" ${STROKE}/>`, [6.6, 12.6, 10.8, 10.8]),

  // right-slanting single decrease (RS: k2tog / WS: p2tog)
  def('k2tog', 'Knit 2 together', 'k2tog', `<path d="M 5.5 29 L 18.5 9" ${STROKE}/>`, [5.5, 9, 13, 20]),

  // left-slanting single decrease (RS: ssk / WS: ssp)
  def('ssk', 'Slip slip knit', 'ssk', `<path d="M 18.5 29 L 5.5 9" ${STROKE}/>`, [5.5, 9, 13, 20]),

  // centered double decrease over three stitches (s2kp2 / cdd)
  def(
    's2kp2',
    'Centered double decrease',
    's2kp2',
    `<path d="M 12 29 L 12 12" ${STROKE}/><path d="M 5 15.5 L 12 8 L 19 15.5" ${STROKE}/>`,
    [5, 8, 14, 21],
  ),

  // "no stitch" placeholder — cells that don't exist because of shaping,
  // kept so rows line up. Conventionally grey regardless of ink colour.
  def('ns', 'No stitch', 'ns', `<rect x="2.5" y="6.5" width="19" height="23" fill="#8b8b8b" fill-opacity="0.5"/>`, [2.5, 6.5, 19, 23]),

  // ---- multi-stitch texture: cables, twists, leaned increases ------------

  // 2/2 right cross over 4 stitches — C4B: front strand runs bottom-left →
  // top-right (drawn continuous), back strand broken under it
  wideDef('c4b', 'Cable 4 back', 'C4B', strand(INSET + 6, INSET + 85) + brokenStrand(INSET + 85, INSET + 6), 4),

  // 2/2 left cross over 4 stitches — C4F: the mirror crossing
  wideDef('c4f', 'Cable 4 front', 'C4F', brokenStrand(INSET + 6, INSET + 85) + strand(INSET + 85, INSET + 6), 4),

  // 1/1 right twist over 2 stitches — the right stitch crosses on top
  wideDef('rt', 'Right twist', 'RT', strand(INSET + 4, INSET + 37) + brokenStrand(INSET + 37, INSET + 4), 2),

  // 1/1 left twist over 2 stitches
  wideDef('lt', 'Left twist', 'LT', brokenStrand(INSET + 4, INSET + 37) + strand(INSET + 37, INSET + 4), 2),

  // lifted increases: a leaned arrow — the lean says which way the strand
  // is picked up (M1R leans right, M1L leans left)
  def('m1r', 'Make 1 right', 'M1R', `<path d="M 8 29 L 16 10" ${STROKE}/><path d="M 16 10 L 11 12.5 M 16 10 L 16.5 15.5" ${STROKE}/>`, [8, 9, 9, 21]),
  def('m1l', 'Make 1 left', 'M1L', `<path d="M 16 29 L 8 10" ${STROKE}/><path d="M 8 10 L 13 12.5 M 8 10 L 7.5 15.5" ${STROKE}/>`, [7, 9, 10, 21]),
]