import { useMemo, useState } from 'react'
import { useStore } from '../state/store'
import { buildFabricSvg } from '../render/fabric'
import { rasterizeSvgToPngBlob } from '@dimcraft/core/export/png'
import { downloadBlob, safeFilename } from '@dimcraft/core/export/download'
import { Modal } from './Dialogs'

/** Simulated-knit 2D preview of the chart: the colourwork as actual knitted
 *  fabric — Vs, bumps, eyelets — at the chart's gauge proportions. */
export function PreviewDialog() {
  const doc = useStore((s) => s.doc)
  const projectName = useStore((s) => s.projectName)
  const [mainYarn, setMainYarn] = useState('#8a8f98')
  const [background, setBackground] = useState<'cream' | 'white' | 'dark'>('cream')
  const [jitter, setJitter] = useState(true)
  const [busy, setBusy] = useState(false)

  const bg = background === 'cream' ? '#f4ecdd' : background === 'white' ? '#ffffff' : '#2b2723'

  const { svg, width, height } = useMemo(
    () => buildFabricSvg(doc, { mainYarn, background: bg, jitter }),
    [doc, mainYarn, bg, jitter],
  )

  const download = async () => {
    setBusy(true)
    try {
      const blob = await rasterizeSvgToPngBlob(svg, width, height, 2, bg)
      downloadBlob(`${safeFilename(projectName)}-preview.png`, blob)
    } catch (err) {
      window.alert(`Preview export failed: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal title="2D preview — simulated fabric" onClose={() => useStore.getState().closeDialog()}>
      <div className="form">
        <div className="preview-controls">
          <label className="field">
            <span>Main yarn</span>
            <input type="color" value={mainYarn} onChange={(e) => setMainYarn(e.target.value)} />
          </label>
          <div className="field">
            <span>Background</span>
            <div className="seg">
              {(
                [
                  ['cream', 'Cream'],
                  ['white', 'White'],
                  ['dark', 'Dark'],
                ] as const
              ).map(([v, label]) => (
                <button key={v} className={background === v ? 'on' : ''} onClick={() => setBackground(v)}>
                  {label}
                </button>
              ))}
            </div>
          </div>
          <label className="check">
            <input type="checkbox" checked={jitter} onChange={(e) => setJitter(e.target.checked)} />
            <span>Handmade jitter</span>
          </label>
        </div>

        <div className="preview-stage" style={{ background: bg }}>
          <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Fabric preview">
            <g dangerouslySetInnerHTML={{ __html: svg }} />
          </svg>
        </div>

        <div className="modal-actions">
          <button className="btn" onClick={() => useStore.getState().closeDialog()}>
            Close
          </button>
          <button className="btn accent" disabled={busy} onClick={() => void download()}>
            {busy ? 'Rendering…' : 'Download PNG'}
          </button>
        </div>
        <p className="hint">
          An approximation for eye-balling colour, balance and texture — cells render at your
          gauge proportions when a gauge is set. Not a row-by-row simulation.
        </p>
      </div>
    </Modal>
  )
}