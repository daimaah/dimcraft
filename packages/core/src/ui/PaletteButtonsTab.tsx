import { Fragment, useState } from 'react'
import { activeStore } from '../state/store'
import { Icon } from './icons'
import { defaultPaletteOrder, paletteButtons } from './ToolPalette'

/** Options → "Buttons": drag to reorder the action bar exactly as it appears,
 *  per-button visibility, one/two-row layout, reset. Shared by every app's
 *  Options dialog — the action bar itself is core/ui/ToolPalette. */
export function PaletteButtonsTab() {
  const st = activeStore()
  const palette = st((s) => s.palette)
  const tool = st((s) => s.tool)
  const canUndo = st((s) => s.past.length > 0)
  const canRedo = st((s) => s.future.length > 0)
  const snapEnabled = st((s) => s.snapEnabled)
  const gridVisible = st((s) => s.gridVisible)
  const guidesVisible = st((s) => s.guidesVisible)
  const zoomPct = Math.round(st((s) => s.viewport.zoom) * 100)

  const byId = new Map(paletteButtons().map((b) => [b.id, b]))
  const [items, setItems] = useState(() => (palette.order ?? defaultPaletteOrder()).map((id) => byId.get(id) ?? { id, label: id }))
  const [hiddenL, setHiddenL] = useState<string[]>(palette.hidden)
  const [dragId, setDragId] = useState<string | null>(null)

  /** same visual state the real toolbar button would have right now */
  const previewState = (id: string): { active: boolean; disabled: boolean } => {
    switch (id) {
      case 'undo':
        return { active: false, disabled: !canUndo }
      case 'redo':
        return { active: false, disabled: !canRedo }
      case 'snap':
        return { active: snapEnabled, disabled: false }
      case 'grid':
        return { active: gridVisible, disabled: false }
      case 'guides':
        return { active: guidesVisible, disabled: false }
      case 'fullscreen':
        return { active: document.fullscreenElement != null, disabled: false }
      default:
        return { active: tool === id, disabled: false }
    }
  }

  const preview = (id: string) => {
    const b = byId.get(id)!
    const { active, disabled } = previewState(id)
    return (
      <span
        className={`tool-btn preview-btn${active ? ' active' : ''}${disabled ? ' dimmed' : ''}`}
        title={b.label}
      >
        {id === 'zoom' ? `${zoomPct}%` : b.icon ? <Icon name={b.icon} /> : b.glyph}
      </span>
    )
  }

  return (
    <div className="form">
      <div className="form-row" data-testid="opt-rows">
        <span>
          <strong>Tool palette layout</strong>
          <br />
          <span className="hint">Two rows take less horizontal space.</span>
        </span>
        <div className="seg">
          {[1, 2].map((n) => (
            <button
              key={n}
              className={palette.rows === n ? 'on' : ''}
              data-testid={`opt-rows-${n}`}
              onClick={() => st.getState().setPalette({ rows: n as 1 | 2 })}
            >
              {n === 1 ? 'One row' : 'Two rows'}
            </button>
          ))}
        </div>
      </div>
      <p className="hint">
        Drag to reorder the buttons exactly as they appear on the palette, and use the checkbox
        to hide ones you don't use. The tool buttons stay on the palette even when it is
        collapsed — only the edit/view/zoom cluster hides.
      </p>
      <div className="palette-dd-list" data-testid="palette-dd-list">
        {items.map((b) => {
          const isHidden = hiddenL.includes(b.id)
          const visibleIds = items.filter((it) => !hiddenL.includes(it.id)).map((it) => it.id)
          const splitAfterId =
            palette.rows === 2 ? visibleIds[Math.ceil(visibleIds.length / 2) - 1] : null
          return (
            <Fragment key={b.id}>
              <div
                className={`palette-dd-row${isHidden ? ' off' : ''}${dragId === b.id ? ' dragging' : ''}`}
                draggable
                onDragStart={(e) => {
                  setDragId(b.id)
                  e.dataTransfer.effectAllowed = 'move'
                  try {
                    e.dataTransfer.setData('text/plain', b.id)
                  } catch {
                    /* some engines refuse setData */
                  }
                }}
                onDragOver={(e) => {
                  e.preventDefault()
                  if (!dragId || dragId === b.id) return
                  const from = items.findIndex((it) => it.id === dragId)
                  const to = items.findIndex((it) => it.id === b.id)
                  if (from < 0 || to < 0 || from === to) return
                  const next = [...items]
                  next.splice(to, 0, next.splice(from, 1)[0])
                  setItems(next)
                  st.getState().setPalette({ order: next.map((it) => it.id) })
                }}
                onDrop={(e) => {
                  e.preventDefault()
                  setDragId(null)
                }}
                onDragEnd={() => setDragId(null)}
              >
                <span className="dd-handle" title="Drag to reorder">
                  ⠿
                </span>
                <label className="check" title="Show or hide this button">
                  <input
                    type="checkbox"
                    checked={!isHidden}
                    onChange={(e) => {
                      const nextHidden = e.target.checked
                        ? hiddenL.filter((h) => h !== b.id)
                        : [...hiddenL, b.id]
                      setHiddenL(nextHidden)
                      st.getState().setPalette({ hidden: nextHidden })
                    }}
                  />
                </label>
                {preview(b.id)}
                <span className="btnrow-label">{b.label}</span>
              </div>
              {splitAfterId === b.id && (
                <div className="dd-row-divider" title="Second row starts here" data-testid="dd-row-divider" />
              )}
            </Fragment>
          )
        })}
      </div>
      <button
        className="btn"
        data-testid="reset-buttons-positions"
        onClick={() => {
          if (
            window.confirm(
              'Reset buttons and positions? Your customizations on the action bar (visibility and order), the one/two-row layout, and the palette position return to defaults.',
            )
          ) {
            st.getState().resetPalette()
            setItems(paletteButtons().map((b) => ({ ...b })))
            setHiddenL([])
          }
        }}
      >
        ⟲ Reset buttons and positions
      </button>
    </div>
  )
}
