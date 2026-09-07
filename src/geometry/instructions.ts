import type { ChartDoc, Placement, SymbolDef, Vec } from '../model/types'
import { getDefMap } from '../symbols/registry'

export interface RoundGroup {
  meanRadius: number
  items: { p: Placement; r: number; a: number }[]
}

interface Run {
  label: string
  count: number
}

/**
 * Derive written round-by-round instructions from a (round) chart.
 *
 * Placements are clustered into rounds by distance from the chart centre
 * (the first circle/polygon guide's centre, else the centroid), then each
 * round is walked by angle, run-length encoded per stitch, and checked for
 * a repeating unit ("[3 dc, ch 2] × 4").
 */
export function groupRounds(doc: ChartDoc, tolerance = 18): { center: Vec; rounds: RoundGroup[] } {
  const placements = doc.placements.filter((p) => p.visible !== false)
  let center: Vec = { x: 0, y: 0 }
  const radialGuide = doc.guides.find((g) => g.kind === 'circle' || g.kind === 'polygon')
  if (radialGuide) {
    center = { x: radialGuide.cx, y: radialGuide.cy }
  } else if (placements.length > 0) {
    center = {
      x: placements.reduce((s, p) => s + p.x, 0) / placements.length,
      y: placements.reduce((s, p) => s + p.y, 0) / placements.length,
    }
  }

  const withR = placements
    .filter((p) => p.symbolId !== 'magicring')
    .map((p) => ({
      p,
      r: Math.hypot(p.x - center.x, p.y - center.y),
      a: Math.atan2(p.y - center.y, p.x - center.x),
    }))
    .sort((a, b) => a.r - b.r)

  const rounds: RoundGroup[] = []
  for (const it of withR) {
    const last = rounds[rounds.length - 1]
    if (!last || it.r - last.meanRadius > tolerance) {
      rounds.push({ meanRadius: it.r, items: [it] })
    } else {
      last.items.push(it)
      last.meanRadius = last.meanRadius + (it.r - last.meanRadius) / last.items.length
    }
  }
  return { center, rounds }
}

function renderRuns(runs: Run[]): string {
  return runs
    .map((r) => (r.label.toLowerCase() === 'ch' ? `${r.label} ${r.count}` : `${r.count} ${r.label}`))
    .join(', ')
}

function smallestPeriod(runs: Run[]): number {
  const n = runs.length
  for (let p = 1; p <= Math.floor(n / 2); p++) {
    if (n % p !== 0) continue
    let ok = true
    for (let i = p; i < n; i++) {
      if (runs[i].label !== runs[i - p].label || runs[i].count !== runs[i - p].count) {
        ok = false
        break
      }
    }
    if (ok) return p
  }
  return 0
}

export interface FollowStep {
  label: string
  text: string
  ids: string[]
  radius: number | null
}

/** Round-by-round steps for follow mode: each step's text plus its stitch ids for highlighting. */
export function followSteps(doc: ChartDoc, tolerance = 18): FollowStep[] {
  const defMap: Map<string, SymbolDef> = getDefMap(doc)
  const steps: FollowStep[] = []

  const ring = doc.placements.filter((p) => p.symbolId === 'magicring' && p.visible !== false)
  if (ring.length) {
    steps.push({ label: 'Start', text: 'Start with a magic ring.', ids: ring.map((p) => p.id), radius: 0 })
  }

  const { rounds } = groupRounds(doc, tolerance)
  rounds.forEach((round, i) => {
    round.items.sort((a, b) => a.a - b.a)
    const runs: Run[] = []
    for (const { p } of round.items) {
      const label = doc.labelOverrides[p.symbolId] ?? defMap.get(p.symbolId)?.label ?? p.symbolId
      const last = runs[runs.length - 1]
      if (last && last.label === label) last.count++
      else runs.push({ label, count: 1 })
    }
    // cyclic merge: a run split across the ±180° sort boundary rejoins here
    if (runs.length > 1 && runs[0].label === runs[runs.length - 1].label) {
      runs[0].count += runs[runs.length - 1].count
      runs.pop()
    }
    const period = smallestPeriod(runs)
    // conventional order starts the repeat at a stitch rather than a chain
    let start = 0
    if (period > 0) {
      for (let i = 0; i < period; i++) {
        if (runs[i].label.toLowerCase() !== 'ch') {
          start = i
          break
        }
      }
    }
    const ordered = [...runs.slice(start), ...runs.slice(0, start)]
    const body =
      period > 0 ? `[${renderRuns(ordered.slice(0, period))}] × ${runs.length / period}` : renderRuns(ordered)
    steps.push({
      label: `R${i + 1}`,
      text: `R${i + 1}: ${body}`,
      ids: round.items.map((it) => it.p.id),
      radius: round.meanRadius,
    })
  })
  return steps
}

/** Generate the full written-instructions text for a chart. */
export function generateInstructions(doc: ChartDoc, tolerance = 18): string {
  const lines: string[] = []
  lines.push(doc.title || 'Chart')
  lines.push('')

  if (doc.placements.filter((p) => p.visible !== false).length === 0) {
    lines.push('No stitches yet — place stitches on the canvas first.')
    return lines.join('\n')
  }

  const steps = followSteps(doc, tolerance)
  for (const s of steps) {
    lines.push(s.text)
    lines.push('')
  }
  if (steps.length > 0) lines.push('Fasten off.')
  return lines.join('\n')
}
