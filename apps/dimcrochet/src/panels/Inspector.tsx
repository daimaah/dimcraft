import { useRef } from 'react'
import { useStore } from '../state/store'
import { getDefMap } from '../symbols/registry'
import { BUILTIN_SETS, resolveSet } from '../symbols/sets'
import { TERMINOLOGY_PRESETS } from '../symbols/terminology'
import { legendItems } from '@dimcraft/core/geometry/legend'
import { contentBBox } from '@dimcraft/core/geometry/bounds'
import { downloadBlob, safeFilename } from '@dimcraft/core/export/download'
import type { Guide } from '@dimcraft/core/model/types'

function NumField(props: {
  label: string
  value: number
  onChange: (v: number) => void
  step?: number
  width?: number
}) {
  return (
    <label className="field">
      <span>{props.label}</span>
      <input
        type="number"
        step={props.step ?? 1}
        value={Number.isFinite(props.value) ? Math.round(props.value * 100) / 100 : 0}
        style={props.width ? { width: props.width } : undefined}
        onChange={(e) => {
          const v = parseFloat(e.target.value)
          if (Number.isFinite(v)) props.onChange(v)
        }}
      />
    </label>
  )
}

function Row({ children }: { children: React.ReactNode }) {
  return <div className="insp-row">{children}</div>
}

export function Inspector() {
  const doc = useStore((s) => s.doc)
  const selPlacements = useStore((s) => s.selPlacements)
  const selGuides = useStore((s) => s.selGuides)
  const selBrackets = useStore((s) => s.selBrackets)
  const selTexts = useStore((s) => s.selTexts)
  const selLines = useStore((s) => s.selLines)

  const defMap = getDefMap(doc)
  const st = useStore

  if (selGuides.length === 1) {
    const g = doc.guides.find((x) => x.id === selGuides[0])
    if (g) return <GuideInspector g={g} />
  }

  if (selPlacements.length > 0) {
    const selected = doc.placements.filter((p) => selPlacements.includes(p.id))
    const single = selected.length === 1 ? selected[0] : null
    const usedIds = [...new Set(selected.map((p) => p.symbolId))]
    const allDefs = [...defMap.values()]
    const singleDef = single ? defMap.get(single.symbolId) : null
    const override = single ? doc.labelOverrides[single.symbolId] : undefined

    return (
      <>
        <div className="panel-title">
          {selected.length === 1 ? 'Stitch' : `${selected.length} stitches`}
        </div>

        <Row>
          <label className="field grow">
            <span>Symbol</span>
            <select
              value={usedIds.length === 1 ? usedIds[0] : ''}
              onChange={(e) => st.getState().updatePlacements(selPlacements, { symbolId: e.target.value })}
            >
              {usedIds.length !== 1 && <option value="">(mixed)</option>}
              {allDefs.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </label>
        </Row>

        {single && (
          <Row>
            <NumField label="X" value={single.x} onChange={(v) => st.getState().updatePlacements(selPlacements, { x: v })} />
            <NumField label="Y" value={single.y} onChange={(v) => st.getState().updatePlacements(selPlacements, { y: v })} />
          </Row>
        )}
        <Row>
          <NumField
            label="Rotate°"
            value={single ? single.rotation : 0}
            onChange={(v) => st.getState().updatePlacements(selPlacements, { rotation: v })}
          />
          <NumField
            label="Scale"
            step={0.05}
            value={single ? single.scale : 1}
            onChange={(v) => st.getState().updatePlacements(selPlacements, { scale: v })}
          />
        </Row>
        {single && singleDef && (
          <Row>
            <label className="field grow">
              <span>Legend label</span>
              <input
                type="text"
                value={override ?? singleDef.label}
                placeholder={singleDef.label}
                onChange={(e) => st.getState().setLabelOverride(single.symbolId, e.target.value)}
              />
            </label>
          </Row>
        )}

        <div className="btn-grid">
          <button className="btn" onClick={() => st.getState().mirrorSelection('v')} title="Mirror the selection horizontally">
            Mirror ↔
          </button>
          <button className="btn" onClick={() => st.getState().mirrorSelection('h')} title="Mirror the selection vertically">
            Mirror ↕
          </button>
          <button className="btn" onClick={() => st.getState().distributeSelection('x')}>
            Distribute X
          </button>
          <button className="btn" onClick={() => st.getState().distributeSelection('y')}>
            Distribute Y
          </button>
          <button className="btn" onClick={() => st.getState().rotateSelection(15)}>
            Rotate 15°
          </button>
          <button className="btn" onClick={() => st.getState().rotateSelection(-15)}>
            Rotate −15°
          </button>
          <button className="btn" onClick={() => st.getState().duplicateSelection()}>
            Duplicate
          </button>
          {single?.groupId ? (
            <button className="btn" onClick={() => st.getState().ungroupSelection()}>
              Ungroup
            </button>
          ) : (
            <button className="btn" disabled={selected.length < 2} onClick={() => st.getState().groupSelection()}>
              Group
            </button>
          )}
          <button
            className="btn"
            title="Paint above every other stitch"
            onClick={() => st.getState().reorderPlacements('front')}
          >
            To front
          </button>
          <button
            className="btn"
            title="Raise one level (Ctrl+])"
            onClick={() => st.getState().reorderPlacements('forward')}
          >
            Forward
          </button>
          <button
            className="btn"
            title="Lower one level (Ctrl+[)"
            onClick={() => st.getState().reorderPlacements('backward')}
          >
            Backward
          </button>
          <button
            className="btn"
            title="Paint beneath every other stitch"
            onClick={() => st.getState().reorderPlacements('back')}
          >
            To back
          </button>
        </div>
        {selected.length >= 2 && (
          <>
            <div className="panel-title">Align</div>
            <div className="btn-grid">
              <button className="btn" onClick={() => st.getState().alignSelection('x', 'min')}>
                Left
              </button>
              <button className="btn" onClick={() => st.getState().alignSelection('x', 'center')}>
                Center X
              </button>
              <button className="btn" onClick={() => st.getState().alignSelection('x', 'max')}>
                Right
              </button>
              <button className="btn" onClick={() => st.getState().alignSelection('y', 'min')}>
                Top
              </button>
              <button className="btn" onClick={() => st.getState().alignSelection('y', 'center')}>
                Middle
              </button>
              <button className="btn" onClick={() => st.getState().alignSelection('y', 'max')}>
                Bottom
              </button>
            </div>
          </>
        )}
        <button className="btn danger wide" onClick={() => st.getState().deleteSelection()}>
          Delete
        </button>
      </>
    )
  }

  if (selLines.length === 1) {
    const l = doc.lines.find((x) => x.id === selLines[0])
    if (l)
      return (
        <>
          <div className="panel-title">Backstitch line</div>
          <Row>
            <NumField
              label="Width"
              step={0.2}
              value={l.width}
              onChange={(v) => st.getState().updateLine(l.id, { width: Math.max(0.5, v) })}
            />
            <label className="check">
              <input
                type="checkbox"
                checked={l.closed}
                onChange={(e) => st.getState().updateLine(l.id, { closed: e.target.checked })}
              />
              <span>Closed loop</span>
            </label>
          </Row>
          <div className="btn-grid">
            <button className="btn" onClick={() => st.getState().insertLinePoint(l.id)} title="Insert a point at the middle of the longest segment">
              + Point
            </button>
            <button
              className="btn"
              disabled={l.points.length <= 2}
              onClick={() => st.getState().removeLastLinePoint(l.id)}
            >
              − Point
            </button>
          </div>
          <button className="btn danger wide" onClick={() => st.getState().deleteSelection()}>
            Delete
          </button>
          <p className="hint">Drag the square handles to reshape. Snapping pulls ends onto stitch anchors.</p>
        </>
      )
  }

  if (selBrackets.length === 1) {
    const b = doc.brackets.find((x) => x.id === selBrackets[0])
    if (b)
      return (
        <>
          <div className="panel-title">Repeat bracket</div>
          <Row>
            <NumField label="Count ×" value={b.count} onChange={(v) => st.getState().updateBracket(b.id, { count: Math.max(1, Math.round(v)) })} />
            <button
              className="btn"
              title="Flip which side the arc bows to"
              onClick={() => st.getState().updateBracket(b.id, { side: b.side === 1 ? -1 : 1 })}
            >
              Flip arc
            </button>
          </Row>
          <Row>
            <label className="field grow">
              <span>Label (blank = ×N)</span>
              <input
                type="text"
                value={b.label ?? ''}
                onChange={(e) => st.getState().updateBracket(b.id, { label: e.target.value || undefined })}
              />
            </label>
          </Row>
          <button className="btn danger wide" onClick={() => st.getState().deleteBracket(b.id)}>
            Delete
          </button>
        </>
      )
  }

  if (selTexts.length === 1) {
    const t = doc.texts.find((x) => x.id === selTexts[0])
    if (t)
      return (
        <>
          <div className="panel-title">Text</div>
          <Row>
            <label className="field grow">
              <span>Content</span>
              <input type="text" value={t.content} onChange={(e) => st.getState().updateText(t.id, { content: e.target.value })} />
            </label>
          </Row>
          <Row>
            <NumField label="Size" value={t.size} onChange={(v) => st.getState().updateText(t.id, { size: Math.max(6, v) })} />
            <NumField label="Rotate°" value={t.rotation} onChange={(v) => st.getState().updateText(t.id, { rotation: v })} />
          </Row>
          <button className="btn danger wide" onClick={() => st.getState().deleteText(t.id)}>
            Delete
          </button>
        </>
      )
  }

  // ---- nothing selected: document settings ----
  const items = legendItems(doc, defMap)
  const gauge = doc.unitsPer10cm ?? null
  const sizeHint = gauge
    ? (() => {
        const bbox = contentBBox(doc, defMap, { includeLegend: true })
        return bbox ? `≈ ${((bbox.w / gauge) * 10).toFixed(1)} × ${((bbox.h / gauge) * 10).toFixed(1)} cm` : null
      })()
    : null
  return (
    <>
      <div className="panel-head">
        <div className="panel-title">Chart</div>
        <button
          className="icon-btn collapse-btn"
          title="Hide inspector & layers"
          onClick={() => useStore.getState().setRightCollapsed(true)}
        >
          »
        </button>
      </div>
      <Row>
        <label className="field grow">
          <span>Ink colour</span>
          <input type="color" value={doc.ink} onChange={(e) => st.getState().setInk(e.target.value)} />
        </label>
        <NumField
          label="Units / 10 cm"
          value={doc.unitsPer10cm ?? 0}
          onChange={(v) => st.getState().setGauge(v > 0 ? v : null)}
        />
      </Row>
      <SymbolSetSection />
      <p className="hint">
        {gauge
          ? `Gauge set — chart${sizeHint ? ` ${sizeHint}` : ''}. Enable “True scale” in the PDF export to print at this size.`
          : 'Optional gauge: how many chart units span 10 cm. Enables true-scale PDF printing.'}
      </p>
      <div className="panel-title">Legend</div>
      <Row>
        <label className="check">
          <input type="checkbox" checked={doc.legend.visible} onChange={(e) => st.getState().setLegend({ visible: e.target.checked })} />
          <span>Show legend</span>
        </label>
        <label className="check">
          <input type="checkbox" checked={doc.legend.showCounts} onChange={(e) => st.getState().setLegend({ showCounts: e.target.checked })} />
          <span>Counts</span>
        </label>
      </Row>
      <Row>
        <label className="field grow">
          <span>Title</span>
          <input type="text" value={doc.legend.title} onChange={(e) => st.getState().setLegend({ title: e.target.value })} />
        </label>
      </Row>
      <Row>
        <NumField label="X" value={doc.legend.x} onChange={(v) => st.getState().setLegend({ x: v })} />
        <NumField label="Y" value={doc.legend.y} onChange={(v) => st.getState().setLegend({ y: v })} />
        <NumField label="Scale" step={0.05} value={doc.legend.scale} onChange={(v) => st.getState().setLegend({ scale: Math.max(0.3, v) })} />
      </Row>
      {doc.lines.length > 0 && (
        <Row>
          <label className="field grow">
            <span>Backstitch label</span>
            <input
              type="text"
              value={doc.labelOverrides['__line'] ?? 'backstitch'}
              onChange={(e) => st.getState().setLabelOverride('__line', e.target.value)}
            />
          </label>
        </Row>
      )}
      {doc.legend.visible && items.length > 0 && (
        <ul className="legend-preview">
          {items.map((i) => (
            <li key={i.symbolId}>
              <span>{i.label}</span>
              <em>× {i.count}</em>
            </li>
          ))}
        </ul>
      )}
      <p className="hint">Drag the legend on canvas to reposition it.</p>
    </>
  )
}

/** Symbol set + regional terminology controls (shown when nothing is selected). */
function SymbolSetSection() {
  const doc = useStore((s) => s.doc)
  const st = useStore
  const fileRef = useRef<HTMLInputElement>(null)
  const currentId = doc.symbolSet ?? 'standard'
  const current = resolveSet(doc)

  const importPack = async (file: File) => {
    const { readSymbolPackFile } = await import('@dimcraft/core/export/projectFile')
    const set = await readSymbolPackFile(file)
    if (!set) {
      window.alert('That symbol pack could not be read. Expected a DimCrochet symbol pack with @INK@ artwork.')
      return
    }
    st.getState().addCustomSet(set)
  }

  const exportPack = () => {
    const pack = {
      app: 'dimcrochet-symbol-pack',
      version: 1,
      name: current.name,
      artwork: current.artwork,
      ...(current.license ? { license: current.license } : {}),
      ...(current.authors ? { authors: current.authors } : {}),
      ...(current.sourceUrl ? { sourceUrl: current.sourceUrl } : {}),
      ...(current.notes ? { notes: current.notes } : {}),
    }
    downloadBlob(
      `${safeFilename(current.name)}.pack.json`,
      new Blob([JSON.stringify(pack, null, 2)], { type: 'application/json' }),
    )
  }

  return (
    <>
      <div className="panel-title">Symbols &amp; region</div>
      <Row>
        <label className="field grow">
          <span>Symbol set</span>
          <select value={currentId} onChange={(e) => st.getState().setSymbolSet(e.target.value)}>
            {BUILTIN_SETS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
            {(doc.customSets ?? []).map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} (pack)
              </option>
            ))}
          </select>
        </label>
      </Row>
      <Row>
        <button className="btn" onClick={() => fileRef.current?.click()}>
          Import pack…
        </button>
        <button className="btn" disabled={Object.keys(current.artwork).length === 0} onClick={exportPack}>
          Export pack
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".json,application/json"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) void importPack(f)
            e.target.value = ''
          }}
        />
      </Row>
      <Row>
        <label className="field grow">
          <span>Terminology</span>
          <select defaultValue="" onChange={(e) => e.target.value && st.getState().applyTerminology(e.target.value)}>
            <option value="">Apply a preset…</option>
            {TERMINOLOGY_PRESETS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
      </Row>
      <p className="hint">
        Sets redraw the symbols on every stitch instantly. Terminology presets relabel the basic stitch
        ladder (legend + instructions) — e.g. UK dc = US sc.
      </p>
    </>
  )
}

function GuideInspector({ g }: { g: Guide }) {  const st = useStore
  const up = (patch: Partial<Guide>) => st.getState().updateGuide(g.id, patch)
  return (
    <>
      <div className="panel-title">
        {g.kind.charAt(0).toUpperCase() + g.kind.slice(1)} guide
      </div>
      {(g.kind === 'circle' || g.kind === 'arc' || g.kind === 'spiral' || g.kind === 'polygon') && (
        <>
          <Row>
            <NumField label="Center X" value={g.cx} onChange={(v) => up({ cx: v })} />
            <NumField label="Center Y" value={g.cy} onChange={(v) => up({ cy: v })} />
          </Row>
        </>
      )}
      {(g.kind === 'circle' || g.kind === 'arc' || g.kind === 'polygon') && (
        <Row>
          <NumField label="Radius" value={g.r} onChange={(v) => up({ r: Math.max(2, v) })} />
        </Row>
      )}
      {g.kind === 'arc' && (
        <Row>
          <NumField label="From°" value={g.a0} onChange={(v) => up({ a0: v })} />
          <NumField label="To°" value={g.a1} onChange={(v) => up({ a1: v })} />
        </Row>
      )}
      {g.kind === 'spiral' && (
        <>
          <Row>
            <NumField label="Inner r" value={g.r0} onChange={(v) => up({ r0: Math.max(0, v) })} />
            <NumField label="Outer r" value={g.r1} onChange={(v) => up({ r1: Math.max(4, v) })} />
          </Row>
          <Row>
            <NumField label="Turns" step={0.25} value={g.turns} onChange={(v) => up({ turns: Math.max(0.1, v) })} />
            <NumField label="Start°" value={g.a0} onChange={(v) => up({ a0: v })} />
          </Row>
        </>
      )}
      {g.kind === 'line' && (
        <>
          <Row>
            <NumField label="X1" value={g.x1} onChange={(v) => up({ x1: v })} />
            <NumField label="Y1" value={g.y1} onChange={(v) => up({ y1: v })} />
          </Row>
          <Row>
            <NumField label="X2" value={g.x2} onChange={(v) => up({ x2: v })} />
            <NumField label="Y2" value={g.y2} onChange={(v) => up({ y2: v })} />
          </Row>
        </>
      )}
      {g.kind === 'polygon' && (
        <Row>
          <NumField label="Sides" value={g.n} onChange={(v) => up({ n: Math.min(24, Math.max(3, Math.round(v))) })} />
          <NumField label="Rotate°" value={g.rot} onChange={(v) => up({ rot: v })} />
        </Row>
      )}
      <Row>
        <label className="check">
          <input type="checkbox" checked={g.visible} onChange={() => st.getState().toggleGuideVisible(g.id)} />
          <span>Visible</span>
        </label>
      </Row>
      <button className="btn accent wide" onClick={() => st.getState().openDialog('place-evenly', g.id)}>
        Place stitches evenly…
      </button>
      <div className="btn-grid">
        <button className="btn" onClick={() => st.getState().openDialog('place-evenly', g.id)}>
          Even placement
        </button>
        <button className="btn danger" onClick={() => st.getState().deleteGuide(g.id)}>
          Delete guide
        </button>
      </div>
      <p className="hint">Guides are construction lines — they stay off exports by default.</p>
    </>
  )
}
