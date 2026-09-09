import type { MotionStep, InsertTarget } from './types'

// ---- Geometry (viewBox space) --------------------------------------------
// Side view for a right-handed crocheter: hook enters from the right, worked
// fabric trails to the right of the hook, yarn feeds from the bottom-left.
export const VIEW = { w: 300, h: 205 }

export interface Pose {
  x: number
  y: number
  rot: number
}

export interface Vec {
  x: number
  y: number
}

/** The stitch the hook is about to work (A), plus B and C for multi-stitch decreases. */
export const TARGET: Record<Exclude<InsertTarget, 'ring'>, Vec> = {
  A: { x: 122, y: 134 },
  B: { x: 94, y: 134 },
  C: { x: 66, y: 134 },
}
export const RING_CENTER: Vec = { x: 76, y: 118 }
export const YARN_TAIL: Vec = { x: 16, y: 174 }
export const YARN_MID_REST: Vec = { x: 58, y: 146 }
/** Resting hook pose (tip position + rotation). */
export const REST: Pose = { x: 150, y: 104, rot: -10 }

/**
 * Local x of loop slot i when the shaft carries n loops (slot 0 = tip-most).
 * Counts up to 4 keep the authored spacing; taller stitches compress evenly
 * so every loop — treble's 5, puff's 8 — stays on the shaft.
 */
export function slotX(i: number, n: number): number {
  if (n <= 4) return [16, 28, 40, 50][i]
  return 16 + (34 / (n - 1)) * i
}

/** Where a shaft ring is drawn right now. */
export interface RingView {
  x: number
  scale: number
  opacity: number
}

/** Tip-side end of the shaft: loops slide here (and off) when pulled through. */
const TIP_X = 2

/**
 * Position of ring i this frame, including the pull-through slide (consumed
 * rings glide to the tip and fade, survivors close ranks) and the shift
 * glide (existing loops make room for an incoming loop).
 */
export function ringView(s: Scene, i: number): RingView {
  const n = s.loops
  const c = s.slide ? Math.min(s.slide.n, Math.max(0, n - 1)) : 0
  const home = slotX(i, n)
  if (s.slide) {
    if (i < c) {
      const k = s.slide.k
      return { x: home + (TIP_X - home) * k, scale: 1 - 0.45 * k, opacity: 1 - k }
    }
    const to = slotX(i - c, n - c)
    return { x: home + (to - home) * s.slide.k, scale: 1, opacity: 1 }
  }
  if (s.shift > 0) {
    // a pulled-up loop lands at the front (pushing every ring back one slot);
    // a yarn-over wrap settles at the back (rings keep their index, but the
    // stack re-compresses once it outgrows the authored spacing)
    const to = s.wrap > 0 ? slotX(i, n + 1) : slotX(i + 1, n + 1)
    return { x: home + (to - home) * s.shift, scale: 1, opacity: 1 }
  }
  return { x: home, scale: 1, opacity: 1 }
}

/** The yarn-over wrap settling in behind the loop stack (slot n of n+1). */
export function wrapView(s: Scene): RingView | null {
  if (s.wrap <= 0) return null
  return { x: slotX(s.loops, s.loops + 1), scale: s.wrap, opacity: Math.min(1, s.wrap * 1.4) }
}

/** Local x the working yarn hangs from: just behind the back-most ring. */
export function yarnAttachX(s: Scene): number {
  const n = s.loops
  if (n <= 0) return s.forming ? lerp(34, slotX(0, 1) + 9, s.forming.k) : 34
  const base = ringView(s, n - 1).x + 9
  if (s.wrap > 0) {
    // the settling wrap becomes the back-most ring; the yarn follows it out
    return lerp(base, slotX(n, n + 1) + 9, Math.min(1, s.wrap))
  }
  return base
}

/** All shaft rings this frame (existing loops plus a settling wrap). */
export function ringLayout(s: Scene): RingView[] {
  const out: RingView[] = []
  for (let i = 0; i < s.loops; i++) out.push(ringView(s, i))
  const wv = wrapView(s)
  if (wv) out.push(wv)
  return out
}

const insertPose = (t: Vec): Pose => ({ x: t.x, y: t.y, rot: -4 })
const DIP: Pose = { x: 164, y: 116, rot: -32 }
const THROUGH: Pose = { x: 158, y: 112, rot: -18 }

// ---- Scene state ----------------------------------------------------------
export interface Scene {
  hook: Pose
  yarnMid: Vec
  inserted: boolean
  /** 0..1 — yarn-over wrap popping onto the shaft. */
  wrap: number
  /** 0..1 — existing loops gliding back to make room for an incoming loop. */
  shift: number
  /** pullUp: a loop travelling from the target stitch onto the shaft. */
  forming: { from: Vec; k: number } | null
  /** pullThrough: n tip-side loops collapsing back towards the throat. */
  slide: { n: number; k: number } | null
  chains: number
  /** 0..1 — newest chain link popping in. */
  chainPop: number
  ring: number
  /** 0..1 — slip-knot loop presence (shrinks as it tightens). */
  knot: number
  highlight: InsertTarget | null
  loops: number
}

export const baseScene = (): Scene => ({
  hook: { ...REST },
  yarnMid: { ...YARN_MID_REST },
  inserted: false,
  wrap: 0,
  shift: 0,
  forming: null,
  slide: null,
  chains: 0,
  chainPop: 0,
  ring: 0,
  knot: 0,
  highlight: null,
  loops: 0,
})

/** Cumulative scene after steps 0..i-1 (state a step starts animating from). */
export function sceneBefore(steps: MotionStep[], i: number): Scene {
  const s = baseScene()
  // any stitch other than the magic ring starts with the working loop on the hook
  s.loops = steps[0]?.kind === 'ringShow' ? 0 : 1
  for (let k = 0; k < i; k++) {
    const st = steps[k]
    if (st.kind === 'chain') {
      s.chains++
      s.chainPop = 0
    }
    if (st.kind === 'ringShow') s.ring = 1
    if (st.kind === 'slipKnot') s.knot = 0.22 // tightened onto the shaft
    s.loops = st.loopsOnHook
  }
  return s
}

// ---- Easing ----------------------------------------------------------------
const clamp01 = (v: number) => Math.min(1, Math.max(0, v))
export const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2)
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3)
export const lerp = (a: number, b: number, k: number) => a + (b - a) * k
const lerpPose = (a: Pose, b: Pose, k: number): Pose => ({
  x: lerp(a.x, b.x, k),
  y: lerp(a.y, b.y, k),
  rot: lerp(a.rot, b.rot, k),
})
export const seg = (t: number, a: number, b: number) => clamp01((t - a) / (b - a))

function targetOf(target: InsertTarget | undefined): Vec {
  if (target === 'ring') return RING_CENTER
  if (target === 'B') return TARGET.B
  return TARGET.A
}

/**
 * Animate one step at progress t (0..1) by mutating a scratch copy of the
 * scene. Only transient channels change here; cumulative counters (loops,
 * chains, ring) come from the step data via `sceneBefore`.
 */
export function applyStep(step: MotionStep, t: number, s: Scene): void {
  const e = easeInOut(clamp01(t))
  switch (step.kind) {
    case 'hold': {
      s.hook = { ...s.hook, y: s.hook.y + Math.sin(clamp01(t) * Math.PI) * 2 }
      return
    }
    case 'slipKnot': {
      // the loop appears, the hook tugs the tail, the knot snugs onto the shaft
      s.knot = easeOut(seg(t, 0, 0.55)) * (1 - 0.78 * easeInOut(seg(t, 0.55, 1)))
      if (t > 0.55) s.hook = lerpPose({ ...REST }, { x: REST.x + 8, y: REST.y - 2, rot: REST.rot - 4 }, e)
      return
    }
    case 'ringShow': {
      s.ring = easeOut(seg(t, 0, 0.8))
      return
    }
    case 'yarnOver': {
      // dip the shaft under the thread, sweep the thread over the shaft, lift
      if (t < 0.45) {
        s.hook = lerpPose({ ...REST }, DIP, easeInOut(seg(t, 0, 0.45)))
        s.yarnMid = { ...YARN_MID_REST }
      } else if (t < 0.8) {
        s.hook = { ...DIP }
        const k = easeInOut(seg(t, 0.45, 0.8))
        s.yarnMid = { x: lerp(YARN_MID_REST.x, 172, k), y: lerp(YARN_MID_REST.y, 78, k) }
      } else {
        s.hook = lerpPose(DIP, REST, easeInOut(seg(t, 0.8, 1)))
        s.yarnMid = { x: lerp(172, YARN_MID_REST.x, easeInOut(seg(t, 0.8, 1))), y: lerp(78, YARN_MID_REST.y, easeInOut(seg(t, 0.8, 1))) }
      }
      // as the thread finishes sweeping it settles onto the shaft: the wrap
      // pops in behind the loop stack while the existing loops make room
      s.wrap = easeOut(seg(t, 0.68, 0.95))
      s.shift = easeInOut(seg(t, 0.68, 1))
      return
    }
    case 'insert': {
      const to = insertPose(targetOf(step.target))
      s.highlight = step.target ?? 'A'
      if (t >= 0.22) s.inserted = true
      s.hook = lerpPose({ ...REST }, to, easeInOut(clamp01(t * 1.15)))
      return
    }
    case 'pullUp': {
      const from = targetOf(step.target)
      s.highlight = step.target ?? 'A'
      const back = easeInOut(clamp01(t * 1.2))
      s.hook = lerpPose(insertPose(from), REST, back)
      s.inserted = t < 0.55
      s.forming = { from, k: easeInOut(seg(t, 0.25, 1)) }
      s.shift = back
      return
    }
    case 'pullThrough': {
      const n = Math.max(1, step.through ?? 1)
      if (t < 0.35) {
        s.hook = lerpPose({ ...REST }, THROUGH, easeInOut(seg(t, 0, 0.35)))
      } else {
        s.hook = lerpPose(THROUGH, REST, easeInOut(seg(t, 0.35, 1)))
        s.slide = { n, k: easeInOut(seg(t, 0.4, 0.95)) }
      }
      return
    }
    case 'chain': {
      // like a yarn-over + pull-through-1: wrap, tug, a link pops off the tip
      if (t < 0.4) {
        s.hook = lerpPose({ ...REST }, DIP, easeInOut(seg(t, 0, 0.4)))
        s.yarnMid = { x: lerp(YARN_MID_REST.x, 168, easeInOut(seg(t, 0, 0.4))), y: lerp(YARN_MID_REST.y, 82, easeInOut(seg(t, 0, 0.4))) }
      } else {
        s.hook = lerpPose(DIP, REST, easeInOut(seg(t, 0.4, 0.9)))
        s.yarnMid = { x: lerp(168, YARN_MID_REST.x, easeInOut(seg(t, 0.4, 0.9))), y: lerp(82, YARN_MID_REST.y, easeInOut(seg(t, 0.4, 0.9))) }
        s.slide = { n: 1, k: easeInOut(seg(t, 0.5, 0.9)) }
        s.chainPop = easeOut(seg(t, 0.85, 1))
      }
      return
    }
  }
}

/**
 * Run the choreography without rendering — used by tests to prove the
 * animation reaches the same end state the data declares.
 */
export function simulate(steps: MotionStep[]): Scene {
  const s = baseScene()
  for (let i = 0; i < steps.length; i++) {
    const scratch: Scene = { ...s }
    applyStep(steps[i], 1, scratch)
    Object.assign(s, scratch)
    s.loops = steps[i].loopsOnHook
    if (steps[i].kind === 'chain') s.chains++
    if (steps[i].kind === 'ringShow') s.ring = 1
    if (steps[i].kind === 'slipKnot') s.knot = 0.22
  }
  return s
}
