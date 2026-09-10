import { useMemo, useState } from 'react'
import { getCraft } from '@dimcraft/core/craft'
import { getDefMap } from '@dimcraft/core/symbols/registry'
import { nextYarn, yarnName } from '@dimcraft/core/model/yarns'
import { useStore } from '../state/store'

/** Symbol palette: the craft's base cells with the doc's artwork set applied. */
export function SymbolPalette() {
  const doc = useStore((s) => s.doc)
  const armed = useStore((s) => s.armedSymbolId)
  const armedColour = useStore((s) => s.armedColour)
  const [q, setQ] = useState('')
  const colourwork = getCraft().colourwork

  const defs = useMemo(() => {
    const map = getDefMap(doc)
    return getCraft()
      .baseSymbols.map((d) => map.get(d.id) ?? d)
      .filter((d) => !q || d.name.toLowerCase().includes(q.toLowerCase()) || d.label.includes(q.toLowerCase()))
  }, [doc, q])

  const addYarn = () => {
    const st = useStore.getState()
    const yarn = nextYarn(st.doc)
    st.setYarns([...(st.doc.yarns ?? []), yarn])
    st.armColour(yarn.colour)
  }

  return (
    <section className="panel symbols-panel">
      <div className="panel-head">
        <div className="panel-title">Symbols</div>
        <button
          className="icon-btn collapse-btn"
          title="Hide symbols"
          onClick={() => useStore.getState().setLeftCollapsed(true)}
        >
          «
        </button>
      </div>
      <input
        className="search"
        type="search"
        placeholder="Search stitches…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        aria-label="Search symbols"
      />
      <div className="symbol-grid">
        {defs.map((d) => (
          <button
            key={d.id}
            className={`symbol-btn${armed === d.id ? ' armed' : ''}`}
            title={`${d.name} — click to arm, then click a cell on the chart`}
            onClick={() => {
              useStore.getState().armSymbol(d.id)
              useStore.getState().setTool('place')
            }}
          >
            {/* wide multi-stitch symbols (cables) get their own viewBox so the
                full span is visible; 1-cell symbols keep the shared frame */}
            <svg
              viewBox={
                d.bbox.w > 24
                  ? `${d.bbox.x} ${d.bbox.y} ${d.bbox.w} ${d.bbox.h}`
                  : '0 0 24 32'
              }
              aria-hidden
            >
              <g
                dangerouslySetInnerHTML={{
                  __html: d.content.replaceAll('@INK@', 'currentColor'),
                }}
              />
            </svg>
            <span>{d.label}</span>
          </button>
        ))}
      </div>
      <p className="hint">
        Click a stitch, then click cells on the chart. Empty cell = knit on RS / purl on WS; dot = purl on RS / knit on
        WS.
      </p>
      {colourwork && (
        <>
          <div className="panel-title">Yarns</div>
          <div className="swatch-row" role="group" aria-label="Yarn colours">
            <button
              className={`swatch-btn${armedColour == null ? ' active' : ''}`}
              title="Chart ink — place without colourwork"
              style={{ background: doc.ink }}
              onClick={() => useStore.getState().armColour(null)}
            />
            {(doc.yarns ?? []).map((y, i) => (
              <button
                key={y.id}
                className={`swatch-btn${armedColour === y.colour ? ' active' : ''}`}
                title={`${yarnName(y, i)} — arm it, then click cells to paint them`}
                style={{ background: y.colour }}
                onClick={() => useStore.getState().armColour(y.colour)}
              />
            ))}
            <button className="swatch-btn add" title="Add a yarn" onClick={addYarn}>
              ＋
            </button>
          </div>
          {(doc.yarns ?? []).length === 0 && <p className="hint">＋ adds a yarn; arm it and click cells to paint colourwork.</p>}
        </>
      )}
    </section>
  )
}
