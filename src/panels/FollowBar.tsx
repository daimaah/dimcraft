import { useEffect, useMemo, useRef, useState } from 'react'
import { useStore } from '../state/store'
import { followSteps } from '../geometry/instructions'

const POS_KEY = 'dimcrochet.followBar'

interface FollowBarState {
  x: number
  y: number
  w: number
}

function loadBarState(): Partial<FollowBarState> {
  try {
    return JSON.parse(localStorage.getItem(POS_KEY) ?? '{}') as Partial<FollowBarState>
  } catch {
    return {}
  }
}

/** Bottom-of-canvas bar for stepping through the chart round by round. */
export function FollowBar() {
  const doc = useStore((s) => s.doc)
  const round = useStore((s) => s.followRound)
  const tolerance = useStore((s) => s.followTolerance)

  const steps = useMemo(() => followSteps(doc, tolerance), [doc, tolerance])
  const idx = steps.length === 0 ? 0 : Math.min(round, steps.length - 1)
  const step = steps[idx]

  const barRef = useRef<HTMLDivElement>(null)
  const saved = useRef(loadBarState())
  const [pos, setPos] = useState<{ x: number; y: number } | null>(
    saved.current.x !== undefined && saved.current.y !== undefined
      ? { x: saved.current.x, y: saved.current.y }
      : null,
  )
  const [width, setWidth] = useState<number | undefined>(saved.current.w)
  const [dragging, setDragging] = useState(false)

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

  const persist = (p: { x: number; y: number }, w: number | undefined) => {
    try {
      localStorage.setItem(POS_KEY, JSON.stringify({ ...p, w }))
    } catch {
      /* storage unavailable */
    }
  }

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
      persist(next, width)
    }
    const onUp = () => {
      setDragging(false)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  const persistWidth = (w: number) => {
    setWidth(w)
    persist(pos ?? { x: 0, y: 0 }, w)
  }

  // track user resizing via the CSS handle
  useEffect(() => {
    const bar = barRef.current
    if (!bar || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver((entries) => {
      const w = Math.round(entries[0].contentRect.width)
      if (w > 0 && w !== width) persistWidth(w)
    })
    ro.observe(bar)
    return () => ro.disconnect()
  })

  return (
    <div
      ref={barRef}
      className={`follow-bar${dragging ? ' dragging' : ''}`}
      style={{ left: pos?.x, top: pos?.y, width }}
    >
      <div
        className="follow-grip"
        title="Drag to move"
        onPointerDown={startDrag}
        data-testid="follow-grip"
      >
        ⠿
      </div>
      <button
        className="btn"
        title="Previous round"
        disabled={idx <= 0}
        onClick={() => useStore.getState().setFollowRound(idx - 1)}
      >
        ‹
      </button>
      <div className="follow-main">
        <span className="follow-step">
          {step ? `Step ${idx + 1} of ${steps.length} · ${step.label}` : 'No rounds detected'}
        </span>
        <span className="follow-text">{step?.text ?? '—'}</span>
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
      </div>
      <button
        className="btn"
        title="Next round"
        disabled={idx >= steps.length - 1}
        onClick={() => useStore.getState().setFollowRound(idx + 1)}
      >
        ›
      </button>
      <button className="icon-btn" title="Exit follow mode" onClick={() => useStore.getState().setFollow(false)}>
        ✕
      </button>
    </div>
  )
}
