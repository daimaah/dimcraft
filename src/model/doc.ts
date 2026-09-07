import type { ChartDoc, LegendState } from './types'

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
  }
}
