import { useMemo, useState } from 'react'
import { Modal } from './Dialogs'
import { chartFromWrittenRows } from '../geometry/patternParser'
import { useStore } from '../state/store'

const EXAMPLE = `Row 1 (RS): k8
Row 2 (WS): p8
Row 3 (RS): k4, yo, k2tog, k2
Row 4 (WS): p8`

/** Written rows → chart: paste run-length row text (the same format the
 *  Rows dialog produces) and get an editable stitch-grid chart. Wrong-side
 *  rows are inverted into the chart's right-side symbols automatically. */
export function PatternImportDialog() {
  const [text, setText] = useState('')
  const parsed = useMemo(() => chartFromWrittenRows(text, 'Chart from rows'), [text])
  const stitchCount = parsed.doc?.placements.length ?? 0

  const create = () => {
    if (!parsed.doc) return
    useStore.getState().newProject(parsed.doc.title || 'Chart from rows', parsed.doc)
  }

  return (
    <Modal title="Chart from written rows" onClose={() => useStore.getState().closeDialog()}>
      <p className="hint">
        One row per line, the way knitting patterns print them — <code>k4, p2, k2tog</code>, with
        optional <code>Row N:</code> labels and <code>(RS)</code>/<code>(WS)</code> markers. Rows
        are worked serpentine: odd rows are right-side rows, even rows are wrong-side rows whose
        stitches the chart shows reversed. Yarn names after a stitch (<code>k3 CC1</code>) are
        ignored.
      </p>
      <textarea
        className="pattern-input"
        rows={9}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={EXAMPLE}
        spellCheck={false}
        data-testid="pattern-input"
      />
      {text.trim() && (
        <div className="pattern-summary">
          {parsed.doc ? (
            <>
              <strong>
                {parsed.rowCount} row{parsed.rowCount === 1 ? '' : 's'} · {stitchCount} stitches
              </strong>
              {parsed.issues.length > 0 && (
                <ul className="issues">
                  {parsed.issues.slice(0, 6).map((i, n) => (
                    <li key={n}>{i}</li>
                  ))}
                </ul>
              )}
            </>
          ) : (
            <span className="hint">Nothing readable yet — start with “Row 1 (RS): k8”.</span>
          )}
        </div>
      )}
      <div className="modal-actions">
        <button className="btn" onClick={() => useStore.getState().closeDialog()}>
          Cancel
        </button>
        <button className="btn accent" disabled={!parsed.doc} onClick={create} data-testid="create-from-rows">
          Create chart
        </button>
      </div>
    </Modal>
  )
}