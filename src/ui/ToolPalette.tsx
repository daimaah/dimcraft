import { useEffect, useRef, useState } from 'react'
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

const KEY = 'dimcrochet.toolPalette'

/** tools that stay visible even when the palette is collapsed */
const ESSENTIAL_TOOLS = ['select', 'pan', 'place', 'text']

interface PaletteState {
  x?: number
  y?: number
  collapsed?: boolean
}

function loadState(): PaletteState {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '{}') as PaletteState
  } catch {
    return {}
  }
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

/** Floating, draggable tool palette. Defaults to anchored at the top of the
 *  canvas; can be moved, collapsed to a pill, laid out in one or two rows,
 *  and reset to its default spot. */
export function ToolPalette() {
  const tool = useStore((s) => s.tool)
  const canUndo = useStore((s) => s.past.length > 0)
  const canRedo = useStore((s) => s.future.length > 0)
  const snapEnabled = useStore((s) => s.snapEnabled)
  const gridVisible = useStore((s) => s.gridVisible)
  const guidesVisible = useStore((s) => s.guidesVisible)
  const viewport = useStore((s) => s.viewport)
  const viewAnimations = useStore((s) => s.viewAnimations)
  const paletteRows = useStore((s) => s.paletteRows)
  const [isFullscreen, setIsFullscreen] = useState(false)

  const barRef = useRef<HTMLDivElement>(null)
  const saved = useRef(loadState())
  const [pos, setPos] = useState<{ x: number; y: number } | null>(
    saved.current.x !== undefined && saved.current.y !== undefined
      ? { x: saved.current.x, y: saved.current.y }
      : null,
  )
  const [collapsed, setCollapsed] = useState(saved.current.collapsed === true)
  const [dragging, setDragging] = useState(false)

  const persist = (patch: Partial<PaletteState>) => {
    try {
      localStorage.setItem(KEY, JSON.stringify({ ...loadState(), ...patch }))
    } catch {
      /* storage unavailable */
    }
  }

  // default: centered along the top edge of the canvas
  useEffect(() => {
    if (pos) return
    const bar = barRef.current
    const parent = bar?.parentElement
    if (!bar || !parent) return
    setPos({ x: Math.max(8, (parent.clientWidth - bar.offsetWidth) / 2), y: 8 })
  }, [pos])

  // clamp into the canvas on mount/resize/fullscreen — the saved spot may come
  // from a different window size
  useEffect(() => {
    if (!pos) return
    const clamp = () => {
      const bar = barRef.current
      const parent = bar?.parentElement
      if (!bar || !parent) return
      const nx = Math.min(Math.max(0, pos.x), Math.max(0, parent.clientWidth - bar.offsetWidth))
      const ny = Math.min(Math.max(0, pos.y), Math.max(0, parent.clientHeight - bar.offsetHeight))
      if (nx !== pos.x || ny !== pos.y) {
        setPos({ x: nx, y: ny })
        persist({ x: nx, y: ny })
      }
    }
    clamp()
    const deferred = () => requestAnimationFrame(clamp)
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
    const next = { x: Math.max(8, (parent.clientWidth - bar.offsetWidth) / 2), y: 8 }
    setPos(next)
    persist(next)
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
      const next = { x: nx, y: ny }
      setPos(next)
      persist(next)
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
      if (viewAnimations) {
        setBounce(true)
        window.setTimeout(() => setBounce(false), 400)
      }
    }
  }

  // ---- button groups --------------------------------------------------------
  const toolsGroup = (
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
  )
  const editGroup = (
    <div className="tb-group">
      <button className="tool-btn" disabled={!canUndo} title="Undo (Ctrl+Z)" onClick={() => st.getState().undo()}>
        <Icon name="undo" />
      </button>
      <button className="tool-btn" disabled={!canRedo} title="Redo (Ctrl+Shift+Z)" onClick={() => st.getState().redo()}>
        <Icon name="redo" />
      </button>
    </div>
  )
  const viewGroup = (
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
  )
  const zoomGroup = (
    <div className="tb-group zoom">
      <button className="tool-btn" title="Zoom out" onClick={() => zoom(1 / 1.2)}>
        −
      </button>
      <input
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
      <button className="tool-btn" title="Zoom in" onClick={() => zoom(1.2)}>
        +
      </button>
      <button className="tool-btn" title="Fit chart (Ctrl+0)" onClick={fit}>
        <Icon name="fit" />
      </button>
      <button
        className={`tool-btn${isFullscreen ? ' active' : ''}`}
        title={isFullscreen ? 'Exit full screen' : 'Full screen'}
        onClick={toggleFullscreen}
      >
        <Icon name="expand" />
      </button>
      <button
        className="tool-btn"
        title="Licenses & attributions"
        onClick={() => st.getState().openDialog('licenses')}
      >
        <Icon name="info" />
      </button>
      <button
        className="tool-btn"
        title="Options — animations, left-handed view, sidecar"
        data-testid="open-options"
        onClick={() => st.getState().openDialog('options')}
      >
        <Icon name="gear" />
      </button>
    </div>
  )
  const actionGroup = (
    <>
      <button className="tool-btn" title="Reset palette position" data-testid="tool-palette-reset" onClick={resetPos}>
        ⟲
      </button>
      <button
        className="tool-btn"
        title="Shrink — stays in this spot"
        data-testid="tool-palette-collapse"
        onClick={() => {
          setCollapsed(true)
          persist({ collapsed: true })
        }}
      >
        ▴
      </button>
    </>
  )
  const sep = <div className="tb-sep" />

  return (
    <div
      key={collapsed ? 'min' : 'max'}
      ref={barRef}
      className={`tool-palette bar-pop${collapsed ? ' compact' : ''}${paletteRows === 2 ? ' two-rows' : ''}${
        dragging ? ' dragging' : ''
      }`}
      style={{ left: pos?.x, top: pos?.y }}
      data-testid="tool-palette"
    >
      <div className="follow-grip" title="Drag to move" onPointerDown={startDrag} data-testid="tool-palette-grip">
        ⠿
      </div>
      {collapsed ? (
        <>
          {/* essential tools stay visible even when collapsed */}
          {TOOLS.filter((t) => ESSENTIAL_TOOLS.includes(t.id)).map((t) => (
            <button
              key={t.id}
              className={`tool-btn${tool === t.id ? ' active' : ''}`}
              title={`${t.label} (${t.key})`}
              onClick={() => st.getState().setTool(t.id as never)}
            >
              <Icon name={t.icon} />
            </button>
          ))}
          <div className="tb-sep" />
          <button
            className="btn"
            title="Expand the tool palette"
            data-testid="tool-palette-expand"
            onClick={() => {
              setCollapsed(false)
              persist({ collapsed: false })
            }}
          >
            ▾
          </button>
          <button className="btn" title="Reset palette position" data-testid="tool-palette-reset" onClick={resetPos}>
            ⟲
          </button>
        </>
      ) : paletteRows === 2 ? (
        <>
          <div className="tp-row">{toolsGroup}</div>
          <div className="tp-row">
            {editGroup}
            {sep}
            {viewGroup}
            {sep}
            {zoomGroup}
            {sep}
            {actionGroup}
          </div>
        </>
      ) : (
        <>
          {toolsGroup}
          {sep}
          {editGroup}
          {sep}
          {viewGroup}
          {sep}
          {zoomGroup}
          {sep}
          {actionGroup}
        </>
      )}
    </div>
  )
}
