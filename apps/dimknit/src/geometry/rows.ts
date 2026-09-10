import type { FollowDirection, FollowStep } from '@dimcraft/core/craft'
import type { ChartDoc, Placement } from '@dimcraft/core/model/types'

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

/** How each cell is *worked*, per side, following the RS/WS duality. */
const STITCH_WORDS: Record<string, { rs: string; ws: string }> = {
  k: { rs: 'k', ws: 'p' },
  p: { rs: 'p', ws: 'k' },
  yo: { rs: 'yo', ws: 'yo' },
  k2tog: { rs: 'k2tog', ws: 'p2tog' },
  ssk: { rs: 'ssk', ws: 'ssp' },
  // worked purlwise on the WS to keep the same RS appearance
  s2kp2: { rs: 's2kp2', ws: 'cddp' },
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

/** Run-length encode a sequence of stitch words the way knitting patterns
 *  write them: plain k/p always carry their count ("k1, p3"), multi-letter
 *  operations stay bare when single ("k2tog, k3, ssk"). */
function runLength(words: string[]): string {
  const runs: string[] = []
  let i = 0
  while (i < words.length) {
    let n = 1
    while (i + n < words.length && words[i + n] === words[i]) n++
    const plain = words[i] === 'k' || words[i] === 'p'
    runs.push(n > 1 || plain ? `${words[i]}${n}` : words[i])
    i += n
  }
  return runs.join(', ')
}

/** Written instruction text for one row, e.g. "Row 2 (WS): k4, p4". */
export function rowInstruction(row: KnitRow, allRs = false): string {
  const side = allRs ? 'RS' : row.side
  // WS rows are read left → right on the chart, RS rows right → left
  const cells = side === 'WS' ? row.cells : [...row.cells].reverse()
  const words = cells.map((c) => STITCH_WORDS[c.symbolId]?.[allRs ? 'rs' : side.toLowerCase() as 'rs' | 'ws'] ?? c.symbolId)
  return `Row ${row.index} (${side}): ${runLength(words)}`
}

/** All rows as written instructions, ready for a pattern sheet. */
export function writtenInstructions(doc: ChartDoc, tolerance = 20, allRs = false): string[] {
  return groupRows(doc, tolerance).map((r) => rowInstruction(r, allRs))
}

/** Row-serpentine follow steps for the shared follow-mode bar. */
export function followSteps(doc: ChartDoc, tolerance = 20, _dir: FollowDirection = 'ccw'): FollowStep[] {
  return groupRows(doc, tolerance).map((row) => {
    const cells = row.side === 'WS' ? row.cells : [...row.cells].reverse()
    const words = cells.map((c) => STITCH_WORDS[c.symbolId]?.[row.side.toLowerCase() as 'rs' | 'ws'] ?? c.symbolId)
    return {
      label: `Row ${row.index}`,
      text: `Row ${row.index} (${row.side}): ${runLength(words)}`,
      ids: cells.map((c) => c.id),
      order: cells.map((c) => c.id),
      radius: null,
    }
  })
}

/** Horizontal mirror image of each stitch: a right-leaning decrease mirrors
 *  to its left-leaning twin and vice versa; symmetric stitches (k, p, yo,
 *  s2kp2, ns) map to themselves. Mirroring is a drawing operation — unlike
 *  the RS/WS duality above it changes the chart, not how a cell is read. */
const MIRROR: Record<string, string> = {
  k2tog: 'ssk',
  ssk: 'k2tog',
  p2tog: 'ssp',
  ssp: 'p2tog',
}

export function mirrorSymbol(symbolId: string): string {
  return MIRROR[symbolId] ?? symbolId
}

/** Stitch-count accounting: the stitches row N works must equal the stitches
 *  row N-1 leaves. A row leaves one live stitch per cell plus one per yarn
 *  over; decrease cells absorb extra stitches from the row below (k2tog/ssk
 *  take 2, s2kp2 takes 3), which closes the accounting. Shaped charts
 *  legitimately vary; the check flags unexplained jumps. */
const EXTRA_CONSUMED: Record<string, number> = { k2tog: 1, ssk: 1, s2kp2: 2 }

export function rowCountIssues(doc: ChartDoc, tolerance = 20): string[] {
  const rows = groupRows(doc, tolerance)
  const issues: string[] = []
  for (let i = 1; i < rows.length; i++) {
    const prev = rows[i - 1]
    const row = rows[i]
    const leaves = prev.cells.length + prev.cells.filter((c) => c.symbolId === 'yo').length
    const works = row.cells.length + row.cells.reduce((sum, c) => sum + (EXTRA_CONSUMED[c.symbolId] ?? 0), 0)
    if (works !== leaves) {
      issues.push(`Row ${row.index} works ${works} stitches, but row ${prev.index} leaves ${leaves}.`)
    }
  }
  return issues
}
