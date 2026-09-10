import { useMemo, useState } from 'react'
import { downloadBlob } from '@dimcraft/core/export/download'
import { rowCountIssues, sizeDoc, writtenInstructions } from '../geometry/rows'
import { Modal } from './Dialogs'
import { useStore } from '../state/store'

/** Written instructions: every row, RS/WS-aware, with a stitch-count check —
 *  per graded size when the chart has them (each size derives from the same
 *  base chart, so the download covers every size). */
export function InstructionsDialog() {
  const doc = useStore((s) => s.doc)
  const tolerance = useStore((s) => s.followTolerance)
  const projectName = useStore((s) => s.projectName)
  const sizes = doc.sizes ?? []
  const [sizeId, setSizeId] = useState<string>('base')
  const size = sizes.find((s) => s.id === sizeId)

  const view = useMemo(() => (size ? sizeDoc(doc, size.pad) : doc), [doc, size])
  const rows = useMemo(() => writtenInstructions(view, tolerance), [view, tolerance])
  const issues = useMemo(() => rowCountIssues(view, tolerance), [view, tolerance])

  const download = () => {
    const blocks: string[] = []
    if (sizes.length === 0) {
      blocks.push(`${projectName}\n\n${rows.join('\n')}\n`)
    } else {
      blocks.push(`${projectName}\n`)
      for (const s of [{ id: 'base', name: 'Base chart', pad: 0 }, ...sizes]) {
        const d = s.pad ? sizeDoc(doc, s.pad) : doc
        blocks.push(`\n== ${s.name} (${writtenInstructions(d, tolerance).length} rows) ==\n\n${writtenInstructions(d, tolerance).join('\n')}\n`)
      }
    }
    downloadBlob(`${projectName || 'chart'}-instructions.txt`, new Blob([blocks.join('\n')], { type: 'text/plain' }))
  }

  return (
    <Modal title={`Written instructions — ${projectName}`} onClose={() => useStore.getState().closeDialog()} wide>
      <p className="hint">
        Charts show the right side of the fabric. Row 1 sits at the bottom and is a right-side (RS) row worked
        right-to-left; wrong-side (WS) rows read left-to-right with each stitch reversed.
      </p>
      {sizes.length > 0 && (
        <div className="field-row">
          <label>
            Size
            <select value={sizeId} onChange={(e) => setSizeId(e.target.value)} data-testid="instructions-size">
              <option value="base">Base chart</option>
              {sizes.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <span className="hint">Sizes add background stitches at both edges — derived from this base chart.</span>
        </div>
      )}
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
        <button className="btn accent" onClick={download}>
          ⭳ Download {sizes.length > 0 ? 'all sizes' : 'as .txt'}
        </button>
        <span className="hint">{rows.length} rows · abbreviations: k, p, yo, k2tog, ssk, s2kp2</span>
      </div>
    </Modal>
  )
}