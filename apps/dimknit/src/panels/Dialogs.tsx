import { useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { deleteAllLocalData } from '@dimcraft/core/export/backup'
import { changelogBlocks, recentChangelog, unreleasedChangelog } from '@dimcraft/core/export/changelog'
import { SiblingUrlField } from '@dimcraft/core/ui/SiblingUrlField'
import changelogRaw from '../../CHANGELOG.md?raw'
import { InstructionsDialog } from './InstructionsDialog'
import { ExportDialog } from './ExportDialog'
import { useStore } from '../state/store'

/** Dialog frame: draggable by its title bar, clamped to the viewport —
 *  same behaviour and styling as the DimCrochet dialogs. */
export function Modal({
  title,
  onClose,
  children,
  wide,
  className,
}: {
  title: string
  onClose: () => void
  children: ReactNode
  wide?: boolean
  className?: string
}) {
  const boxRef = useRef<HTMLDivElement>(null)
  const headRef = useRef<HTMLDivElement>(null)

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
    const onMove = (ev: PointerEvent) => {
      const w = el.offsetWidth
      const h = el.offsetHeight
      const maxLeft = Math.max(8, window.innerWidth - w - 8)
      const maxTop = Math.max(8, window.innerHeight - h - 8)
      el.style.left = `${Math.min(Math.max(8, startLeft + ev.clientX - startX), maxLeft)}px`
      el.style.top = `${Math.min(Math.max(8, startTop + ev.clientY - startY), maxTop)}px`
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

/** Options: General (view + canvas preferences) and Danger zone. */
export function OptionsDialog() {
  const viewAnimations = useStore((s) => s.viewAnimations)
  const clock24h = useStore((s) => s.clock24h)
  const snapEnabled = useStore((s) => s.snapEnabled)
  const gridVisible = useStore((s) => s.gridVisible)
  const guidesVisible = useStore((s) => s.guidesVisible)
  const [tab, setTab] = useState<'general' | 'danger'>('general')
  const [confirmText, setConfirmText] = useState('')
  const [wiping, setWiping] = useState(false)

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

  return (
    <Modal title="Options" onClose={() => useStore.getState().closeDialog()} wide className="options">
      <div className="seg options-tabs" role="tablist">
        <button role="tab" aria-selected={tab === 'general'} className={tab === 'general' ? 'on' : ''} onClick={() => setTab('general')}>
          General
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
            <label className="check">
              <input
                type="checkbox"
                checked={viewAnimations}
                onChange={(e) => useStore.getState().setViewAnimations(e.target.checked)}
              />
              <span>
                <strong>Design-view animations</strong>
                <br />
                <span className="hint">Animate the follow bar and dialogs in the design view.</span>
              </span>
            </label>
            <label className="check">
              <input type="checkbox" checked={clock24h} onChange={(e) => useStore.getState().setClock24h(e.target.checked)} />
              <span>
                <strong>24-hour clock</strong>
                <br />
                <span className="hint">Show saved times as 13:45 rather than 1:45 pm.</span>
              </span>
            </label>
            <label className="check">
              <input type="checkbox" checked={snapEnabled} onChange={(e) => useStore.getState().setSnap(e.target.checked)} />
              <span>
                <strong>Snap to stitch grid</strong>
                <br />
                <span className="hint">Placed cells snap to the 24 px stitch grid.</span>
              </span>
            </label>
            <label className="check">
              <input type="checkbox" checked={gridVisible} onChange={(e) => useStore.getState().setGrid(e.target.checked)} />
              <span>
                <strong>Show grid</strong>
                <br />
                <span className="hint">The faint cell grid behind the chart.</span>
              </span>
            </label>
            <label className="check">
              <input
                type="checkbox"
                checked={guidesVisible}
                onChange={(e) => useStore.getState().setGuidesVisible(e.target.checked)}
              />
              <span>
                <strong>Show guides</strong>
                <br />
                <span className="hint">Construction guides stay editable but are skipped in exports when hidden.</span>
              </span>
            </label>
            <SiblingUrlField />
          </div>
        )}
        {tab === 'danger' && (
          <div className="form">
            <div className="form-row" data-testid="opt-wipe">
              <span>
                <strong>Delete all local data</strong>
                <br />
                <span className="hint">
                  Removes every saved chart and all settings from this browser. This cannot be
                  undone — type <code>reset</code> to unlock the button.
                </span>
              </span>
              <div className="danger-zone">
                <input
                  type="text"
                  value={confirmText}
                  placeholder="reset"
                  onChange={(e) => setConfirmText(e.target.value)}
                  aria-label="Type reset to confirm"
                />
                <button className="btn danger" disabled={!unlock || wiping} onClick={() => void wipe()}>
                  Delete everything
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}

/** Licenses & attributions: the knit app's own artwork and dependencies. */
export function LicensesDialog() {
  const doc = useStore((s) => s.doc)

  const DEPS = [
    { name: 'React / React DOM', license: 'MIT', url: 'https://react.dev' },
    { name: 'zustand', license: 'MIT', url: 'https://github.com/pmndrs/zustand' },
    { name: 'idb-keyval', license: 'ISC', url: 'https://github.com/jakearchibald/idb-keyval' },
    { name: 'Vite', license: 'MIT', url: 'https://vitejs.dev' },
    { name: 'vite-plugin-pwa / Workbox', license: 'MIT', url: 'https://vite-pwa-org.netlify.app' },
    { name: 'TypeScript', license: 'Apache-2.0', url: 'https://www.typescriptlang.org' },
  ]

  return (
    <Modal title="Licenses & attributions" onClose={() => useStore.getState().closeDialog()} wide>
      <div className="licenses-body">
        <h3>DimKnit</h3>
        <p>
          Copyright © 2026 DimKnit contributors. Released under the{' '}
          <a href="/LICENSE" target="_blank" rel="noreferrer">
            MIT License
          </a>
          . The knitting chart symbols are original artwork created for DimKnit under the same
          license; symbol shapes follow the Craft Yarn Council chart conventions. Shares the
          DimCraft chart-editor kernel with DimCrochet.
        </p>

        <h3>Bundled symbol set</h3>
        <ul className="license-list">
          <li>
            <strong>Standard (CYC-style)</strong> — MIT — original artwork for DimKnit
          </li>
        </ul>

        <h3>Symbol packs in this chart</h3>
        {(doc.customSets ?? []).length === 0 && <p className="hint">No imported symbol packs are used by this chart.</p>}
        <ul className="license-list">
          {(doc.customSets ?? []).map((s) => (
            <li key={s.id}>
              <strong>{s.name}</strong>
              {s.license ? <span> — {s.license}</span> : <span> — no license information provided (use at your own discretion)</span>}
              {s.authors && <div>Authors: {s.authors}</div>}
              {s.sourceUrl && (
                <div>
                  Source:{' '}
                  <a href={s.sourceUrl} target="_blank" rel="noreferrer">
                    {s.sourceUrl}
                  </a>
                </div>
              )}
            </li>
          ))}
        </ul>
        <p className="hint">Packs keep their own licenses; attribution travels with exported files.</p>

        <h3>Open-source dependencies</h3>
        <ul className="license-list">
          {DEPS.map((d) => (
            <li key={d.name}>
              <a href={d.url} target="_blank" rel="noreferrer">
                {d.name}
              </a>{' '}
              — {d.license}
            </li>
          ))}
        </ul>
        <p className="hint">All trademarks belong to their respective owners.</p>

        <h3>AI assistance</h3>
        <p>
          DimKnit is designed and developed with the assistance of Z.AI large language models:{' '}
          <strong>GLM-5.3-Flash and GLM-5.3 (Z.AI)</strong> — most contributions via GLM-5.3-Flash
          with high reasoning. All code and artwork are human-reviewed, and the chart conventions
          are checked against published knitting-industry references. This attribution is kept up
          to date whenever the models in use change.
        </p>
      </div>

      <div className="modal-actions">
        <button className="btn accent" onClick={() => useStore.getState().closeDialog()}>
          Close
        </button>
      </div>
    </Modal>
  )
}

/** Minimal inline-markdown rendering for changelog bodies: bold + code. */
function inline(text: string): ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).filter(Boolean)
  return parts.map((p, i) => {
    if (p.startsWith('**') && p.endsWith('**')) return <strong key={i}>{p.slice(2, -2)}</strong>
    if (p.startsWith('`') && p.endsWith('`')) return <code key={i}>{p.slice(1, -1)}</code>
    return <span key={i}>{p}</span>
  })
}

/** Version history: the knit app's changelog, current release highlighted. */
export function ChangelogDialog() {
  const up = unreleasedChangelog(changelogRaw)
  const { current, older } = recentChangelog(changelogRaw, __APP_VERSION__, 5)
  const renderBody = (body: string) => (
    <>
      {changelogBlocks(body).map((b, i) =>
        b.kind === 'heading' ? (
          <h3 key={i}>{inline(b.text)}</h3>
        ) : b.kind === 'bullets' ? (
          <ul key={i}>
            {b.items.map((item, j) => (
              <li key={j}>{inline(item)}</li>
            ))}
          </ul>
        ) : (
          <p key={i}>{inline(b.text)}</p>
        ),
      )}
    </>
  )
  return (
    <Modal title="Version history" onClose={() => useStore.getState().closeDialog()} wide>
      <p className="hint">
        Showing the current release and the last five. The app's history lives in
        apps/dimknit/CHANGELOG.md; the shared kernel and sidecar are versioned separately as the
        DimCraft core (currently {__CORE_VERSION__}) — see the CHANGELOG.md at the repository root.
      </p>
      {up && (
        <div className="changelog-entry unreleased">
          <div className="changelog-head">
            <strong>Changes coming in next version</strong>
            <span className="level-chip level-3">unreleased</span>
          </div>
          {renderBody(up.body)}
        </div>
      )}
      {current && (
        <div className="changelog-entry current">
          <div className="changelog-head">
            <strong>v{current.version}</strong>
            <span className="level-chip level-1">current</span>
          </div>
          {renderBody(current.body)}
        </div>
      )}
      {older.map((e) => (
        <div key={e.version} className="changelog-entry">
          <div className="changelog-head">
            <strong>v{e.version}</strong>
          </div>
          {renderBody(e.body)}
        </div>
      ))}
    </Modal>
  )
}

export function Dialogs() {
  const dialog = useStore((s) => s.dialog)
  if (dialog === 'instructions') return <InstructionsDialog />
  if (dialog === 'export') return <ExportDialog />
  if (dialog === 'options') return <OptionsDialog />
  if (dialog === 'licenses') return <LicensesDialog />
  if (dialog === 'changelog') return <ChangelogDialog />
  return null
}