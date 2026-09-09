import type { Scene, Pose, Vec } from './engine'
import { TARGET, RING_CENTER, YARN_TAIL, YARN_MID_REST, VIEW, slotX, ringView, wrapView, yarnAttachX, easeInOut, seg, lerp } from './engine'

// Line-art palette: dark steel hook, warm yarn thread, app accent for highlights.
const HOOK = '#3a3733'
const YARN = '#bf6a4b'
const YARN_SOFT = '#d9a68f'
const INK = '#26221f'
const ACCENT = '#d96f4e'

const rad = (deg: number) => (deg * Math.PI) / 180

/** Transform a hook-local point into scene space. */
export const hookPoint = (p: Pose, l: Vec): Vec => ({
  x: p.x + Math.cos(rad(p.rot)) * l.x - Math.sin(rad(p.rot)) * l.y,
  y: p.y + Math.sin(rad(p.rot)) * l.x + Math.cos(rad(p.rot)) * l.y,
})

const stitchV = (x: number, top: number, point: number, stroke: string, width: number) => (
  <path
    key={`${x}-${top}`}
    d={`M ${x - 9} ${top} L ${x} ${point} L ${x + 9} ${top}`}
    fill="none"
    stroke={stroke}
    strokeWidth={width}
    strokeLinecap="round"
    strokeLinejoin="round"
  />
)

const lerpV = (a: Vec, b: Vec, k: number): Vec => ({ x: lerp(a.x, b.x, k), y: lerp(a.y, b.y, k) })

/** Sag point the working yarn pulls down to while drawing through the loops. */
const SLIDE_BELLY: Vec = { x: 84, y: 170 }

/** Centre of the loop currently travelling up from the fabric to the hook. */
function formingCenter(scene: Scene): Vec {
  const { from, k } = scene.forming!
  const to = hookPoint(scene.hook, { x: slotX(0, scene.loops + 1), y: -1 })
  return lerpV(from, to, k)
}

function Yarn({ scene }: { scene: Scene }) {
  const end = hookPoint(scene.hook, { x: yarnAttachX(scene), y: 2 })
  let d: string
  if (scene.forming) {
    // pull-up: the thread runs from the tail, through the target stitch, into
    // the loop travelling up to the hook — then relaxes as the loop lands
    const { from, k } = scene.forming
    const ring = formingCenter(scene)
    const bend = lerpV(from, YARN_MID_REST, easeInOut(seg(k, 0.75, 1)))
    const c1 = lerpV(bend, ring, 0.5)
    const c2 = lerpV(ring, end, 0.5)
    d = `M ${YARN_TAIL.x} ${YARN_TAIL.y} Q ${scene.yarnMid.x} ${scene.yarnMid.y} ${bend.x} ${bend.y} Q ${c1.x} ${c1.y} ${ring.x} ${ring.y} Q ${c2.x} ${c2.y} ${end.x} ${end.y}`
  } else if (scene.slide && scene.slide.k > 0) {
    // pull-through: the yarn runs along the shaft, through the loops sliding
    // off the tip, then hangs to the tail — relaxing back once the draw ends
    const k = scene.slide.k
    const out = easeInOut(seg(k, 0, 0.3))
    const back = easeInOut(seg(k, 0.65, 1))
    const belly = lerpV(lerpV(YARN_MID_REST, SLIDE_BELLY, easeInOut(seg(k, 0.05, 0.55))), YARN_MID_REST, back)
    const exit = hookPoint(scene.hook, { x: lerp(yarnAttachX(scene) - 3, -4, out), y: lerp(6, 12, out) })
    const c2 = lerpV(exit, end, 0.5)
    d = `M ${YARN_TAIL.x} ${YARN_TAIL.y} Q ${belly.x} ${belly.y} ${exit.x} ${exit.y} Q ${c2.x} ${c2.y} ${end.x} ${end.y}`
  } else {
    d = `M ${YARN_TAIL.x} ${YARN_TAIL.y} Q ${scene.yarnMid.x} ${scene.yarnMid.y} ${end.x} ${end.y}`
  }
  return (
    <path
      d={d}
      fill="none"
      stroke={YARN}
      strokeWidth={3.4}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  )
}

function Hook({ scene }: { scene: Scene }) {
  const loops = []
  // ring width thins with the slot spacing so dense stacks stay countable
  const step = scene.loops > 4 ? 34 / (scene.loops - 1) : 12
  const rx = Math.min(4, step * 0.62)
  for (let i = 0; i < scene.loops; i++) {
    const v = ringView(scene, i)
    loops.push(
      <ellipse
        key={`lp${i}`}
        cx={v.x}
        cy={-1}
        rx={rx * v.scale}
        ry={8.5 * v.scale}
        fill="none"
        stroke={YARN}
        strokeWidth={3.4}
        opacity={v.opacity}
      />,
    )
  }
  // a yarn-over wrap settling onto the shaft behind the loop stack
  const wv = wrapView(scene)
  if (wv) {
    loops.push(
      <ellipse key="wrap" cx={wv.x} cy={-1} rx={rx * wv.scale} ry={8.5 * wv.scale} fill="none" stroke={YARN} strokeWidth={3.4} opacity={wv.opacity} />,
    )
  }
  return (
    <g transform={`translate(${scene.hook.x} ${scene.hook.y}) rotate(${scene.hook.rot})`}>
      <path
        d="M 104 4 C 72 2, 36 0, 18 0 C 6 0, -2 6, 0 14"
        fill="none"
        stroke={HOOK}
        strokeWidth={5}
        strokeLinecap="round"
      />
      <rect x={86} y={-4.5} width={22} height={9} rx={4.5} fill={HOOK} />
      {loops}
    </g>
  )
}

function Fabric({ scene }: { scene: Scene }) {
  const worked = [0, 1, 2, 3].map((i) => stitchV(152 + i * 28, 126, 152, YARN_SOFT, 4))
  const isHi = (t: 'A' | 'B' | 'C') => scene.highlight === t
  return (
    <g>
      {worked}
      {stitchV(TARGET.A.x, 126, 152, isHi('A') ? ACCENT : INK, isHi('A') ? 5 : 4)}
      {stitchV(TARGET.B.x, 126, 152, isHi('B') ? ACCENT : INK, isHi('B') ? 5 : 4)}
      {stitchV(TARGET.C.x, 126, 152, isHi('C') ? ACCENT : INK, isHi('C') ? 5 : 4)}
    </g>
  )
}

function Chains({ scene }: { scene: Scene }) {
  const links = []
  for (let i = 0; i < scene.chains; i++) {
    links.push(<ellipse key={`ch${i}`} cx={126 - i * 22} cy={112} rx={7} ry={9.5} fill="none" stroke={YARN} strokeWidth={3.4} />)
  }
  if (scene.chainPop > 0) {
    const k = scene.chainPop
    const tip = hookPoint(scene.hook, { x: -6, y: 14 })
    const slot = { x: 126 - scene.chains * 22, y: 112 }
    links.push(
      <ellipse
        key="chNew"
        cx={tip.x + (slot.x - tip.x) * k}
        cy={tip.y + (slot.y - tip.y) * k}
        rx={7 * k}
        ry={9.5 * k}
        fill="none"
        stroke={YARN}
        strokeWidth={3.4}
      />,
    )
  }
  return <g>{links}</g>
}

function Ring({ scene }: { scene: Scene }) {
  if (scene.ring <= 0) return null
  return (
    <g opacity={scene.ring}>
      <circle cx={RING_CENTER.x} cy={RING_CENTER.y} r={42} fill="none" stroke={YARN} strokeWidth={4} />
      <path d={`M ${RING_CENTER.x - 38} ${RING_CENTER.y + 20} Q 30 185 ${YARN_TAIL.x} ${YARN_TAIL.y}`} fill="none" stroke={YARN} strokeWidth={3.4} strokeLinecap="round" />
    </g>
  )
}

function KnotLoop({ scene }: { scene: Scene }) {
  if (scene.knot <= 0) return null
  const c = hookPoint(scene.hook, { x: 18, y: 0 })
  const r = 4 + 26 * scene.knot
  return (
    <g opacity={Math.min(1, scene.knot * 4)}>
      <circle cx={c.x} cy={c.y} r={r} fill="none" stroke={YARN} strokeWidth={3.4} />
      <path d={`M ${c.x - r * 0.5} ${c.y + r * 0.8} Q 40 190 ${YARN_TAIL.x} ${YARN_TAIL.y}`} fill="none" stroke={YARN} strokeWidth={3} strokeLinecap="round" />
    </g>
  )
}

function FormingLoop({ scene }: { scene: Scene }) {
  if (!scene.forming) return null
  const { k } = scene.forming
  const c = formingCenter(scene)
  return (
    <ellipse
      cx={c.x}
      cy={c.y}
      rx={5.5 + (4 - 5.5) * k}
      ry={5.5 + (8.5 - 5.5) * k}
      fill="none"
      stroke={YARN}
      strokeWidth={3.4}
    />
  )
}

/** Render the whole scene, layer order depending on whether the hook is inside the fabric. */
export function renderScene(scene: Scene, mirrored = false) {
  const hook = <Hook scene={scene} />
  const fabric = <Fabric scene={scene} />
  return (
    <svg
      viewBox={`0 0 ${VIEW.w} ${VIEW.h}`}
      className="motion-svg"
      data-testid="motion-svg"
      style={mirrored ? { transform: 'scaleX(-1)' } : undefined}
    >
      <rect x={0} y={0} width={VIEW.w} height={VIEW.h} fill="var(--paper, #faf8f4)" />
      <Ring scene={scene} />
      <Chains scene={scene} />
      <KnotLoop scene={scene} />
      {scene.inserted ? (
        <>
          {hook}
          {fabric}
        </>
      ) : (
        <>
          {fabric}
          {hook}
        </>
      )}
      <FormingLoop scene={scene} />
      <Yarn scene={scene} />
    </svg>
  )
}
