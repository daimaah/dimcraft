import type { SymbolDef } from '@dimcraft/core/model/types'

/**
 * Standard crochet symbols, drawn from scratch as stroke paths.
 * Frame: 24 × 32, anchor (base of the stitch) at (12, 30), stitches point up.
 * All markup uses the @INK@ token so the renderer can theme stroke colour.
 */

const STROKE = 'fill="none" stroke="@INK@" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"'
const FILLED = 'fill="@INK@" stroke="none"'

const p = (d: string) => `<path d="${d}" ${STROKE}/>`
const el = (cx: number, cy: number, rx: number, ry: number) =>
  `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" ${STROKE}/>`
const dot = (cx: number, cy: number, r: number) => `<circle cx="${cx}" cy="${cy}" r="${r}" ${FILLED}/>`

/** slanted treble slash: lower-left → upper-right crossing the stem at x=12 */
const slash = (yBot: number, yTop: number) => p(`M 6.8 ${yBot} L 17.2 ${yTop}`)

function def(id: string, name: string, label: string, content: string, bbox: [number, number, number, number]): SymbolDef {
  return { id, name, label, content, bbox: { x: bbox[0], y: bbox[1], w: bbox[2], h: bbox[3] } }
}

export const BUILT_IN_SYMBOLS: SymbolDef[] = [
  def('ch', 'Chain', 'ch', el(12, 23, 4.6, 7), [7.4, 16, 9.2, 14]),

  def('slst', 'Slip stitch', 'sl st', dot(12, 27, 2.6), [9.4, 24.4, 5.2, 5.2]),

  def('sc', 'Single crochet', 'sc', p('M 7.5 21.5 L 16.5 30.5 M 16.5 21.5 L 7.5 30.5'), [7.5, 21.5, 9, 9]),

  def('hdc', 'Half double crochet', 'hdc', p('M 12 30 L 12 17 M 6.5 17 L 17.5 17'), [6.5, 17, 11, 13]),

  def('dc', 'Double crochet', 'dc', p('M 12 30 L 12 12 M 6 12 L 18 12') + slash(24, 19), [6, 12, 12, 18]),

  def(
    'tr',
    'Treble crochet',
    'tr',
    p('M 12 30 L 12 8 M 5.5 8 L 18.5 8') + slash(22.5, 18) + slash(16, 11.5),
    [5.5, 8, 13, 22],
  ),

  def(
    'dtr',
    'Double treble crochet',
    'dtr',
    p('M 12 30 L 12 4 M 5 4 L 19 4') + slash(22.5, 18) + slash(15.8, 11.3) + slash(9.1, 4.6),
    [5, 4, 14, 26],
  ),

  def(
    'trtr',
    'Triple treble crochet',
    'trtr',
    p('M 12 30 L 12 2.5 M 5 2.5 L 19 2.5') + slash(24, 20.3) + slash(17.8, 14.1) + slash(11.6, 7.9) + slash(5.4, 2.2),
    [5, 2.2, 14, 27.8],
  ),

  def(
    'dc2tog',
    '2 dc cluster',
    'dc2tog',
    p('M 8.5 30 L 11.3 14 M 15.5 30 L 12.7 14 M 8.2 13.8 L 15.8 13.8') + p('M 6.5 24.5 L 11.5 22') + p('M 12.5 25 L 17.5 22.5'),
    [6.5, 13.5, 11, 16.5],
  ),

  def(
    'tr3tog',
    '3 tr cluster',
    'tr3tog',
    p('M 7 30 L 11 12 M 12 30 L 12 12 M 17 30 L 13 12 M 8 12 L 16 12') +
      p('M 5.2 23.5 L 9.6 21.3') +
      p('M 10.2 20 L 13.8 18.3') +
      p('M 14.4 23.5 L 18.8 21.3'),
    [5, 12, 14, 18],
  ),

  def(
    'sc2tog',
    'Single crochet 2 together',
    'sc2tog',
    p('M 8.5 30 L 11.3 22 M 15.5 30 L 12.7 22 M 8.2 21.8 L 15.8 21.8') + p('M 6.8 27 L 11.2 25') + p('M 12.8 27.5 L 17 25.5'),
    [6.8, 21.8, 10.2, 8.2],
  ),

  def(
    'hdc2tog',
    'Half double crochet 2 together',
    'hdc2tog',
    p('M 8.5 30 L 11.3 17 M 15.5 30 L 12.7 17 M 6.5 16.8 L 17.5 16.8'),
    [6.5, 16.8, 11, 13.2],
  ),

  def(
    'popcorn',
    'Popcorn stitch',
    'pc',
    p(
      'M 12 30 C 12 26.5 6.2 24.5 6.2 17.5 C 6.2 11.5 9 8.8 12 8.8 C 15 8.8 17.8 11.5 17.8 17.5 C 17.8 24.5 12 26.5 12 30 Z',
    ),
    [6.2, 8.8, 11.6, 21.2],
  ),

  def(
    'puff',
    'Puff stitch',
    'puff',
    p('M 12 30 L 12 20.5') + p('M 5.5 20.5 A 3.25 3.25 0 0 1 12 20.5 A 3.25 3.25 0 0 1 18.5 20.5'),
    [5.5, 17.2, 13, 12.8],
  ),

  def(
    'bobble',
    'Bobble stitch',
    'bo',
    p('M 12 30 L 12 20.5 M 12 30 L 7.8 21.8 M 12 30 L 16.2 21.8 M 12 30 L 9.4 18.8 M 12 30 L 14.6 18.8') +
      p('M 7 19.5 A 5.4 5.4 0 0 1 17 19.5'),
    [7, 16.1, 10, 13.9],
  ),

  def('picot', 'Picot', 'picot', p('M 8 30 L 12 17 L 16 30') + `<circle cx="12" cy="14.8" r="1.8" ${STROKE}/>`, [8, 13, 8, 17]),

  def(
    'shell',
    'Shell (5 dc)',
    'shell',
    p('M 5.5 21 A 7.5 7.5 0 0 1 18.5 21') +
      p('M 12 29 L 6.5 19.3 M 12 29 L 9.3 16.9 M 12 29 L 12 16.2 M 12 29 L 14.7 16.9 M 12 29 L 17.5 19.3'),
    [5.5, 16.2, 13, 12.8],
  ),

  def(
    'crosseddc',
    'Crossed double crochet',
    'x-dc',
    p('M 7 30 L 16.5 12.5 M 17 30 L 7.5 12.5 M 13 12.5 L 20 12.5 M 4 12.5 L 11 12.5'),
    [4, 12.5, 16, 17.5],
  ),

  def(
    'fpdc',
    'Front post double crochet',
    'FPdc',
    p('M 12 30 L 12 12 M 6 12 L 18 12') + slash(24, 19) + p('M 12 26.5 C 8.4 26.5 8.4 21.8 12 21.8'),
    [6, 12, 12, 18],
  ),

  def(
    'bpdc',
    'Back post double crochet',
    'BPdc',
    p('M 12 30 L 12 12 M 6 12 L 18 12') + slash(24, 19) + p('M 12 26.5 C 15.6 26.5 15.6 21.8 12 21.8'),
    [6, 12, 12, 18],
  ),

  def('magicring', 'Magic (adjustable) ring', 'mr', `<circle cx="12" cy="22" r="6.2" ${STROKE}/>` + p('M 16.6 17.4 L 19.6 14'), [5.8, 14, 13.8, 14.2]),
]

export const BUILT_IN_MAP = new Map(BUILT_IN_SYMBOLS.map((s) => [s.id, s]))
