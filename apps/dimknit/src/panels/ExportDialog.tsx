import { useState } from 'react'
import { downloadBlob } from '@dimcraft/core/export/download'
import { buildExportSvg, type SvgExportOptions } from '@dimcraft/core/export/svg'
import { exportPng } from '@dimcraft/core/export/png'
import { Modal } from './Dialogs'
import { useStore } from '../state/store'

/** Export the chart as SVG or PNG. */
export function ExportDialog() {
  const doc = useStore((s) => s.doc)
  const projectName = useStore((s) => s.projectName)
  const [format, setFormat] = useState<'svg' | 'png'>('svg')
  const [scale, setScale] = useState(2)
  const [white, setWhite] = useState(false)

  const opts: SvgExportOptions = {
    includeGuides: false,
    includeLegend: true,
    background: white ? '#ffffff' : null,
    padding: 24,
  }

  const run = async () => {
    const safe = projectName.replace(/[^\w-]+/g, '_') || 'chart'
    if (format === 'svg') {
      const { svg } = buildExportSvg(doc, opts)
      downloadBlob(`${safe}.svg`, new Blob([svg], { type: 'image/svg+xml' }))
    } else {
      await exportPng(doc, safe, { ...opts, scale })
    }
    useStore.getState().closeDialog()
  }

  return (
    <Modal title="Export chart" onClose={() => useStore.getState().closeDialog()}>
      <div className="field-row">
        <label>
          <input type="radio" checked={format === 'svg'} onChange={() => setFormat('svg')} /> SVG (vector)
        </label>
        <label>
          <input type="radio" checked={format === 'png'} onChange={() => setFormat('png')} /> PNG
        </label>
      </div>
      {format === 'png' && (
        <div className="field-row">
          <label>
            Scale
            <select value={scale} onChange={(e) => setScale(Number(e.target.value))}>
              <option value={1}>1×</option>
              <option value={2}>2×</option>
              <option value={4}>4×</option>
            </select>
          </label>
        </div>
      )}
      <label className="field-row">
        <input type="checkbox" checked={white} onChange={(e) => setWhite(e.target.checked)} /> White background
        (otherwise transparent)
      </label>
      <div className="modal-actions">
        <button className="btn accent" onClick={run}>
          ⭳ Export {format.toUpperCase()}
        </button>
      </div>
    </Modal>
  )
}