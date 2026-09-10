import { Icon } from '@dimcraft/core/ui/icons'
import { useStore } from '../state/store'

/** Slim top bar: project identity + chart-level actions. Same layout as the
 *  DimCrochet toolbar — the two apps read as siblings, differing in theme. */
export function Toolbar() {
  const projectName = useStore((s) => s.projectName)
  const followActive = useStore((s) => s.followActive)

  const st = useStore

  return (
    <header className="toolbar">
      <div className="brand">
        <svg viewBox="0 0 64 64" width="22" height="22" aria-hidden>
          <rect width="64" height="64" rx="14" fill="#3fc1b0" />
          <g fill="none" stroke="#f4f6f5" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M 14 40 L 24 26 L 34 40" />
            <path d="M 30 40 L 40 26 L 50 40" />
          </g>
        </svg>
        <span>DimKnit</span>
      </div>

      <input
        className="proj-name"
        value={projectName}
        onChange={(e) => st.setState({ projectName: e.target.value })}
        title="Project name"
        spellCheck={false}
      />

      <div className="tb-spacer" />

      <button
        className={`btn${followActive ? ' accent' : ''}`}
        title="Follow mode — step through the chart row by row (F)"
        onClick={() => st.getState().setFollow(!followActive)}
      >
        <Icon name="play" /> Follow
      </button>
      <button className="btn" onClick={() => st.getState().openDialog('instructions')} title="Written row-by-row instructions">
        <Icon name="list" /> Rows
      </button>
      <button className="btn" onClick={() => st.getState().openDialog('preview')} title="2D fabric preview">
        <Icon name="eye" /> Preview
      </button>
      <button className="btn accent" onClick={() => st.getState().openDialog('export')} title="Export the chart">
        <Icon name="export" /> Export
      </button>
      <button className="tool-btn" title="All projects" onClick={() => st.getState().closeProject()}>
        <Icon name="gallery" />
      </button>
    </header>
  )
}
