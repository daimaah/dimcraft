import { useStore } from '../state/store'
import { saveProject } from '@dimcraft/core/storage/db'
import { Modal } from './Dialogs'

/** Shown at startup when a link delivered a chart into this browser — either
 *  embedded in the URL fragment (#c=…, never sent to a server) or fetched
 *  encrypted from a self-hosted sidecar (/x/<id>#k=…, where the sidecar only
 *  ever saw ciphertext). Same behaviour and styling as the DimCrochet dialog. */
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
    <Modal title="Shared chart" onClose={() => useStore.getState().setSharedChart(null)}>
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
          <button className="btn accent" onClick={open} data-testid="shared-chart-open">
            Open as my copy
          </button>
        </div>
      </div>
    </Modal>
  )
}