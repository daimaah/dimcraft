import { BUILT_IN_MAP } from '../symbols/definitions'
import { LADDER_IDS, TERMINOLOGY_PRESETS } from '../symbols/terminology'
import { smallestPeriod } from './instructions'

export interface PatternStitchRun {
  symbolId: string
  count: number
}

export interface ParsedRound {
  label: string
  runs: PatternStitchRun[]
  total: number
  raw: string
  /** when the round is a repeating unit: the unit runs and how many times */
  repeat?: { runs: PatternStitchRun[]; times: number } | null
}

export interface PatternParseResult {
  start: 'magic-ring' | 'chain-ring' | null
  rounds: ParsedRound[]
  warnings: string[]
  title?: string
}

export interface ParseOptions {
  /** terminology preset id the *text* is written in (default US) */
  terminology?: string
}

/**
 * Alias table for the chosen terminology: local abbreviation -> symbol id.
 * Preset ladder labels win over built-in labels (UK "dc" means US sc).
 */
export function buildAliases(terminology = 'us'): Record<string, string> {
  const map: Record<string, string> = {}
  // built-in symbols by label first (popcorn, puff, dc2tog, ...)
  for (const def of BUILT_IN_MAP.values()) map[def.label.toLowerCase()] = def.id
  // preset ladder overrides (regional abbreviations)
  const preset = TERMINOLOGY_PRESETS.find((p) => p.id === terminology) ?? TERMINOLOGY_PRESETS[0]
  for (const id of LADDER_IDS) {
    const label = preset.labels[id]
    if (label) map[label.toLowerCase()] = id
  }
  // universal slip-stitch spellings
  for (const a of ['ss', 'sl st', 'slst', 'sl st.', 'smyckmaska', 'smygmaska', 'smykemaske', 'km', 'mc', 'pr', 'mbss', 'сс']) {
    map[a.toLowerCase()] = 'slst'
  }
  // full-word forms for the ladder
  for (const [word, id] of Object.entries({
    chain: 'ch',
    'luftmaska': 'ch',
    'luftmaske': 'ch',
    'ketjusilmukka': 'ch',
    'luftmasche': 'ch',
    'fastmaska': 'sc',
    'fastmaske': 'sc',
    'fastmasche': 'sc',
    'kiinteä silmukka': 'sc',
    'halvstolpe': 'hdc',
    'halvstang': 'hdc',
    'puolisauva': 'hdc',
    'halbes stäbchen': 'hdc',
    'stolpe': 'dc',
    'stang': 'dc',
    'sauva': 'dc',
    'stäbchen': 'dc',
    'dubbelstolpe': 'tr',
    'dubbelstang': 'tr',
    'kaksoissauva': 'tr',
    'doppelstäbchen': 'tr',
  })) {
    map[word] = id
  }
  return map
}

const IGNORE_WORDS = new Set([
  'join', 'turn', 'fasten', 'off', 'around', 'each', 'next', 'in', 'into', 'the', 'to', 'from',
  'all', 'begin', 'beginning', 'working', 'work', 'st', 'sts', 'stitch', 'stitches', 'space',
  'sp', 'rnd', 'round', 'row', 'and', 'with', 'same', 'first', 'last', 'end', 'mark', 'marker',
  'repeat', 'times', 'more', 'across', 'remaining', 'close', 'pull', 'tight', 'finish',
])

function mergeRuns(target: PatternStitchRun[], runs: PatternStitchRun[]): PatternStitchRun[] {
  for (const run of runs) {
    const last = target[target.length - 1]
    if (last && last.symbolId === run.symbolId) last.count += run.count
    else target.push({ ...run })
  }
  return target
}

function multiplyRuns(runs: PatternStitchRun[], times: number): PatternStitchRun[] {
  const out: PatternStitchRun[] = []
  for (let k = 0; k < Math.max(1, times); k++) mergeRuns(out, runs)
  return out
}

/** Expand one round body (brackets and ×N handled, asterisks ignored with a warning). */
export function expandRoundBody(
  body: string,
  aliases: Record<string, string>,
  warnings: Set<string>,
): PatternStitchRun[] {
  const stack: PatternStitchRun[][] = [[]]
  let i = 0
  let sawAsterisk = false

  while (i < body.length) {
    const rest = body.slice(i)

    const open = rest.match(/^([\[(])/)
    if (open) {
      stack.push([])
      i += open[0].length
      continue
    }

    const close = rest.match(/^([\])])\s*(?:[×x*]\s*)?(\d+)?\s*(?:times|mal|kertaa|ganger)?/i)
    if (close) {
      const group = stack.pop() ?? []
      const times = close[2] ? parseInt(close[2]) : 1
      mergeRuns(stack[stack.length - 1] ?? [], multiplyRuns(group, times))
      i += close[0].length
      continue
    }

    const strayMultiplier = rest.match(/^[×x*]\s*(\d+)?/i)
    if (strayMultiplier) {
      if (strayMultiplier[0].includes('*')) sawAsterisk = true
      i += strayMultiplier[0].length
      continue
    }

    const countFirst = rest.match(/^(\d+)\s*([a-zа-яёµ][a-zа-яёµ'-]*)/i)
    if (countFirst) {
      const sym = aliases[countFirst[2].toLowerCase()]
      if (sym) mergeRuns(stack[stack.length - 1], [{ symbolId: sym, count: parseInt(countFirst[1]) }])
      else warnings.add(countFirst[2].toLowerCase())
      i += countFirst[0].length
      continue
    }

    const symCount = rest.match(/^([a-zа-яёµ][a-zа-яёµ'-]*)\s+(\d+)\b/i)
    if (symCount) {
      const sym = aliases[symCount[1].toLowerCase()]
      if (sym) mergeRuns(stack[stack.length - 1], [{ symbolId: sym, count: parseInt(symCount[2]) }])
      else warnings.add(symCount[1].toLowerCase())
      i += symCount[0].length
      continue
    }

    const word = rest.match(/^([a-zа-яёµ][a-zа-яёµ'-]*)/i)
    if (word) {
      const lower = word[1].toLowerCase()
      const sym = aliases[lower]
      if (sym) mergeRuns(stack[stack.length - 1], [{ symbolId: sym, count: 1 }])
      else if (!IGNORE_WORDS.has(lower)) warnings.add(lower)
      i += word[0].length
      continue
    }

    const num = rest.match(/^\d+/)
    if (num) {
      i += num[0].length
      continue
    }
    i++
  }

  if (sawAsterisk) warnings.add('asterisk-repeat')
  const runs = stack[0]
  // collapse adjacent identical runs for a cleaner total
  return mergeRuns(runs, [])
}

const HEADER_RE =
  /^\s*(?:round|rnd|rd|r|varv|rivi|kierros|omgang|r\u00e6kke|reihe|tour|vuelta|giro|\u0440\u044f\u0434)?\s*\.?\s*(\d+)\s*[.:)\]\-]\s*(.+)$/i
const START_MAGIC_RE = /magic (?:ring|circle)|\bmr\b|\bmring\b/i
const START_CHAIN_RE = /\b(?:ch|lm)\s*\d\b[^.]*\b(?:join|sl st|slst|ss)\b|\bjoin\b[^.]*\bring/i

/** Parse written, round-based crochet instructions into structured rounds. */
export function parsePattern(text: string, opts: ParseOptions = {}): PatternParseResult {
  const aliases = buildAliases(opts.terminology)
  const warnings = new Set<string>()

  const start: PatternParseResult['start'] = START_MAGIC_RE.test(text)
    ? 'magic-ring'
    : START_CHAIN_RE.test(text)
      ? 'chain-ring'
      : null

  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !/^fasten off/i.test(l) && !/^start with a magic ring/i.test(l))

  const chunks: { label: string; body: string[] }[] = []
  let title: string | undefined

  for (const line of lines) {
    const header = line.match(HEADER_RE)
    if (header) {
      chunks.push({ label: `R${header[1]}`, body: [header[2]] })
      continue
    }
    if (chunks.length === 0) {
      // text before the first round header: a title (or prose we can't chart)
      if (!title && !/[:.]/.test(line.slice(1, 3))) title = line.replace(/[.]+$/, '')
      continue
    }
    chunks[chunks.length - 1].body.push(line)
  }

  const rounds: ParsedRound[] = chunks.map((chunk, i) => {
    const runs = expandRoundBody(chunk.body.join(' '), aliases, warnings)
    const period = smallestPeriod(runs.map((r) => ({ label: r.symbolId, count: r.count })))
    return {
      label: chunk.label || `R${i + 1}`,
      runs,
      total: runs.reduce((s, r) => s + r.count, 0),
      raw: chunk.body.join(' '),
      repeat:
        period > 0
          ? { runs: runs.slice(0, period).map((r) => ({ ...r })), times: runs.length / period }
          : null,
    }
  })

  return {
    start,
    rounds,
    warnings: [...warnings],
    title,
  }
}
