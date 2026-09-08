import type { ChartDoc, Placement } from '../model/types'
import { createEmptyDoc } from '../model/doc'
import { TERMINOLOGY_PRESETS } from '../symbols/terminology'
import type { PatternParseResult } from './patternParser'

export interface PatternToChartOptions {
  title?: string
  /** terminology preset id the pattern text was written in — legend will match it */
  terminology?: string
  /** width of one stitch along the round, in chart units */
  stitchWidth?: number
}

const TAU = Math.PI * 2

/**
 * Lay parsed rounds out as a suggested round chart:
 * - each round gets its own radius, driven by its stitch count so the fabric
 *   stays flat (circumference ≈ stitches × stitch width), never smaller than
 *   the previous round plus one stitch height
 * - stitches are placed evenly by angle, rotated radially outward
 * - consecutive identical stitches within a round are offset side by side
 *   (granny-cluster style) instead of stacked on one point
 */
export function patternToChart(
  parsed: PatternParseResult,
  opts: PatternToChartOptions = {},
): { doc: ChartDoc; notes: string[] } {
  const W = opts.stitchWidth ?? 14
  const doc = createEmptyDoc(opts.title ?? parsed.title ?? 'Imported pattern')
  const notes: string[] = []

  // legend matches the language of the pasted pattern
  const preset = TERMINOLOGY_PRESETS.find((p) => p.id === (opts.terminology ?? 'us'))
  if (preset && preset.id !== 'us') {
    for (const id of Object.keys(preset.labels)) doc.labelOverrides[id] = preset.labels[id]
  }

  if (parsed.start === 'magic-ring') {
    doc.placements.push({ id: 'p-mr', symbolId: 'magicring', x: 0, y: 0, rotation: 0, scale: 1, flip: false })
  } else if (parsed.start === 'chain-ring') {
    notes.push('Chain ring: draw the foundation chain manually (a line guide + chain stitches), or replace with a magic ring.')
  }

  let radius = 24
  parsed.rounds.forEach((round, index) => {
    if (round.total === 0) {
      notes.push(`${round.label}: nothing to place (empty or unsupported).`)
      return
    }
    const needed = (round.total * W) / TAU
    radius = index === 0 ? Math.max(needed, 24) : Math.max(radius + W * 0.9, needed)

    // Layout: a repeating round places each unit run at its own base angle
    // with members side by side along the tangent (granny-cluster style).
    // A flat round (e.g. "12 dc") spreads all stitches evenly by angle.
    type Job = { symbolId: string; angleDeg: number; offset: number }
    const jobs: Job[] = []
    if (round.repeat) {
      const totalRuns = round.runs.length
      let si = 0
      for (let t = 0; t < round.repeat.times; t++) {
        for (const run of round.repeat.runs) {
          const angleDeg = -90 + (si * 360) / totalRuns
          for (let k = 0; k < run.count; k++) {
            const offset = (k - (run.count - 1) / 2) * (W * 0.85)
            jobs.push({ symbolId: run.symbolId, angleDeg, offset })
          }
          si++
        }
      }
    } else {
      for (let k = 0; k < round.total; k++) {
        jobs.push({ symbolId: '', angleDeg: -90 + (k * 360) / round.total, offset: 0 })
      }
    }

    const tag = `imported-round-${index + 1}`
    const rad = (deg: number) => (deg * Math.PI) / 180
    // fill symbols for flat rounds from the expanded run list, in order
    const flatSymbols: string[] = []
    for (const run of round.runs) {
      for (let k = 0; k < run.count; k++) flatSymbols.push(run.symbolId)
    }
    jobs.forEach((job, jobIndex) => {
      const a = rad(job.angleDeg)
      const tx = -Math.sin(a)
      const ty = Math.cos(a)
      const placement: Placement = {
        id: `p-r${index + 1}-${jobIndex}`,
        symbolId: round.repeat ? job.symbolId : flatSymbols[jobIndex],
        x: +(radius * Math.cos(a) + tx * job.offset).toFixed(2),
        y: +(radius * Math.sin(a) + ty * job.offset).toFixed(2),
        rotation: +((job.angleDeg + 90) % 360).toFixed(2),
        scale: 1,
        flip: false,
        guideTag: tag,
      }
      doc.placements.push(placement)
    })

    doc.guides.push({
      id: `g-round-${index + 1}`,
      kind: 'circle',
      cx: 0,
      cy: 0,
      r: +radius.toFixed(2),
      visible: true,
      name: round.label,
    })
  })

  if (parsed.rounds.length === 0) {
    notes.push('No rounds detected. Make sure rounds start with labels like "R1:", "Round 1:" or "1)."')
  }

  return { doc, notes }
}
