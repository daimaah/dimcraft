// ---- Shared types for the stitch-motion (physical technique) animations ----

/** Where the hook inserts during an "insert" step. */
export type InsertTarget = 'A' | 'B' | 'C' | 'ring'

export type MotionKind =
  | 'slipKnot' // form a loop, pull the tail through, tighten on the hook
  | 'yarnOver' // wrap the yarn over the shaft (+1 loop)
  | 'insert' // slide the hook through a stitch / ring
  | 'pullUp' // catch the yarn and draw a loop back out (+1 loop)
  | 'pullThrough' // draw the yarn through N loops (consumes N, keeps working loop)
  | 'chain' // yarn over + pull through the single hook loop → chain link
  | 'ringShow' // reveal the magic-ring yarn circle
  | 'hold' // caption-only pause (repeat guidance)

export interface MotionStep {
  kind: MotionKind
  /** Plain-language caption for beginners (US terms). */
  caption: string
  target?: InsertTarget
  /** pullThrough only: how many loops the yarn is drawn through. */
  through?: number
  /** Loops on the hook AFTER this step (the count crochet teachers use). */
  loopsOnHook: number
  durationMs?: number
}

export interface StitchMotion {
  /** Symbol id from the chart palette this motion teaches. */
  symbolId: string
  name: string
  steps: MotionStep[]
  /** True when the choreography is a height-based approximation, not the authored technique. */
  approximate?: boolean
}
