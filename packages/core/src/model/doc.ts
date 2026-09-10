import type { ChartDoc, CustomSet, LegendState, Yarn } from './types'

export const SCHEMA_VERSION = 1

let counter = 0
export function uid(prefix = 'e'): string {
  counter = (counter + 1) % 1296
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}${counter.toString(36)}`
}

export const DEFAULT_LEGEND: LegendState = {
  visible: true,
  x: 150,
  y: -150,
  title: 'Legend',
  showCounts: true,
  scale: 1,
}

export function createEmptyDoc(title = 'Untitled chart'): ChartDoc {
  return {
    schemaVersion: SCHEMA_VERSION,
    title,
    placements: [],
    guides: [],
    lines: [],
    brackets: [],
    texts: [],
    customSymbols: [],
    labelOverrides: {},
    legend: { ...DEFAULT_LEGEND },
    ink: '#26221f',
  }
}

/** Accepts unknown JSON (project import) and returns a valid ChartDoc or null. */
export function sanitizeDoc(input: unknown): ChartDoc | null {
  if (!input || typeof input !== 'object') return null
  const d = input as Partial<ChartDoc>
  if (!Array.isArray(d.placements) || !Array.isArray(d.guides)) return null
  const base = createEmptyDoc(typeof d.title === 'string' ? d.title : 'Imported chart')
  return {
    ...base,
    ...d,
    schemaVersion: SCHEMA_VERSION,
    placements: d.placements,
    guides: d.guides,
    lines: Array.isArray(d.lines) ? d.lines : [],
    brackets: Array.isArray(d.brackets) ? d.brackets : [],
    texts: Array.isArray(d.texts) ? d.texts : [],
    customSymbols: Array.isArray(d.customSymbols) ? d.customSymbols : [],
    labelOverrides: d.labelOverrides && typeof d.labelOverrides === 'object' ? d.labelOverrides : {},
    legend: { ...DEFAULT_LEGEND, ...(d.legend ?? {}) },
    ink: typeof d.ink === 'string' ? d.ink : base.ink,
    unitsPer10cm: typeof d.unitsPer10cm === 'number' && Number.isFinite(d.unitsPer10cm) ? d.unitsPer10cm : null,
    follow:
      d.follow && typeof d.follow === 'object' && Number.isFinite(Number((d.follow as { round?: unknown }).round))
        ? {
            round: Math.max(0, Math.round(Number((d.follow as { round?: unknown }).round))),
            tolerance: Number.isFinite(Number((d.follow as { tolerance?: unknown }).tolerance))
              ? Number((d.follow as { tolerance?: unknown }).tolerance)
              : 18,
          }
        : null,
    symbolSet: typeof d.symbolSet === 'string' ? d.symbolSet : 'standard',
    customSets: Array.isArray(d.customSets)
      ? (d.customSets as CustomSet[]).filter(
          (s) =>
            !!s &&
            typeof s === 'object' &&
            typeof s.id === 'string' &&
            typeof s.name === 'string' &&
            typeof s.artwork === 'object' &&
            s.artwork !== null,
        )
      : [],
    // colourwork palette: absent until the chart uses one; invalid entries dropped
    yarns: Array.isArray(d.yarns)
      ? (d.yarns as Yarn[])
          .filter((y) => !!y && typeof y === 'object' && typeof y.id === 'string' && typeof y.colour === 'string')
          .map((y) => ({
            id: y.id,
            colour: y.colour,
            ...(typeof y.name === 'string' && y.name.trim() ? { name: y.name.trim() } : {}),
          }))
      : undefined,
    numbering:
      d.numbering && typeof d.numbering === 'object'
        ? {
            rows: (d.numbering as { rows?: unknown }).rows === true,
            cols: (d.numbering as { cols?: unknown }).cols === true,
          }
        : undefined,
    rowGauge: typeof d.rowGauge === 'number' && Number.isFinite(d.rowGauge) ? d.rowGauge : null,
  }
}
