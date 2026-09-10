import { activeStore } from '../state/store'

/** Dual-handle rest/hover opacity slider for the floating action bar, plus
 *  the keep-the-island-visible toggle. Shared by every app's Options dialog;
 *  the backing state lives in the shared store factory. */
export function ToolbarOpacityField() {
  const st = activeStore()
  const toolbarOpacity = st((s) => s.toolbarOpacity)
  const toolbarHoverOpacity = st((s) => s.toolbarHoverOpacity)

  return (
    <div className="form-row" data-testid="opt-toolbar-opacity">
      <span>
        <strong>Toolbar opacity</strong>
        <br />
        <span className="hint">
          Rest value dims the floating palette; it brightens to the hover value while you
          point at it. 30% minimum keeps it findable.
        </span>
      </span>
      <div className="dual-wrap" data-testid="opt-toolbar-opacity-slider">
        <div className="dual-range">
          {/* visible track ends at the hover thumb — no dangling tail past it */}
          <div
            className="dual-track"
            style={{ width: `${((toolbarHoverOpacity - 30) / 70) * 100}%` }}
          />
          <div
            className="dual-band"
            style={{
              left: `${((toolbarOpacity - 30) / 70) * 100}%`,
              width: `${((toolbarHoverOpacity - toolbarOpacity) / 70) * 100}%`,
            }}
          />
          <input
            type="range"
            min={30}
            max={100}
            step={5}
            value={toolbarOpacity}
            aria-label="Toolbar opacity at rest"
            style={{ zIndex: toolbarOpacity === toolbarHoverOpacity ? 4 : 2 }}
            onChange={(e) => st.getState().setToolbarOpacity(Number(e.target.value))}
          />
          <input
            type="range"
            min={30}
            max={100}
            step={5}
            value={toolbarHoverOpacity}
            aria-label="Toolbar opacity on hover"
            style={{ zIndex: 3 }}
            onChange={(e) => st.getState().setToolbarHoverOpacity(Number(e.target.value))}
          />
        </div>
        <div className="dual-values">
          At rest {toolbarOpacity}% · On hover {toolbarHoverOpacity}%
        </div>
      </div>
    </div>
  )
}

export function IslandFullOpacityCheck() {
  const st = activeStore()
  const islandFullOpacity = st((s) => s.islandFullOpacity)
  return (
    <label className="check" data-testid="opt-island-full">
      <input
        type="checkbox"
        checked={islandFullOpacity}
        onChange={(e) => st.getState().setIslandFullOpacity(e.target.checked)}
      />
      <span>
        <strong>Keep the drag &amp; collapse island fully visible</strong>
        <br />
        <span className="hint">The island ignores the toolbar opacity, so drag and collapse stay easy to find on dimmed palettes.</span>
      </span>
    </label>
  )
}
