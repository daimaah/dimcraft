import { useMemo } from 'react'
import { downloadBlob } from '@dimcraft/core/export/download'
import { rowCountIssues, writtenInstructions } from '../geometry/rows'
import { Modal } from './Dialogs'
import { useStore } from '../state/store'

/** Written instructions: every row, RS/WS-aware, with a stitch-count check. */
export function InstructionsDialog() {
  const doc = useStore((s) => s.doc)
  const tolerance = useStore((s) => s.followTolerance)
  const projectName = useStore((s) => s.projectName)

  const rows = useMemo(() => writtenInstructions(doc, tolerance), [doc, tolerance])
  const issues = useMemo(() => rowCountIssues(doc, tolerance), [doc, tolerance])

  return (
    <Modal title={`Written instructions — ${projectName}`} onClose={() => useStore.getState().closeDialog()} wide>
      <p className="hint">
        Charts show the right side of the fabric. Row 1 sits at the bottom and is a right-side (RS) row worked
        right-to-left; wrong-side (WS) rows read left-to-right with each stitch reversed.
      </p>
      <ol className="row-list">
        {rows.map((r) => (
          <li key={r}>{r}</li>
        ))}
      </ol>
      {issues.length > 0 && (
        <div className="issues">
          <strong>Stitch-count check:</strong>
          <ul>
            {issues.map((i) => (
              <li key={i}>{i}</li>
            ))}
          </ul>
        </div>
      )}
      <div className="modal-actions">
        <button
          className="btn accent"
          onClick={() =>
            downloadBlob(
              `${projectName || 'chart'}-instructions.txt`,
              new Blob([`${projectName}\n\n${rows.join('\n')}\n`], { type: 'text/plain' }),
            )
          }
        >
          ⭳ Download as .txt
        </button>
        <span className="hint">{rows.length} rows · abbreviations: k, p, yo, k2tog, ssk, s2kp2</span>
      </div>
    </Modal>
  )
}