import { createEmptyDoc, uid } from '@dimcraft/core/model/doc'
import type { ChartDoc } from '@dimcraft/core/model/types'
import { STITCH_WORDS } from './rows'

/**
 * Written-row pattern parser: turns run-length row text ("Row 2 (WS): p4,
 * k2tog") back into a stitch-grid chart — the inverse of the written
 * instructions the app generates.
 *
 * Rows are worked serpentine: row 1 is a right-side row worked
 * right-to-left, even rows are wrong-side rows. Written text describes the
 * stitches AS WORKED, so a wrong-side row's words are inverted into the
 * chart's right-side symbols (a "p" on WS is a knit cell on the chart). An
 * explicit "(RS)"/"(WS)" marker on the line wins over row parity.
 *
 * Multi-stitch symbols advance the column cursor by their chart width (a
 * C4B covers 4 stitch columns), matching how the chart draws them.
 */

/** Chart width of each symbol in stitch columns. */
const SYMBOL_WIDTH: Record<string, number> = {
  c4b: 4,
  c4f: 4,
  rt: 2,
  lt: 2,
}

export interface ParsedRow {
  index: number
  side: 'RS' | 'WS'
  /** one entry per chart cell; x is the stitch column it starts at */
  cells: { symbolId: string; col: number }[]
}

export interface ParsedRows {
  rows: ParsedRow[]
  issues: string[]
  /** total stitch columns of the widest row */
  cols: number
}

const WORDS = new Set(
  Object.values(STITCH_WORDS).flatMap((f) => [f.rs.toLowerCase(), f.ws.toLowerCase()]),
)

/** Inverse of the RS/WS duality: what chart symbol produces this worked word? */
function symbolForWord(word: string, side: 'RS' | 'WS'): string | null {
  const w = word.toLowerCase()
  for (const [symbolId, forms] of Object.entries(STITCH_WORDS)) {
    if (forms[side.toLowerCase() as 'rs' | 'ws'].toLowerCase() === w) return symbolId
  }
  return null
}

interface Token {
  /** the worked word, e.g. "k", "p2tog", "c4f" */
  word: string
}

function parseToken(raw: string): Token | { error: string } {
  let tok = raw.trim()
  if (!tok) return { error: 'empty' }

  // drop a trailing colourway name: "k3 CC1" — a space-separated word that
  // is not itself a stitch (colourwork instructions carry yarn abbreviations)
  const parts = tok.split(/\s+/)
  if (parts.length > 1) {
    const last = parts[parts.length - 1]
    if (!WORDS.has(last.toLowerCase())) tok = parts.slice(0, -1).join(' ')
  }

  const word = tok.toLowerCase()
  // plain k/p carry counts ("k4"); multi-letter ops never do ("k2tog" owns
  // its digits) — repeats on those arrive only via the ×N form
  const plain = word.match(/^([kp])(\d+)$/)
  const base = plain ? plain[1] : word

  if (!WORDS.has(base)) return { error: raw }
  return { word }
}

/** how many times a token lays its stitch down: "×N" for multi-letter ops,
 *  the digit count for plain k/p */
function tokenTimes(raw: string, word: string): number {
  const rep = raw.match(/\s*[×x]\s*(\d+)\s*$/i)
  if (rep && !/^[kp]\d+$/.test(word)) return Math.min(200, parseInt(rep[1], 10))
  const plain = word.match(/^([kp])(\d+)$/)
  if (plain) return Math.min(200, parseInt(plain[2], 10))
  return 1
}

export function parseWrittenRows(text: string): ParsedRows {
  const rows: ParsedRow[] = []
  const issues: string[] = []
  let implicit = 0

  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed) continue

    // "Row 3 (WS):", "R3.", "3:" — explicit label with optional side marker
    const label = trimmed.match(/^(?:row\s*|r\s*)(\d+)\s*(?:\(\s*(rs|ws)\s*\))?\s*[:.\-–]\s*(.*)$/i)
    let index: number
    let side: 'RS' | 'WS'
    let body: string
    if (label) {
      index = parseInt(label[1], 10)
      const marker = label[2]?.toUpperCase()
      side = marker === 'RS' ? 'RS' : marker === 'WS' ? 'WS' : index % 2 === 1 ? 'RS' : 'WS'
      body = label[3]
    } else {
      index = ++implicit
      side = index % 2 === 1 ? 'RS' : 'WS'
      body = trimmed
    }

    const toks: { symbolId: string; width: number }[] = []
    let widthSum = 0
    for (const rawTok of body.split(/[,;]+/)) {
      if (!rawTok.trim()) continue
      const parsed = parseToken(rawTok)
      if ('error' in parsed) {
        issues.push(`Row ${index}: could not read “${rawTok.trim()}”.`)
        continue
      }
      const times = tokenTimes(rawTok, parsed.word)
      const base = parsed.word.replace(/^([kp])\d+$/, '$1')
      const symbolId = symbolForWord(base, side)
      if (!symbolId) {
        issues.push(`Row ${index}: “${base}” is not a ${side} stitch.`)
        continue
      }
      const width = SYMBOL_WIDTH[symbolId] ?? 1
      for (let i = 0; i < times; i++) {
        toks.push({ symbolId, width })
        widthSum += width
      }
    }

    // the text is in WORKING order: RS rows work right-to-left, so tokens
    // fill the chart from the right edge; WS rows fill from the left. The
    // words themselves already resolved to the chart's right-side symbols
    // (symbolForWord applied the duality).
    const cells: ParsedRow['cells'] = []
    if (side === 'RS') {
      let right = widthSum
      for (const t of toks) {
        right -= t.width
        cells.push({ symbolId: t.symbolId, col: right })
      }
    } else {
      let left = 0
      for (const t of toks) {
        cells.push({ symbolId: t.symbolId, col: left })
        left += t.width
      }
    }

    rows.push({ index, side, cells })
    implicit = Math.max(implicit, index)
  }

  const cols = rows.reduce(
    (max, r) => Math.max(max, ...r.cells.map((c) => c.col + (SYMBOL_WIDTH[c.symbolId] ?? 1))),
    0,
  )
  return { rows, issues, cols }
}

/** Build a chart document from parsed rows: row 1 at the bottom, serpentine. */
export function chartFromWrittenRows(
  text: string,
  title = 'Chart from rows',
): { doc: ChartDoc | null; issues: string[]; rowCount: number } {
  const parsed = parseWrittenRows(text)
  if (parsed.rows.length === 0) return { doc: null, issues: parsed.issues, rowCount: 0 }
  const doc = createEmptyDoc(title)
  for (const row of parsed.rows) {
    for (const c of row.cells) {
      doc.placements.push({
        id: uid('p'),
        symbolId: c.symbolId,
        x: c.col * 24,
        y: (1 - row.index) * 24,
        rotation: 0,
        scale: 1,
        flip: false,
      })
    }
  }
  return { doc, issues: parsed.issues, rowCount: parsed.rows.length }
}