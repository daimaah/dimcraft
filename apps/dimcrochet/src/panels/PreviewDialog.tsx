import { useMemo, useState } from 'react'
import { useStore } from '../state/store'
import { buildFabricSvg, previewRounds } from '../render/fabric'
import { rasterizeSvgToPngBlob } from '../export/png'
import { downloadBlob, safeFilename } from '@dimcraft/core/export/download'

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="modal-backdrop" onPointerDown={onClose}>
      <div className="modal wide" onPointerDown={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>{title}</h2>
          <button className="icon-btn" onClick={onClose}>
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

/** Simulated-crochet 2D preview of the chart. */
export function PreviewDialog() {
  const doc = useStore((s) => s.doc)
  const projectName = useStore((s) => s.projectName)
  const [yarn, setYarn] = useState('#c9553d')
  const [background, setBackground] = useState<'cream' | 'white' | 'dark'>('cream')
  const [jitter, setJitter] = useState(true)
  const [busy, setBusy] = useState(false)
  // sparse per-round overrides; unset rounds fall back to the base yarn colour
  const [roundColors, setRoundColors] = useState<(string | undefined)[]>([])

  const bg = background === 'cream' ? '#f4ecdd' : background === 'white' ? '#ffffff' : '#2b2723'
  const rounds = useMemo(() => previewRounds(doc), [doc])
  const colors = useMemo(() => rounds.map((r) => roundColors[r.index] ?? yarn), [rounds, roundColors, yarn])
  const hasOverrides = rounds.some((r) => roundColors[r.index])

  const { svg, width, height } = useMemo(
    () => buildFabricSvg(doc, { yarn, background: bg, jitter, roundColors: colors }),
    [doc, yarn, bg, jitter, colors],
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
            <span>Yarn colour</span>
            <input type="color" value={yarn} onChange={(e) => setYarn(e.target.value)} />
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

        {rounds.length > 0 && (
          <div className="field">
            <span>Round colours</span>
            <div className="preview-rounds">
              {rounds.map((r) => (
                <label key={r.index} className="preview-round-row">
                  <input
                    type="color"
                    value={roundColors[r.index] ?? yarn}
                    onChange={(e) =>
                      setRoundColors((prev) => {
                        const next = [...prev]
                        next[r.index] = e.target.value
                        return next
                      })
                    }
                  />
                  <span>
                    R{r.index + 1} · {r.count} sts
                  </span>
                </label>
              ))}
            </div>
            <button className="btn" disabled={!hasOverrides} onClick={() => setRoundColors([])}>
              Reset to yarn colour
            </button>
          </div>
        )}

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
          An approximation for eye-balling colour, balance and texture — not a row-by-row simulation.
        </p>
      </div>
    </Modal>
  )
}
