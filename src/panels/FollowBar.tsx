import { useMemo } from 'react'
import { useStore } from '../state/store'
import { followSteps } from '../geometry/instructions'

/** Bottom-of-canvas bar for stepping through the chart round by round. */
export function FollowBar() {
  const doc = useStore((s) => s.doc)
  const round = useStore((s) => s.followRound)
  const tolerance = useStore((s) => s.followTolerance)

  const steps = useMemo(() => followSteps(doc, tolerance), [doc, tolerance])
  const idx = steps.length === 0 ? 0 : Math.min(round, steps.length - 1)
  const step = steps[idx]

  return (
    <div className="follow-bar">
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
