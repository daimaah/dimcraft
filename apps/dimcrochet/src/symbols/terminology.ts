import type { ChartDoc } from '@dimcraft/core/model/types'
import type { TerminologyPreset } from '@dimcraft/core/craft'

export type { TerminologyPreset }

export const LADDER_IDS = ['ch', 'slst', 'sc', 'hdc', 'dc', 'tr', 'dtr', 'trtr'] as const

export const TERMINOLOGY_PRESETS: TerminologyPreset[] = [
  { id: 'us', name: 'US English (default)', labels: { ch: 'ch', slst: 'sl st', sc: 'sc', hdc: 'hdc', dc: 'dc', tr: 'tr', dtr: 'dtr', trtr: 'trtr' } },
  {
    id: 'uk',
    name: 'UK English',
    labels: { ch: 'ch', slst: 'ss', sc: 'dc', hdc: 'htr', dc: 'tr', tr: 'dtr', dtr: 'ttr', trtr: 'qtr' },
  },
  {
    id: 'sv',
    name: 'Svenska',
    labels: { ch: 'lm', slst: 'sm', sc: 'fm', hdc: 'hst', dc: 'st', tr: 'dst', dtr: 'tst', trtr: 'fyrst' },
  },
  {
    id: 'no',
    name: 'Norsk',
    labels: { ch: 'lm', slst: 'sm', sc: 'fm', hdc: 'hst', dc: 'st', tr: 'dst', dtr: 'trst', trtr: 'firtr' },
  },
  {
    id: 'da',
    name: 'Dansk',
    labels: { ch: 'lm', slst: 'sm', sc: 'fm', hdc: 'hst', dc: 'st', tr: 'dst', dtr: 'trst', trtr: 'firest' },
  },
  {
    id: 'fi',
    name: 'Suomi',
    labels: { ch: 'kj', slst: 'ss', sc: 'ks', hdc: 'ps', dc: 's', tr: '2s', dtr: '3s', trtr: '4s' },
  },
  {
    id: 'de',
    name: 'Deutsch',
    labels: { ch: 'Lm', slst: 'Km', sc: 'fM', hdc: 'hStb', dc: 'Stb', tr: 'Dstb', dtr: 'DrStb', trtr: 'QStb' },
  },
  {
    id: 'nl',
    name: 'Nederlands',
    labels: { ch: 'l', slst: 'hv', sc: 'v', hdc: 'hst', dc: 'st', tr: 'dst', dtr: 'drst', trtr: 'vierst' },
  },
  {
    id: 'fr',
    name: 'Français',
    labels: { ch: 'ml', slst: 'mc', sc: 'ms', hdc: 'demi-br', dc: 'br', tr: 'dbl-br', dtr: 'tpl-br', trtr: 'quad-br' },
  },
  {
    id: 'es',
    name: 'Español',
    labels: { ch: 'cad', slst: 'pr', sc: 'pb', hdc: 'pma', dc: 'pa', tr: 'pad', dtr: 'pat', trtr: 'pac' },
  },
  {
    id: 'it',
    name: 'Italiano',
    labels: { ch: 'cat', slst: 'mbss', sc: 'mb', hdc: 'mma', dc: 'ma', tr: 'mad', dtr: 'mat', trtr: 'maq' },
  },
  {
    id: 'ru',
    name: 'Русский',
    labels: { ch: 'вп', slst: 'сс', sc: 'сбн', hdc: 'псн', dc: 'ссн', tr: 'с2н', dtr: 'с3н', trtr: 'с4н' },
  },
]

/**
 * Apply a preset's labels to a document's overrides ('us' resets the ladder
 * back to the US defaults). Wired into the craft module for the store's
 * applyTerminology action.
 */
export function applyTerminologyToDoc(doc: ChartDoc, presetId: string): void {
  if (presetId === 'us') {
    for (const k of LADDER_IDS) delete doc.labelOverrides[k]
    return
  }
  const preset = TERMINOLOGY_PRESETS.find((p) => p.id === presetId)
  if (!preset) return
  for (const [k, v] of Object.entries(preset.labels)) doc.labelOverrides[k] = v
}
