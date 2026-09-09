import { useEffect, useMemo, useState } from 'react'
import { useStore } from '../state/store'
import { getDefMap } from '../symbols/registry'
import { STITCH_MOTIONS, motionForAny } from '../motion/stitches'
import { MotionPlayer } from './MotionPlayer'
import { Modal } from './dialogs'

const DEFAULT_MOTION_ID = 'dc'

/** Browse the physical technique animations for the palette stitches. */
export function StitchMotionDialog() {
  const doc = useStore((s) => s.doc)
  const motionRequest = useStore((s) => s.motionRequest)
  const lefty = useStore((s) => s.lefty)
  const [symbolId, setSymbolId] = useState(() => useStore.getState().motionRequest ?? DEFAULT_MOTION_ID)

  // a "show me how" button elsewhere in the app can preselect a stitch
  useEffect(() => {
    if (motionRequest) {
      setSymbolId(motionRequest)
      useStore.getState().requestMotionDone()
    }
  }, [motionRequest])

  const defMap = useMemo(() => getDefMap(doc), [doc])
  const motion = motionForAny(symbolId, defMap.get(symbolId)?.label ?? symbolId)!

  return (
    <Modal title="How stitches work" onClose={() => useStore.getState().closeDialog()} wide>
      <div className="seg motion-picker" data-testid="motion-picker">
        {STITCH_MOTIONS.map((m) => (
          <button
            key={m.symbolId}
            className={m.symbolId === symbolId ? 'on' : ''}
            onClick={() => setSymbolId(m.symbolId)}
          >
            {m.name}
          </button>
        ))}
      </div>
      <div className="motion-row">
        <label className="motion-lookup">
          <span>Any palette symbol:</span>
          <select value={symbolId} onChange={(e) => setSymbolId(e.target.value)} data-testid="motion-lookup">
            {[...defMap.values()].map((d) => (
              <option key={d.id} value={d.id}>
                {d.label} ({d.id})
              </option>
            ))}
          </select>
        </label>
        <label className="check" title="Mirror the animation (and the follow-mode working order) for left-handed crocheting">
          <input
            type="checkbox"
            checked={lefty}
            onChange={(e) => useStore.getState().setLefty(e.target.checked)}
            data-testid="motion-lefty"
          />
          <span>Left-handed</span>
        </label>
      </div>
      <MotionPlayer key={symbolId} motion={motion} mirrored={lefty} />
      {motion.approximate && (
        <p className="hint" data-testid="motion-approx">
          This stitch has no dedicated animation yet — what you see is the standard stitch of the
          same height it is worked like.
        </p>
      )}
      <p className="hint">
        Right-handed side view, US terms. Yarn over = wrap the yarn over the hook from back to
        front. More dedicated animations are on the way.
      </p>
    </Modal>
  )
}
