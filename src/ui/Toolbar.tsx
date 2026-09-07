import { useStore } from '../state/store'
import { Icon, type IconName } from './icons'

const TOOLS: { id: string; icon: IconName; label: string; key: string }[] = [
  { id: 'select', icon: 'select', label: 'Select & move', key: 'V' },
  { id: 'pan', icon: 'hand', label: 'Pan view', key: 'H' },
  { id: 'place', icon: 'place', label: 'Place symbol', key: 'P' },
  { id: 'line', icon: 'guide-line', label: 'Backstitch line', key: 'L' },
  { id: 'guide-circle', icon: 'guide-circle', label: 'Circle guide', key: '1' },
  { id: 'guide-arc', icon: 'guide-arc', label: 'Arc guide', key: '2' },
  { id: 'guide-spiral', icon: 'guide-spiral', label: 'Spiral guide', key: '3' },
  { id: 'guide-line', icon: 'guide-line', label: 'Line guide', key: '4' },
  { id: 'guide-polygon', icon: 'guide-polygon', label: 'Polygon guide', key: '5' },
  { id: 'bracket', icon: 'bracket', label: 'Repeat bracket', key: 'B' },
  { id: 'text', icon: 'text', label: 'Text label', key: 'T' },
]

export function Toolbar() {
  const tool = useStore((s) => s.tool)
  const projectName = useStore((s) => s.projectName)
  const canUndo = useStore((s) => s.past.length > 0)
  const canRedo = useStore((s) => s.future.length > 0)
  const snapEnabled = useStore((s) => s.snapEnabled)
  const gridVisible = useStore((s) => s.gridVisible)
  const guidesVisible = useStore((s) => s.guidesVisible)
  const viewport = useStore((s) => s.viewport)

  const st = useStore
  const zoomPct = Math.round(viewport.zoom * 100)

  const fit = () => {
    const el = document.querySelector('.canvas-wrap')
    if (el) {
      const r = el.getBoundingClientRect()
      st.getState().fitView(r.width, r.height)
    }
  }

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

      <div className="tb-sep" />

      <div className="tb-group">
        {TOOLS.map((t) => (
          <button
            key={t.id}
            className={`tool-btn${tool === t.id ? ' active' : ''}`}
            title={`${t.label} (${t.key})`}
            onClick={() => st.getState().setTool(t.id as never)}
          >
            <Icon name={t.icon} />
          </button>
        ))}
      </div>

      <div className="tb-sep" />

      <div className="tb-group">
        <button className="tool-btn" disabled={!canUndo} title="Undo (Ctrl+Z)" onClick={() => st.getState().undo()}>
          <Icon name="undo" />
        </button>
        <button className="tool-btn" disabled={!canRedo} title="Redo (Ctrl+Shift+Z)" onClick={() => st.getState().redo()}>
          <Icon name="redo" />
        </button>
      </div>

      <div className="tb-sep" />

      <div className="tb-group">
        <button
          className={`tool-btn${snapEnabled ? ' active' : ''}`}
          title="Snapping (guide points, anchors, grid)"
          onClick={() => st.getState().setSnap(!snapEnabled)}
        >
          <Icon name="snap" />
        </button>
        <button
          className={`tool-btn${gridVisible ? ' active' : ''}`}
          title="Grid"
          onClick={() => st.getState().setGrid(!gridVisible)}
        >
          <Icon name="grid" />
        </button>
        <button
          className={`tool-btn${guidesVisible ? ' active' : ''}`}
          title="Show guides"
          onClick={() => st.getState().setGuidesVisible(!guidesVisible)}
        >
          <Icon name="guides" />
        </button>
      </div>

      <div className="tb-spacer" />

      <div className="tb-group zoom">
        <button className="tool-btn" title="Zoom out" onClick={() => st.getState().zoomAt(1 / 1.2, window.innerWidth / 2, window.innerHeight / 2)}>
          −
        </button>
        <span className="zoom-label">{zoomPct}%</span>
        <button className="tool-btn" title="Zoom in" onClick={() => st.getState().zoomAt(1.2, window.innerWidth / 2, window.innerHeight / 2)}>
          +
        </button>
        <button className="tool-btn" title="Fit chart (Ctrl+0)" onClick={fit}>
          <Icon name="fit" />
        </button>
      </div>

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
