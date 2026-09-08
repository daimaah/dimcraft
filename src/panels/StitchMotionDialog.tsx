import { useState } from 'react'
import { useStore } from '../state/store'
import { STITCH_MOTIONS, motionFor } from '../motion/stitches'
import { MotionPlayer } from './MotionPlayer'
import { Modal } from './dialogs'

const DEFAULT_MOTION_ID = 'dc'

/** Browse the physical technique animations for the core stitches. */
export function StitchMotionDialog() {
  const [symbolId, setSymbolId] = useState(DEFAULT_MOTION_ID)
  const motion = motionFor(symbolId) ?? STITCH_MOTIONS[0]

  return (
    <Modal title="How stitches work" onClose={() => useStore.getState().closeDialog()} wide>
      <div className="seg motion-picker" data-testid="motion-picker">
        {STITCH_MOTIONS.map((m) => (
          <button
            key={m.symbolId}
            className={m.symbolId === motion.symbolId ? 'on' : ''}
            onClick={() => setSymbolId(m.symbolId)}
          >
            {m.name}
          </button>
        ))}
      </div>
      <MotionPlayer key={motion.symbolId} motion={motion} />
      <p className="hint">
        Right-handed side view, US terms. Yarn over = wrap the yarn over the hook from back to
        front. More stitch motions are on the way.
      </p>
    </Modal>
  )
}
