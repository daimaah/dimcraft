import { Fragment, useEffect, useRef, useState } from 'react'
import { useStore } from '../state/store'
import { Icon, type IconName } from '@dimcraft/core/ui/icons'

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

/** customizable buttons in default display order */
export const PALETTE_BUTTONS: { id: string; label: string; icon?: IconName; glyph?: string }[] = [
  ...TOOLS.map((t) => ({ id: t.id, label: t.label, icon: t.icon })),
  { id: 'undo', label: 'Undo', icon: 'undo' },
  { id: 'redo', label: 'Redo', icon: 'redo' },
  { id: 'snap', label: 'Snapping', icon: 'snap' },
  { id: 'grid', label: 'Grid', icon: 'grid' },
  { id: 'guides', label: 'Show guides', icon: 'guides' },
  { id: 'zoom-out', label: 'Zoom out', glyph: '−' },
  { id: 'zoom', label: 'Zoom percentage', glyph: '%' },
  { id: 'zoom-in', label: 'Zoom in', glyph: '+' },
  { id: 'fit', label: 'Fit chart', icon: 'fit' },
  { id: 'fullscreen', label: 'Full screen', icon: 'expand' },
  { id: 'info', label: 'Licenses', icon: 'info' },
  { id: 'options', label: 'Options', icon: 'gear' },
]

export const DEFAULT_ORDER = PALETTE_BUTTONS.map((b) => b.id)

/** group separators render before these ids in the default layout */
const SEP_BEFORE = new Set(['undo', 'snap', 'zoom-out'])

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

/** Floating, draggable tool palette. Defaults to anchored at the top of the
 *  canvas; buttons can be hidden/reordered from Options; can be collapsed to
 *  a pill that always keeps the essential tools visible; layout, position,
 *  and customization live in the store and persist with preferences. */
export function ToolPalette() {
  const tool = useStore((s) => s.tool)
  const canUndo = useStore((s) => s.past.length > 0)
  const canRedo = useStore((s) => s.future.length > 0)
  const snapEnabled = useStore((s) => s.snapEnabled)
  const gridVisible = useStore((s) => s.gridVisible)
  const guidesVisible = useStore((s) => s.guidesVisible)
  const viewport = useStore((s) => s.viewport)
  const palette = useStore((s) => s.palette)
  const { rows, pos, collapsed, order, hidden } = palette
  const [isFullscreen, setIsFullscreen] = useState(false)

  const barRef = useRef<HTMLDivElement>(null)
  const [dragging, setDragging] = useState(false)

  const setPalette = (patch: Partial<typeof palette>) => useStore.getState().setPalette(patch)

  // default: anchored top-left, aligned with the sidebar buttons below
  useEffect(() => {
    if (pos) return
    const bar = barRef.current
    const parent = bar?.parentElement
    if (!bar || !parent) return
    setPalette({ pos: { x: 8, y: 8 } })
  }, [pos])

  // clamp into the canvas on mount/resize/fullscreen — the saved spot may come
  // from a different window size
  useEffect(() => {
    if (!pos) return
    const clampPos = () => {
      const bar = barRef.current
      const parent = bar?.parentElement
      if (!bar || !parent) return
      const nx = Math.min(Math.max(0, pos.x), Math.max(0, parent.clientWidth - bar.offsetWidth))
      const ny = Math.min(Math.max(0, pos.y), Math.max(0, parent.clientHeight - bar.offsetHeight))
      if (nx !== pos.x || ny !== pos.y) {
        setPalette({ pos: { x: nx, y: ny } })
      }
    }
    clampPos()
    const deferred = () => requestAnimationFrame(clampPos)
    window.addEventListener('resize', deferred)
    document.addEventListener('fullscreenchange', deferred)
    return () => {
      window.removeEventListener('resize', deferred)
      document.removeEventListener('fullscreenchange', deferred)
    }
  }, [pos, collapsed])

  const resetPos = () => {
    const bar = barRef.current
    const parent = bar?.parentElement
    if (!bar || !parent) return
    setPalette({ pos: { x: 8, y: 8 } })
  }

  const startDrag = (e: React.PointerEvent) => {
    const bar = barRef.current
    const parent = bar?.parentElement
    if (!bar || !parent) return
    const startX = e.clientX
    const startY = e.clientY
    const startPos = pos ?? { x: bar.offsetLeft, y: bar.offsetTop }
    setDragging(true)
    ;(e.target as Element).setPointerCapture(e.pointerId)
    const onMove = (ev: PointerEvent) => {
      const pw = parent.clientWidth
      const ph = parent.clientHeight
      const nx = Math.min(Math.max(0, startPos.x + (ev.clientX - startX)), Math.max(0, pw - bar.offsetWidth))
      const ny = Math.min(Math.max(0, startPos.y + (ev.clientY - startY)), Math.max(0, ph - bar.offsetHeight))
      setPalette({ pos: { x: nx, y: ny } })
    }
    const onUp = () => {
      setDragging(false)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  // track browser fullscreen so the button can reflect/exit it
  useEffect(() => {
    const h = () => setIsFullscreen(document.fullscreenElement != null)
    document.addEventListener('fullscreenchange', h)
    return () => document.removeEventListener('fullscreenchange', h)
  }, [])

  const toggleFullscreen = () => {
    if (document.fullscreenElement) {
      void document
        .exitFullscreen()
        .catch(() => {})
        .finally(() => setIsFullscreen(document.fullscreenElement != null))
    } else {
      document.documentElement.requestFullscreen().catch(() => setIsFullscreen(false))
    }
  }

  const st = useStore
  const zoomPct = Math.round(viewport.zoom * 100)
  const viewAnimationsOn = useStore((s) => s.viewAnimations)
  const toolbarOpacity = useStore((s) => s.toolbarOpacity)
  const toolbarHoverOpacity = useStore((s) => s.toolbarHoverOpacity)
  const islandFullOpacity = useStore((s) => s.islandFullOpacity)
  const fit = () => {
    const el = document.querySelector('.canvas-wrap')
    if (el) {
      const r = el.getBoundingClientRect()
      st.getState().fitView(r.width, r.height)
    }
  }
  const zoom = (f: number) => st.getState().zoomAt(f, window.innerWidth / 2, window.innerHeight / 2)

  // editable zoom indicator: type a percentage, Enter/blur applies it with a bounce
  const [zoomEdit, setZoomEdit] = useState<string | null>(null)
  const [bounce, setBounce] = useState(false)
  const commitZoom = () => {
    if (zoomEdit == null) return
    const v = parseFloat(zoomEdit.replace('%', '').trim())
    setZoomEdit(null)
    if (Number.isFinite(v)) {
      st.getState().zoomAt(clamp(v / 100, 0.04, 24) / viewport.zoom, window.innerWidth / 2, window.innerHeight / 2)
      if (viewAnimationsOn) {
        setBounce(true)
        window.setTimeout(() => setBounce(false), 400)
      }
    }
  }

  /** Render one customizable button by id. */
  const renderButton = (id: string) => {
    const toolDef = TOOLS.find((t) => t.id === id)
    if (toolDef) {
      return (
        <button
          key={id}
          className={`tool-btn${tool === id ? ' active' : ''}`}
          title={`${toolDef.label} (${toolDef.key})`}
          onClick={() => st.getState().setTool(id as never)}
        >
          <Icon name={toolDef.icon} />
        </button>
      )
    }
    switch (id) {
      case 'undo':
        return (
          <button key={id} className="tool-btn" disabled={!canUndo} title="Undo (Ctrl+Z)" onClick={() => st.getState().undo()}>
            <Icon name="undo" />
          </button>
        )
      case 'redo':
        return (
          <button key={id} className="tool-btn" disabled={!canRedo} title="Redo (Ctrl+Shift+Z)" onClick={() => st.getState().redo()}>
            <Icon name="redo" />
          </button>
        )
      case 'snap':
        return (
          <button
            key={id}
            className={`tool-btn${snapEnabled ? ' active' : ''}`}
            title="Snapping (guide points, anchors, grid)"
            onClick={() => st.getState().setSnap(!snapEnabled)}
          >
            <Icon name="snap" />
          </button>
        )
      case 'grid':
        return (
          <button
            key={id}
            className={`tool-btn${gridVisible ? ' active' : ''}`}
            title="Grid"
            onClick={() => st.getState().setGrid(!gridVisible)}
          >
            <Icon name="grid" />
          </button>
        )
      case 'guides':
        return (
          <button
            key={id}
            className={`tool-btn${guidesVisible ? ' active' : ''}`}
            title="Show guides"
            onClick={() => st.getState().setGuidesVisible(!guidesVisible)}
          >
            <Icon name="guides" />
          </button>
        )
      case 'zoom-out':
        return (
          <button key={id} className="tool-btn" title="Zoom out" onClick={() => zoom(1 / 1.2)}>
            −
          </button>
        )
      case 'zoom':
        return (
          <input
            key={id}
            className={`zoom-label zoom-input${bounce ? ' zoom-bounce' : ''}`}
            value={zoomEdit ?? `${zoomPct}%`}
            onChange={(e) => setZoomEdit(e.target.value)}
            onFocus={() => setZoomEdit(`${zoomPct}%`)}
            onBlur={() => commitZoom()}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                commitZoom()
                ;(e.target as HTMLInputElement).blur()
              }
              if (e.key === 'Escape') {
                setZoomEdit(null)
                ;(e.target as HTMLInputElement).blur()
              }
            }}
            size={5}
            inputMode="decimal"
            spellCheck={false}
            title="Zoom — type a percentage and press Enter"
            data-testid="zoom-input"
          />
        )
      case 'zoom-in':
        return (
          <button key={id} className="tool-btn" title="Zoom in" onClick={() => zoom(1.2)}>
            +
          </button>
        )
      case 'fit':
        return (
          <button key={id} className="tool-btn" title="Fit chart (Ctrl+0)" onClick={fit}>
            <Icon name="fit" />
          </button>
        )
      case 'fullscreen':
        return (
          <button
            key={id}
            className={`tool-btn${isFullscreen ? ' active' : ''}`}
            title={isFullscreen ? 'Exit full screen' : 'Full screen'}
            onClick={toggleFullscreen}
          >
            <Icon name="expand" />
          </button>
        )
      case 'info':
        return (
          <button
            key={id}
            className="tool-btn"
            title="Licenses & attributions"
            onClick={() => st.getState().openDialog('licenses')}
          >
            <Icon name="info" />
          </button>
        )
      case 'options':
        return (
          <button
            key={id}
            className="tool-btn"
            title="Options — animations, left-handed view, sidecar"
            data-testid="open-options"
            onClick={() => st.getState().openDialog('options')}
          >
            <Icon name="gear" />
          </button>
        )
      default:
        return null
    }
  }

  const visible = (order ?? DEFAULT_ORDER).filter((id) => !hidden.includes(id))
  const visibleTools = visible.filter((id) => TOOLS.some((t) => t.id === id))
  const toolsSplit = Math.ceil(visibleTools.length / 2)
  const split = Math.ceil(visible.length / 2)

  return (
    <div
      key={collapsed ? 'min' : 'max'}
      ref={barRef}
      className={`tool-palette bar-pop${collapsed ? ' compact' : ''}${rows === 2 ? ' two-rows' : ''}${
        dragging ? ' dragging' : ''
      }`}
      style={
        {
          left: pos?.x,
          top: pos?.y,
          '--o-rest': toolbarOpacity / 100,
          '--o-hover': Math.max(toolbarOpacity, toolbarHoverOpacity) / 100,
          '--island-rest': islandFullOpacity ? 1 : toolbarOpacity / 100,
          '--island-bg': islandFullOpacity
            ? 'rgb(63, 58, 69)' // solid equivalent of the translucent tile over a solid bar
            : 'rgba(255, 255, 255, 0.08)',
          '--island-hover': islandFullOpacity ? 1 : Math.max(toolbarOpacity, toolbarHoverOpacity) / 100,
        } as React.CSSProperties
      }
      data-testid="tool-palette"
    >
      {/* always-visible left island: drag to move + collapse/expand, same spot in both states */}
      <div className="tp-side" onPointerDown={startDrag} title="Drag to move" data-testid="tool-palette-grip">
        <span className="tp-grip">⠿</span>
        <button
          className="tool-btn"
          title={collapsed ? 'Expand the tool palette' : 'Shrink — stays in this spot'}
          data-testid={collapsed ? 'tool-palette-expand' : 'tool-palette-collapse'}
          onClick={() => setPalette({ collapsed: !collapsed })}
        >
          {collapsed ? '▾' : '▴'}
        </button>
      </div>
      <div className="tp-content">
        {collapsed ? (
          /* collapsed keeps every tool button visible; the edit/view/zoom cluster hides */
          rows === 2 ? (
            <>
              <div className="tp-row">{visibleTools.slice(0, toolsSplit).map((id) => renderButton(id))}</div>
              <div className="tp-row">{visibleTools.slice(toolsSplit).map((id) => renderButton(id))}</div>
            </>
          ) : (
            visibleTools.map((id) => renderButton(id))
          )
        ) : rows === 2 ? (
          <>
            <div className="tp-row">{visible.slice(0, split).map((id) => renderButton(id))}</div>
            <div className="tp-row">{visible.slice(split).map((id) => renderButton(id))}</div>
          </>
        ) : (
          visible.map((id, i) => (
            <Fragment key={id}>
              {SEP_BEFORE.has(id) && i > 0 && <div className="tb-sep" />}
              {renderButton(id)}
            </Fragment>
          ))
        )}
        {!collapsed && (
          <>
            <div className="tb-sep" />
            <button className="tool-btn" title="Reset palette position" data-testid="tool-palette-reset" onClick={resetPos}>
              ⟲
            </button>
          </>
        )}
      </div>
    </div>
  )
}
