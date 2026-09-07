import { useMemo, useState } from 'react'
import { useStore } from '../state/store'
import { generateInstructions } from '../geometry/instructions'
import { downloadBlob, safeFilename } from '../export/download'

/** Chart → written round-by-round instructions. */
export function InstructionsDialog() {
  const doc = useStore((s) => s.doc)
  const projectName = useStore((s) => s.projectName)
  const [tolerance, setTolerance] = useState(18)
  const text = useMemo(() => generateInstructions(doc, tolerance), [doc, tolerance])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      window.alert('Clipboard access was blocked — select the text and copy manually.')
    }
  }

  return (
    <div className="modal-backdrop" onPointerDown={() => useStore.getState().closeDialog()}>
      <div className="modal wide" onPointerDown={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>Written instructions</h2>
          <button className="icon-btn" onClick={() => useStore.getState().closeDialog()}>
            ✕
          </button>
        </div>
        <div className="form">
          <label className="form-row">
            <span>Round grouping</span>
            <div className="seg">
              {[10, 18, 28].map((v) => (
                <button key={v} className={tolerance === v ? 'on' : ''} onClick={() => setTolerance(v)}>
                  {v === 10 ? 'Tight' : v === 18 ? 'Normal' : 'Loose'}
                </button>
              ))}
            </div>
          </label>
          <textarea className="instructions-text" readOnly rows={14} value={text} />
          <p className="hint">
            Rounds are detected by distance from the chart centre; stitches inside each round are listed
            clockwise, with repeating units collapsed to [ … ] × n. Tune the grouping if two rounds merge
            or one round splits.
          </p>
          <div className="modal-actions">
            <button className="btn" onClick={() => void copy()}>
              Copy
            </button>
            <button
              className="btn accent"
              onClick={() => downloadBlob(`${safeFilename(projectName)}-instructions.txt`, new Blob([text], { type: 'text/plain' }))}
            >
              Download .txt
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
