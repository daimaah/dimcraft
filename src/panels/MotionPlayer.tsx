import { useEffect, useMemo, useReducer, useRef, useState } from 'react'
import type { MotionKind, StitchMotion } from '../motion/types'
import { applyStep, sceneBefore } from '../motion/engine'
import { renderScene } from '../motion/scene'

const STEP_MS: Record<MotionKind, number> = {
  slipKnot: 1700,
  yarnOver: 1000,
  insert: 900,
  pullUp: 1000,
  pullThrough: 1100,
  chain: 950,
  ringShow: 1100,
  hold: 1700,
}

/** Animated side-view player for one stitch's physical technique. */
export function MotionPlayer({ motion, mirrored = false }: { motion: StitchMotion; mirrored?: boolean }) {
  const steps = motion.steps
  const clock = useRef({ i: 0, t: 0 })
  const playingRef = useRef(true)
  const [playing, setPlaying] = useState(true)
  const [speed, setSpeed] = useState(1)
  const [, force] = useReducer((x: number) => x + 1, 0)
  const raf = useRef(0)
  const last = useRef(0)

  const goto = (i: number) => {
    clock.current = { i: Math.max(0, Math.min(steps.length - 1, i)), t: 0 }
    force()
  }

  // new stitch → restart from the first step
  useEffect(() => {
    clock.current = { i: 0, t: 0 }
    playingRef.current = true
    setPlaying(true)
    force()
  }, [motion])

  useEffect(() => {
    if (!playing) return
    last.current = performance.now()
    const tick = (now: number) => {
      const dt = Math.min(64, now - last.current) * speed
      last.current = now
      const c = clock.current
      const dur = STEP_MS[steps[c.i].kind]
      c.t += dt / dur
      if (c.t >= 1) {
        if (c.i < steps.length - 1) {
          c.i += 1
          c.t = 0
        } else {
          c.t = 1
          playingRef.current = false
          setPlaying(false)
        }
      }
      force()
      if (playingRef.current) raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf.current)
  }, [playing, speed, steps])

  const scene = useMemo(() => {
    const { i, t } = clock.current
    const s = sceneBefore(steps, i)
    applyStep(steps[i], t, s)
    return s
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [steps, clock.current.i, clock.current.t])

  const step = steps[clock.current.i]
  const done = !playing && clock.current.i === steps.length - 1 && clock.current.t >= 1

  const toggle = () => {
    if (done) {
      clock.current = { i: 0, t: 0 }
      playingRef.current = true
      setPlaying(true)
    } else {
      const next = !playing
      playingRef.current = next
      setPlaying(next)
    }
    force()
  }

  return (
    <div className="motion-player" data-testid="motion-player">
      {renderScene(scene, mirrored)}
      <div className="motion-caption" data-testid="motion-caption">
        <span className="motion-stepnum">
          Step {clock.current.i + 1}/{steps.length}
        </span>
        <span>{step.caption}</span>
        <span className="motion-loops" title="Loops on the hook after this step">
          → {step.loopsOnHook} loop{step.loopsOnHook === 1 ? '' : 's'} on hook
        </span>
      </div>
      <div className="motion-controls">
        <button className="btn" title="Restart" onClick={() => goto(0)}>
          ⏮
        </button>
        <button
          className="btn"
          title="Previous step"
          disabled={clock.current.i <= 0}
          onClick={() => goto(clock.current.i - 1)}
        >
          ⟨
        </button>
        <button className="btn" title={playing ? 'Pause' : 'Play'} data-testid="motion-play" onClick={toggle}>
          {playing ? '⏸' : '▶'}
        </button>
        <button
          className="btn"
          title="Next step"
          disabled={clock.current.i >= steps.length - 1}
          onClick={() => goto(clock.current.i + 1)}
        >
          ⟩
        </button>
        <button
          className="btn"
          title="Speed (click to cycle)"
          onClick={() => setSpeed(speed === 1 ? 0.5 : speed === 0.5 ? 1.5 : 1)}
        >
          {speed}×
        </button>
        <div className="motion-chips">
          {steps.map((s, i) => (
            <button
              key={i}
              className={i === clock.current.i ? 'on' : ''}
              title={s.caption}
              onClick={() => goto(i)}
            >
              {i + 1}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
