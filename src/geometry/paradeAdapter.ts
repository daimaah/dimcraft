/**
 * Preprocessor for CrochetPARADE-style pattern text
 * (https://github.com/crochetparade/CrochetPARADE). Strips the 2D/3D model
 * annotations (position anchors, variables, custom stitch DEF bodies, color
 * changes) and converts each remaining line into a round, so the regular
 * pattern parser can read it.
 *
 * Approximations, reported as notes:
 * - position anchors (@Ring1[][0], @[%,0], [t++], …) are dropped — our layout
 *   places stitches evenly
 * - custom DEF stitches are mapped to the closest built-in symbol by name
 *   hints (p→picot, *bobble*→bobble, …); unmapped DEFs are dropped
 * - `<` / `>` (long/spike stitches) are drawn as single crochet
 * - COLOR changes are listed as notes — charts use a single ink colour
 */

const DEF_HINTS: [RegExp, string][] = [
  [/pico/i, 'picot'],
  [/bobble/i, 'bobble'],
  [/popcorn/i, 'popcorn'],
  [/puff/i, 'puff'],
  [/cluster/i, 'popcorn'],
  [/shell/i, 'shell'],
]

export interface ParadePreprocessResult {
  text: string
  notes: string[]
  colors: string[]
}

export function preprocessCrochetParade(input: string): ParadePreprocessResult {
  const notes: string[] = []
  const colors: string[] = []
  const defSymbols = new Map<string, string>()

  const outLines: string[] = []

  for (const rawLine of input.split(/\r?\n/)) {
    const line = rawLine.trim()

    if (line.startsWith('#') || line.startsWith('DOT:') || line === '') continue

    if (line.startsWith('COLOR:')) {
      colors.push(line.slice(6).trim())
      continue
    }

    if (line.startsWith('DEF:')) {
      const m = line.match(/^DEF:\s*([A-Za-z0-9_]+)\s*=/)
      if (m) {
        const name = m[1]
        // hints match the whole line: the trailing comment often names the stitch
        let mapped: string | null = null
        for (const [re, symbolId] of DEF_HINTS) {
          if (re.test(line)) {
            mapped = symbolId
            break
          }
        }
        if (mapped) {
          defSymbols.set(name.toLowerCase(), mapped)
          notes.push(`Custom stitch "${name}" mapped to ${mapped}.`)
        } else {
          notes.push(`Custom stitch "${name}" has no equivalent and was skipped.`)
        }
      }
      continue
    }

    let s = line
      .replace(/#.*$/, '') // inline comment
      .replace(/@[A-Za-z0-9_]*(?:\[[^\[\]]*\])*/g, '') // position anchors: @Ring1[][0], @Tip[t], @[%,0], @[-1,-1]
      .replace(/,\s*COLOR:\s*([A-Za-z]+)\s*/gi, (_, c: string) => {
        colors.push(c)
        return ','
      }) // mid-line color changes
      .replace(/^COLOR:\s*[A-Za-z]+\s*/i, '')
      .replace(/\$[^$]*\$/g, '') // $var=0,c++$ expressions
      .replace(/\.[A-Za-z][A-Za-z0-9_]*(\[[^\]]*\])?/g, '') // .Name / .Name[0] / .chain_space[c++] qualifiers
      .replace(/\+\d+!/g, '')
      .replace(/!/g, '')
      .replace(/[<>]/g, 'sc') // long/spike stitches drawn as single crochet

    // custom DEF names -> built-in symbols; hint matching also covers
    // composed names (dc4bobble, tr4bobble, …) that were used but never DEF'd
    s = s.replace(/[A-Za-z0-9_]+/g, (word) => {
      const sym = defSymbols.get(word.toLowerCase())
      if (sym) return sym
      for (const [re, symbolId] of DEF_HINTS) {
        if (re.test(word)) return symbolId
      }
      return word
    })

    if (!s.trim()) continue
    outLines.push(s.trim())
  }

  // each remaining line becomes a numbered round
  const text2 = outLines.map((l, i) => `R${i + 1}: ${l}`).join('\n')

  if (colors.length) notes.push(`Pattern colors (single-ink chart): ${colors.join(', ')}.`)
  notes.push('CrochetPARADE position anchors are dropped; spike/long stitches (<, >) are drawn as single crochet.')

  return { text: text2, notes, colors }
}
