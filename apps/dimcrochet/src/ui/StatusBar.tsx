import { useStore } from '../state/store'

export function StatusBar() {
  const cursor = useStore((s) => s.cursor)
  const viewport = useStore((s) => s.viewport)
  const selPlacements = useStore((s) => s.selPlacements)
  const selGuides = useStore((s) => s.selGuides)
  const selBrackets = useStore((s) => s.selBrackets)
  const selTexts = useStore((s) => s.selTexts)
  const selLines = useStore((s) => s.selLines)
  const savedAt = useStore((s) => s.savedAt)
  const clock24h = useStore((s) => s.clock24h)
  const tool = useStore((s) => s.tool)
  const armed = useStore((s) => s.armedSymbolId)

  const selCount = selPlacements.length + selGuides.length + selBrackets.length + selTexts.length + selLines.length
  const selSummary =
    selCount === 0
      ? ''
      : [
          selPlacements.length ? `${selPlacements.length} stitches` : '',
          selLines.length ? `${selLines.length} line${selLines.length > 1 ? 's' : ''}` : '',
          selGuides.length ? `${selGuides.length} guide${selGuides.length > 1 ? 's' : ''}` : '',
          selBrackets.length ? `${selBrackets.length} bracket` : '',
          selTexts.length ? `${selTexts.length} text` : '',
        ]
          .filter(Boolean)
          .join(' · ')

  const toolHint =
    tool === 'place'
      ? `Placing ${armed ?? '—'} — R rotate · [ ] scale · Esc done`
      : tool === 'line'
        ? 'Backstitch: drag from one stitch to the next — ends snap to anchors'
        : tool === 'pan'
          ? 'Drag to pan · wheel scrolls · Ctrl+wheel zooms'
          : tool.startsWith('guide-')
            ? 'Drag on canvas to draw the guide'
            : tool === 'bracket'
              ? 'Click the first stitch, then the last stitch of the repeat'
              : ''

  return (
    <footer className="statusbar">
      <span className="sb-cell">
        {cursor ? `${Math.round(cursor.x)}, ${Math.round(cursor.y)}` : '—'}
      </span>
      <span className="sb-cell">{Math.round(viewport.zoom * 100)}%</span>
      {selSummary && <span className="sb-cell accent">{selSummary}</span>}
      {toolHint && <span className="sb-cell hint-text">{toolHint}</span>}
      <span className="sb-spacer" />
      <span className="sb-cell">
        {savedAt
          ? `Saved ${new Date(savedAt).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
              hour12: !clock24h,
            })}`
          : 'Unsaved'}
      </span>
      <span className="sb-cell muted">Everything stays in this browser — no account, no uploads</span>
      <button
        className="sb-cell version-link"
        data-testid="statusbar-version"
        title="Version history"
        onClick={() => useStore.getState().openDialog('changelog')}
      >
        v{__APP_VERSION__}
      </button>
    </footer>
  )
}
