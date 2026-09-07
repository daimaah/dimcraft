// ---- Shared vector type -------------------------------------------------
export interface Vec {
  x: number
  y: number
}

// ---- Symbols -------------------------------------------------------------
// Every symbol is drawn inside a 24×32 frame whose anchor point (the base of
// the stitch, where it joins the previous round) sits at (12, 30). Stitches
// point "up" (negative y) so that radial placement on a circle makes them
// grow outwards from the centre.
export const FRAME = { w: 24, h: 32, ax: 12, ay: 30 } as const

export interface SymbolBBox {
  x: number
  y: number
  w: number
  h: number
}

export interface SymbolDef {
  id: string
  name: string
  label: string
  /** Inner SVG markup in frame coordinates. Uses the @INK@ token for colour. */
  content: string
  bbox: SymbolBBox
  custom?: boolean
}

// ---- Placements ----------------------------------------------------------
export interface Placement {
  id: string
  symbolId: string
  x: number
  y: number
  /** degrees, clockwise */
  rotation: number
  scale: number
  flip: boolean
  /** set when the stitch was created by "place evenly along guide" */
  guideTag?: string
  groupId?: string
}

// ---- Guides --------------------------------------------------------------
interface GuideBase {
  id: string
  visible: boolean
  name?: string
}

export interface CircleGuide extends GuideBase {
  kind: 'circle'
  cx: number
  cy: number
  r: number
}

export interface ArcGuide extends GuideBase {
  kind: 'arc'
  cx: number
  cy: number
  r: number
  /** degrees, screen space (y down); arc runs from a0 to a1 */
  a0: number
  a1: number
}

export interface SpiralGuide extends GuideBase {
  kind: 'spiral'
  cx: number
  cy: number
  r0: number
  r1: number
  turns: number
  a0: number
}

export interface LineGuide extends GuideBase {
  kind: 'line'
  x1: number
  y1: number
  x2: number
  y2: number
}

export interface PolygonGuide extends GuideBase {
  kind: 'polygon'
  cx: number
  cy: number
  r: number
  n: number
  /** rotation of the first corner, degrees */
  rot: number
}

export type Guide = CircleGuide | ArcGuide | SpiralGuide | LineGuide | PolygonGuide
export type GuideKind = Guide['kind']

// ---- Annotations ---------------------------------------------------------
/**
 * A polyline of chart line-work (backstitch / surface crochet). Part of the
 * chart itself: exported as a solid ink stroke, unlike construction guides.
 */
export interface StitchLine {
  id: string
  points: Vec[]
  closed: boolean
  width: number
}

export interface RepeatBracket {
  id: string
  x1: number
  y1: number
  x2: number
  y2: number
  /** 1 or -1: which side of the chord the arc bows towards */
  side: 1 | -1
  count: number
  label?: string
}

export interface TextElement {
  id: string
  x: number
  y: number
  content: string
  size: number
  rotation: number
}

export interface LegendState {
  visible: boolean
  x: number
  y: number
  title: string
  showCounts: boolean
  scale: number
}

// ---- Document ------------------------------------------------------------
export interface ChartDoc {
  schemaVersion: number
  title: string
  placements: Placement[]
  guides: Guide[]
  lines: StitchLine[]
  brackets: RepeatBracket[]
  texts: TextElement[]
  customSymbols: SymbolDef[]
  labelOverrides: Record<string, string>
  legend: LegendState
  ink: string
}

/** Legend key under which backstitch lines are listed. */
export const LINE_LEGEND_ID = '__line'

// ---- Tools & placement options --------------------------------------------
export type Tool =
  | 'select'
  | 'place'
  | 'line'
  | 'guide-circle'
  | 'guide-arc'
  | 'guide-spiral'
  | 'guide-line'
  | 'guide-polygon'
  | 'bracket'
  | 'text'

export type RotationMode = 'radial' | 'tangent' | 'upright'

export interface EvenPlaceOptions {
  count: number
  /** 0..1 phase shift around the path */
  startOffset: number
  scale: number
  rotationMode: RotationMode
  /** replace stitches previously placed from this guide, or add alongside */
  mode: 'replace' | 'append'
}

// ---- Storage -------------------------------------------------------------
export interface ProjectRecord {
  id: string
  name: string
  createdAt: number
  updatedAt: number
  doc: ChartDoc
}
