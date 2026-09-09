import { useStore } from '../state/store'
import { saveProject } from '@dimcraft/core/storage/db'

/**
 * Shown at startup when the URL contains a shared chart
 * (fragment-encoded — nothing was uploaded to any server).
 */
export function SharedChartDialog() {
  const shared = useStore((s) => s.sharedChart)
  if (!shared) return null

  const open = () => {
    const st = useStore.getState()
    st.newProject(shared.name, shared.doc)
    void saveProject({
      id: st.projectId!,
      name: st.projectName,
      createdAt: st.createdAt ?? Date.now(),
      updatedAt: Date.now(),
      doc: st.doc,
    })
    useStore.getState().setSharedChart(null)
  }

  return (
    <div className="modal-backdrop" onPointerDown={() => useStore.getState().setSharedChart(null)}>
      <div className="modal" onPointerDown={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>Shared chart</h2>
          <button className="icon-btn" onClick={() => useStore.getState().setSharedChart(null)}>
            ✕
          </button>
        </div>
        <div className="form">
          <p>
            This link contains the chart <strong>{shared.name}</strong> ({shared.doc.placements.length}{' '}
            stitches).
          </p>
          <p className="hint">{shared.note ?? 'The chart is embedded in the link itself — nothing was uploaded to a server.'}</p>
          <p className="hint">Opening it creates a <strong>new copy</strong> in your browser; the original stays untouched.</p>
          <div className="modal-actions">
            <button className="btn" onClick={() => useStore.getState().setSharedChart(null)}>
              Not now
            </button>
            <button className="btn accent" onClick={open}>
              Open as my copy
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
