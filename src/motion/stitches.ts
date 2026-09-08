import type { MotionStep, StitchMotion } from './types'

/**
 * Physical technique decompositions for the core stitches, in US terms.
 * The step sequences and the "loops on hook" counts follow the standard
 * beginner instructions (yo once → 3 loops → through 2 twice for dc; yo twice
 * → 4 loops → through 2 three times for tr; hdc pulls through all 3 at once).
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
    steps: [
      { kind: 'yarnOver', caption: 'Yarn over first.', loopsOnHook: 2 },
      { kind: 'insert', target: 'A', caption: 'Insert the hook into the next stitch.', loopsOnHook: 2 },
      { kind: 'pullUp', target: 'A', caption: 'Pull up a loop — 3 loops on the hook.', loopsOnHook: 3 },
      { kind: 'yarnOver', caption: 'Yarn over.', loopsOnHook: 4 },
      { kind: 'pullThrough', through: 2, caption: 'Pull through the first two loops — 2 loops left.', loopsOnHook: 2 },
      { kind: 'yarnOver', caption: 'Yarn over once more.', loopsOnHook: 3 },
      { kind: 'pullThrough', through: 2, caption: 'Pull through the last two loops — the double crochet is done.', loopsOnHook: 1 },
    ],
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

export const motionFor = (symbolId: string): StitchMotion | undefined =>
  STITCH_MOTIONS.find((m) => m.symbolId === symbolId)
