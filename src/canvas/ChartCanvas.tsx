import { useEffect, useMemo, useRef, useState } from 'react'
import type { GuideKind, Vec } from '../model/types'
import { useStore, type Viewport } from '../state/store'
import { getDefMap, symbolInner } from '../symbols/registry'
import { placementTransform, cornersBBox, bboxesIntersect, placementCorners, type BBox } from '../geometry/transform'
import { applySnap, collectSnapTargets, type SnapKind } from '../geometry/snap'
import { guideHandles, applyGuideHandle } from '../geometry/handles'
import { guideSvgPath } from '../geometry/guides'
import { legendSize } from '../geometry/bounds'
import { bracketSvg, legendSvgPlaced, lineSvg, textSvg } from '../render/markup'
import { applyLineHandle } from '../geometry/handles'
import type { DragPositions } from '../state/store'

const GRID = 24

type DragState =
  | { kind: 'pan'; startClient: Vec; vp: Viewport }
  | { kind: 'marquee'; startScreen: Vec }
  | { kind: 'move'; startWorld: Vec; moved: boolean; orig: DragPositions }
  | { kind: 'guide-draw'; tool: string; a: Vec; b: Vec }
  | { kind: 'line-draw'; a: Vec; b: Vec }
  | { kind: 'handle'; guideId: string; handleId: string }
  | { kind: 'legend'; startWorld: Vec; orig: { x: number; y: number } }

interface Rect {
  x: number
  y: number
  w: number
  h: number
}

const normRect = (a: Vec, b: Vec): Rect => ({
  x: Math.min(a.x, b.x),
  y: Math.min(a.y, b.y),
  w: Math.abs(a.x - b.x),
  h: Math.abs(a.y - b.y),
})

function isTypingTarget(t: EventTarget | null): boolean {
  return t instanceof HTMLElement && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)
}

const SEL_KEY = {
  placement: 'selPlacements',
  bracket: 'selBrackets',
  text: 'selTexts',
  guide: 'selGuides',
  line: 'selLines',
} as const

export function ChartCanvas() {
  const svgRef = useRef<SVGSVGElement>(null)
  const spaceRef = useRef(false)
  const dragRef = useRef<DragState | null>(null)

  const doc = useStore((s) => s.doc)
  const vp = useStore((s) => s.viewport)
  const tool = useStore((s) => s.tool)
  const guidesVisible = useStore((s) => s.guidesVisible)
  const gridVisible = useStore((s) => s.gridVisible)
  const selPlacements = useStore((s) => s.selPlacements)
  const selGuides = useStore((s) => s.selGuides)
  const selBrackets = useStore((s) => s.selBrackets)
  const selTexts = useStore((s) => s.selTexts)
  const selLines = useStore((s) => s.selLines)
  const bracketStart = useStore((s) => s.bracketStart)

  const [marquee, setMarquee] = useState<Rect | null>(null)
  const [guidePreview, setGuidePreview] = useState<{ a: Vec; b: Vec } | null>(null)
  const [linePreview, setLinePreview] = useState<{ a: Vec; b: Vec } | null>(null)
  const [snapDot, setSnapDot] = useState<{ pos: Vec; kind: SnapKind } | null>(null)
  const [spaceDown, setSpaceDown] = useState(false)

  const defMap = useMemo(() => getDefMap(doc), [doc])
  const ink = doc.ink

  // ---- coordinate helpers -------------------------------------------------
  const localScreen = (e: { clientX: number; clientY: number }): Vec => {
    const rect = svgRef.current!.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }
  const screenToWorld = (local: Vec): Vec => ({
    x: (local.x - vp.x) / vp.zoom,
    y: (local.y - vp.y) / vp.zoom,
  })

  const snapPoint = (world: Vec, ignore?: Vec): { pos: Vec; kind: SnapKind | null } => {
    const st = useStore.getState()
    if (!st.snapEnabled) return { pos: world, kind: null }
    return applySnap(
      world,
      collectSnapTargets(st.doc),
      10 / st.viewport.zoom,
      st.gridVisible ? GRID : null,
      ignore,
    )
  }

  // ---- selection helpers --------------------------------------------------
  const selectOnDown = (kind: string, id: string, shift: boolean) => {
    const st = useStore.getState()
    const key = SEL_KEY[kind as keyof typeof SEL_KEY] ?? 'selGuides'
    if (shift) {
      const cur = st[key]
      const next = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]
      st.setSelection({ [key]: next })
      return
    }
    if (!st[key].includes(id)) {
      let ids = [id]
      if (kind === 'placement') {
        const p = st.doc.placements.find((q) => q.id === id)
        if (p?.groupId) ids = st.doc.placements.filter((q) => q.groupId === p.groupId).map((q) => q.id)
      }
      st.setSelection({
        selPlacements: [],
        selGuides: [],
        selBrackets: [],
        selTexts: [],
        selLines: [],
        [key]: ids,
      })
    }
  }

  const captureMoveOriginals = (): DragPositions => {
    const st = useStore.getState()
    const sp = new Set(st.selPlacements)
    const stx = new Set(st.selTexts)
    const sb = new Set(st.selBrackets)
    const sl = new Set(st.selLines)
    return {
      placements: st.doc.placements.filter((p) => sp.has(p.id)).map((p) => ({ id: p.id, x: p.x, y: p.y })),
      texts: st.doc.texts.filter((t) => stx.has(t.id)).map((t) => ({ id: t.id, x: t.x, y: t.y })),
      brackets: st.doc.brackets
        .filter((b) => sb.has(b.id))
        .map((b) => ({ id: b.id, x1: b.x1, y1: b.y1, x2: b.x2, y2: b.y2 })),
      lines: st.doc.lines.filter((l) => sl.has(l.id)).map((l) => ({ id: l.id, points: l.points.map((p) => ({ ...p })) })),
    }
  }

  // ---- pointer handlers ---------------------------------------------------
  const onPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    const st = useStore.getState()
    if (e.button === 2) return
    svgRef.current?.setPointerCapture(e.pointerId)
    const local = localScreen(e)
    const world = screenToWorld(local)

    if (e.button === 1 || spaceRef.current) {
      e.preventDefault()
      dragRef.current = { kind: 'pan', startClient: { x: e.clientX, y: e.clientY }, vp: st.viewport }
      return
    }

    if (st.tool === 'place') {
      const s = snapPoint(world)
      st.stampPlacement(s.pos.x, s.pos.y)
      return
    }
    if (st.tool === 'text') {
      const s = snapPoint(world)
      st.addTextAt(s.pos.x, s.pos.y)
      st.setTool('select')
      return
    }
    if (st.tool === 'bracket') {
      const s = snapPoint(world)
      if (!st.bracketStart) st.setBracketStart(s.pos)
      else {
        st.addBracketFromPoints(st.bracketStart, s.pos)
        st.setBracketStart(null)
      }
      return
    }
    if (st.tool === 'line') {
      const a = snapPoint(world).pos
      dragRef.current = { kind: 'line-draw', a, b: a }
      setLinePreview({ a, b: a })
      return
    }
    if (st.tool.startsWith('guide-')) {
      const a = snapPoint(world).pos
      dragRef.current = { kind: 'guide-draw', tool: st.tool, a, b: a }
      setGuidePreview({ a, b: a })
      return
    }

    // ---- select tool ----
    const target = (e.target as Element).closest('[data-kind]')
    if (target) {
      const kind = target.getAttribute('data-kind')!
      if (kind === 'handle') {
        st.beginDrag()
        dragRef.current = {
          kind: 'handle',
          guideId: target.getAttribute('data-guide')!,
          handleId: target.getAttribute('data-handle')!,
        }
        return
      }
      if (kind === 'legend') {
        st.beginDrag()
        const cur = useStore.getState()
        dragRef.current = { kind: 'legend', startWorld: world, orig: { x: cur.doc.legend.x, y: cur.doc.legend.y } }
        return
      }
      const id = target.getAttribute('data-id')!
      selectOnDown(kind, id, e.shiftKey)
      if (kind === 'placement' || kind === 'text' || kind === 'bracket' || kind === 'line') {
        useStore.getState().beginDrag()
        dragRef.current = { kind: 'move', startWorld: world, moved: false, orig: captureMoveOriginals() }
      }
      return
    }

    if (!e.shiftKey) st.clearSelection()
    dragRef.current = { kind: 'marquee', startScreen: local }
    setMarquee({ x: local.x, y: local.y, w: 0, h: 0 })
  }

  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const st = useStore.getState()
    const local = localScreen(e)
    const world = screenToWorld(local)
    st.setCursor(world)
    const d = dragRef.current

    if (!d) {
      if (st.tool === 'place' || st.tool.startsWith('guide-') || st.tool === 'bracket') {
        const s = snapPoint(world)
        setSnapDot(s.kind ? { pos: s.pos, kind: s.kind } : null)
      } else if (snapDot) setSnapDot(null)
      return
    }

    switch (d.kind) {
      case 'pan':
        st.setViewport({
          zoom: d.vp.zoom,
          x: d.vp.x + (e.clientX - d.startClient.x),
          y: d.vp.y + (e.clientY - d.startClient.y),
        })
        break
      case 'marquee':
        setMarquee(normRect(d.startScreen, local))
        break
      case 'move': {
        let dx = world.x - d.startWorld.x
        let dy = world.y - d.startWorld.y
        let base: Vec | null = null
        if (d.orig.placements[0]) base = { x: d.orig.placements[0].x, y: d.orig.placements[0].y }
        else if (d.orig.texts[0]) base = { x: d.orig.texts[0].x, y: d.orig.texts[0].y }
        else if (d.orig.brackets[0]) base = { x: d.orig.brackets[0].x1, y: d.orig.brackets[0].y1 }
        else if (d.orig.lines[0]) base = d.orig.lines[0].points[0] ?? null
        if (st.snapEnabled && base) {
          const s = applySnap(
            { x: base.x + dx, y: base.y + dy },
            collectSnapTargets(st.doc),
            10 / st.viewport.zoom,
            st.gridVisible ? GRID : null,
            base,
          )
          dx = s.pos.x - base.x
          dy = s.pos.y - base.y
          setSnapDot(s.kind ? { pos: s.pos, kind: s.kind } : null)
        }
        if (dx !== 0 || dy !== 0) d.moved = true
        st.applyDragPositions({
          placements: d.orig.placements.map((o) => ({ id: o.id, x: o.x + dx, y: o.y + dy })),
          texts: d.orig.texts.map((o) => ({ id: o.id, x: o.x + dx, y: o.y + dy })),
          brackets: d.orig.brackets.map((o) => ({
            id: o.id,
            x1: o.x1 + dx,
            y1: o.y1 + dy,
            x2: o.x2 + dx,
            y2: o.y2 + dy,
          })),
          lines: d.orig.lines.map((o) => ({
            id: o.id,
            points: o.points.map((p) => ({ x: p.x + dx, y: p.y + dy })),
          })),
        })
        break
      }
      case 'line-draw': {
        const b = snapPoint(world).pos
        d.b = b
        setLinePreview({ a: d.a, b })
        break
      }
      case 'guide-draw': {
        const b = snapPoint(world).pos
        d.b = b
        setGuidePreview({ a: d.a, b })
        break
      }
      case 'handle': {
        const guide = st.doc.guides.find((g) => g.id === d.guideId)
        if (guide) {
          const ng = applyGuideHandle(guide, d.handleId, world, st.snapEnabled)
          st.updateGuideLive(d.guideId, ng)
        } else {
          const line = st.doc.lines.find((l) => l.id === d.guideId)
          if (line && d.handleId.startsWith('pt-')) {
            const idx = parseInt(d.handleId.slice(3), 10)
            if (Number.isFinite(idx)) st.updateLineLive(d.guideId, { points: applyLineHandle(line, idx, world).points })
          }
        }
        break
      }
      case 'legend': {
        st.setLegendLive({ x: d.orig.x + (world.x - d.startWorld.x), y: d.orig.y + (world.y - d.startWorld.y) })
        break
      }
    }
  }

  const onPointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    const st = useStore.getState()
    const d = dragRef.current
    dragRef.current = null
    setSnapDot(null)
    if (!d) return

    switch (d.kind) {
      case 'marquee': {
        const local = localScreen(e)
        const rect = normRect(d.startScreen, local)
        setMarquee(null)
        if (rect.w < 4 && rect.h < 4) break
        const a = screenToWorld({ x: rect.x, y: rect.y })
        const b = screenToWorld({ x: rect.x + rect.w, y: rect.y + rect.h })
        const worldRect: BBox = {
          x: Math.min(a.x, b.x),
          y: Math.min(a.y, b.y),
          w: Math.abs(a.x - b.x),
          h: Math.abs(a.y - b.y),
        }
        const hits = st.doc.placements.filter((p) => {
          const def = defMap.get(p.symbolId)
          if (!def) return false
          return bboxesIntersect(cornersBBox(placementCorners(p, def)), worldRect)
        })
        const prev = e.shiftKey ? st.selPlacements : []
        st.setSelection({
          selPlacements: [...new Set([...prev, ...hits.map((h) => h.id)])],
          selGuides: [],
          selBrackets: [],
          selTexts: [],
          selLines: [],
        })
        break
      }
      case 'move':
        st.endDrag()
        break
      case 'guide-draw': {
        setGuidePreview(null)
        const dist = Math.hypot(d.b.x - d.a.x, d.b.y - d.a.y)
        if (dist > 4 / st.viewport.zoom) {
          st.addGuideDrawn(d.tool.replace('guide-', '') as GuideKind, d.a, d.b, st.snapEnabled)
        }
        break
      }
      case 'line-draw': {
        setLinePreview(null)
        const dist = Math.hypot(d.b.x - d.a.x, d.b.y - d.a.y)
        if (dist > 3 / st.viewport.zoom) {
          st.addLineFromPoints(d.a, d.b)
        }
        break
      }
      case 'handle':
      case 'legend':
        st.endDrag()
        break
      case 'pan':
        break
    }
  }

  // ---- wheel zoom (non-passive) ------------------------------------------
  useEffect(() => {
    const el = svgRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const rect = el.getBoundingClientRect()
      const factor = Math.exp(-e.deltaY * 0.0012)
      useStore.getState().zoomAt(factor, e.clientX - rect.left, e.clientY - rect.top)
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  // ---- space-pan ----------------------------------------------------------
  useEffect(() => {
    const kd = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !isTypingTarget(e.target)) {
        spaceRef.current = true
        setSpaceDown(true)
        e.preventDefault()
      }
    }
    const ku = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        spaceRef.current = false
        setSpaceDown(false)
      }
    }
    window.addEventListener('keydown', kd)
    window.addEventListener('keyup', ku)
    return () => {
      window.removeEventListener('keydown', kd)
      window.removeEventListener('keyup', ku)
    }
  }, [])

  // ---- derived render data ------------------------------------------------
  const selPlacementSet = useMemo(() => new Set(selPlacements), [selPlacements])
  const selGuideSet = useMemo(() => new Set(selGuides), [selGuides])
  const selBracketSet = useMemo(() => new Set(selBrackets), [selBrackets])
  const selTextSet = useMemo(() => new Set(selTexts), [selTexts])
  const selLineSet = useMemo(() => new Set(selLines), [selLines])
  const selectedGuide = selGuides.length === 1 ? doc.guides.find((g) => g.id === selGuides[0]) : undefined
  const handles = selectedGuide ? guideHandles(selectedGuide) : []
  const legendBox = legendSize(doc, defMap)

  const previewDist = guidePreview ? Math.hypot(guidePreview.b.x - guidePreview.a.x, guidePreview.b.y - guidePreview.a.y) : 0
  const radialPreview = guidePreview && tool !== 'guide-line' && tool !== 'guide-spiral'

  return (
    <svg
      ref={svgRef}
      className={`chart-canvas${spaceDown ? ' panning' : ''}`}
      data-tool={tool}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={() => useStore.getState().setCursor(null)}
      onContextMenu={(e) => e.preventDefault()}
    >
      <defs>
        <pattern id="gridpat" patternUnits="userSpaceOnUse" width={GRID} height={GRID}>
          <path d={`M ${GRID} 0 L 0 0 0 ${GRID}`} fill="none" stroke="#ddd3c2" strokeWidth={1} />
        </pattern>
      </defs>

      <g transform={`translate(${vp.x} ${vp.y}) scale(${vp.zoom})`}>
        {gridVisible && <rect x={-100000} y={-100000} width={200000} height={200000} fill="url(#gridpat)" />}

        {/* guides */}
        {guidesVisible && (
          <g className="layer-guides">
            {doc.guides.filter((g) => g.visible).map((g) => {
              const d = guideSvgPath(g)
              const selected = selGuideSet.has(g.id)
              return (
                <g key={g.id} data-kind="guide" data-id={g.id}>
                  <path
                    d={d}
                    fill="none"
                    stroke={selected ? '#d96f4e' : '#a89a85'}
                    strokeWidth={selected ? 2 / vp.zoom : 1.4 / vp.zoom}
                    strokeDasharray="7 5"
                  />
                  <path d={d} fill="none" stroke="transparent" strokeWidth={12 / vp.zoom} />
                </g>
              )
            })}
          </g>
        )}

        {/* repeat brackets */}
        <g className="layer-brackets">
          {doc.brackets.map((b) => (
            <g
              key={b.id}
              data-kind="bracket"
              data-id={b.id}
              dangerouslySetInnerHTML={{
                __html:
                  (selBracketSet.has(b.id)
                    ? `<path d="M ${b.x1} ${b.y1} L ${b.x2} ${b.y2}" stroke="#d96f4e" stroke-width="${5 / vp.zoom}" opacity="0.25" fill="none"/>`
                    : '') + bracketSvg(b, ink, { interactive: true }),
              }}
            />
          ))}
        </g>

        {/* stitches */}
        <g className="layer-stitches">
          {doc.placements.map((p) => {
            const def = defMap.get(p.symbolId)
            if (!def) {
              return (
                <g key={p.id} data-kind="placement" data-id={p.id} transform={`translate(${p.x} ${p.y})`}>
                  <circle r={7 / vp.zoom} fill="none" stroke="#c33" strokeWidth={1.5 / vp.zoom} />
                  <rect x={-10} y={-10} width={20} height={20} fill="transparent" />
                </g>
              )
            }
            const selected = selPlacementSet.has(p.id)
            return (
              <g
                key={p.id}
                data-kind="placement"
                data-id={p.id}
                transform={placementTransform(p)}
                opacity={selected ? 1 : undefined}
              >
                <g dangerouslySetInnerHTML={{ __html: symbolInner(def, ink) }} />
                <rect
                  x={def.bbox.x}
                  y={def.bbox.y}
                  width={def.bbox.w}
                  height={def.bbox.h}
                  fill="transparent"
                  stroke={selected ? '#d96f4e' : 'none'}
                  strokeWidth={selected ? 1.2 / vp.zoom : 0}
                />
              </g>
            )
          })}
        </g>

        {/* chart line-work (backstitch) — drawn over the stitches */}
        <g className="layer-lines">
          {doc.lines.map((l) => {
            const selected = selLineSet.has(l.id)
            return (
              <g
                key={l.id}
                data-kind="line"
                data-id={l.id}
                dangerouslySetInnerHTML={{
                  __html:
                    (selected
                      ? `<path d="${linePathD(l)}" fill="none" stroke="#d96f4e" stroke-width="${l.width + 6 / vp.zoom}" opacity="0.3" stroke-linecap="round" stroke-linejoin="round"/>`
                      : '') + lineSvg(l, ink, { interactive: true }),
                }}
              />
            )
          })}
        </g>

        {/* free text */}
        <g className="layer-texts">
          {doc.texts.map((t) => (
            <g
              key={t.id}
              data-kind="text"
              data-id={t.id}
              dangerouslySetInnerHTML={{ __html: textSvg(t, ink, { interactive: true }) }}
            />
          ))}
        </g>

        {/* legend */}
        {doc.legend.visible && (
          <g
            data-kind="legend"
            dangerouslySetInnerHTML={{
              __html:
                legendSvgPlaced(doc, defMap, ink) +
                `<rect x="${doc.legend.x}" y="${doc.legend.y}" width="${legendBox.w}" height="${legendBox.h}" fill="transparent" />`,
            }}
          />
        )}

        {/* selection outlines */}
        <g className="layer-selection" pointerEvents="none">
          {doc.placements
            .filter((p) => selPlacementSet.has(p.id))
            .map((p) => {
              const def = defMap.get(p.symbolId)
              if (!def) return null
              return <PolygonOutline key={p.id} pts={placementCorners(p, def)} zoom={vp.zoom} />
            })}
          {doc.texts
            .filter((t) => selTextSet.has(t.id))
            .map((t) => (
              <PolygonOutline key={t.id} pts={textOutlineCorners(t)} zoom={vp.zoom} />
            ))}
        </g>

        {/* guide handles */}
        {selectedGuide && (
          <g className="layer-handles">
            {handles.map((h) => (
              <rect
                key={h.id}
                data-kind="handle"
                data-guide={selectedGuide.id}
                data-handle={h.id}
                x={h.pos.x - 5 / vp.zoom}
                y={h.pos.y - 5 / vp.zoom}
                width={10 / vp.zoom}
                height={10 / vp.zoom}
                className="guide-handle"
                style={{ cursor: h.cursor }}
              />
            ))}
          </g>
        )}

        {/* backstitch line point handles */}
        {selLines.length === 1 && (
          <g className="layer-line-handles">
            {(doc.lines.find((l) => l.id === selLines[0])?.points ?? []).map((p, i) => (
              <rect
                key={i}
                data-kind="handle"
                data-guide={selLines[0]}
                data-handle={`pt-${i}`}
                x={p.x - 5 / vp.zoom}
                y={p.y - 5 / vp.zoom}
                width={10 / vp.zoom}
                height={10 / vp.zoom}
                className="guide-handle"
                style={{ cursor: 'move' }}
              />
            ))}
          </g>
        )}

        {/* tool previews */}
        <g className="layer-preview" pointerEvents="none">
          {guidePreview && (
            <>
              {radialPreview && (
                <circle
                  cx={guidePreview.a.x}
                  cy={guidePreview.a.y}
                  r={Math.max(0.01, previewDist)}
                  fill="none"
                  stroke="#d96f4e"
                  strokeWidth={1.4 / vp.zoom}
                  strokeDasharray="6 5"
                />
              )}
              <line
                x1={guidePreview.a.x}
                y1={guidePreview.a.y}
                x2={guidePreview.b.x}
                y2={guidePreview.b.y}
                stroke="#d96f4e"
                strokeWidth={1.2 / vp.zoom}
              />
            </>
          )}
          {bracketStart && (
            <line
              x1={bracketStart.x}
              y1={bracketStart.y}
              x2={snapDot?.pos.x ?? bracketStart.x}
              y2={snapDot?.pos.y ?? bracketStart.y}
              stroke="#3f7d64"
              strokeWidth={1.6 / vp.zoom}
              strokeDasharray="5 4"
            />
          )}
          {linePreview && (
            <line
              x1={linePreview.a.x}
              y1={linePreview.a.y}
              x2={linePreview.b.x}
              y2={linePreview.b.y}
              stroke={ink}
              strokeWidth={2.2}
              strokeLinecap="round"
              opacity={0.75}
            />
          )}
          {snapDot && (
            <circle
              cx={snapDot.pos.x}
              cy={snapDot.pos.y}
              r={5 / vp.zoom}
              fill="none"
              stroke={snapDot.kind === 'grid' ? '#8a8a8a' : '#3f7d64'}
              strokeWidth={1.6 / vp.zoom}
            />
          )}
        </g>
      </g>

      {marquee && <rect className="marquee" x={marquee.x} y={marquee.y} width={marquee.w} height={marquee.h} />}
    </svg>
  )
}

function PolygonOutline({ pts, zoom }: { pts: Vec[]; zoom: number }) {
  return (
    <polygon
      points={pts.map((c) => `${c.x},${c.y}`).join(' ')}
      fill="none"
      stroke="#d96f4e"
      strokeWidth={1.2 / zoom}
      strokeDasharray="4 3"
    />
  )
}

function linePathD(l: { points: Vec[]; closed: boolean }): string {
  if (l.points.length === 0) return ''
  let d = 'M ' + l.points.map((p) => `${p.x} ${p.y}`).join(' L ')
  if (l.closed) d += ' Z'
  return d
}

function textOutlineCorners(t: { x: number; y: number; size: number; content: string; rotation: number }): Vec[] {
  const w = Math.max(20, t.content.length * t.size * 0.58)
  const h = t.size
  return [
    { x: t.x, y: t.y - h * 0.85 },
    { x: t.x + w, y: t.y - h * 0.85 },
    { x: t.x + w, y: t.y + h * 0.3 },
    { x: t.x, y: t.y + h * 0.3 },
  ]
}
