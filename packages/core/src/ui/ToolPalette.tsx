import { Fragment, useEffect, useRef, useState } from 'react'
import { activeStore } from '../state/store'
import { getCraft } from '../craft'
import { Icon, type IconName } from './icons'

/** customizable buttons in default display order (tool section from the craft) */
export interface PaletteButtonDef {
  id: string
  label: string
  icon?: IconName
  glyph?: string
}

/** The full button list for the app's action bar: the craft's tools plus the
 *  generic edit/view/zoom cluster. Lazy so it is only asked for once the app
 *  has registered its craft. */
export function paletteButtons(): PaletteButtonDef[] {
  return [
    ...getCraft().paletteTools.map((t) => ({ id: t.id, label: t.label, icon: t.icon })),
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
}

/** Default button order for the app's craft. */
export function defaultPaletteOrder(): string[] {
  return paletteButtons().map((b) => b.id)
}

/** group separators render before these ids in the default layout */
const SEP_BEFORE = new Set(['undo', 'snap', 'zoom-out'])

/** zoom controls travel as one block: either they all fit on the row or they
 *  all wrap to the next one together */
const ZOOM_CLUSTER = new Set(['zoom-out', 'zoom', 'zoom-in'])

/** Group visible button ids into wrap units: contiguous zoom controls merge
 *  into a single unbreakable unit, everything else stands alone. A user who
 *  deliberately drags a zoom button elsewhere gets separate buttons back. */
export function groupWrapUnits(visible: string[]): string[][] {
  const units: string[][] = []
  for (const id of visible) {
    const last = units[units.length - 1]
    if (last && ZOOM_CLUSTER.has(id) && ZOOM_CLUSTER.has(last[last.length - 1])) last.push(id)
    else units.push([id])
  }
  return units
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

/** Floating, draggable action bar. Defaults to anchored at the top of the
 *  canvas; buttons can be hidden/reordered from Options; can be collapsed to
 *  a pill that always keeps the essential tools visible; layout, position,
 *  and customization live in the store and persist with preferences. */
export function ToolPalette() {
  const st = activeStore()
  const tool = st((s) => s.tool)
  const canUndo = st((s) => s.past.length > 0)
  const canRedo = st((s) => s.future.length > 0)
  const snapEnabled = st((s) => s.snapEnabled)
  const gridVisible = st((s) => s.gridVisible)
  const guidesVisible = st((s) => s.guidesVisible)
  const viewport = st((s) => s.viewport)
  const palette = st((s) => s.palette)
  const { rows, pos, collapsed, order, hidden } = palette
  const [isFullscreen, setIsFullscreen] = useState(false)

  const barRef = useRef<HTMLDivElement>(null)
  const [dragging, setDragging] = useState(false)

  const setPalette = (patch: Partial<typeof palette>) => st.getState().setPalette(patch)

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
    return () => window.removeEventListener('fullscreenchange', h)
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

  const zoomPct = Math.round(viewport.zoom * 100)
  const viewAnimationsOn = st((s) => s.viewAnimations)
  const toolbarOpacity = st((s) => s.toolbarOpacity)
  const toolbarHoverOpacity = st((s) => s.toolbarHoverOpacity)
  const islandFullOpacity = st((s) => s.islandFullOpacity)
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

  const tools = getCraft().paletteTools

  /** Render one customizable button by id. */
  const renderButton = (id: string) => {
    const toolDef = tools.find((t) => t.id === id)
    if (toolDef) {
      return (
        <button
          key={id}
          className={`tool-btn${tool === id ? ' active' : ''}`}
          title={`${toolDef.label} (${toolDef.key})`}
          onClick={() => st.getState().setTool(toolDef.id)}
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
            title="Options"
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

  const visible = (order ?? defaultPaletteOrder()).filter((id) => !hidden.includes(id))
  const visibleTools = visible.filter((id) => tools.some((t) => t.id === id))
  const toolsSplit = Math.ceil(visibleTools.length / 2)
  const units = groupWrapUnits(visible)
  const split = Math.ceil(units.length / 2)

  /** one wrap unit: a lone button, or the zoom cluster in an unbreakable span
   *  that carries its leading separator along when it wraps (separators are
   *  otherwise a single-row-mode feature, as before) */
  const renderUnit = (group: string[], unitIndex: number, withSep: boolean) => {
    const sep = withSep && SEP_BEFORE.has(group[0]) && unitIndex > 0 ? <div className="tb-sep" /> : null
    const inner = group.map((id) => renderButton(id))
    if (group.length === 1)
      return (
        <Fragment key={group[0]}>
          {sep}
          {inner}
        </Fragment>
      )
    return (
      <span key={group[0]} className="tp-cluster">
        {sep}
        {inner}
      </span>
    )
  }

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
            ? 'var(--island-bg-solid, rgb(63, 58, 69))' // solid equivalent of the translucent tile over a solid bar
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
            <div className="tp-row">{units.slice(0, split).map((g, i) => renderUnit(g, i, false))}</div>
            <div className="tp-row">{units.slice(split).map((g, i) => renderUnit(g, i, false))}</div>
          </>
        ) : (
          units.map((g, i) => renderUnit(g, i, true))
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
