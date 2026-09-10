import { useEffect, useState } from 'react'
import { applyBackup, downloadBackup } from '@dimcraft/core/export/backup'
import { importInterchangeFile } from '@dimcraft/core/export/projectFile'
import { deleteProject, listProjects } from '@dimcraft/core/storage/db'
import { editedLabel } from '@dimcraft/core/ui/relativeTime'
import type { ProjectRecord } from '@dimcraft/core/model/types'
import { KNIT_STARTERS, createBlankKnitDoc, createStarter } from '../model/starters'
import { useStore } from '../state/store'

/** Home view: learn-with-starters, your designs, backup/restore. */
export function Gallery() {
  const [tab, setTab] = useState<'learn' | 'mine'>('learn')
  const [mine, setMine] = useState<ProjectRecord[]>([])
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    void listProjects().then(setMine)
    const t = setInterval(() => setNow(Date.now()), 60_000)
    return () => clearInterval(t)
  }, [])

  const openStarter = (id: string) => {
    useStore.getState().newProject(createStarter(id).title, createStarter(id))
  }

  const onRestore = async (file: File) => {
    const parsed = await importInterchangeFile(file)
    if (!parsed) {
      window.alert(`Could not read ${file.name}. Expected a DimKnit chart or backup export.`)
      return
    }
    if (parsed.type === 'backup') {
      const n = await applyBackup(parsed.backup)
      setMine(await listProjects())
      window.alert(`Restored ${n} chart${n === 1 ? '' : 's'} from the backup.`)
    } else if (parsed.type === 'chart') {
      useStore.getState().newProject(parsed.name, parsed.doc)
    } else {
      window.alert('Symbol packs from DimCrochet are not compatible with knitting charts.')
    }
  }

  return (
    <div className="gallery">
      <header className="gallery-head">
        <div>
          <h1>DimKnit</h1>
          <p>Knitting chart composer</p>
        </div>
        <button
          className="primary"
          onClick={() => useStore.getState().newProject(createBlankKnitDoc().title, createBlankKnitDoc())}
        >
          + New chart
        </button>
      </header>

      <div className="tabs" role="tablist">
        <button role="tab" aria-selected={tab === 'learn'} className={tab === 'learn' ? 'selected' : ''} onClick={() => setTab('learn')}>
          Learn with starters
        </button>
        <button role="tab" aria-selected={tab === 'mine'} className={tab === 'mine' ? 'selected' : ''} onClick={() => setTab('mine')}>
          My designs
        </button>
      </div>

      {tab === 'learn' ? (
        <>
          <p className="hint">
            New to knitting? Open a starter in increasing difficulty, then hit ▶ Follow to walk the rows stitch by
            stitch — right-side rows run right-to-left, wrong-side rows reverse.
          </p>
          <div className="cards">
            {KNIT_STARTERS.map((s) => (
              <article key={s.id} className="card" onClick={() => openStarter(s.id)}>
                <strong>{s.name}</strong>
                <span className="level">{s.level}</span>
                <p>{s.blurb}</p>
                <span className="open-hint">Open starter →</span>
              </article>
            ))}
          </div>
        </>
      ) : mine.length === 0 ? (
        <p className="hint">Nothing here yet — open a starter above or start a new chart.</p>
      ) : (
        <div className="cards">
          {mine.map((rec) => (
            <article key={rec.id} className="card" onClick={() => useStore.getState().openProject(rec)}>
              <strong>{rec.name}</strong>
              <span className="level">
                {rec.doc.placements.length} stitches · edited {editedLabel(rec.updatedAt, now)}
              </span>
              <p>{rec.doc.title}</p>
              <span className="open-hint">✎</span>
              <button
                className="card-delete"
                title="Delete this chart"
                onClick={async (e) => {
                  e.stopPropagation()
                  if (!window.confirm(`Delete “${rec.name}”? This cannot be undone.`)) return
                  await deleteProject(rec.id)
                  setMine(await listProjects())
                }}
              >
                ✕
              </button>
            </article>
          ))}
        </div>
      )}

      <footer className="gallery-foot">
        <p>
          DimKnit v{__APP_VERSION__} ({__GIT_COMMIT__}) — charts are stored only in this browser. Drop a .dimknit
          export or backup anywhere on this page to import it — purely client-side, nothing is uploaded. DimKnit is
          open source (MIT).
        </p>
        <button
          onClick={async () => {
            await downloadBackup()
          }}
        >
          ⭳ Backup everything
        </button>
        <label className="file-label">
          ⭱ Restore backup…
          <input
            type="file"
            accept=".json,application/json"
            hidden
            onChange={async (e) => {
              const f = e.target.files?.[0]
              e.target.value = ''
              if (f) await onRestore(f)
            }}
          />
        </label>
      </footer>
    </div>
  )
}
