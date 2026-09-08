import { useStore } from '../state/store'
import { Icon } from './icons'

/** Slim top bar: project identity + chart-level actions. Editing/view tools
 *  live in the floating, collapsible ToolPalette over the canvas. */
export function Toolbar() {
  const projectName = useStore((s) => s.projectName)
  const followActive = useStore((s) => s.followActive)

  const st = useStore

  return (
    <header className="toolbar">
      <div className="brand">
        <svg viewBox="0 0 64 64" width="22" height="22" aria-hidden>
          <rect width="64" height="64" rx="14" fill="#d96f4e" />
          <circle cx="32" cy="32" r="15" fill="none" stroke="#fff8f2" strokeWidth="4" />
          <g fill="#fff8f2">
            {Array.from({ length: 8 }, (_, i) => {
              const a = (i * Math.PI) / 4
              return <circle key={i} cx={32 + 15 * Math.cos(a)} cy={32 + 15 * Math.sin(a)} r="3.4" />
            })}
          </g>
        </svg>
        <span>DimCrochet</span>
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
        title="Follow mode — step through the chart round by round (F)"
        onClick={() => st.getState().setFollow(!followActive)}
      >
        <Icon name="play" /> Follow
      </button>
      <button className="btn" onClick={() => st.getState().openDialog('instructions')} title="Written round-by-round instructions">
        <Icon name="list" /> Rounds
      </button>
      <button className="btn" onClick={() => st.getState().openDialog('preview')} title="2D fabric preview">
        <Icon name="eye" /> Preview
      </button>
      <button className="btn accent" onClick={() => st.getState().openDialog('export')}>
        <Icon name="export" /> Export
      </button>
      <button className="tool-btn" title="All projects" onClick={() => st.getState().closeProject()}>
        <Icon name="gallery" />
      </button>
    </header>
  )
}
