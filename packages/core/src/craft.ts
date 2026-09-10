import type { ChartDoc, SymbolDef } from './model/types'
import type { BuiltinSet } from './symbols/sets'

/**
 * Regional terminology presets: what each stitch is *called* per market.
 * The preset data itself is craft-specific; this is only the shared shape.
 */
export interface TerminologyPreset {
  id: string
  name: string
  labels: Record<string, string>
}

/** One playable unit of a chart's written-out work: highlight these, say this. */
export interface FollowStep {
  label: string
  text: string
  ids: string[]
  /** ids in true working order, for stitch-by-stitch playback */
  order: string[]
  radius: number | null
}

/** Direction the follow playback walks the chart. */
export type FollowDirection = 'cw' | 'ccw'

/**
 * The craft seam. Everything an app injects so the shared shell can stay
 * craft-agnostic: the palette, the bundled artwork sets, the default armed
 * symbol, how terminology presets rewrite labels, and how a chart reads out
 * as playable steps (rounds for crochet, rows for knitting).
 *
 * The app registers its module once at boot; core modules pull these from
 * getCraft() instead of importing craft-specific code — the dependency
 * direction (app → core) is enforced by the package boundary.
 */
export interface CraftModule {
  craft: 'crochet' | 'knit'
  /** The base palette, before artwork-set overrides. */
  baseSymbols: SymbolDef[]
  /** Bundled artwork sets available to every document. */
  builtinSets: BuiltinSet[]
  /** Symbol armed when the editor opens / after resets. */
  defaultSymbolId: string
  /** Apply a terminology preset to a document's label overrides. */
  applyTerminology(doc: ChartDoc, presetId: string): void
  /** Written-out, playable steps for the chart's work. */
  followSteps(doc: ChartDoc, tolerance: number, dir: FollowDirection): FollowStep[]
}

let craft: CraftModule | null = null

/** Register the app's craft module. Call once at boot, before first render. */
export function registerCraft(module: CraftModule): void {
  craft = module
}

/** The registered craft module. Throws if the app never registered one. */
export function getCraft(): CraftModule {
  if (!craft) throw new Error('No craft module registered — the app must register its CraftModule at boot.')
  return craft
}
