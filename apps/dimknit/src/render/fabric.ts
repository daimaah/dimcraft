import type { ChartDoc, Placement } from '@dimcraft/core/model/types'
import { gridAspect } from '@dimcraft/core/geometry/bounds'

// ---- colour helpers --------------------------------------------------------
function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  const v = h.length === 3 ? h.split('').map((c) => c + c).join('') : h
  const n = parseInt(v.slice(0, 6), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

const toHex = (n: number) => Math.round(n).toString(16).padStart(2, '0')

/** Mix a colour towards white (t > 0) or black (t < 0). */
export function shade(hex: string, t: number): string {
  const [r, g, b] = hexToRgb(hex)
  const target = t >= 0 ? 255 : 0
  const k = Math.abs(t)
  return `#${toHex(r + (target - r) * k)}${toHex(g + (target - g) * k)}${toHex(b + (target - b) * k)}`
}

// ---- fabric glyphs ---------------------------------------------------------
// Knitted fabric in the shared 24×32 frame (anchor (12,30), cell band
// y 6.5–29.5): knit stitches are columns of fat Vs, purls are horizontal
// bumps, eyelets are holes. Tokens: @YARN@ stitch colour, @HI@ highlight
// (lighter), @DK@ shadow (darker). The renderer scales cells vertically by
// the gauge aspect, so stitches come out wider than tall like real knitting.

const Y = 'fill="none" stroke="@YARN@" stroke-linecap="round" stroke-linejoin="round"'
const H = 'fill="none" stroke="@HI@" stroke-linecap="round"'

// Real-stockinette anatomy (vs reference photography): the fabric is
// CONTINUOUS — fat Vs spread nearly the full stitch width, each row tucks
// under the one above, and the darker between-stitch tone shows only in
// small triangles. So: full-bleed base fill, fat slightly-curved legs whose
// point overlaps the next row, and bottom-up paint order for the interlock.

/** one knit V: two fat, slightly curved legs converging into a point that
 *  reaches past the cell bottom (the row above's tile covers it) */
function knitV(cx: number, top: number, bottom: number, spread: number): string {
  return (
    `<path d="M ${cx - spread} ${top} C ${cx - spread + 0.6} ${(top + bottom) / 2} ${cx - 1.5} ${bottom - 6} ${cx} ${bottom}" ${Y} stroke-width="4.2"/>` +
    `<path d="M ${cx + spread} ${top} C ${cx + spread - 0.6} ${(top + bottom) / 2} ${cx + 1.5} ${bottom - 6} ${cx} ${bottom}" ${Y} stroke-width="4.2"/>` +
    `<path d="M ${cx - spread + 1.1} ${top + 2} C ${cx - spread + 1.5} ${(top + bottom) / 2} ${cx - 1.2} ${bottom - 5.5}" ${H} stroke-width="1.2" opacity="0.6"/>`
  )
}

/** one purl bump: a full-width horizontal dome anchored at the BOTTOM of the
 *  cell (where real purl bumps sit), with a recessed shadow above it */
function purlBump(cx: number, cy: number, w: number): string {
  return (
    `<path d="M ${cx - w} ${cy + 4.5} Q ${cx} ${cy - 6} ${cx + w} ${cy + 4.5} Z" fill="@YARN@" stroke="none"/>` +
    `<path d="M ${cx - w + 1.4} ${cy + 2.6} Q ${cx} ${cy - 3.8} ${cx + w - 1.4} ${cy + 2.6}" ${H} stroke-width="1.2" opacity="0.7"/>` +
    `<path d="M ${cx - w} ${cy - 4.5} L ${cx + w} ${cy - 4.5}" stroke="@DK@" stroke-width="1.6" opacity="0.45"/>`
  )
}

/** fat crossing strands for cables/twists: one strand continuous, the other
 *  broken where it passes underneath */
function fatStrand(x0: number, x1: number, top: number, bottom: number, broken: boolean): string {
  const y0 = bottom
  const y1 = top
  if (broken) {
    const ax = x0 + (x1 - x0) * 0.4
    const bx = x0 + (x1 - x0) * 0.6
    return (
      `<path d="M ${x0} ${y0} L ${ax} ${(y0 + y1) / 2 - 2}" ${Y} stroke-width="3.8"/>` +
      `<path d="M ${bx} ${(y0 + y1) / 2 + 2} L ${x1} ${y1}" ${Y} stroke-width="3.8"/>`
    )
  }
  return `<path d="M ${x0} ${y0} L ${x1} ${y1}" ${Y} stroke-width="3.8"/>`
}

/** fabric artwork per symbol id; unknown ids fall back to a plain knit V */
const FABRIC: Record<string, string> = {
  k: knitV(12, 8.5, 31, 7.4),
  p: purlBump(12, 21, 7.4),
  yo:
    `<circle cx="12" cy="18.5" r="5" fill="none" stroke="@DK@" stroke-width="1.2" opacity="0.5"/>` +
    `<circle cx="12" cy="18.5" r="4" fill="none" stroke="@YARN@" stroke-width="2.6"/>` +
    `<path d="M 9.6 16.4 A 4 4 0 0 1 13.6 15.4" ${H} stroke-width="1" opacity="0.7"/>`,
  k2tog:
    knitV(15, 10, 30, 5.5) +
    `<path d="M 8 30 C 10.5 24 12.5 17 14.2 13" fill="none" stroke="@DK@" stroke-width="2.6" stroke-linecap="round" opacity="0.75"/>`,
  ssk:
    knitV(9, 10, 30, 5.5) +
    `<path d="M 16 30 C 13.5 24 11.5 17 9.8 13" fill="none" stroke="@DK@" stroke-width="2.6" stroke-linecap="round" opacity="0.75"/>`,
  s2kp2:
    knitV(12, 8, 31, 5.4) +
    `<path d="M 5.5 13 Q 12 7.5 18.5 13" fill="none" stroke="@DK@" stroke-width="2.4" stroke-linecap="round" opacity="0.7"/>`,
  c4b: fatStrand(4.5, 19.5, 9, 30, false) + fatStrand(19.5, 4.5, 9, 30, true),
  c4f: fatStrand(4.5, 19.5, 9, 30, true) + fatStrand(19.5, 4.5, 9, 30, false),
  rt: fatStrand(7.5, 16.5, 11, 29, false) + fatStrand(16.5, 7.5, 11, 29, true),
  lt: fatStrand(7.5, 16.5, 11, 29, true) + fatStrand(16.5, 7.5, 11, 29, false),
  m1r: knitV(13, 12, 30, 5) + `<path d="M 7 26.5 L 10.4 23" fill="none" stroke="@DK@" stroke-width="2.2" stroke-linecap="round" opacity="0.7"/>`,
  m1l: knitV(11, 12, 30, 5) + `<path d="M 17 26.5 L 13.6 23" fill="none" stroke="@DK@" stroke-width="2.2" stroke-linecap="round" opacity="0.7"/>`,
}

export interface FabricOptions {
  /** colour of the uncoloured (background/stockinette) stitches */
  mainYarn: string
  background: string
  jitter: boolean
}

export interface BuiltFabric {
  svg: string
  width: number
  height: number
}

const MARGIN = 16

/** deterministic per-cell jitter: a small handmade offset from the grid */
function jitterFor(row: number, col: number): { dx: number; dy: number } {
  const h = Math.sin(row * 127.1 + col * 311.7) * 43758.5453
  const a = h - Math.floor(h)
  const h2 = Math.sin(row * 269.5 + col * 183.3) * 28001.8384
  const b = h2 - Math.floor(h2)
  return { dx: (a - 0.5) * 3, dy: (b - 0.5) * 2.4 }
}

/** Simulated-knit 2D preview: every chart cell drawn as its RS fabric
 *  appearance in its yarn colour, rows at the chart's gauge aspect. */
export function buildFabricSvg(doc: ChartDoc, options: FabricOptions): BuiltFabric {
  const aspect = gridAspect(doc)
  const placements = doc.placements.filter((p) => p.visible !== false && p.symbolId !== 'ns')
  let cols = 1
  let rows = 1
  for (const p of placements) {
    cols = Math.max(cols, Math.round(p.x / 24) + 1)
    rows = Math.max(rows, Math.round(-p.y / 24) + 1)
  }
  const width = cols * 24 + MARGIN * 2
  const height = rows * 24 * aspect + MARGIN * 2

  const bases: string[] = []
  const glyphs: string[] = []
  // paint bottom rows first so each row's stitches tuck under the row above
  const sorted = [...placements].sort((a, b) => a.y - b.y)
  for (const p of sorted as (Placement & { __col?: number })[]) {
    const glyph = FABRIC[p.symbolId] ?? FABRIC.k
    const col = Math.round(p.x / 24)
    const row = Math.round(-p.y / 24)
    const colour = p.colour ?? options.mainYarn
    const fill = shade(colour, -0.14)
    const j = options.jitter ? jitterFor(row, col) : { dx: 0, dy: 0 }
    const artwork = glyph
      .replaceAll('@YARN@', colour)
      .replaceAll('@HI@', shade(colour, 0.38))
      .replaceAll('@DK@', shade(colour, -0.32))
    // full-bleed base fill keeps the fabric continuous (no background between
    // stitches — only the darker between-stitch tone, like real stockinette);
    // the field stays unjittered — only the stitches wobble
    bases.push(
      `<g transform="translate(${col * 24} ${-row * 24}) scale(1 ${aspect})">` +
        `<rect x="0" y="7" width="24" height="24" fill="${fill}" stroke="none"/>` +
        `</g>`,
    )
    glyphs.push(
      `<g transform="translate(${col * 24 + j.dx} ${-row * 24 + j.dy}) scale(1 ${aspect})">${artwork}</g>`,
    )
  }
  const cells = [bases.join(''), glyphs.join('')]

  const svg =
    `<rect x="0" y="0" width="${width}" height="${height}" fill="${options.background}"/>` +
    `<g transform="translate(${MARGIN} ${MARGIN + rows * 24 * aspect}) scale(1 ${aspect})">${cells.join('')}</g>`

  return { svg, width, height }
}