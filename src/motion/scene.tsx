import type { Scene, Pose, Vec } from './engine'
import { TARGET, RING_CENTER, YARN_TAIL, LOOP_LOCAL_X, VIEW } from './engine'

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

const YARN_PT_LOCAL: Vec = { x: 34, y: 2 }

function Hook({ scene }: { scene: Scene }) {
  const loops = []
  const slideK = scene.slide?.k ?? 0
  for (let i = 0; i < scene.loops; i++) {
    const consumed = scene.slide && i < scene.slide.n
    const lx = consumed ? LOOP_LOCAL_X[i] + (2 - LOOP_LOCAL_X[i]) * slideK : LOOP_LOCAL_X[i]
    const scale = consumed ? 1 - 0.5 * slideK : 1
    loops.push(
      <ellipse
        key={`lp${i}`}
        cx={lx}
        cy={-1}
        rx={4 * scale}
        ry={8.5 * scale}
        fill="none"
        stroke={YARN}
        strokeWidth={3.4}
        opacity={consumed ? 1 - slideK : 1}
      />,
    )
  }
  // a yarn-over wrap popping onto the shaft (becomes the tip-most loop)
  if (scene.wrap > 0) {
    loops.push(
      <ellipse key="wrap" cx={LOOP_LOCAL_X[0]} cy={-1} rx={4 * scene.wrap} ry={8.5 * scene.wrap} fill="none" stroke={YARN} strokeWidth={3.4} />,
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

function Yarn({ scene }: { scene: Scene }) {
  const end = hookPoint(scene.hook, YARN_PT_LOCAL)
  return (
    <path
      d={`M ${YARN_TAIL.x} ${YARN_TAIL.y} Q ${scene.yarnMid.x} ${scene.yarnMid.y} ${end.x} ${end.y}`}
      fill="none"
      stroke={YARN}
      strokeWidth={3.4}
      strokeLinecap="round"
    />
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
  const { from, k } = scene.forming
  const to = hookPoint(scene.hook, { x: LOOP_LOCAL_X[0], y: -1 })
  return (
    <ellipse
      cx={from.x + (to.x - from.x) * k}
      cy={from.y + (to.y - from.y) * k}
      rx={5.5}
      ry={5.5 + 3 * k}
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
