import type { InsertTarget, MotionStep, StitchMotion } from './types'

/**
 * Physical technique decompositions, in US terms. Core stitches are authored
 * by hand; family stitches (shells, decreases, raised stitches, texture
 * clusters) are generated from block builders below; anything else falls back
 * to a height-based approximation via `genericMotion`.
 *
 * The step sequences and "loops on hook" counts follow the standard beginner
 * instructions (dc: yo once → 3 loops → through 2 twice; tr: yo twice → 4
 * loops → through 2 three times; hdc: through all 3 at once; clusters: each
 * unfinished stitch adds one loop, closed through everything at the end).
 * Every stitch ends with exactly one working loop on the hook.
 */

const knot: MotionStep = {
  kind: 'slipKnot',
  caption: 'Make a slip knot: cross the yarn into a loop, pull the tail through, and slide it onto the hook.',
  loopsOnHook: 1,
}

const chainPair = (n: number): MotionStep[] => [
  { kind: 'yarnOver', caption: 'Yarn over: wrap the yarn over the hook from back to front.', loopsOnHook: 2 },
  { kind: 'chain', caption: `Pull through the loop on the hook — chain number ${n} done.`, loopsOnHook: 1 },
]

const ordinal = (n: number) => ['first', 'second', 'third', 'fourth', 'fifth'][n - 1] ?? `${n}th`

const PARTIALS: Record<'sc' | 'hdc' | 'dc' | 'tr', (target: InsertTarget, n: number, total: number) => MotionStep[]> = {
  sc: (target, n, total) => [
    { kind: 'insert', target, caption: `Insert the hook into the ${ordinal(n)} of ${total} stitches.`, loopsOnHook: 0 },
    { kind: 'pullUp', target, caption: 'Pull up a loop.', loopsOnHook: 0 },
  ],
  hdc: (target, n, total) => [
    { kind: 'yarnOver', caption: 'Yarn over.', loopsOnHook: 0 },
    { kind: 'insert', target, caption: `Insert the hook into the ${ordinal(n)} of ${total} stitches.`, loopsOnHook: 0 },
    { kind: 'pullUp', target, caption: 'Pull up a loop.', loopsOnHook: 0 },
  ],
  dc: (target, n, total) => [
    { kind: 'yarnOver', caption: 'Yarn over.', loopsOnHook: 0 },
    { kind: 'insert', target, caption: `Insert the hook into the ${ordinal(n)} of ${total} stitches.`, loopsOnHook: 0 },
    { kind: 'pullUp', target, caption: 'Pull up a loop.', loopsOnHook: 0 },
    { kind: 'yarnOver', caption: 'Yarn over.', loopsOnHook: 0 },
    { kind: 'pullThrough', through: 2, caption: 'Pull through two — leave this stitch unfinished.', loopsOnHook: 0 },
  ],
  tr: (target, n, total) => [
    { kind: 'yarnOver', caption: 'Yarn over.', loopsOnHook: 0 },
    { kind: 'yarnOver', caption: 'Yarn over again.', loopsOnHook: 0 },
    { kind: 'insert', target, caption: `Insert the hook into the ${ordinal(n)} of ${total} stitches.`, loopsOnHook: 0 },
    { kind: 'pullUp', target, caption: 'Pull up a loop.', loopsOnHook: 0 },
    { kind: 'yarnOver', caption: 'Yarn over.', loopsOnHook: 0 },
    { kind: 'pullThrough', through: 2, caption: 'Pull through two — leave this treble unfinished.', loopsOnHook: 0 },
  ],
}

const DECREASE_TARGETS: InsertTarget[] = ['A', 'B', 'C', 'A', 'B']

/** N unfinished stitches worked across the row, then closed through everything. */
const decreaseOf = (base: 'sc' | 'hdc' | 'dc' | 'tr', count: number): MotionStep[] => {
  const partial = PARTIALS[base]
  const targets = DECREASE_TARGETS.slice(0, count)
  const steps: MotionStep[] = []
  let l = 1
  for (let i = 0; i < count; i++) {
    for (const s of partial(targets[i], i + 1, count)) {
      const copy = { ...s }
      if (copy.kind === 'yarnOver') l += 1
      if (copy.kind === 'pullUp') l += 1
      if (copy.kind === 'pullThrough') l -= copy.through ?? 2
      copy.loopsOnHook = l
      steps.push(copy)
    }
  }
  steps.push({ kind: 'yarnOver', caption: 'Yarn over.', loopsOnHook: ++l })
  steps.push({
    kind: 'pullThrough',
    through: l - 1,
    caption: `Pull through all ${l - 1} loops — the ${count} stitches become one.`,
    loopsOnHook: 1,
  })
  return steps
}

/** One full double crochet into a target: yo, insert, pull up, (yo, through 2) ×2. */
const dcBlock = (target: InsertTarget, o: { insertCaption?: string; closeCaption?: string } = {}): MotionStep[] => [
  { kind: 'yarnOver', caption: 'Yarn over.', loopsOnHook: 2 },
  { kind: 'insert', target, caption: o.insertCaption ?? 'Insert the hook into the next stitch.', loopsOnHook: 2 },
  { kind: 'pullUp', target, caption: 'Pull up a loop — 3 loops on the hook.', loopsOnHook: 3 },
  { kind: 'yarnOver', caption: 'Yarn over.', loopsOnHook: 4 },
  { kind: 'pullThrough', through: 2, caption: o.closeCaption ?? 'Pull through the first two loops — 2 loops left.', loopsOnHook: 2 },
  { kind: 'yarnOver', caption: 'Yarn over.', loopsOnHook: 3 },
  { kind: 'pullThrough', through: 2, caption: o.closeCaption ?? 'Pull through the last two loops.', loopsOnHook: 1 },
]

/** N stitches of one base type worked into the SAME stitch (a shell). */
const shellBlock = (base: 'sc' | 'hdc' | 'dc', count: number): MotionStep[] => {
  const steps: MotionStep[] = [
    { kind: 'hold', caption: `A shell fans ${count} ${base} stitches out of a single stitch.`, loopsOnHook: 1 },
  ]
  for (let i = 0; i < count; i++) {
    const where = i === 0 ? `Work the ${ordinal(1)} stitch into the stitch below.` : `Stitch ${i + 1} of ${count} — still into the SAME stitch.`
    if (base === 'sc') {
      steps.push(
        { kind: 'insert', target: 'A', caption: where, loopsOnHook: 1 },
        { kind: 'pullUp', target: 'A', caption: 'Yarn over and pull up a loop — 2 loops on the hook.', loopsOnHook: 2 },
        { kind: 'yarnOver', caption: 'Yarn over again.', loopsOnHook: 3 },
        { kind: 'pullThrough', through: 2, caption: 'Pull through both loops.', loopsOnHook: 1 },
      )
    } else if (base === 'hdc') {
      steps.push(
        { kind: 'yarnOver', caption: 'Yarn over first.', loopsOnHook: 2 },
        { kind: 'insert', target: 'A', caption: where, loopsOnHook: 2 },
        { kind: 'pullUp', target: 'A', caption: 'Pull up a loop — 3 loops on the hook.', loopsOnHook: 3 },
        { kind: 'yarnOver', caption: 'Yarn over.', loopsOnHook: 4 },
        { kind: 'pullThrough', through: 3, caption: 'Pull through all three loops at once.', loopsOnHook: 1 },
      )
    } else {
      steps.push(
        ...dcBlock('A', {
          insertCaption: where,
          closeCaption: i === count - 1 ? 'Pull through the last two loops — the shell is done.' : 'Pull through the last two loops.',
        }),
      )
    }
  }
  return steps
}

/** Five unfinished dcs into one stitch, closed through all six loops. */
const bobbleSteps = (): MotionStep[] => {
  const steps: MotionStep[] = []
  let l = 1
  for (let i = 0; i < 5; i++) {
    for (const s of PARTIALS.dc('A', i + 1, 5)) {
      const copy = { ...s }
      if (copy.kind === 'insert') {
        copy.caption =
          i === 0
            ? 'All five unfinished dcs go into the SAME stitch — this is the first.'
            : `Unfinished dc number ${i + 1} — same stitch again.`
      }
      if (copy.kind === 'yarnOver') l += 1
      if (copy.kind === 'pullUp') l += 1
      if (copy.kind === 'pullThrough') l -= copy.through ?? 2
      copy.loopsOnHook = l
      steps.push(copy)
    }
  }
  steps.push({ kind: 'yarnOver', caption: 'Yarn over.', loopsOnHook: 7 })
  steps.push({
    kind: 'pullThrough',
    through: 6,
    caption: 'Pull through all 6 loops — the bobble bulges to the back.',
    loopsOnHook: 1,
  })
  return steps
}

// ---- core authored stitches (shown in the picker) --------------------------

export const STITCH_MOTIONS: StitchMotion[] = [
  {
    symbolId: '__slipknot',
    name: 'Slip knot',
    steps: [knot],
  },
  {
    symbolId: 'ch',
    name: 'Chain (ch)',
    steps: [
      knot,
      ...chainPair(1),
      ...chainPair(2),
      ...chainPair(3),
      { kind: 'hold', caption: 'Keep repeating: yarn over, pull through — a chain of any length.', loopsOnHook: 1 },
    ],
  },
  {
    symbolId: 'slst',
    name: 'Slip stitch (sl st)',
    steps: [
      { kind: 'insert', target: 'A', caption: 'Insert the hook into the next stitch (this join barely uses any height).', loopsOnHook: 1 },
      { kind: 'yarnOver', caption: 'Yarn over.', loopsOnHook: 2 },
      { kind: 'pullThrough', through: 2, caption: 'Pull through both the stitch and the loop on the hook in one move.', loopsOnHook: 1 },
    ],
  },
  {
    symbolId: 'sc',
    name: 'Single crochet (sc)',
    steps: [
      { kind: 'insert', target: 'A', caption: 'Insert the hook into the next stitch.', loopsOnHook: 1 },
      { kind: 'pullUp', target: 'A', caption: 'Yarn over and pull up a loop — 2 loops on the hook.', loopsOnHook: 2 },
      { kind: 'yarnOver', caption: 'Yarn over again.', loopsOnHook: 3 },
      { kind: 'pullThrough', through: 2, caption: 'Pull through both loops — the single crochet is done.', loopsOnHook: 1 },
    ],
  },
  {
    symbolId: 'hdc',
    name: 'Half double crochet (hdc)',
    steps: [
      { kind: 'yarnOver', caption: 'Yarn over first.', loopsOnHook: 2 },
      { kind: 'insert', target: 'A', caption: 'Insert the hook into the next stitch.', loopsOnHook: 2 },
      { kind: 'pullUp', target: 'A', caption: 'Pull up a loop — 3 loops on the hook.', loopsOnHook: 3 },
      { kind: 'yarnOver', caption: 'Yarn over.', loopsOnHook: 4 },
      { kind: 'pullThrough', through: 3, caption: 'Pull through all three loops at once — done.', loopsOnHook: 1 },
    ],
  },
  {
    symbolId: 'dc',
    name: 'Double crochet (dc)',
    steps: dcBlock('A', {
      insertCaption: 'Insert the hook into the next stitch.',
      closeCaption: 'Pull through the first two loops — 2 loops left.',
    }),
  },
  {
    symbolId: 'tr',
    name: 'Treble crochet (tr)',
    steps: [
      { kind: 'yarnOver', caption: 'Yarn over.', loopsOnHook: 2 },
      { kind: 'yarnOver', caption: 'Yarn over a second time — treble starts with two wraps.', loopsOnHook: 3 },
      { kind: 'insert', target: 'A', caption: 'Insert the hook into the next stitch.', loopsOnHook: 3 },
      { kind: 'pullUp', target: 'A', caption: 'Pull up a loop — 4 loops on the hook.', loopsOnHook: 4 },
      { kind: 'yarnOver', caption: 'Yarn over.', loopsOnHook: 5 },
      { kind: 'pullThrough', through: 2, caption: 'Pull through two — 3 loops left.', loopsOnHook: 3 },
      { kind: 'yarnOver', caption: 'Yarn over.', loopsOnHook: 4 },
      { kind: 'pullThrough', through: 2, caption: 'Pull through two — 2 loops left.', loopsOnHook: 2 },
      { kind: 'yarnOver', caption: 'Yarn over.', loopsOnHook: 3 },
      { kind: 'pullThrough', through: 2, caption: 'Pull through the last two — the treble crochet is done.', loopsOnHook: 1 },
    ],
  },
  {
    symbolId: 'dc2tog',
    name: 'Double crochet decrease (dc2tog)',
    steps: [
      { kind: 'yarnOver', caption: 'Yarn over — a decrease is two unfinished double crochets joined at the top.', loopsOnHook: 2 },
      { kind: 'insert', target: 'A', caption: 'Insert the hook into the first stitch.', loopsOnHook: 2 },
      { kind: 'pullUp', target: 'A', caption: 'Pull up a loop — 3 loops on the hook.', loopsOnHook: 3 },
      { kind: 'yarnOver', caption: 'Yarn over.', loopsOnHook: 4 },
      { kind: 'pullThrough', through: 2, caption: 'Pull through two — but leave the loop unfinished (2 loops left).', loopsOnHook: 2 },
      { kind: 'insert', target: 'B', caption: 'Insert the hook into the NEXT stitch.', loopsOnHook: 2 },
      { kind: 'pullUp', target: 'B', caption: 'Pull up a loop — 3 loops on the hook.', loopsOnHook: 3 },
      { kind: 'yarnOver', caption: 'Yarn over.', loopsOnHook: 4 },
      { kind: 'pullThrough', through: 3, caption: 'Pull through all three loops — both stitches become one.', loopsOnHook: 1 },
    ],
  },
  {
    symbolId: 'magicring',
    name: 'Magic ring',
    steps: [
      { kind: 'ringShow', caption: 'Wrap the yarn around two fingers into a ring, laid over the tail.', loopsOnHook: 0 },
      { kind: 'insert', target: 'ring', caption: 'Push the hook through the centre of the ring.', loopsOnHook: 0 },
      { kind: 'pullUp', target: 'ring', caption: 'Catch the working yarn and pull up a loop.', loopsOnHook: 1 },
      { kind: 'yarnOver', caption: 'Yarn over.', loopsOnHook: 2 },
      { kind: 'chain', caption: 'Chain one to close the ring — now work your first round into the ring.', loopsOnHook: 1 },
    ],
  },
]

// ---- family stitches: aliases + generated decompositions ------------------

/** ids that share a core or family motion (Commons artwork variants). */
const ALIASES: Record<string, string> = {
  'crochet-picot': 'picot',
  'crochet-popcorn': 'popcorn',
  'crochet-puff-stitch': 'puff',
  'crochet-raised-double-front': 'fpdc',
  'crochet-raised-double-back': 'bpdc',
  'crochet-dc2tog': 'dc2tog',
  'crochet-chain': 'ch',
  'crochet-single-crochet': 'sc',
  'crochet-single-crochet-2': 'sc',
  'crochet-double-crochet': 'dc',
  'crochet-triple': 'tr',
  'crochet-slip-stitch': 'slst',
  'crochet-half-double-crochet': 'hdc',
  'crochet-triple-triple': 'trtr',
  'crochet-double-triple': 'dtr',
  'ring6ch': 'ring',
  'tch1': 'ch',
  'tch2': 'ch',
  'tch3': 'ch',
  'tch4': 'ch',
  'tch5': 'ch',
  'tch6': 'ch',
}

const FAMILY: Record<string, StitchMotion> = {
  picot: {
    symbolId: 'picot',
    name: 'Picot',
    steps: [
      ...chainPair(1),
      ...chainPair(2),
      ...chainPair(3),
      { kind: 'insert', target: 'A', caption: 'Insert the hook back into the stitch the chain grows from.', loopsOnHook: 1 },
      { kind: 'yarnOver', caption: 'Yarn over.', loopsOnHook: 2 },
      { kind: 'pullThrough', through: 2, caption: 'Slip stitch to close — a little point of three chains.', loopsOnHook: 1 },
    ],
  },
  shell: { symbolId: 'shell', name: 'Shell', steps: shellBlock('dc', 5) },
  popcorn: {
    symbolId: 'popcorn',
    name: 'Popcorn (pc)',
    steps: [
      ...dcBlock('A', { insertCaption: 'Work this dc into the SAME stitch.' }),
      ...dcBlock('A', { insertCaption: 'Second dc into the same stitch.' }),
      ...dcBlock('A', { insertCaption: 'Third dc into the same stitch.' }),
      ...dcBlock('A', { insertCaption: 'Fourth dc into the same stitch.' }),
      ...dcBlock('A', { insertCaption: 'Fifth dc into the same stitch.' }),
      {
        kind: 'insert',
        target: 'A',
        caption: 'Take the hook out, then insert it from the FRONT into the first dc of the group.',
        loopsOnHook: 1,
      },
      {
        kind: 'pullThrough',
        through: 1,
        caption: 'Catch the working loop and pull it through — the popcorn pops forward.',
        loopsOnHook: 1,
      },
    ],
  },
  puff: {
    symbolId: 'puff',
    name: 'Puff stitch',
    steps: [
      { kind: 'yarnOver', caption: 'Yarn over.', loopsOnHook: 2 },
      { kind: 'insert', target: 'A', caption: 'Insert into the stitch.', loopsOnHook: 2 },
      { kind: 'pullUp', target: 'A', caption: 'Pull up a loop as tall as a double crochet — 3 loops.', loopsOnHook: 3 },
      { kind: 'yarnOver', caption: 'Yarn over and repeat.', loopsOnHook: 4 },
      { kind: 'insert', target: 'A', caption: 'Into the same stitch again.', loopsOnHook: 4 },
      { kind: 'pullUp', target: 'A', caption: 'Pull up another loop — 5 loops.', loopsOnHook: 5 },
      { kind: 'yarnOver', caption: 'Yarn over, a third time.', loopsOnHook: 6 },
      { kind: 'insert', target: 'A', caption: 'Into the same stitch a last time.', loopsOnHook: 6 },
      { kind: 'pullUp', target: 'A', caption: 'Pull up a loop — 7 loops.', loopsOnHook: 7 },
      { kind: 'yarnOver', caption: 'Yarn over.', loopsOnHook: 8 },
      { kind: 'pullThrough', through: 7, caption: 'Pull through all 7 loops, then chain one to close the puff.', loopsOnHook: 1 },
    ],
  },
  bobble: { symbolId: 'bobble', name: 'Bobble (bo)', steps: bobbleSteps() },
  fpdc: {
    symbolId: 'fpdc',
    name: 'Front post dc (FPdc)',
    steps: dcBlock('A', {
      insertCaption: 'Insert the hook from front to BACK around the post of the next dc, then back to the front.',
      closeCaption: 'Finish like a normal double crochet.',
    }),
  },
  bpdc: {
    symbolId: 'bpdc',
    name: 'Back post dc (BPdc)',
    steps: dcBlock('A', {
      insertCaption: 'Insert the hook from BACK to FRONT around the post of the next dc, then front to back.',
      closeCaption: 'Finish like a normal double crochet.',
    }),
  },
  crosseddc: {
    symbolId: 'crosseddc',
    name: 'Crossed dc (x-dc)',
    steps: [
      ...dcBlock('B', { insertCaption: 'SKIP the next stitch; work this dc into the one after it.' }),
      ...dcBlock('A', { insertCaption: 'Now work a dc into the SKIPPED stitch — the hook crosses behind the first dc.' }),
    ],
  },
  blo: {
    symbolId: 'blo',
    name: 'Back loop only (blo)',
    steps: [
      { kind: 'insert', target: 'A', caption: 'Insert the hook under the BACK loop only — the one furthest from you.', loopsOnHook: 1 },
      { kind: 'pullUp', target: 'A', caption: 'Yarn over and pull up a loop — 2 loops on the hook.', loopsOnHook: 2 },
      { kind: 'yarnOver', caption: 'Yarn over again.', loopsOnHook: 3 },
      { kind: 'pullThrough', through: 2, caption: 'Pull through both loops. Back-loops-only rows leave a ridge.', loopsOnHook: 1 },
    ],
  },
  flo: {
    symbolId: 'flo',
    name: 'Front loop only (flo)',
    steps: [
      { kind: 'insert', target: 'A', caption: 'Insert the hook under the FRONT loop only — the one nearest you.', loopsOnHook: 1 },
      { kind: 'pullUp', target: 'A', caption: 'Yarn over and pull up a loop — 2 loops on the hook.', loopsOnHook: 2 },
      { kind: 'yarnOver', caption: 'Yarn over again.', loopsOnHook: 3 },
      { kind: 'pullThrough', through: 2, caption: 'Pull through both loops.', loopsOnHook: 1 },
    ],
  },
  sc2tog: { symbolId: 'sc2tog', name: 'Single crochet decrease (sc2tog)', steps: decreaseOf('sc', 2) },
  sc3tog: { symbolId: 'sc3tog', name: '3 sc together (sc3tog)', steps: decreaseOf('sc', 3) },
  hdc2tog: { symbolId: 'hdc2tog', name: 'Half double decrease (hdc2tog)', steps: decreaseOf('hdc', 2) },
  hdg3tog: { symbolId: 'hdg3tog', name: '3 hdc together (hdc3tog)', steps: decreaseOf('hdc', 3) },
  tr3tog: { symbolId: 'tr3tog', name: '3 tr together (tr3tog)', steps: decreaseOf('tr', 3) },
  dc5tog: { symbolId: 'dc5tog', name: '5 dc together (dc5tog)', steps: decreaseOf('dc', 5) },
  'st2tog-v1': { symbolId: 'st2tog-v1', name: '2 stitches together', steps: decreaseOf('sc', 2) },
  'st2tog-v2': { symbolId: 'st2tog-v2', name: '2 stitches together', steps: decreaseOf('sc', 2) },
  st3tog: { symbolId: 'st3tog', name: '3 stitches together', steps: decreaseOf('sc', 3) },
  'st3tog-ch': { symbolId: 'st3tog-ch', name: '3 stitches together', steps: decreaseOf('sc', 3) },
  'crochet-dc3tog': { symbolId: 'crochet-dc3tog', name: '3 dc together', steps: decreaseOf('dc', 3) },
  'crochet-decrease': { symbolId: 'crochet-decrease', name: 'Decrease', steps: decreaseOf('sc', 2) },
  'crochet-increase': {
    symbolId: 'crochet-increase',
    name: 'Increase (2 dc in one)',
    steps: [
      ...dcBlock('A', { insertCaption: 'First dc into the stitch.' }),
      ...dcBlock('A', { insertCaption: 'Second dc into the SAME stitch — one stitch becomes two.' }),
    ],
  },
  'crochet-inc1dc': {
    symbolId: 'crochet-inc1dc',
    name: 'Increase (2 dc in one)',
    steps: [
      ...dcBlock('A', { insertCaption: 'First dc into the stitch.' }),
      ...dcBlock('A', { insertCaption: 'Second dc into the SAME stitch — one stitch becomes two.' }),
    ],
  },
  ring: {
    symbolId: 'ring',
    name: 'Chain ring',
    steps: [
      ...chainPair(1),
      ...chainPair(2),
      ...chainPair(3),
      ...chainPair(4),
      ...chainPair(5),
      ...chainPair(6),
      { kind: 'insert', target: 'A', caption: 'Insert the hook into the FIRST chain to form a ring.', loopsOnHook: 1 },
      { kind: 'yarnOver', caption: 'Yarn over.', loopsOnHook: 2 },
      { kind: 'pullThrough', through: 2, caption: 'Slip stitch to close the ring.', loopsOnHook: 1 },
    ],
  },
}

const SHELL_RE = /^(sc|hdc|dc)([2-5])sh(-x)?$/

/**
 * Resolve a motion for any palette symbol: exact authored table, family
 * aliases, pattern-generated shells, then a height-based approximation.
 */
export function motionForAny(symbolId: string, label: string): StitchMotion | undefined {
  const exact = STITCH_MOTIONS.find((m) => m.symbolId === symbolId)
  if (exact) return exact
  const family = FAMILY[symbolId]
  if (family) return family
  const aliasId = ALIASES[symbolId]
  if (aliasId) {
    const aliased = STITCH_MOTIONS.find((m) => m.symbolId === aliasId) ?? FAMILY[aliasId]
    if (aliased) return { ...aliased, symbolId }
  }
  const shell = SHELL_RE.exec(symbolId)
  if (shell) {
    const base = shell[1] as 'sc' | 'hdc' | 'dc'
    return {
      symbolId,
      name: `${base} ${shell[2]}-together shell`,
      steps: shellBlock(base, Number(shell[2])),
      approximate: symbolId.endsWith('-x'),
    }
  }
  return genericMotion(symbolId, label)
}

export const motionFor = (symbolId: string): StitchMotion | undefined =>
  STITCH_MOTIONS.find((m) => m.symbolId === symbolId)

/**
 * Height-based approximation for stitches without an authored technique:
 * the standard wrap formula (N−1 yarn overs, insert, pull up, then work off
 * two loops at a time; hdc closes through 3 at once).
 */
export function genericMotion(symbolId: string, label: string): StitchMotion {
  const id = symbolId.toLowerCase()
  let kind: 'sc' | 'hdc' | 'dc' | 'tr' | 'dtr' | 'trtr' = 'sc'
  if (/trtr|triple-triple/.test(id)) kind = 'trtr'
  else if (/dtr|double-triple|double-treble/.test(id)) kind = 'dtr'
  else if (/tr|triple|treble/.test(id)) kind = 'tr'
  else if (/dc|double/.test(id)) kind = 'dc'
  else if (/hdc|half/.test(id)) kind = 'hdc'
  const wraps = kind === 'sc' ? 0 : kind === 'hdc' ? 1 : kind === 'dc' ? 1 : kind === 'tr' ? 2 : kind === 'dtr' ? 3 : 4
  const name =
    ({ sc: 'single', hdc: 'half double', dc: 'double', tr: 'treble', dtr: 'double treble', trtr: 'triple treble' } as const)[kind]
  const steps: MotionStep[] = [
    {
      kind: 'hold',
      caption: `No dedicated animation yet — here is the ${name}-crochet motion this stitch is based on.`,
      loopsOnHook: 1,
    },
  ]
  let l = 1
  for (let i = 0; i < wraps; i++) {
    l += 1
    steps.push({ kind: 'yarnOver', caption: 'Yarn over.', loopsOnHook: l })
  }
  steps.push({
    kind: 'insert',
    target: 'A',
    caption: wraps > 0 ? `Insert the hook into the next stitch, past the wraps — ${l} loops on the hook.` : 'Insert the hook into the next stitch.',
    loopsOnHook: l,
  })
  l += 1
  steps.push({ kind: 'pullUp', target: 'A', caption: `Pull up a loop — ${l} loops on the hook.`, loopsOnHook: l })
  if (kind === 'hdc') {
    l += 1
    steps.push({ kind: 'yarnOver', caption: 'Yarn over.', loopsOnHook: l })
    steps.push({ kind: 'pullThrough', through: 3, caption: 'Pull through all the loops at once.', loopsOnHook: 1 })
  } else {
    for (let i = 0; i < wraps + 1; i++) {
      l += 1
      steps.push({ kind: 'yarnOver', caption: 'Yarn over.', loopsOnHook: l })
      const left = l - 2
      l -= 2
      steps.push({
        kind: 'pullThrough',
        through: 2,
        caption: left > 0 ? `Pull through two — ${left} loop${left === 1 ? '' : 's'} left.` : 'Pull through the last two loops.',
        loopsOnHook: l,
      })
    }
  }
  return { symbolId, name: `${label} — like a ${name} crochet`, approximate: true, steps }
}
