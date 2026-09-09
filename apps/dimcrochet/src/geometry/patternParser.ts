import { BUILT_IN_MAP } from '../symbols/definitions'
import { LADDER_IDS, TERMINOLOGY_PRESETS } from '../symbols/terminology'
import { smallestPeriod } from './instructions'
import { preprocessCrochetParade } from './paradeAdapter'

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
  /** adapter notes (e.g. CrochetPARADE approximations, colors found) */
  notes?: string[]
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
  // built-in symbols by label first (popcorn 'pc', bobble 'bo', ...)
  for (const def of BUILT_IN_MAP.values()) {
    map[def.label.toLowerCase()] = def.id
    // full words too, so prose-like tokens ("bobble", "popcorn") resolve
    for (const word of def.name.toLowerCase().split(/\s+/)) {
      if (word.length > 2 && !map[word]) map[word] = def.id
    }
  }
  // preset ladder overrides (regional abbreviations)
  const preset = TERMINOLOGY_PRESETS.find((p) => p.id === terminology) ?? TERMINOLOGY_PRESETS[0]
  for (const id of LADDER_IDS) {
    const label = preset.labels[id]
    if (label) map[label.toLowerCase()] = id
  }
  // decrease clusters resolve by their own abbreviations (sc2tog, dc2tog, …)
  for (const def of BUILT_IN_MAP.values()) {
    if (def.id.endsWith('tog')) map[def.id] = def.id
  }
  // amigurumi decrease shorthand: "dec" is an invisible sc2tog
  for (const a of ['dec', 'invdec', 'invisible decrease', 'invsible dec']) map[a] = 'sc2tog'
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
  'join', 'turn', 'fasten', 'off', 'around', 'each', 'every', 'next', 'in', 'into', 'the', 'to', 'from',
  'all', 'begin', 'beginning', 'working', 'work', 'st', 'sts', 'stitch', 'stitches', 'space',
  'sp', 'rnd', 'round', 'row', 'and', 'with', 'same', 'first', 'last', 'end', 'mark', 'marker',
  'repeat', 'times', 'more', 'across', 'remaining', 'close', 'pull', 'tight', 'finish',
  'sk', 'skip', 'chsp', 'tip', 'ring1', 'ring', 'chain-space', 'bobble-start',
  'once', 'twice', '2nd', '3rd', '4th', 'together', 'tog',
])

function mergeRuns(target: PatternStitchRun[] | undefined, runs: PatternStitchRun[]): PatternStitchRun[] {
  const t = target ?? []
  for (const run of runs) {
    const last = t[t.length - 1]
    if (last && last.symbolId === run.symbolId) last.count += run.count
    else t.push({ ...run })
  }
  return t
}

function multiplyRuns(runs: PatternStitchRun[], times: number): PatternStitchRun[] {
  const out: PatternStitchRun[] = []
  for (let k = 0; k < Math.max(1, times); k++) mergeRuns(out, runs)
  return out
}

/** full stitch names used in prose-style decrease phrases */
const LONG_STITCH: Record<string, string> = {
  'single crochet': 'sc',
  'half double crochet': 'hdc',
  'double crochet': 'dc',
  'treble crochet': 'tr',
}

/**
 * Expand one round body: bracketed repeats ([…] ×N, (…) N times), asterisk
 * repeats (*…*; repeat from * N more times), decreases ("sc2tog", "2 sc
 * together", "dec") and the amigurumi "inc" (2 sc in one stitch).
 */
export function expandRoundBody(
  body: string,
  aliases: Record<string, string>,
  warnings: Set<string>,
  notes: string[] = [],
): PatternStitchRun[] {
  // "single crochet 2 together" / "2 sc together" → sc2tog, before tokenising
  body = body.replace(
    /\b(\d)\s*(single crochet|half double crochet|double crochet|treble crochet|sc|hdc|dc|tr)\s+tog(?:ether)?\b/gi,
    (_m, n: string, st: string) => `${LONG_STITCH[st.toLowerCase()] ?? st.toLowerCase()}${n}tog`,
  )
  body = body.replace(
    /\b(single crochet|half double crochet|double crochet|treble crochet|sc|hdc|dc|tr)\s+(\d)\s*tog(?:ether)?\b/gi,
    (_m, st: string, n: string) => `${LONG_STITCH[st.toLowerCase()] ?? st.toLowerCase()}${n}tog`,
  )

  const stack: PatternStitchRun[][] = [[]]
  // parallel to the stack: was the group opened by asterisks?
  const astOpen: boolean[] = [false]
  let i = 0
  let asteriskNote = false

  const consumeAsteriskMultiplier = (): number => {
    const after = body.slice(i)
    const rep = after.match(/^\s*[;,]?\s*repeat(?:ing)?\s+from\s+\*?\s*(\d+)?\s*(more\s+)?times?/i)
    if (rep) {
      i += rep[0].length
      // style-guide reading: the pass before the asterisk counts too, so
      // "repeat from * 3 (more) times" = the first pass plus 3 repeats
      if (!rep[2] && !asteriskNote) {
        asteriskNote = true
        notes.push('Asterisk repeat: "repeat from * N times" was read as N+1 passes (the first pass plus N repeats).')
      }
      return (rep[1] ? parseInt(rep[1]) : 1) + 1
    }
    const toEnd = after.match(/^\s*[;,]?\s*repeat(?:ing)?\s+from\s+\*?\s*(?:around|to\s+(?:the\s+)?end)/i)
    if (toEnd) {
      i += toEnd[0].length
      warnings.add('asterisk-repeat-to-end')
      return 1
    }
    const plain = after.match(/^\s*[;,]?\s*(?:×|x)\s*(\d+)|^\s*[;,]?\s*(\d+)\s*times\b|^\s*(once|twice)\b/i)
    if (plain) {
      i += plain[0].length
      return plain[1] ? parseInt(plain[1]) : plain[2] ? parseInt(plain[2]) : plain[3] === 'once' ? 1 : 2
    }
    return 1
  }

  while (i < body.length) {
    const rest = body.slice(i)

    const open = rest.match(/^([\[(])/)
    if (open) {
      stack.push([])
      astOpen.push(false)
      i += open[0].length
      continue
    }

    const close = rest.match(/^([\])])\s*(?:[×x*]\s*)?(\d+)?\s*(?:times|mal|kertaa|ganger)?/i)
    if (close && stack.length > 1) {
      const group = stack.pop() ?? []
      astOpen.pop()
      const times = close[2] ? parseInt(close[2]) : 1
      mergeRuns(stack[stack.length - 1] ?? [], multiplyRuns(group, times))
      i += close[0].length
      continue
    }

    if (/^\*+/.test(rest)) {
      if (astOpen[astOpen.length - 1]) {
        // close the asterisk group and apply the multiplier that follows
        const group = stack.pop() ?? []
        astOpen.pop()
        i += rest.match(/^\*+/)![0].length
        const times = consumeAsteriskMultiplier()
        mergeRuns(stack[stack.length - 1] ?? [], multiplyRuns(group, times))
      } else {
        stack.push([])
        astOpen.push(true)
        i += rest.match(/^\*+/)![0].length
      }
      continue
    }

    const strayMultiplier = rest.match(/^[×x]\s*(\d+)?/i)
    if (strayMultiplier) {
      i += strayMultiplier[0].length
      continue
    }

    const countFirst = rest.match(/^(\d+)\s*([a-zа-яёµ0-9][a-zа-яёµ0-9'-]*)/i)
    if (countFirst) {
      const sym = aliases[countFirst[2].toLowerCase()]
      if (sym) mergeRuns(stack[stack.length - 1], [{ symbolId: sym, count: parseInt(countFirst[1]) }])
      else if (!IGNORE_WORDS.has(countFirst[2].toLowerCase())) warnings.add(countFirst[2].toLowerCase())
      i += countFirst[0].length
      continue
    }

    const symCount = rest.match(/^([a-zа-яёµ][a-zа-яёµ0-9'-]*)\s+(\d+)\b/i)
    if (symCount) {
      const sym = aliases[symCount[1].toLowerCase()]
      if (sym) mergeRuns(stack[stack.length - 1], [{ symbolId: sym, count: parseInt(symCount[2]) }])
      else warnings.add(symCount[1].toLowerCase())
      i += symCount[0].length
      continue
    }

    const word = rest.match(/^([a-zа-яёµ][a-zа-яёµ0-9'-]*)/i)
    if (word) {
      const lower = word[1].toLowerCase()
      // amigurumi shorthand: "inc" = 2 sc in one stitch
      if (lower === 'inc' || lower === 'increase') {
        mergeRuns(stack[stack.length - 1], [{ symbolId: 'sc', count: 2 }])
      } else {
        const sym = aliases[lower]
        if (sym) mergeRuns(stack[stack.length - 1], [{ symbolId: sym, count: 1 }])
        else if (!IGNORE_WORDS.has(lower)) warnings.add(lower)
      }
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

  if (astOpen.some(Boolean) && stack.length > 1) warnings.add('asterisk-repeat-unbalanced')
  const runs = stack[0] ?? []
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
  let notes: string[] = []

  // CrochetPARADE-style input is auto-detected and preprocessed
  if (/\bDEF:|\bCOLOR:|\bDOT:|@\[|@\w+\[|\$\w+\s*=/.test(text)) {
    const pre = preprocessCrochetParade(text)
    text = pre.text
    notes = pre.notes
  }

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

  // built sequentially: "N <st> in each st" needs the previous round's total
  const rounds: ParsedRound[] = []
  chunks.forEach((chunk, i) => {
    const rawBody = chunk.body.join(' ')
    let runs = expandRoundBody(rawBody, aliases, warnings, notes)

    // "2 dc in each st" (and "inc in each st"): the count depends on the
    // previous round — N stitches into every stitch of round i-1
    const each = rawBody.match(/\b(\d+)\s+([a-zа-яёµ0-9'-]+)\s+in\s+(?:each|every|all)\b/i)
    if (each) {
      const sym = aliases[each[2].toLowerCase()]
      const prev = i > 0 ? rounds[i - 1]?.total ?? 0 : 0
      if (sym && prev > 0) {
        const per = parseInt(each[1])
        runs = [{ symbolId: sym, count: per * prev }]
        notes.push(`${chunk.label || `R${i + 1}`}: "${each[0]}" expanded to ${per} × ${prev} stitches (one per stitch of the previous round).`)
      } else if (sym) {
        warnings.add('increase-base-unknown')
      }
    } else if (/\binc\b[^.]*\b(?:each|every)\b/i.test(rawBody)) {
      const prev = i > 0 ? rounds[i - 1]?.total ?? 0 : 0
      if (prev > 0) {
        runs = [{ symbolId: 'sc', count: 2 * prev }]
        notes.push(`${chunk.label || `R${i + 1}`}: "inc in each st" expanded to 2 × ${prev} single crochets.`)
      } else {
        warnings.add('increase-base-unknown')
      }
    }

    const period = smallestPeriod(runs.map((r) => ({ label: r.symbolId, count: r.count })))
    rounds.push({
      label: chunk.label || `R${i + 1}`,
      runs,
      total: runs.reduce((s, r) => s + r.count, 0),
      raw: rawBody,
      repeat:
        period > 0
          ? { runs: runs.slice(0, period).map((r) => ({ ...r })), times: runs.length / period }
          : null,
    })
  })

  return {
    start,
    rounds,
    warnings: [...warnings],
    title,
    notes: notes.length ? notes : undefined,
  }
}
