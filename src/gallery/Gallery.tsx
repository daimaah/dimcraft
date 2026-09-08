import { useEffect, useState } from 'react'
import type { ChartDoc, ProjectRecord } from '../model/types'
import { createStarterDoc } from '../model/starter'
import { deleteProject, listProjects, saveProject } from '../storage/db'
import { useStore } from '../state/store'
import { FileLoadRow } from '../panels/dialogs'
import { getDefMap, symbolInner } from '../symbols/registry'
import { contentBBox } from '../geometry/bounds'
import { guideSvgPath } from '../geometry/guides'
import { placementTransform } from '../geometry/transform'
import { lineSvg } from '../render/markup'
import { readProjectFile, readSymbolPackFile } from '../export/projectFile'

const LAST_KEY = 'dimcrochet.lastProject'

export function Gallery() {
  const [projects, setProjects] = useState<ProjectRecord[] | null>(null)
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [dragOver, setDragOver] = useState(false)

  const refresh = () => void listProjects().then(setProjects)
  useEffect(refresh, [])

  /** purely client-side import: dropped files are read into memory, never uploaded */
  const importFiles = async (files: File[]) => {
    for (const f of files) {
      if (f.name.endsWith('.pack.json')) {
        const set = await readSymbolPackFile(f)
        if (!set) {
          window.alert(`Could not read symbol pack ${f.name}.`)
          continue
        }
        useStore.getState().addCustomSet(set)
        useStore.getState().setSymbolSet(set.id)
        window.alert(`Symbol pack “${set.name}” imported and selected.`)
        continue
      }
      const pf = await readProjectFile(f)
      if (!pf) {
        window.alert(`Could not read chart ${f.name}. Expected a DimCrochet export (.dimcrochet.json).`)
        continue
      }
      create(pf.name, pf.doc)
    }
  }

  const open = (rec: ProjectRecord) => {
    localStorage.setItem(LAST_KEY, rec.id)
    useStore.getState().openProject(rec)
  }

  const create = (name: string, doc?: ChartDoc) => {
    const id = useStore.getState().newProject(name, doc)
    const st = useStore.getState()
    localStorage.setItem(LAST_KEY, id)
    void saveProject({ id, name: st.projectName, createdAt: Date.now(), updatedAt: Date.now(), doc: st.doc })
  }

  const del = async (id: string) => {
    if (!window.confirm('Delete this project? Its chart lives only in this browser.')) return
    await deleteProject(id)
    if (localStorage.getItem(LAST_KEY) === id) localStorage.removeItem(LAST_KEY)
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
            <p>Crochet round &amp; motif chart composer</p>
          </div>
        </div>
        <div className="gallery-actions">
          <button className="btn accent" onClick={() => create('Untitled chart')}>
            + New chart
          </button>
          <button className="btn" onClick={() => create('Granny square starter', createStarterDoc())}>
            + Starter: granny square
          </button>
          <FileLoadRow />
        </div>
      </header>

      {projects === null && <p className="hint center">Loading projects…</p>}

      {projects !== null && projects.length === 0 && (
        <div className="empty">
          <p>No projects yet.</p>
          <p className="hint">
            Start from the granny-square starter, or draw your own: place a circle or square guide, drop stitches
            evenly along it, and export a clean SVG, PNG or PDF. Charts are saved in this browser only.
          </p>
        </div>
      )}

      <div className="cards-list">
        {(projects ?? []).map((rec) => (
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
                <span className="hint">
                  {rec.doc.placements.length} stitches · {rec.doc.guides.length} guides · edited{' '}
                  {new Date(rec.updatedAt).toLocaleDateString()}
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
      <footer className="gallery-foot">
        <p className="hint">
          Charts are stored only in this browser. Drop a .dimcrochet.json export or a symbol pack
          anywhere on this page to import it — purely client-side, nothing is uploaded. DimCrochet is
          open source (MIT); symbol packs keep their own licenses.
        </p>
        <button className="btn" onClick={() => useStore.getState().openDialog('licenses')}>
          Licenses &amp; attributions
        </button>
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
