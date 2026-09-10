import { useMemo, useState } from 'react'
import { getCraft } from '@dimcraft/core/craft'
import { getDefMap } from '@dimcraft/core/symbols/registry'
import { useStore } from '../state/store'

/** Symbol palette: the craft's base cells with the doc's artwork set applied. */
export function SymbolPalette() {
  const doc = useStore((s) => s.doc)
  const armed = useStore((s) => s.armedSymbolId)
  const [q, setQ] = useState('')

  const defs = useMemo(() => {
    const map = getDefMap(doc)
    return getCraft()
      .baseSymbols.map((d) => map.get(d.id) ?? d)
      .filter((d) => !q || d.name.toLowerCase().includes(q.toLowerCase()) || d.label.includes(q.toLowerCase()))
  }, [doc, q])

  return (
    <section className="panel symbols-panel">
      <h2>Symbols</h2>
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
            <svg viewBox="0 0 24 32" aria-hidden>
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
    </section>
  )
}
