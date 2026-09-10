import { Fragment, useRef, useState } from 'react'
import { useStore } from '../state/store'
import { getManualSiblingUrl, saveManualSiblingUrl, siblingAppName } from '@dimcraft/core/sibling'
import { getDefMap } from '@dimcraft/core/symbols/registry'
import { guideSample } from '@dimcraft/core/geometry/guides'
import { contentBBox } from '@dimcraft/core/geometry/bounds'
import { exportProjectFile, importInterchangeFile } from '@dimcraft/core/export/projectFile'
import { downloadBlob, safeFilename } from '@dimcraft/core/export/download'
import { applyBackup, deleteAllLocalData } from '@dimcraft/core/export/backup'
import { PreviewDialog } from './PreviewDialog'
import { InstructionsDialog } from './InstructionsDialog'
import { LicensesDialog } from './LicensesDialog'
import { PatternImportDialog } from './PatternImportDialog'
import { StitchMotionDialog } from './StitchMotionDialog'
import { createShortLink, sidecarAvailable } from '@dimcraft/core/export/secureShare'
import { changelogBlocks, recentChangelog, unreleasedChangelog } from '@dimcraft/core/export/changelog'
import { DEFAULT_ORDER, PALETTE_BUTTONS } from '../ui/ToolPalette'
import { Icon } from '@dimcraft/core/ui/icons'
import changelogRaw from '../../CHANGELOG.md?raw'
import type { RotationMode } from '@dimcraft/core/model/types'
import { buildExportSvg, type SvgExportOptions } from '@dimcraft/core/export/svg'
import { exportPng } from '@dimcraft/core/export/png'
import { createShareFragment } from '@dimcraft/core/export/share'
import type { PaperFormat, PageOrientation } from '@dimcraft/core/export/pdf'

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
  const boxRef = useRef<HTMLDivElement>(null)
  const headRef = useRef<HTMLDivElement>(null)

  /** Drag the dialog by its title bar: converts the centered modal to
   *  absolute positioning on first grab, then follows the pointer. */
  const startHeadDrag = (e: React.PointerEvent) => {
    if (e.button !== 0 || (e.target as HTMLElement).closest('button')) return
    const el = boxRef.current
    const head = headRef.current
    if (!el || !head) return
    const rect = el.getBoundingClientRect()
    el.style.position = 'absolute'
    el.style.left = `${rect.left}px`
    el.style.top = `${rect.top}px`
    el.style.margin = '0'
    try {
      head.setPointerCapture(e.pointerId)
    } catch {
      /* pointer id may be unavailable for synthetic events */
    }
    head.dataset.dragging = 'true'
    const startX = e.clientX
    const startY = e.clientY
    const startLeft = rect.left
    const startTop = rect.top
    // keep the whole dialog inside the viewport while dragging
    const onMove = (ev: PointerEvent) => {
      const w = el.offsetWidth
      const h = el.offsetHeight
      const maxLeft = Math.max(8, window.innerWidth - w - 8)
      const maxTop = Math.max(8, window.innerHeight - h - 8)
      const left = Math.min(Math.max(8, startLeft + ev.clientX - startX), maxLeft)
      const top = Math.min(Math.max(8, startTop + ev.clientY - startY), maxTop)
      el.style.left = `${left}px`
      el.style.top = `${top}px`
    }
    const onUp = () => {
      head.dataset.dragging = 'false'
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  return (
    <div className="modal-backdrop" onPointerDown={onClose}>
      <div
        ref={boxRef}
        className={['modal', wide ? 'wide' : '', className ?? ''].filter(Boolean).join(' ')}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <div className="modal-head" ref={headRef} onPointerDown={startHeadDrag} data-testid="modal-drag-handle">
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
        const { svg } = buildExportSvg(doc, opts)
        downloadBlob(`${safeFilename(projectName)}.svg`, new Blob([svg], { type: 'image/svg+xml' }))
      } else if (format === 'png') {
          await exportPng(doc, projectName, { ...opts, scale: pngScale })
      } else {
        const { exportPdf } = await import('@dimcraft/core/export/pdf')
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
  const islandFullOpacity = useStore((s) => s.islandFullOpacity)
  const toolbarOpacity = useStore((s) => s.toolbarOpacity)
  const toolbarHoverOpacity = useStore((s) => s.toolbarHoverOpacity)
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
  const [siblingUrl, setSiblingUrl] = useState(getManualSiblingUrl)
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

      <div className="options-divider" />

      <div className="options-content">
      {tab === 'general' && (
        <div className="form">
          <div className="form-row" data-testid="opt-toolbar-opacity">
            <span>
              <strong>Toolbar opacity</strong>
              <br />
              <span className="hint">
                Rest value dims the floating palette; it brightens to the hover value while you
                point at it. 30% minimum keeps it findable.
              </span>
            </span>
            <div className="dual-wrap" data-testid="opt-toolbar-opacity-slider">
              <div className="dual-range">
                {/* visible track ends at the hover thumb — no dangling tail past it */}
                <div
                  className="dual-track"
                  style={{ width: `${((toolbarHoverOpacity - 30) / 70) * 100}%` }}
                />
                <div
                  className="dual-band"
                  style={{
                    left: `${((toolbarOpacity - 30) / 70) * 100}%`,
                    width: `${((toolbarHoverOpacity - toolbarOpacity) / 70) * 100}%`,
                  }}
                />
                <input
                  type="range"
                  min={30}
                  max={100}
                  step={5}
                  value={toolbarOpacity}
                  aria-label="Toolbar opacity at rest"
                  style={{ zIndex: toolbarOpacity === toolbarHoverOpacity ? 4 : 2 }}
                  onChange={(e) => useStore.getState().setToolbarOpacity(Number(e.target.value))}
                />
                <input
                  type="range"
                  min={30}
                  max={100}
                  step={5}
                  value={toolbarHoverOpacity}
                  aria-label="Toolbar opacity on hover"
                  style={{ zIndex: 3 }}
                  onChange={(e) => useStore.getState().setToolbarHoverOpacity(Number(e.target.value))}
                />
              </div>
              <div className="dual-values">
                At rest {toolbarOpacity}% · On hover {toolbarHoverOpacity}%
              </div>
            </div>
          </div>
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
          <label className="check" data-testid="opt-island-full">
            <input
              type="checkbox"
              checked={islandFullOpacity}
              onChange={(e) => useStore.getState().setIslandFullOpacity(e.target.checked)}
            />
            <span>
              <strong>Keep the drag &amp; collapse island fully visible</strong>
              <br />
              <span className="hint">The island ignores the toolbar opacity, so drag and collapse stay easy to find on dimmed palettes.</span>
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
              <span className="hint">Display times like 14:07 instead of 2:07 PM — save times in the status bar and the edited timestamps in My designs.</span>
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
          <div className="form-row" data-testid="opt-sibling">
            <span>
              <strong>Companion app URL</strong>
              <br />
              <span className="hint">
                Link to {siblingAppName()} when it runs on another address. Leave empty to
                auto-detect it on this host (ports 8080/8081) via the sibling's sidecar.
              </span>
            </span>
            <input
              value={siblingUrl}
              onChange={(e) => setSiblingUrl(e.target.value)}
              onBlur={() => saveManualSiblingUrl(siblingUrl)}
              placeholder="auto-detect"
              spellCheck={false}
              data-testid="opt-sibling-url"
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
                    <label className="check" title="Show or hide this button">
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
                    </label>
                    {preview(b.id)}
                    <span className="btnrow-label">{b.label}</span>
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
            <span>Type “reset” to confirm:</span>
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

/** Minimal inline markdown: **bold**, *italic*, `code`, [text](url). */
function renderChangelogInline(text: string, key: string): React.ReactNode[] {
  const parts: React.ReactNode[] = []
  const re = /\*\*([^*]+)\*\*|\*([^*]+)\*|`([^`]+)`|\[([^\]]+)\]\(([^)\s]+)\)/g
  let idx = 0
  let n = 0
  for (let m = re.exec(text); m; m = re.exec(text)) {
    if (m.index > idx) parts.push(text.slice(idx, m.index))
    const k = `${key}-${n++}`
    if (m[1] !== undefined) parts.push(<strong key={k}>{m[1]}</strong>)
    else if (m[2] !== undefined) parts.push(<em key={k}>{m[2]}</em>)
    else if (m[3] !== undefined) parts.push(<code key={k}>{m[3]}</code>)
    else if (m[4] !== undefined && m[5] !== undefined)
      parts.push(
        <a key={k} href={m[5]} target="_blank" rel="noreferrer">
          {m[4]}
        </a>,
      )
    idx = m.index + m[0].length
  }
  if (idx < text.length) parts.push(text.slice(idx))
  return parts
}

export function ChangelogDialog() {
  const raw = changelogRaw
  const { current, older } = recentChangelog(raw, __APP_VERSION__, 5)
  const upcoming = unreleasedChangelog(raw)

  const renderBody = (body: string) => (
    <div className="changelog-body">
      {changelogBlocks(body).map((b, i) =>
        b.kind === 'heading' ? (
          <h4 key={i} className="changelog-sub">
            {b.text}
          </h4>
        ) : b.kind === 'bullets' ? (
          <ul key={i}>
            {b.items.map((item, j) => (
              <li key={j}>{renderChangelogInline(item, `${i}:${j}`)}</li>
            ))}
          </ul>
        ) : (
          <p key={i}>{renderChangelogInline(b.text, `${i}`)}</p>
        ),
      )}
    </div>
  )

  return (
    <Modal title="Version history" onClose={() => useStore.getState().closeDialog()} wide>
      <p className="hint">
        Showing the current release and the last five. The app's history lives in
        apps/dimcrochet/CHANGELOG.md; the shared kernel and sidecar are versioned separately as
        the DimCraft core (currently {__CORE_VERSION__}) — see the CHANGELOG.md at the repository
        root.
      </p>
      {upcoming && (
        <div className="changelog-entry unreleased" data-testid="changelog-unreleased">
          <div className="changelog-head">
            <strong>Changes coming in next version</strong>
            <span className="level-chip level-3">unreleased</span>
          </div>
          {renderBody(upcoming.body)}
        </div>
      )}
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
