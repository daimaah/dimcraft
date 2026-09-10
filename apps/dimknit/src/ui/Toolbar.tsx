import { useStore } from '../state/store'

/** Top bar: brand, project name, history, follow + export entry points. */
export function Toolbar() {
  const projectName = useStore((s) => s.projectName)
  const dialog = useStore((s) => s.dialog)
  const followActive = useStore((s) => s.followActive)

  return (
    <header className="toolbar">
      <span className="brand">DimKnit</span>
      <input
        className="name"
        value={projectName}
        onChange={(e) => useStore.setState({ projectName: e.target.value })}
        aria-label="Project name"
      />
      <div className="toolbar-actions">
        <button title="Undo (Ctrl+Z)" onClick={() => useStore.getState().undo()}>
          ↩
        </button>
        <button title="Redo (Ctrl+Shift+Z)" onClick={() => useStore.getState().redo()}>
          ↪
        </button>
        <button
          className={followActive ? 'active' : ''}
          title="Follow mode — step through the rows (F)"
          onClick={() => useStore.getState().setFollow(!followActive)}
        >
          ▶ Follow
        </button>
        <button
          className={dialog === 'instructions' ? 'active' : ''}
          title="Written instructions"
          onClick={() => useStore.getState().openDialog('instructions')}
        >
          ☰ Rows
        </button>
        <button
          className={dialog === 'export' ? 'active' : ''}
          title="Export (Ctrl+E)"
          onClick={() => useStore.getState().openDialog('export')}
        >
          ⭳ Export
        </button>
        <button title="Back to all projects" onClick={() => useStore.getState().closeProject()}>
          ⌂ Projects
        </button>
      </div>
    </header>
  )
}
