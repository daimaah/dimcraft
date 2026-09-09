import { useEffect, useMemo, useState } from 'react'
import type { ChartDoc, ProjectRecord } from '@dimcraft/core/model/types'
import { STARTERS } from '../model/starters'
import { docFromClipboard, hasClipboard } from '@dimcraft/core/model/clipboard'
import { sortProjects, DESIGNS_SORTS, type DesignsSort } from '@dimcraft/core/model/projectSort'
import { applyBackup, downloadBackup } from '@dimcraft/core/export/backup'
import { deleteProject, listProjects, saveProject } from '@dimcraft/core/storage/db'
import { useStore } from '../state/store'
import { FileLoadRow } from '../panels/dialogs'
import { getDefMap, symbolInner } from '../symbols/registry'
import { contentBBox } from '@dimcraft/core/geometry/bounds'
import { guideSvgPath } from '@dimcraft/core/geometry/guides'
import { placementTransform } from '@dimcraft/core/geometry/transform'
import { lineSvg } from '../render/markup'
import { editedLabel, editedTimestamp } from '@dimcraft/core/ui/relativeTime'

const SEEN_MINE_KEY = 'dimcrochet.seenMine'
const SORT_KEY = 'dimcrochet.designsSort'

type Tab = 'starters' | 'mine'

export function Gallery() {
  const clock24h = useStore((s) => s.clock24h)
  const [projects, setProjects] = useState<ProjectRecord[] | null>(null)
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [dragOver, setDragOver] = useState(false)
  // no designs yet → lead with the starters; otherwise lead with the user's own work
  const [tab, setTab] = useState<Tab | null>(null)
  const [mineSeen, setMineSeen] = useState(() => localStorage.getItem(SEEN_MINE_KEY) === '1')
  const [sort, setSort] = useState<DesignsSort>(
    () => (localStorage.getItem(SORT_KEY) as DesignsSort) || 'updated-desc',
  )

  const refresh = () => void listProjects().then(setProjects)
  useEffect(refresh, [])

  // re-render every minute so "edited N minutes ago" labels stay honest
  const [nowTick, setNowTick] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setNowTick(Date.now()), 60_000)
    return () => clearInterval(t)
  }, [])

  const starterDocs = useMemo(() => STARTERS.map((s) => ({ def: s, doc: s.build() })), [])

  const activeTab: Tab = tab ?? (projects && projects.length > 0 ? 'mine' : 'starters')
  const showMineBadge = (projects?.length ?? 0) > 0 && !mineSeen

  // seeing the My designs tab (by click or by default) counts as "noticed"
  useEffect(() => {
    if (activeTab === 'mine' && !mineSeen) {
      localStorage.setItem(SEEN_MINE_KEY, '1')
      setMineSeen(true)
    }
  }, [activeTab, mineSeen])

  const openMine = () => setTab('mine')

  /** purely client-side import: dropped files are read into memory, never uploaded */
  const importFiles = async (files: File[]) => {
    const { importInterchangeFile } = await import('@dimcraft/core/export/projectFile')
    for (const f of files) {
      const parsed = await importInterchangeFile(f)
      if (!parsed) {
        window.alert(`Could not read ${f.name}. Expected a DimCrochet chart or symbol pack export.`)
        continue
      }
      if (parsed.type === 'pack') {
        useStore.getState().addCustomSet(parsed.set)
        useStore.getState().setSymbolSet(parsed.set.id)
        window.alert(`Symbol pack “${parsed.set.name}” imported and selected.`)
        continue
      }
      if (parsed.type === 'backup') {
        const n = parsed.backup.projects.length
        if (!window.confirm(`Restore this backup: ${n} chart(s) and your settings? Charts with the same id are replaced; your other charts are kept. The page reloads afterwards.`)) continue
        const restored = await applyBackup(parsed.backup)
        window.alert(`Restored ${restored} chart(s). Reloading…`)
        location.reload()
        continue
      }
      create(parsed.name, parsed.doc)
    }
  }

  const open = (rec: ProjectRecord) => {
    useStore.getState().openProject(rec)
  }

  const create = (name: string, doc?: ChartDoc) => {
    useStore.getState().newProject(name, doc)
    const st = useStore.getState()
    void saveProject({ id: st.projectId!, name: st.projectName, createdAt: Date.now(), updatedAt: Date.now(), doc: st.doc })
  }

  const del = async (id: string) => {
    if (!window.confirm('Delete this project? Its chart lives only in this browser.')) return
    await deleteProject(id)
    refresh()
  }

  const duplicate = async (rec: ProjectRecord) => {
    const id = 'proj-' + Math.random().toString(36).slice(2, 10)
    await saveProject({ ...rec, id, name: `${rec.name} copy`, createdAt: Date.now(), updatedAt: Date.now() })
    refresh()
  }

  const rename = async (rec: ProjectRecord) => {
    const name = renameValue.trim()
    setRenamingId(null)
    if (!name || name === rec.name) return
    await saveProject({ ...rec, name, updatedAt: rec.updatedAt })
    refresh()
  }

  return (
    <div
      className={`gallery${dragOver ? ' drag-over' : ''}`}
      onDragOver={(e) => {
        e.preventDefault()
        setDragOver(true)
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault()
        setDragOver(false)
        void importFiles(Array.from(e.dataTransfer.files))
      }}
    >
      <header className="gallery-head">
        <div className="brand big">
          <svg viewBox="0 0 64 64" width="34" height="34" aria-hidden>
            <rect width="64" height="64" rx="14" fill="#d96f4e" />
            <circle cx="32" cy="32" r="15" fill="none" stroke="#fff8f2" strokeWidth="4" />
            <g fill="#fff8f2">
              {Array.from({ length: 8 }, (_, i) => {
                const a = (i * Math.PI) / 4
                return <circle key={i} cx={32 + 15 * Math.cos(a)} cy={32 + 15 * Math.sin(a)} r="3.4" />
              })}
            </g>
          </svg>
          <div>
            <h1>DimCrochet</h1>
            <button
              className="version-link"
              data-testid="version-link"
              title="Version history"
              onClick={() => useStore.getState().openDialog('changelog')}
            >
              v{__APP_VERSION__}
              {__GIT_COMMIT__ ? ` · ${__GIT_COMMIT__}` : ''}
            </button>
            <p>Crochet round &amp; motif chart composer</p>
          </div>
        </div>
        <div className="gallery-actions">
          {hasClipboard() && (
            <button
              className="btn"
              title="Paste a copied chart fragment as a new project"
              data-testid="paste-new-chart"
              onClick={() => {
                const doc = docFromClipboard()
                if (doc) create(doc.title, doc)
              }}
            >
              + Paste as new chart
            </button>
          )}
          <button className="btn accent" onClick={() => create('Untitled chart')}>
            + New chart
          </button>
          <button
            className="btn"
            onClick={() => {
              useStore.getState().newProject('Imported pattern')
              useStore.getState().openDialog('pattern-import')
            }}
            title="Paste written instructions and generate a suggested chart"
          >
            + From written pattern
          </button>
          <FileLoadRow />
        </div>
      </header>

      <div className="gallery-tabs" role="tablist" data-testid="gallery-tabs">
        <button
          role="tab"
          aria-selected={activeTab === 'starters'}
          className={`gallery-tab${activeTab === 'starters' ? ' on' : ''}`}
          onClick={() => setTab('starters')}
          data-testid="tab-starters"
        >
          Learn with starters
        </button>
        <button
          role="tab"
          aria-selected={activeTab === 'mine'}
          className={`gallery-tab${activeTab === 'mine' ? ' on' : ''}`}
          onClick={openMine}
          data-testid="tab-mine"
        >
          My designs
          {showMineBadge && <span className="tab-badge" aria-hidden />}
        </button>
      </div>

      {projects !== null && activeTab === 'starters' && projects.length > 0 && (
        <p className="hint mine-hint" data-testid="mine-hint">
          Everything you save lands under <strong>My designs</strong> →
        </p>
      )}

      {activeTab === 'starters' && (
        <>
          <p className="hint starters-intro">
            New to crochet? Open a starter in increasing difficulty, hit play in follow mode to watch
            the chart build stitch by stitch, and use ▶ How stitches work for the physical moves.
          </p>
          <div className="starter-grid" data-testid="starter-grid">
            {starterDocs.map(({ def, doc }) => (
              <article
                key={def.id}
                className="starter-card"
                data-testid={`starter-${def.id}`}
                onClick={() => create(def.title, doc)}
                title={`Open “${def.title}” as a new chart`}
              >
                <MiniChart doc={doc} />
                <div className="starter-meta">
                  <div className="starter-title-row">
                    <strong>{def.title}</strong>
                    <span className={`level-chip level-${def.level}`}>{def.levelLabel}</span>
                  </div>
                  <p className="hint">{def.tagline}</p>
                  <span className="starter-open">Open starter →</span>
                </div>
              </article>
            ))}
          </div>
        </>
      )}

      {projects === null && activeTab === 'mine' && <p className="hint center">Loading projects…</p>}

      {projects !== null && activeTab === 'mine' && projects.length === 0 && (
        <div className="empty">
          <p>No designs yet.</p>
          <p className="hint">
            Open a starter under <strong>Learn with starters</strong> and make it yours — every chart
            you edit is saved here automatically. Charts are stored in this browser only.
          </p>
        </div>
      )}

      {activeTab === 'mine' && (
        <div className="mine-toolbar" data-testid="mine-toolbar">
          <label className="mine-sort">
            <span>Sort:</span>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as DesignsSort)}
              data-testid="mine-sort"
            >
              {DESIGNS_SORTS.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          {(projects ?? []).length > 0 && <span className="hint">{(projects ?? []).length} designs</span>}
        </div>
      )}

      {activeTab === 'mine' && (
        <div className="cards-list">
          {sortProjects(projects ?? [], sort).map((rec) => (
            <article key={rec.id} className="project-card" onDoubleClick={() => open(rec)}>
              <div className="project-main" onClick={() => open(rec)}>
                <MiniChart doc={rec.doc} />
                <div className="project-meta">
                  {renamingId === rec.id ? (
                    <input
                      autoFocus
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onBlur={() => void rename(rec)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') void rename(rec)
                        if (e.key === 'Escape') setRenamingId(null)
                      }}
                    />
                  ) : (
                    <strong>{rec.name}</strong>
                  )}
                  <span className="hint" title={`Last edited ${editedTimestamp(rec.updatedAt, !clock24h)}`}>
                    {rec.doc.placements.length} stitches · {rec.doc.guides.length} guides · edited{' '}
                    {editedLabel(rec.updatedAt, nowTick, !clock24h)}
                  </span>
                </div>
              </div>
              <div className="project-actions">
                <button
                  className="icon-btn"
                  title="Rename"
                  onClick={() => {
                    setRenamingId(rec.id)
                    setRenameValue(rec.name)
                  }}
                >
                  ✎
                </button>
                <button className="icon-btn" title="Duplicate" onClick={() => void duplicate(rec)}>
                  ⧉
                </button>
                <button className="icon-btn danger" title="Delete" onClick={() => void del(rec.id)}>
                  ✕
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
      <footer className="gallery-foot">
        <p className="hint">
          DimCrochet v{__APP_VERSION__}{__GIT_COMMIT__ ? ` (${__GIT_COMMIT__})` : ''} — charts are stored only in this browser. Drop a .dimcrochet.json export or a symbol pack
          anywhere on this page to import it — purely client-side, nothing is uploaded. DimCrochet is
          open source (MIT); symbol packs keep their own licenses.
        </p>
        <div className="gallery-foot-actions">
          <button
            className="btn"
            data-testid="backup-download"
            title="Download all charts and settings as one file"
            onClick={() => void downloadBackup()}
          >
            ⭳ Backup everything
          </button>
          <label
            className="btn"
            data-testid="backup-restore"
            title="Restore a backup file: adds charts, replaces charts with the same id, applies settings"
          >
            ⭱ Restore backup…
            <input
              type="file"
              accept=".json,application/json"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0]
                e.target.value = ''
                if (f) void importFiles([f])
              }}
            />
          </label>
          <button className="btn" data-testid="open-options-gallery" onClick={() => useStore.getState().openDialog('options')}>
            ⚙ Options
          </button>
          <button className="btn" onClick={() => useStore.getState().openDialog('licenses')}>
            Licenses &amp; attributions
          </button>
        </div>
      </footer>
    </div>
  )
}

function MiniChart({ doc }: { doc: ChartDoc }) {
  const defMap = getDefMap(doc)
  const ink = doc.ink
  const bbox = contentBBox(doc, defMap, { includeGuides: true }) ?? { x: -100, y: -100, w: 200, h: 200 }
  const pad = 30
  const vb = `${bbox.x - pad} ${bbox.y - pad} ${bbox.w + pad * 2} ${bbox.h + pad * 2}`
  return (
    <div className="mini-chart">
      <svg viewBox={vb}>
        {doc.guides
          .filter((g) => g.visible)
          .map((g) => (
            <path key={g.id} d={guideSvgPath(g)} fill="none" stroke="#c8bda9" strokeWidth={4} strokeDasharray="10 8" />
          ))}
        {doc.placements.slice(0, 500).map((p) => {
          const def = defMap.get(p.symbolId)
          if (!def) return null
          return (
            <g
              key={p.id}
              transform={placementTransform(p)}
              dangerouslySetInnerHTML={{ __html: symbolInner(def, ink) }}
            />
          )
        })}
        {doc.lines.map((l) => (
          <g key={l.id} dangerouslySetInnerHTML={{ __html: lineSvg(l, ink) }} />
        ))}
      </svg>
    </div>
  )
}
