import { useStore } from '../state/store'

/** Status bar: mirrors DimCrochet's — cursor, zoom, selection, save state. */
export function StatusBar() {
  const cursor = useStore((s) => s.cursor)
  const viewport = useStore((s) => s.viewport)
  const selPlacements = useStore((s) => s.selPlacements)
  const savedAt = useStore((s) => s.savedAt)
  const tool = useStore((s) => s.tool)
  const armed = useStore((s) => s.armedSymbolId)

  const selSummary = selPlacements.length > 0 ? `${selPlacements.length} stitches` : ''

  const toolHint =
    tool === 'place'
      ? `Placing ${armed ?? '—'} — click cells; arrows move selection by one cell`
      : tool === 'pan'
        ? 'Drag to pan · wheel scrolls · Ctrl+wheel zooms'
        : ''

  return (
    <footer className="statusbar">
      <span className="sb-cell">{cursor ? `${Math.round(cursor.x)}, ${Math.round(cursor.y)}` : '—'}</span>
      <span className="sb-cell">{Math.round(viewport.zoom * 100)}%</span>
      {selSummary && <span className="sb-cell accent">{selSummary}</span>}
      {toolHint && <span className="sb-cell hint-text">{toolHint}</span>}
      <span className="sb-spacer" />
      <span className="sb-cell muted">Row 1 sits at the bottom · RS rows read right-to-left</span>
      <span className="sb-cell">
        {savedAt
          ? `Saved ${new Date(savedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
          : 'Unsaved'}
      </span>
      <span className="sb-cell muted">Everything stays in this browser — no account, no uploads</span>
      <span className="sb-cell version-link">v{__APP_VERSION__}</span>
    </footer>
  )
}
