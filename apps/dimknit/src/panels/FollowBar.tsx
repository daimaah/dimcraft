import { useEffect, useMemo, useRef } from 'react'
import { getCraft } from '@dimcraft/core/craft'
import { useStore } from '../state/store'

/** Advance the follow cursor by `delta` stitches, walking across rows. */
export function stepFollow(delta: number) {
  const st = useStore.getState()
  const steps = getCraft().followSteps(st.doc, st.followTolerance, 'ccw')
  if (!steps.length) return
  let round = st.followRound < steps.length ? st.followRound : 0
  let stitch = st.followStitch ?? -1
  stitch += delta
  while (stitch >= steps[round].order.length) {
    if (round >= steps.length - 1) {
      stitch = steps[round].order.length - 1
      st.seekFollow(round, stitch, false)
      return
    }
    stitch -= steps[round].order.length
    round++
  }
  while (stitch < 0) {
    if (round <= 0) {
      st.seekFollow(0, 0, false)
      return
    }
    round--
    stitch += steps[round].order.length
  }
  st.seekFollow(round, stitch)
}

/** Play/pause the row-stitching animation. */
export function toggleFollowPlayback() {
  const st = useStore.getState()
  st.setFollowPlaying(!st.followPlaying)
}

/** The follow-mode bar: current row, playback controls, RS/WS chip. */
export function FollowBar() {
  const doc = useStore((s) => s.doc)
  const followRound = useStore((s) => s.followRound)
  const followStitch = useStore((s) => s.followStitch)
  const followPlaying = useStore((s) => s.followPlaying)
  const followSpeed = useStore((s) => s.followSpeed)
  const tolerance = useStore((s) => s.followTolerance)

  const steps = useMemo(() => getCraft().followSteps(doc, tolerance, 'ccw'), [doc, tolerance])
  const step = steps[followRound] ?? steps[0]
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (timer.current) clearInterval(timer.current)
    if (followPlaying && steps.length) {
      timer.current = setInterval(() => stepFollow(1), 1500 / followSpeed)
    }
    return () => {
      if (timer.current) clearInterval(timer.current)
    }
  }, [followPlaying, followSpeed, steps])

  if (!step) return null
  const onRow = followStitch === null ? false : followStitch >= 0 && followStitch < step.order.length

  return (
    <div className="bar-pop follow-bar" role="status">
      <button className="grip" title="Previous stitch" onClick={() => stepFollow(-1)}>
        ‹
      </button>
      <button className="grip" title="Play / pause" onClick={toggleFollowPlayback}>
        {followPlaying ? '❚❚' : '▶'}
      </button>
      <button className="grip" title="Next stitch" onClick={() => stepFollow(1)}>
        ›
      </button>
      <div className="follow-text">
        <span className="follow-step">
          {onRow ? `STITCH ${(followStitch ?? 0) + 1} OF ${step.order.length} · ` : ''}
          {step.label.toUpperCase()}
        </span>
        <strong>{step.text}</strong>
      </div>
      <button
        title="Stitch-level cursor"
        onClick={() => useStore.getState().seekFollow(followRound, null)}
      >
        ⋮
      </button>
      <button title="Close follow mode" onClick={() => useStore.getState().setFollow(false)}>
        ✕
      </button>
    </div>
  )
}
