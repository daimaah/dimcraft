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
 */

const STROKE = 'fill="none" stroke="@INK@" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"'

/** faint cell outline so blank (knit) cells stay visible on the canvas and legend */
const CELL = 'x="2.5" y="6.5" width="19" height="23" fill="none" stroke="@INK@" stroke-opacity="0.22"'

function def(id: string, name: string, label: string, content: string, bbox: [number, number, number, number]): SymbolDef {
  return { id, name, label, content, bbox: { x: bbox[0], y: bbox[1], w: bbox[2], h: bbox[3] } }
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
]
