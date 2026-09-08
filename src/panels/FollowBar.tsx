import { useEffect, useMemo, useRef, useState } from 'react'
import { useStore } from '../state/store'
import { followSteps } from '../geometry/instructions'

const POS_KEY = 'dimcrochet.followBar'

interface FollowBarState {
  x: number
  y: number
  /** compact pill mode — same spot, less screen */
  min?: boolean
}

function loadBarState(): Partial<FollowBarState> {
  try {
    return JSON.parse(localStorage.getItem(POS_KEY) ?? '{}') as Partial<FollowBarState>
  } catch {
    return {}
  }
}

const dirOf = () => (useStore.getState().lefty ? 'cw' : 'ccw')

/** Move the stitch cursor within the round's working order, crossing round boundaries. */
export function stepFollow(delta: 1 | -1) {
  const st = useStore.getState()
  const steps = followSteps(st.doc, st.followTolerance, dirOf())
  if (steps.length === 0) return
  const idx = Math.min(st.followRound, steps.length - 1)
  const order = steps[idx].order
  const cursor = st.followStitch
  if (delta === 1) {
    if (cursor == null) st.seekFollow(idx, 0)
    else if (cursor + 1 < order.length) st.seekFollow(idx, cursor + 1)
    else if (idx + 1 < steps.length) st.seekFollow(idx + 1, 0)
  } else {
    if (cursor == null) st.seekFollow(idx, 0)
    else if (cursor > 0) st.seekFollow(idx, cursor - 1)
    else if (idx > 0) st.seekFollow(idx - 1, steps[idx - 1].order.length - 1)
  }
}

/** Play/pause the stitch-by-stitch build; replaying from R1 when already at the end. */
export function toggleFollowPlayback() {
  const st = useStore.getState()
  if (!st.followActive) return
  if (st.followPlaying) {
    st.setFollowPlaying(false)
    return
  }
  const steps = followSteps(st.doc, st.followTolerance, dirOf())
  if (steps.length === 0) return
  const idx = Math.min(st.followRound, steps.length - 1)
  const order = steps[idx].order
  const atEnd = idx === steps.length - 1 && st.followStitch != null && st.followStitch >= order.length - 1
  if (st.followStitch == null) st.seekFollow(idx, 0, true)
  else if (atEnd) st.seekFollow(0, 0, true)
  else st.setFollowPlaying(true)
}

/** Open the technique animation for the current round's dominant stitch. */
export function showHowForCurrentRound() {
  const st = useStore.getState()
  const steps = followSteps(st.doc, st.followTolerance, dirOf())
  if (steps.length === 0) return
  const step = steps[Math.min(st.followRound, steps.length - 1)]
  const counts = new Map<string, number>()
  for (const id of step.ids) {
    const p = st.doc.placements.find((pl) => pl.id === id)
    if (p) counts.set(p.symbolId, (counts.get(p.symbolId) ?? 0) + 1)
  }
  const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1])
  const pick = ranked.find(([id]) => id !== 'ch')?.[0] ?? ranked[0]?.[0]
  if (pick) st.requestMotion(pick)
}

/** Bottom-of-canvas bar for stepping through the chart. Auto-fits the canvas;
 *  can shrink to a compact pill in the same spot. */
export function FollowBar() {
  const doc = useStore((s) => s.doc)
  const round = useStore((s) => s.followRound)
  const tolerance = useStore((s) => s.followTolerance)
  const followStitch = useStore((s) => s.followStitch)
  const playing = useStore((s) => s.followPlaying)
  const speed = useStore((s) => s.followSpeed)
  const lefty = useStore((s) => s.lefty)

  const steps = useMemo(
    () => followSteps(doc, tolerance, lefty ? 'cw' : 'ccw'),
    [doc, tolerance, lefty],
  )
  const idx = steps.length === 0 ? 0 : Math.min(round, steps.length - 1)
  const step = steps[idx]
  const order = step?.order ?? []
  const cursor = followStitch == null || order.length === 0 ? null : Math.min(followStitch, order.length - 1)

  // playback: light one stitch per tick, crossing into the next round, then stop
  useEffect(() => {
    if (!playing) return
    const t = window.setTimeout(() => {
      const st = useStore.getState()
      const cur = followSteps(st.doc, st.followTolerance, st.lefty ? 'cw' : 'ccw')
      if (cur.length === 0) return st.setFollowPlaying(false)
      const i = Math.min(st.followRound, cur.length - 1)
      const ord = cur[i].order
      const c = st.followStitch == null ? -1 : Math.min(st.followStitch, ord.length - 1)
      if (c + 1 < ord.length) st.seekFollow(i, c + 1, true)
      else if (i + 1 < cur.length) st.seekFollow(i + 1, 0, true)
      else st.setFollowPlaying(false)
    }, 550 / speed)
    return () => window.clearTimeout(t)
  }, [playing, speed, followStitch, round, steps])

  const barRef = useRef<HTMLDivElement>(null)
  const saved = useRef(loadBarState())
  const [pos, setPos] = useState<{ x: number; y: number } | null>(
    saved.current.x !== undefined && saved.current.y !== undefined
      ? { x: saved.current.x, y: saved.current.y }
      : null,
  )
  const [minimized, setMinimized] = useState(saved.current.min === true)
  const [dragging, setDragging] = useState(false)

  const persist = (patch: Partial<FollowBarState>) => {
    try {
      localStorage.setItem(POS_KEY, JSON.stringify({ ...loadBarState(), ...patch }))
    } catch {
      /* storage unavailable */
    }
  }

  // default position: centered near the bottom (measured once after mount)
  useEffect(() => {
    if (pos) return
    const bar = barRef.current
    const parent = bar?.parentElement
    if (!bar || !parent) return
    const pw = parent.clientWidth
    const ph = parent.clientHeight
    const x = Math.max(8, (pw - bar.offsetWidth) / 2)
    const y = Math.max(8, ph - bar.offsetHeight - 14)
    setPos({ x, y })
  }, [pos])

  // keep the saved position inside the canvas area: it may have been stored
  // under a different window size (e.g. before entering fullscreen), which
  // would otherwise push the bar out of view
  useEffect(() => {
    if (!pos) return
    const clamp = () => {
      const bar = barRef.current
      const parent = bar?.parentElement
      if (!bar || !parent) return
      const nx = Math.min(Math.max(0, pos.x), Math.max(0, parent.clientWidth - bar.offsetWidth))
      const ny = Math.min(Math.max(0, pos.y), Math.max(0, parent.clientHeight - bar.offsetHeight))
      if (nx !== pos.x || ny !== pos.y) {
        setPos({ x: nx, y: ny })
        persist({ x: nx, y: ny })
      }
    }
    clamp()
    // defer to the next frame so the layout has settled after a size change
    const deferred = () => requestAnimationFrame(clamp)
    window.addEventListener('resize', deferred)
    document.addEventListener('fullscreenchange', deferred)
    return () => {
      window.removeEventListener('resize', deferred)
      document.removeEventListener('fullscreenchange', deferred)
    }
  }, [pos, minimized])

  const startDrag = (e: React.PointerEvent) => {
    const bar = barRef.current
    const parent = bar?.parentElement
    if (!bar || !parent) return
    const startX = e.clientX
    const startY = e.clientY
    const startPos = pos ?? { x: bar.offsetLeft, y: bar.offsetTop }
    setDragging(true)
    ;(e.target as Element).setPointerCapture(e.pointerId)
    const onMove = (ev: PointerEvent) => {
      const pw = parent.clientWidth
      const ph = parent.clientHeight
      const nx = Math.min(Math.max(0, startPos.x + (ev.clientX - startX)), Math.max(0, pw - bar.offsetWidth))
      const ny = Math.min(Math.max(0, startPos.y + (ev.clientY - startY)), Math.max(0, ph - bar.offsetHeight))
      const next = { x: nx, y: ny }
      setPos(next)
      persist(next)
    }
    const onUp = () => {
      setDragging(false)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  const stepCounter = () =>
    cursor != null ? ` · ${cursor + 1}/${order.length}` : steps.length > 0 ? ` · ${idx + 1}/${steps.length}` : ''

  const compactLabel = step ? `${step.label}${stepCounter()}` : 'Follow'

  return (
    <div
      ref={barRef}
      className={`follow-bar${minimized ? ' compact' : ''}${dragging ? ' dragging' : ''}`}
      style={{ left: pos?.x, top: pos?.y }}
      data-testid="follow-bar"
    >
      <div
        className="follow-grip"
        title="Drag to move"
        onPointerDown={startDrag}
        data-testid="follow-grip"
      >
        ⠿
      </div>
      {minimized ? (
        <>
          <span className="follow-compact-label" data-testid="follow-compact-label">
            {compactLabel}
          </span>
          <button
            className="btn"
            title={playing ? 'Pause' : 'Play'}
            data-testid="follow-play"
            disabled={!step}
            onClick={() => toggleFollowPlayback()}
          >
            {playing ? '⏸' : '▶'}
          </button>
          <button
            className="btn"
            title="Expand the follow bar"
            data-testid="follow-expand"
            onClick={() => {
              setMinimized(false)
              persist({ min: false })
            }}
          >
            ▴
          </button>
          <button className="icon-btn" title="Exit follow mode" onClick={() => useStore.getState().setFollow(false)}>
            ✕
          </button>
        </>
      ) : (
        <>
          <button
            className="btn"
            title="Previous round"
            disabled={idx <= 0}
            onClick={() => useStore.getState().setFollowRound(idx - 1)}
          >
            ‹
          </button>
          <button
            className="btn"
            title="Previous stitch"
            data-testid="follow-prev-stitch"
            disabled={!step}
            onClick={() => stepFollow(-1)}
          >
            ⟨
          </button>
          <button
            className="btn"
            title={playing ? 'Pause' : 'Play — build the chart stitch by stitch'}
            data-testid="follow-play"
            disabled={!step}
            onClick={() => toggleFollowPlayback()}
          >
            {playing ? '⏸' : '▶'}
          </button>
          <button
            className="btn"
            title="Next stitch"
            data-testid="follow-next-stitch"
            disabled={!step}
            onClick={() => stepFollow(1)}
          >
            ⟩
          </button>
          <button
            className="btn"
            title="Playback speed (click to cycle)"
            data-testid="follow-speed"
            onClick={() => useStore.getState().setFollowSpeed(speed === 0.5 ? 1 : speed === 1 ? 2 : 0.5)}
          >
            {speed === 0.5 ? '0.5×' : speed === 1 ? '1×' : '2×'}
          </button>
          <div className="follow-main">
            <span className="follow-step">
              {step
                ? `Step ${idx + 1} of ${steps.length} · ${step.label}` +
                  (cursor != null ? ` · stitch ${cursor + 1}/${order.length}` : '')
                : 'No rounds detected'}
            </span>
            <span className="follow-text">{step?.text ?? '—'}</span>
            <div className="follow-toggles">
              <div className="seg follow-tolerance">
                {(
                  [
                    [10, 'Tight'],
                    [18, 'Normal'],
                    [28, 'Loose'],
                  ] as const
                ).map(([v, label]) => (
                  <button
                    key={v}
                    className={tolerance === v ? 'on' : ''}
                    title={`Round grouping: ${label.toLowerCase()}`}
                    onClick={() => useStore.getState().setFollowTolerance(v)}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <button
                className="btn follow-how"
                title="Show the technique animation for this round's stitches"
                data-testid="follow-show-how"
                disabled={!step}
                onClick={() => showHowForCurrentRound()}
              >
                ▶ Show me how
              </button>
            </div>
          </div>
          <button
            className="btn"
            title="Next round"
            disabled={idx >= steps.length - 1}
            onClick={() => useStore.getState().setFollowRound(idx + 1)}
          >
            ›
          </button>
          <button
            className="btn"
            title="Shrink — stays in this spot"
            data-testid="follow-minimize"
            onClick={() => {
              setMinimized(true)
              persist({ min: true })
            }}
          >
            ▾
          </button>
          <button className="icon-btn" title="Exit follow mode" onClick={() => useStore.getState().setFollow(false)}>
            ✕
          </button>
        </>
      )}
    </div>
  )
}
