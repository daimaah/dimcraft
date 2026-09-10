import type { ChartDoc, SymbolDef, Tool } from './model/types'
import type { BuiltinSet } from './symbols/sets'
import type { IconName } from './ui/icons'
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

/** One entry of the shared floating action bar's tool section. */
export interface PaletteToolDef {
  id: Tool
  icon: IconName
  label: string
  /** keyboard shortcut shown in the tooltip */
  key: string
}

/**
 * The craft seam. Everything an app injects so the shared shell can stay
 * craft-agnostic: the palette, the bundled artwork sets, the default armed
 * symbol, how terminology presets rewrite labels, and how a chart reads out
 * as playable steps (rounds for crochet, rows for knitting) — plus the
 * capability flags that gate shell panels so no app ever shows dead UI.
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
  /** Tool buttons of the floating action bar, in default display order. */
  paletteTools: PaletteToolDef[]
  /** Horizontal mirror image of a stitch (ssk ↔ k2tog); the identity for
   *  symmetric stitches. Absent: mirroring only flips geometry. */
  mirrorSymbol?(symbolId: string): string
  /** Regional terminology presets offered in the inspector (empty hides the control). */
  terminologyPresets: TerminologyPreset[]
  /** Whether the inspector offers symbol-pack import/export. */
  symbolPacks: boolean
  /** Gauge (chart units per 10 cm) — absent hides the field until the craft
   *  has a feature that uses it (true-scale PDF, gauge-correct cells). */
  gauge?: {
    label: string
    /** second gauge axis (e.g. rows / 10 cm beside stitches / 10 cm) */
    label2?: string
    /** how many chart units one entered count spans (grid crafts: FRAME.w —
     *  the user enters stitches/rows, the doc stores units per 10 cm) */
    unitScale?: number
    hint(set: boolean, sizeHint: string | null): string
  }
  /** Whether the shell exposes the colourwork palette (yarn picking, per-stitch
   *  colour inspector, yarn legend). */
  colourwork: boolean
  /** Grid crafts: stamping on an occupied cell re-works that cell (symbol +
   *  colour) instead of stacking a second stitch on top of it. */
  replaceOnStamp: boolean
  /** Grid crafts: row/column furniture — numbering toggles and insert/delete
   *  of whole rows and columns in the inspector. */
  rowsAndColumns: boolean
  /** Grid geometry of the chart, for rendering row/column numbers. Absent:
   *  the craft has no grid and numbering stays hidden. */
  gridInfo?(doc: ChartDoc, tolerance: number): {
    /** rows bottom-up: band centre y, 1-based index, and the worked side */
    rows: { index: number; y: number; side: 'RS' | 'WS' }[]
    /** x of every occupied column, left → right */
    colXs: number[]
  }
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
