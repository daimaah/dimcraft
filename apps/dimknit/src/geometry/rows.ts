import type { FollowDirection, FollowStep } from '@dimcraft/core/craft'
import type { ChartDoc, Placement, Yarn } from '@dimcraft/core/model/types'
import { yarnName } from '@dimcraft/core/model/yarns'

/**
 * Row engine for flat knitting charts.
 *
 * A knitting chart is an operation matrix read SERPENTINE: the chart shows
 * the fabric as it looks on the right side, Row 1 sits at the bottom and is
 * a right-side row worked right-to-left; every subsequent row alternates
 * side and reading direction. On WS rows each cell is worked as the REVERSE
 * of its RS symbol (blank cell = knit on RS but purl on WS, and so on).
 *
 * In-the-round charts read every row right-to-left with no WS rows — that
 * variant arrives with the in-the-round starter set; the engine already
 * keeps all rows RS when a chart opts in via `allRs`.
 */

/** How each cell is *worked*, per side, following the RS/WS duality.
 *  Cable crossings mirror on the wrong side (a right cross reads as its
 *  left twin), and a leaned increase flips its lean. */
export const STITCH_WORDS: Record<string, { rs: string; ws: string }> = {
  k: { rs: 'k', ws: 'p' },
  p: { rs: 'p', ws: 'k' },
  yo: { rs: 'yo', ws: 'yo' },
  k2tog: { rs: 'k2tog', ws: 'p2tog' },
  ssk: { rs: 'ssk', ws: 'ssp' },
  // worked purlwise on the WS to keep the same RS appearance
  s2kp2: { rs: 's2kp2', ws: 'cddp' },
  c4b: { rs: 'C4B', ws: 'C4F' },
  c4f: { rs: 'C4F', ws: 'C4B' },
  rt: { rs: 'RT', ws: 'LT' },
  lt: { rs: 'LT', ws: 'RT' },
  m1r: { rs: 'M1R', ws: 'M1L' },
  m1l: { rs: 'M1L', ws: 'M1R' },
}

export interface KnitRow {
  /** 1-based; row 1 is the bottom row and is a right-side row */
  index: number
  side: 'RS' | 'WS'
  /** cells ordered left → right as drawn on the chart */
  cells: Placement[]
  y: number
}

/** Cluster placements into chart rows (bottom row first). */
export function groupRows(doc: ChartDoc, tolerance = 20): KnitRow[] {
  const placed = doc.placements
    .filter((p) => p.visible !== false && p.symbolId !== 'ns')
    .sort((a, b) => b.y - a.y || a.x - b.x) // bottom first, then left → right
  const bands: { y: number; cells: Placement[] }[] = []
  for (const p of placed) {
    const band = bands.find((b) => Math.abs(b.y - p.y) <= tolerance)
    if (band) {
      band.cells.push(p)
    } else {
      bands.push({ y: p.y, cells: [p] })
    }
  }
  // bands were opened bottom-first; number them 1..n
  return bands.map((b, i) => ({
    index: i + 1,
    side: (i + 1) % 2 === 1 ? 'RS' : 'WS',
    cells: b.cells.sort((a, z) => a.x - z.x),
    y: b.y,
  }))
}

/** Run-length encode a sequence of stitch tokens the way knitting patterns
 *  write them: plain k/p always carry their count ("k1, p3"), multi-letter
 *  operations stay bare when single ("k2tog, k3, ssk"). A colourwork token's
 *  yarn abbreviation rides after the count ("k3 CC1", "k2tog MC"). */
interface Tok {
  word: string
  suffix: string
}

function runLength(toks: Tok[]): string {
  const runs: string[] = []
  let i = 0
  while (i < toks.length) {
    let n = 1
    while (i + n < toks.length && toks[i + n].word === toks[i].word && toks[i + n].suffix === toks[i].suffix) n++
    const plain = toks[i].word === 'k' || toks[i].word === 'p'
    // plain k/p carry their count ("p3"); multi-letter ops stay bare when
    // single and repeat as "×N" — "C4B ×2", never "C4B2" (which would read
    // as a five-stitch cable)
    const count = plain ? String(n) : n > 1 ? ` ×${n}` : ''
    runs.push(`${toks[i].word}${count}${toks[i].suffix}`)
    i += n
  }
  return runs.join(', ')
}

/** How a yarn shows in written instructions; unknown colours (yarn deleted)
 *  read as uncoloured stitches rather than breaking the row text. */
function colourSuffix(yarns: Yarn[], hex: string | undefined): string {
  if (!hex) return ''
  const i = yarns.findIndex((y) => y.colour === hex)
  return i < 0 ? '' : ` ${yarnName(yarns[i], i)}`
}

function rowToks(row: KnitRow, yarns: Yarn[], side: 'rs' | 'ws'): Tok[] {
  const cells = side === 'ws' ? row.cells : [...row.cells].reverse()
  return cells.map((c) => ({
    word: STITCH_WORDS[c.symbolId]?.[side] ?? c.symbolId,
    suffix: colourSuffix(yarns, c.colour),
  }))
}

/** Written instruction text for one row, e.g. "Row 2 (WS): k4, p4". */
export function rowInstruction(row: KnitRow, allRs = false, yarns: Yarn[] = []): string {
  const side = allRs ? 'RS' : row.side
  // WS rows are read left → right on the chart, RS rows right → left
  const toks = rowToks(row, yarns, allRs ? 'rs' : (side.toLowerCase() as 'rs' | 'ws'))
  return `Row ${row.index} (${side}): ${runLength(toks)}`
}

/** All rows as written instructions, ready for a pattern sheet. Charts
 *  worked in the round read every row as a right-side row. */
export function writtenInstructions(doc: ChartDoc, tolerance = 20, allRs = false): string[] {
  const yarns = doc.yarns ?? []
  return groupRows(doc, tolerance).map((r) => rowInstruction(r, allRs || doc.inTheRound === true, yarns))
}

/** Row-serpentine follow steps for the shared follow-mode bar. In the round,
 *  every row is a right-side row read right-to-left. */
export function followSteps(doc: ChartDoc, tolerance = 20, _dir: FollowDirection = 'ccw'): FollowStep[] {
  const yarns = doc.yarns ?? []
  const allRs = doc.inTheRound === true
  return groupRows(doc, tolerance).map((row) => {
    const side: 'rs' | 'ws' = allRs ? 'rs' : (row.side.toLowerCase() as 'rs' | 'ws')
    const cells = side === 'ws' ? row.cells : [...row.cells].reverse()
    const toks = cells.map((c) => ({
      word: STITCH_WORDS[c.symbolId]?.[side] ?? c.symbolId,
      suffix: colourSuffix(yarns, c.colour),
    }))
    return {
      label: `Row ${row.index}`,
      text: `Row ${row.index} (${allRs ? 'RS' : row.side}): ${runLength(toks)}`,
      ids: cells.map((c) => c.id),
      order: cells.map((c) => c.id),
      radius: null,
    }
  })
}

/** Horizontal mirror image of each stitch: right-leaning operations mirror
 *  to their left-leaning twins (decreases, cable crossings, twists, leaned
 *  increases); symmetric stitches (k, p, yo, s2kp2, ns) map to themselves.
 *  Mirroring is a drawing operation — unlike the RS/WS duality above it
 *  changes the chart, not how a cell is read. */
const MIRROR: Record<string, string> = {
  k2tog: 'ssk',
  ssk: 'k2tog',
  p2tog: 'ssp',
  ssp: 'p2tog',
  c4b: 'c4f',
  c4f: 'c4b',
  rt: 'lt',
  lt: 'rt',
  m1r: 'm1l',
  m1l: 'm1r',
}

export function mirrorSymbol(symbolId: string): string {
  return MIRROR[symbolId] ?? symbolId
}

/** Grid geometry for chart furniture: row bands bottom-up with their worked
 *  side, and the x of every occupied column. In the round, every row is a
 *  right-side row, so all row numbers print on the right. Feeds row/column
 *  numbering and the inspector's rows & columns controls via the craft seam. */
export function gridInfo(doc: ChartDoc, tolerance = 20): {
  rows: { index: number; y: number; side: 'RS' | 'WS' }[]
  colXs: number[]
} {
  const round = doc.inTheRound === true
  const rows = groupRows(doc, tolerance).map((r) => ({
    index: r.index,
    y: r.y,
    side: round ? ('RS' as const) : r.side,
  }))
  const xs = new Set(doc.placements.filter((p) => p.visible !== false).map((p) => p.x))
  return { rows, colXs: [...xs].sort((a, b) => a - b) }
}

/** Stitch-count accounting: the stitches row N works must equal the stitches
 *  row N-1 leaves. Every symbol declares how many stitches it WORKS (takes
 *  from the row below — k2tog takes 2, a 4-stitch cable takes 4, M1 takes 0:
 *  it lifts a new stitch from the strand between two stitches) and how many
 *  it LEAVES as live stitches (a yo leaves the one it creates, decreases
 *  still leave their single resulting stitch). Shaped charts legitimately
 *  vary; the check flags unexplained jumps. */
const WORKS: Record<string, number> = {
  yo: 0, // a yo creates a stitch, it doesn't take one from the row below
  k2tog: 2,
  ssk: 2,
  s2kp2: 3,
  c4b: 4,
  c4f: 4,
  rt: 2,
  lt: 2,
  m1r: 0,
  m1l: 0,
}

const LEAVES: Record<string, number> = {
  k2tog: 1,
  ssk: 1,
  s2kp2: 1,
  c4b: 4,
  c4f: 4,
  rt: 2,
  lt: 2,
  yo: 1,
  m1r: 1,
  m1l: 1,
}

export function rowCountIssues(doc: ChartDoc, tolerance = 20): string[] {
  const rows = groupRows(doc, tolerance)
  const issues: string[] = []
  for (let i = 1; i < rows.length; i++) {
    const prev = rows[i - 1]
    const row = rows[i]
    const leaves = prev.cells.reduce((sum, c) => sum + (LEAVES[c.symbolId] ?? 1), 0)
    const works = row.cells.reduce((sum, c) => sum + (WORKS[c.symbolId] ?? 1), 0)
    if (works !== leaves) {
      issues.push(`Row ${row.index} works ${works} stitches, but row ${prev.index} leaves ${leaves}.`)
    }
  }
  return issues
}
