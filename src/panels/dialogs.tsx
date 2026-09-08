import { Fragment, useState } from 'react'
import { useStore } from '../state/store'
import { getDefMap } from '../symbols/registry'
import { guideSample } from '../geometry/guides'
import { contentBBox } from '../geometry/bounds'
import { exportProjectFile } from '../export/projectFile'
import { PreviewDialog } from './PreviewDialog'
import { InstructionsDialog } from './InstructionsDialog'
import { LicensesDialog } from './LicensesDialog'
import { PatternImportDialog } from './PatternImportDialog'
import { StitchMotionDialog } from './StitchMotionDialog'
import { createShortLink, sidecarAvailable } from '../export/secureShare'
import { recentChangelog } from '../export/changelog'
import { DEFAULT_ORDER, PALETTE_BUTTONS } from '../ui/ToolPalette'
import { Icon } from '../ui/icons'
import changelogRaw from '../../CHANGELOG.md?raw'
import type { RotationMode } from '../model/types'
import type { SvgExportOptions } from '../export/svg'
import type { PaperFormat, PageOrientation } from '../export/pdf'

export function Modal({
  title,
  onClose,
  children,
  wide,
  className,
}: {
  title: string
  onClose: () => void
  children: React.ReactNode
  wide?: boolean
  className?: string
}) {
  return (
    <div className="modal-backdrop" onPointerDown={onClose}>
      <div
        className={['modal', wide ? 'wide' : '', className ?? ''].filter(Boolean).join(' ')}
        onPointerDown={(e) => e.stopPropagation()}
      >
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
  const projectId = useStore((s) => s.projectId)
  const [format, setFormat] = useState<'svg' | 'png' | 'pdf'>('svg')
  const [includeGuides, setIncludeGuides] = useState(false)
  const [background, setBackground] = useState<'transparent' | 'white'>('transparent')
  const [pngScale, setPngScale] = useState(2)
  const [pdfFormat, setPdfFormat] = useState<PaperFormat>('a4')
  const [orientation, setOrientation] = useState<PageOrientation>('portrait')
  const [trueScale, setTrueScale] = useState(false)
  const [busy, setBusy] = useState(false)
  const [shareLink, setShareLink] = useState<string | null>(null)
  const [shareBusy, setShareBusy] = useState(false)
  const [sidecarUrl, setSidecarUrl] = useState(
    () => localStorage.getItem('dimcrochet.sidecarUrl') ?? location.origin,
  )
  const [shortLink, setShortLink] = useState<string | null>(null)
  const [shortBusy, setShortBusy] = useState(false)
  const [shortError, setShortError] = useState<string | null>(null)

  const gauge = doc.unitsPer10cm ?? null
  const cryptoOk = sidecarAvailable()

  const createShort = async () => {
    setShortBusy(true)
    setShortError(null)
    try {
      localStorage.setItem('dimcrochet.sidecarUrl', sidecarUrl.trim())
      const { url } = await createShortLink(sidecarUrl.trim(), {
        id: projectId ?? 'proj-share',
        name: projectName,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        doc,
      })
      setShortLink(url)
    } catch (err) {
      setShortError(err instanceof Error ? err.message : String(err))
    } finally {
      setShortBusy(false)
    }
  }

  const createShareLink = async () => {
    setShareBusy(true)
    try {
      const { createShareFragment } = await import('../export/share')
      const fragment = await createShareFragment({
        id: projectId ?? 'proj-share',
        name: projectName,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        doc,
      })
      setShareLink(`${location.origin}${location.pathname}${fragment}`)
    } catch (err) {
      window.alert(`Could not create the link: ${err instanceof Error ? err.message : err}`)
    } finally {
      setShareBusy(false)
    }
  }

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

        <div className="share-section">
          <div className="panel-title">Share</div>
          {!shareLink ? (
            <>
              <button className="btn wide" disabled={shareBusy} onClick={() => void createShareLink()}>
                {shareBusy ? 'Encoding…' : 'Create share link'}
              </button>
              <p className="hint">
                Embeds a copy of this chart in the link itself. Anyone who has the link can view it.
                Nothing is uploaded to a server — but treat the link like the file it contains.
              </p>
            </>
          ) : (
            <>
              <input
                className="share-link"
                readOnly
                value={shareLink}
                onFocus={(e) => e.target.select()}
                onClick={(e) => (e.target as HTMLInputElement).select()}
              />
              <div className="modal-actions">
                <button
                  className="btn"
                  onClick={() => {
                    void navigator.clipboard.writeText(shareLink).catch(() => {})
                  }}
                >
                  Copy link
                </button>
                <button className="btn" onClick={() => setShareLink(null)}>
                  New link
                </button>
              </div>
              {shareLink.length > 20000 && (
                <p className="hint">
                  This link is very long ({shareLink.length} characters) — some apps truncate long
                  URLs. For big charts, prefer the short link below or the file export.
                </p>
              )}
            </>
          )}
        </div>

        <div className="share-section">
          <div className="panel-title">Short link (self-hosted sidecar)</div>
          <Row2 label="Sidecar">
            <input
              value={sidecarUrl}
              onChange={(e) => setSidecarUrl(e.target.value)}
              placeholder="https://charts.example.com"
              spellCheck={false}
            />
          </Row2>
          {!shortLink ? (
            <button
              className="btn wide"
              disabled={shortBusy || !cryptoOk || !sidecarUrl.trim()}
              title={
                cryptoOk
                  ? 'Encrypt the chart here, store only ciphertext on your sidecar'
                  : 'Encrypted links need a secure context — open DimCrochet via HTTPS or localhost'
              }
              data-testid="create-short-link"
              onClick={() => void createShort()}
            >
              {shortBusy ? 'Encrypting…' : 'Create short link'}
            </button>
          ) : (
            <>
              <input
                className="share-link"
                readOnly
                value={shortLink}
                onFocus={(e) => e.target.select()}
                onClick={(e) => (e.target as HTMLInputElement).select()}
              />
              <div className="modal-actions">
                <button
                  className="btn"
                  onClick={() => {
                    void navigator.clipboard.writeText(shortLink).catch(() => {})
                  }}
                >
                  Copy link
                </button>
                <button className="btn" onClick={() => setShortLink(null)}>
                  New link
                </button>
              </div>
            </>
          )}
          {shortError && <p className="hint">Short link failed: {shortError}</p>}
          <p className="hint">
            The chart is encrypted in your browser (AES-GCM) — the sidecar stores only ciphertext it
            cannot read, and the decryption key rides in the link fragment. Links expire (default 30
            days since last opening).
          </p>
        </div>

        <FileLoadRow />
      </div>
    </Modal>
  )
}

export function FileLoadRow() {
  return (
    <label className="btn wide file-btn">
      Load chart / pack file…
      <input
        type="file"
        accept=".json,application/json,.dimcrochet.json"
        hidden
        onChange={async (e) => {
          const f = e.target.files?.[0]
          e.target.value = ''
          if (!f) return
          const { importInterchangeFile } = await import('../export/projectFile')
          const { applyBackup } = await import('../export/backup')
          const parsed = await importInterchangeFile(f)
          if (!parsed) {
            window.alert(`Could not read ${f.name}. Expected a DimCrochet chart, pack or backup export.`)
            return
          }
          const st = useStore.getState()
          if (parsed.type === 'chart') {
            st.newProject(parsed.name, parsed.doc)
          } else if (parsed.type === 'backup') {
            const n = parsed.backup.projects.length
            if (
              !window.confirm(
                `Restore this backup: ${n} chart(s) and your settings? Charts with the same id are replaced; your other charts are kept. The page reloads afterwards.`,
              )
            ) {
              return
            }
            const restored = await applyBackup(parsed.backup)
            window.alert(`Restored ${restored} chart(s). Reloading…`)
            location.reload()
          } else {
            st.addCustomSet(parsed.set)
            st.setSymbolSet(parsed.set.id)
            window.alert(`Symbol pack “${parsed.set.name}” imported and selected.`)
          }
        }}
      />
    </label>
  )
}

// ---- universal options: view animations, handedness, sidecar, danger zone --

export function OptionsDialog() {
  const viewAnimations = useStore((s) => s.viewAnimations)
  const lefty = useStore((s) => s.lefty)
  const palette = useStore((s) => s.palette)
  const clock24h = useStore((s) => s.clock24h)
  const tool = useStore((s) => s.tool)
  const snapEnabled = useStore((s) => s.snapEnabled)
  const gridVisible = useStore((s) => s.gridVisible)
  const guidesVisible = useStore((s) => s.guidesVisible)
  const canUndo = useStore((s) => s.past.length > 0)
  const canRedo = useStore((s) => s.future.length > 0)
  const zoomPct = Math.round(useStore((s) => s.viewport.zoom) * 100)
  const [tab, setTab] = useState<'general' | 'buttons' | 'danger'>('general')
  const [confirmText, setConfirmText] = useState('')
  const [wiping, setWiping] = useState(false)
  const [sidecarUrl, setSidecarUrl] = useState(
    () => localStorage.getItem('dimcrochet.sidecarUrl') ?? location.origin,
  )
  const byId = new Map(PALETTE_BUTTONS.map((b) => [b.id, b]))
  const [items, setItems] = useState(() => (palette.order ?? DEFAULT_ORDER).map((id) => byId.get(id) ?? { id, label: id }))
  const [hiddenL, setHiddenL] = useState<string[]>(palette.hidden)
  const [dragId, setDragId] = useState<string | null>(null)

  const wipe = async () => {
    setWiping(true)
    try {
      const { deleteAllLocalData } = await import('../export/backup')
      await deleteAllLocalData()
      location.reload()
    } finally {
      setWiping(false)
    }
  }

  const unlock = confirmText.trim().toLowerCase() === 'reset'

  /** same visual state the real toolbar button would have right now */
  const previewState = (id: string): { active: boolean; disabled: boolean } => {
    switch (id) {
      case 'select':
      case 'pan':
      case 'place':
      case 'line':
      case 'guide-circle':
      case 'guide-arc':
      case 'guide-spiral':
      case 'guide-line':
      case 'guide-polygon':
      case 'bracket':
      case 'text':
        return { active: tool === id, disabled: false }
      case 'undo':
        return { active: false, disabled: !canUndo }
      case 'redo':
        return { active: false, disabled: !canRedo }
      case 'snap':
        return { active: snapEnabled, disabled: false }
      case 'grid':
        return { active: gridVisible, disabled: false }
      case 'guides':
        return { active: guidesVisible, disabled: false }
      case 'fullscreen':
        return { active: document.fullscreenElement != null, disabled: false }
      default:
        return { active: false, disabled: false }
    }
  }

  const preview = (id: string) => {
    const b = byId.get(id)!
    const { active, disabled } = previewState(id)
    return (
      <span
        className={`tool-btn preview-btn${active ? ' active' : ''}${disabled ? ' dimmed' : ''}`}
        title={b.label}
      >
        {id === 'zoom' ? `${zoomPct}%` : b.icon ? <Icon name={b.icon} /> : b.glyph}
      </span>
    )
  }

  return (
    <Modal title="Options" onClose={() => useStore.getState().closeDialog()} wide className="options">
      <div className="seg options-tabs" role="tablist">
        <button
          role="tab"
          aria-selected={tab === 'general'}
          className={tab === 'general' ? 'on' : ''}
          onClick={() => setTab('general')}
        >
          General
        </button>
        <button
          role="tab"
          aria-selected={tab === 'buttons'}
          className={tab === 'buttons' ? 'on' : ''}
          onClick={() => setTab('buttons')}
          data-testid="options-buttons-tab"
        >
          Buttons
        </button>
        <button
          role="tab"
          aria-selected={tab === 'danger'}
          className={`danger${tab === 'danger' ? ' on' : ''}`}
          onClick={() => setTab('danger')}
          data-testid="options-danger-tab"
        >
          Danger zone
        </button>
      </div>

      <div className="options-content">
      {tab === 'general' && (
        <div className="form">
          <label className="check" data-testid="opt-animations">
            <input
              type="checkbox"
              checked={viewAnimations}
              onChange={(e) => useStore.getState().setViewAnimations(e.target.checked)}
            />
            <span>
              <strong>Design view animations</strong>
              <br />
              <span className="hint">
                Animate collapsible bars, side panels, and the tool palette collapse, and add a
                bounce when a typed zoom is applied. Turn off for instant transitions.
              </span>
            </span>
          </label>
          <label className="check" data-testid="opt-clock24h">
            <input
              type="checkbox"
              checked={clock24h}
              onChange={(e) => useStore.getState().setClock24h(e.target.checked)}
            />
            <span>
              <strong>Show 24 hour clock</strong>
              <br />
              <span className="hint">Display save times like 14:07 instead of 2:07 PM.</span>
            </span>
          </label>
          <label className="check" data-testid="opt-lefty">
            <input
              type="checkbox"
              checked={lefty}
              onChange={(e) => useStore.getState().setLefty(e.target.checked)}
            />
            <span>
              <strong>Left-handed view</strong>
              <br />
              <span className="hint">
                Mirrors the stitch-motion animations and switches follow-mode playback to clockwise.
              </span>
            </span>
          </label>
          <div className="form-row" data-testid="opt-sidecar">
            <span>
              <strong>Sidecar URL</strong>
              <br />
              <span className="hint">
                Base URL of the self-hosted short-link sidecar used by Export → Short link
                (defaults to this app's own address).
              </span>
            </span>
            <input
              value={sidecarUrl}
              onChange={(e) => setSidecarUrl(e.target.value)}
              onBlur={() => {
                try {
                  localStorage.setItem('dimcrochet.sidecarUrl', sidecarUrl.trim())
                } catch {
                  /* storage unavailable */
                }
              }}
              placeholder="https://charts.example.com"
              spellCheck={false}
              data-testid="opt-sidecar-url"
            />
          </div>
        </div>
      )}

      {tab === 'buttons' && (
        <div className="form">
          <div className="form-row" data-testid="opt-rows">
            <span>
              <strong>Tool palette layout</strong>
              <br />
              <span className="hint">Two rows take less horizontal space.</span>
            </span>
            <div className="seg">
              {[1, 2].map((n) => (
                <button
                  key={n}
                  className={palette.rows === n ? 'on' : ''}
                  data-testid={`opt-rows-${n}`}
                  onClick={() => useStore.getState().setPalette({ rows: n as 1 | 2 })}
                >
                  {n === 1 ? 'One row' : 'Two rows'}
                </button>
              ))}
            </div>
          </div>
          <p className="hint">
            Drag to reorder the buttons exactly as they appear on the palette, and use the checkbox
            to hide ones you don't use. The tool buttons stay on the palette even when it is
            collapsed — only the edit/view/zoom cluster hides.
          </p>
          <div className="palette-dd-list" data-testid="palette-dd-list">
            {items.map((b) => {
              const isHidden = hiddenL.includes(b.id)
              const visibleIds = items.filter((it) => !hiddenL.includes(it.id)).map((it) => it.id)
              const splitAfterId =
                palette.rows === 2 ? visibleIds[Math.ceil(visibleIds.length / 2) - 1] : null
              return (
                <Fragment key={b.id}>
                  <div
                    className={`palette-dd-row${isHidden ? ' off' : ''}${dragId === b.id ? ' dragging' : ''}`}
                    draggable
                    onDragStart={(e) => {
                      setDragId(b.id)
                      e.dataTransfer.effectAllowed = 'move'
                      try {
                        e.dataTransfer.setData('text/plain', b.id)
                      } catch {
                        /* some engines refuse setData */
                      }
                    }}
                    onDragOver={(e) => {
                      e.preventDefault()
                      if (!dragId || dragId === b.id) return
                      const from = items.findIndex((it) => it.id === dragId)
                      const to = items.findIndex((it) => it.id === b.id)
                      if (from < 0 || to < 0 || from === to) return
                      const next = [...items]
                      next.splice(to, 0, next.splice(from, 1)[0])
                      setItems(next)
                      useStore.getState().setPalette({ order: next.map((it) => it.id) })
                    }}
                    onDrop={(e) => {
                      e.preventDefault()
                      setDragId(null)
                    }}
                    onDragEnd={() => setDragId(null)}
                  >
                    <span className="dd-handle" title="Drag to reorder">
                      ⠿
                    </span>
                    {preview(b.id)}
                    <span className="btnrow-label">{b.label}</span>
                    <label className="check">
                      <input
                        type="checkbox"
                        checked={!isHidden}
                        onChange={(e) => {
                          const nextHidden = e.target.checked
                            ? hiddenL.filter((h) => h !== b.id)
                            : [...hiddenL, b.id]
                          setHiddenL(nextHidden)
                          useStore.getState().setPalette({ hidden: nextHidden })
                        }}
                      />
                      <span>{isHidden ? 'hidden' : 'shown'}</span>
                    </label>
                  </div>
                  {splitAfterId === b.id && (
                    <div className="dd-row-divider" title="Second row starts here" data-testid="dd-row-divider" />
                  )}
                </Fragment>
              )
            })}
          </div>
          <button
            className="btn"
            data-testid="reset-buttons-positions"
            onClick={() => {
              if (
                window.confirm(
                  'Reset buttons and positions? Your customizations on the action bar (visibility and order), the one/two-row layout, and the palette position return to defaults.',
                )
              ) {
                useStore.getState().resetPalette()
                setItems(PALETTE_BUTTONS.map((b) => ({ ...b })))
                setHiddenL([])
              }
            }}
          >
            ⟲ Reset buttons and positions
          </button>
        </div>
      )}

      {tab === 'danger' && (
        <div className="danger-zone">
          <p>
            <strong>Delete everything on this device.</strong> This removes every saved chart, all
            preferences, and the copy/paste clipboard from this browser — exactly as if you had
            never visited the site. Anything you did not back up is gone for good.
          </p>
          <div className="form-row" data-testid="danger-confirm-row">
            <span>Type \u201creset\u201d to confirm:</span>
            <input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="reset"
              spellCheck={false}
              data-testid="danger-confirm"
            />
          </div>
          <button
            className="btn danger-btn"
            data-testid="danger-reset"
            disabled={!unlock || wiping}
            onClick={() => void wipe()}
          >
            {wiping ? 'Deleting…' : 'Delete everything & start fresh'}
          </button>
        </div>
      )}
      </div>
    </Modal>
  )
}

// ---- version history: current release highlighted + last 5 entries ---------

const CHANGELOG_FALLBACK = 'No version history available.'

export function ChangelogDialog() {
  const raw = changelogRaw
  const { current, older } = recentChangelog(raw, __APP_VERSION__, 5)

  const renderBody = (body: string) => (
    <div className="changelog-body">
      {body
        .split('\n')
        .filter((l) => l.trim())
        .map((line, i) =>
          line.startsWith('### ') ? (
            <strong key={i}>{line.slice(4)}</strong>
          ) : line.startsWith('- ') ? (
            <span key={i} className="changelog-li">
              · {line.slice(2)}
            </span>
          ) : (
            <span key={i}>{line}</span>
          ),
        )}
    </div>
  )

  return (
    <Modal title="Version history" onClose={() => useStore.getState().closeDialog()} wide>
      <p className="hint">
        Showing the current release and the last five. Older history lives in the repository's
        CHANGELOG.md.
      </p>
      {current ? (
        <div className="changelog-entry current" data-testid="changelog-current">
          <div className="changelog-head">
            <strong>Version {current.version}</strong>
            {current.date && <span className="hint">{current.date}</span>}
            <span className="level-chip level-3">current</span>
          </div>
          {renderBody(current.body)}
        </div>
      ) : (
        <p className="hint">{CHANGELOG_FALLBACK}</p>
      )}
      {older.map((e) => (
        <div key={e.version} className="changelog-entry">
          <div className="changelog-head">
            <strong>Version {e.version}</strong>
            {e.date && <span className="hint">{e.date}</span>}
          </div>
          {renderBody(e.body)}
        </div>
      ))}
    </Modal>
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
  if (dialog === 'stitch-motions') return <StitchMotionDialog />
  if (dialog === 'options') return <OptionsDialog />
  if (dialog === 'changelog') return <ChangelogDialog />
  return null
}
