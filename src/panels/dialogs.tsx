import { useState } from 'react'
import { useStore } from '../state/store'
import { getDefMap } from '../symbols/registry'
import { guideSample } from '../geometry/guides'
import { contentBBox } from '../geometry/bounds'
import { exportProjectFile, readProjectFile } from '../export/projectFile'
import { PreviewDialog } from './PreviewDialog'
import { InstructionsDialog } from './InstructionsDialog'
import { LicensesDialog } from './LicensesDialog'
import { PatternImportDialog } from './PatternImportDialog'
import type { RotationMode } from '../model/types'
import type { SvgExportOptions } from '../export/svg'
import type { PaperFormat, PageOrientation } from '../export/pdf'

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="modal-backdrop" onPointerDown={onClose}>
      <div className="modal" onPointerDown={(e) => e.stopPropagation()}>
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

export function PlaceEvenlyDialog() {
  const doc = useStore((s) => s.doc)
  const preselected = useStore((s) => s.placeEvenlyGuideId)
  const armed = useStore((s) => s.armedSymbolId)
  const [guideId, setGuideId] = useState(preselected ?? doc.guides[0]?.id ?? '')
  const [symbolId, setSymbolId] = useState(armed ?? 'dc')
  const [count, setCount] = useState(12)
  const [startOffset, setStartOffset] = useState(0)
  const [scale, setScale] = useState(1)
  const [rotationMode, setRotationMode] = useState<RotationMode>('radial')
  const [mode, setMode] = useState<'replace' | 'append'>('replace')

  const guide = doc.guides.find((g) => g.id === guideId)
  const defMap = getDefMap(doc)
  const perStitch = guide ? guideSample(guide).length / Math.max(1, count) : 0

  const ok = () => {
    if (!guideId) return
    useStore.getState().placeEvenlyOnGuide(guideId, symbolId, { count, startOffset, scale, rotationMode, mode })
    useStore.getState().closeDialog()
  }

  return (
    <Modal title="Place stitches evenly along guide" onClose={() => useStore.getState().closeDialog()}>
      {!guide && <p className="hint">No guides yet — draw one first (keys 1–5).</p>}
      {guide && (
        <div className="form">
          <Row2 label="Guide">
            <select value={guideId} onChange={(e) => setGuideId(e.target.value)}>
              {doc.guides.map((g, i) => (
                <option key={g.id} value={g.id}>
                  {g.name ?? `${g.kind} ${i + 1}`}
                </option>
              ))}
            </select>
          </Row2>
          <Row2 label="Symbol">
            <select value={symbolId} onChange={(e) => setSymbolId(e.target.value)}>
              {[...defMap.values()].map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </Row2>
          <Row2 label="Count">
            <input type="number" min={1} max={720} value={count} onChange={(e) => setCount(Math.max(1, Math.round(parseFloat(e.target.value) || 1)))} />
          </Row2>
          <Row2 label="Start offset %">
            <input
              type="number"
              min={-100}
              max={100}
              value={Math.round(startOffset * 100)}
              onChange={(e) => setStartOffset((parseFloat(e.target.value) || 0) / 100)}
            />
          </Row2>
          <Row2 label="Scale">
            <input type="number" step={0.05} min={0.2} max={8} value={scale} onChange={(e) => setScale(Math.max(0.2, parseFloat(e.target.value) || 1))} />
          </Row2>
          <Row2 label="Direction">
            <div className="seg">
              {(
                [
                  ['radial', 'Radiate out'],
                  ['tangent', 'Follow path'],
                  ['upright', 'Upright'],
                ] as const
              ).map(([v, label]) => (
                <button key={v} className={rotationMode === v ? 'on' : ''} onClick={() => setRotationMode(v)}>
                  {label}
                </button>
              ))}
            </div>
          </Row2>
          <Row2 label="Existing">
            <div className="seg">
              <button className={mode === 'replace' ? 'on' : ''} onClick={() => setMode('replace')}>
                Replace this guide’s
              </button>
              <button className={mode === 'append' ? 'on' : ''} onClick={() => setMode('append')}>
                Append
              </button>
            </div>
          </Row2>
          <p className="hint">
            ≈ {perStitch.toFixed(1)} units between stitches · {count} × {defMap.get(symbolId)?.label ?? symbolId}
          </p>
          <div className="modal-actions">
            <button className="btn" onClick={() => useStore.getState().closeDialog()}>
              Cancel
            </button>
            <button className="btn accent" onClick={ok} disabled={!guide}>
              Place {count} stitches
            </button>
          </div>
        </div>
      )}
    </Modal>
  )
}

function Row2({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="form-row">
      <span>{label}</span>
      {children}
    </label>
  )
}

function trueSizeLabel(doc: ReturnType<typeof useStore.getState>['doc'], gauge: number): string {
  const bbox = contentBBox(doc, getDefMap(doc), { includeLegend: true })
  if (!bbox) return '—'
  const w = (bbox.w / gauge) * 10
  const h = (bbox.h / gauge) * 10
  return `${w.toFixed(1)} × ${h.toFixed(1)} cm`
}

export function ExportDialog() {
  const doc = useStore((s) => s.doc)
  const projectName = useStore((s) => s.projectName)
  const [format, setFormat] = useState<'svg' | 'png' | 'pdf'>('svg')
  const [includeGuides, setIncludeGuides] = useState(false)
  const [background, setBackground] = useState<'transparent' | 'white'>('transparent')
  const [pngScale, setPngScale] = useState(2)
  const [pdfFormat, setPdfFormat] = useState<PaperFormat>('a4')
  const [orientation, setOrientation] = useState<PageOrientation>('portrait')
  const [trueScale, setTrueScale] = useState(false)
  const [busy, setBusy] = useState(false)

  const gauge = doc.unitsPer10cm ?? null

  const run = async () => {
    setBusy(true)
    try {
      const opts: SvgExportOptions = {
        includeGuides,
        background: background === 'white' ? '#ffffff' : null,
      }
      if (format === 'svg') {
        const { buildExportSvg } = await import('../export/svg')
        const { downloadBlob, safeFilename } = await import('../export/download')
        const { svg } = buildExportSvg(doc, opts)
        downloadBlob(`${safeFilename(projectName)}.svg`, new Blob([svg], { type: 'image/svg+xml' }))
      } else if (format === 'png') {
        const { exportPng } = await import('../export/png')
        await exportPng(doc, projectName, { ...opts, scale: pngScale })
      } else {
        const { exportPdf } = await import('../export/pdf')
        await exportPdf(doc, projectName, { ...opts, format: pdfFormat, orientation, trueScale, unitsPer10cm: gauge })
      }
      useStore.getState().closeDialog()
    } catch (err) {
      window.alert(`Export failed: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal title="Export" onClose={() => useStore.getState().closeDialog()}>
      <div className="form">
        <div className="cards">
          {(
            [
              ['svg', 'SVG', 'Vector — editing apps & print'],
              ['png', 'PNG', 'Transparent raster, 2×/4×'],
              ['pdf', 'PDF', 'Print-ready, fitted page'],
            ] as const
          ).map(([v, title, desc]) => (
            <button key={v} className={`card${format === v ? ' on' : ''}`} onClick={() => setFormat(v)}>
              <strong>{title}</strong>
              <span>{desc}</span>
            </button>
          ))}
        </div>

        {format === 'png' && (
          <Row2 label="Resolution">
            <div className="seg">
              {[2, 4].map((s) => (
                <button key={s} className={pngScale === s ? 'on' : ''} onClick={() => setPngScale(s)}>
                  {s}× ({s * 96} dpi)
                </button>
              ))}
            </div>
          </Row2>
        )}
        {format === 'pdf' && (
          <>
            <Row2 label="Paper">
              <div className="seg">
                <button className={pdfFormat === 'a4' ? 'on' : ''} onClick={() => setPdfFormat('a4')}>
                  A4
                </button>
                <button className={pdfFormat === 'letter' ? 'on' : ''} onClick={() => setPdfFormat('letter')}>
                  Letter
                </button>
              </div>
            </Row2>
            <Row2 label="Orientation">
              <div className="seg">
                <button className={orientation === 'portrait' ? 'on' : ''} onClick={() => setOrientation('portrait')}>
                  Portrait
                </button>
                <button className={orientation === 'landscape' ? 'on' : ''} onClick={() => setOrientation('landscape')}>
                  Landscape
                </button>
              </div>
            </Row2>
            <label className="check" title={gauge ? 'Print at the gauge-derived true size' : 'Set a gauge in the inspector first'}>
              <input
                type="checkbox"
                checked={trueScale && !!gauge}
                disabled={!gauge}
                onChange={(e) => setTrueScale(e.target.checked)}
              />
              <span>True scale{gauge ? ` (≈ ${trueSizeLabel(doc, gauge)})` : ' — set gauge first'}</span>
            </label>
          </>
        )}

        <Row2 label="Background">
          <div className="seg">
            <button className={background === 'transparent' ? 'on' : ''} onClick={() => setBackground('transparent')}>
              Transparent
            </button>
            <button className={background === 'white' ? 'on' : ''} onClick={() => setBackground('white')}>
              White
            </button>
          </div>
        </Row2>
        <label className="check">
          <input type="checkbox" checked={includeGuides} onChange={(e) => setIncludeGuides(e.target.checked)} />
          <span>Include guide lines</span>
        </label>

        <div className="modal-actions">
          <button
            className="btn"
            onClick={() => {
              const id = useStore.getState().projectId
              if (!id) return
              exportProjectFile({ id, name: projectName, createdAt: Date.now(), updatedAt: Date.now(), doc })
            }}
          >
            Save .json file
          </button>
          <button className="btn" disabled={busy} onClick={() => void run()}>
            {busy ? 'Exporting…' : 'Export'}
          </button>
        </div>
        <FileLoadRow />
      </div>
    </Modal>
  )
}

export function FileLoadRow() {
  return (
    <label className="btn wide file-btn">
      Load .json project file…
      <input
        type="file"
        accept=".json,application/json"
        hidden
        onChange={async (e) => {
          const f = e.target.files?.[0]
          e.target.value = ''
          if (!f) return
          const parsed = await readProjectFile(f)
          if (!parsed) {
            window.alert('That file is not a DimCrochet project.')
            return
          }
          const { newProject } = useStore.getState()
          newProject(parsed.name, parsed.doc)
        }}
      />
    </label>
  )
}

export function Dialogs() {
  const dialog = useStore((s) => s.dialog)
  if (dialog === 'place-evenly') return <PlaceEvenlyDialog />
  if (dialog === 'export') return <ExportDialog />
  if (dialog === 'preview') return <PreviewDialog />
  if (dialog === 'instructions') return <InstructionsDialog />
  if (dialog === 'licenses') return <LicensesDialog />
  if (dialog === 'pattern-import') return <PatternImportDialog />
  return null
}
