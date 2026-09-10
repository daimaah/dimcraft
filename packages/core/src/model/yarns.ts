import { uid } from './doc'
import type { ChartDoc, Yarn } from './types'

/** Default swatch sequence offered when adding yarns, in picking order. */
export const YARN_COLOURS = [
  '#b8433a', // rust red
  '#2f6f9f', // blue
  '#3f7d4e', // green
  '#d9a03f', // mustard
  '#7d5ba6', // purple
  '#2f8f8f', // teal
  '#c46a9e', // pink
  '#5c5c5c', // charcoal
]

/** Conventional colourwork abbreviation by palette position: the main colour,
 *  then contrast colours (MC, CC1, CC2, …). Used until the user names a yarn. */
export function defaultYarnName(index: number): string {
  return index === 0 ? 'MC' : `CC${index}`
}

/** Displayed name of a yarn: the user's, or the convention for its slot. */
export function yarnName(yarn: Yarn, index: number): string {
  return yarn.name && yarn.name.trim() ? yarn.name.trim() : defaultYarnName(index)
}

/** The next palette colour from the defaults that the chart doesn't use yet. */
export function nextYarnColour(doc: ChartDoc): string {
  const used = new Set((doc.yarns ?? []).map((y) => y.colour))
  return YARN_COLOURS.find((c) => !used.has(c)) ?? YARN_COLOURS[Math.floor(Math.random() * YARN_COLOURS.length)]
}

/** A fresh yarn for this chart with the next free default colour. */
export function nextYarn(doc: ChartDoc): Yarn {
  return { id: uid('y'), colour: nextYarnColour(doc) }
}
