import { useMemo, useRef, useState } from 'react'
import { useStore } from '../state/store'
import { builtInDefsFor, normalizeCustomSvg, symbolInner } from '../symbols/registry'
import { uid } from '../model/doc'

export function SymbolPalette() {
  const doc = useStore((s) => s.doc)
  const armed = useStore((s) => s.armedSymbolId)
  const tool = useStore((s) => s.tool)
  const [query, setQuery] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const all = useMemo(() => [...builtInDefsFor(doc), ...doc.customSymbols], [doc])
  const filtered = all.filter((s) =>
    `${s.name} ${s.label}`.toLowerCase().includes(query.trim().toLowerCase()),
  )

  const onImport = async (file: File) => {
    const text = await file.text()
    const def = normalizeCustomSvg(text, uid('sym'), file.name.replace(/\.svg$/i, '') || 'Custom symbol')
    if (def) useStore.getState().addCustomSymbol(def)
    else window.alert('That SVG could not be read. Try exporting a plain (non-CSS) SVG.')
  }

  return (
    <aside className="panel palette">
      <button
        className="icon-btn collapse-btn"
        title="Hide symbols"
        onClick={() => useStore.getState().setLeftCollapsed(true)}
      >
        «
      </button>
      <div className="panel-title">Symbols</div>
      <input
        className="search"
        type="search"
        placeholder="Search symbols…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <div className="symbol-grid">
        {filtered.map((s) => (
          <button
            key={s.id}
            className={`symbol-cell${armed === s.id && tool === 'place' ? ' armed' : ''}`}
            title={s.name}
            onClick={() => useStore.getState().armSymbol(s.id)}
          >
            <svg viewBox="0 0 24 32" aria-hidden>
              <g dangerouslySetInnerHTML={{ __html: symbolInner(s, '#2b2723') }} />
            </svg>
            <span>{s.label}</span>
          </button>
        ))}
      </div>

      <div className="panel-title">Custom symbol</div>
      <button className="btn wide" onClick={() => fileRef.current?.click()}>
        + Import SVG…
      </button>
      <input
        ref={fileRef}
        type="file"
        accept=".svg,image/svg+xml"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) void onImport(f)
          e.target.value = ''
        }}
      />
      {doc.customSymbols.length > 0 && (
        <ul className="custom-list">
          {doc.customSymbols.map((s) => (
            <li key={s.id}>
              <button
                className={`symbol-cell small${armed === s.id && tool === 'place' ? ' armed' : ''}`}
                title={s.name}
                onClick={() => useStore.getState().armSymbol(s.id)}
              >
                <svg viewBox="0 0 24 32" aria-hidden>
                  <g dangerouslySetInnerHTML={{ __html: symbolInner(s, '#2b2723') }} />
                </svg>
                <span>{s.label}</span>
              </button>
              <button
                className="icon-btn danger"
                title="Remove custom symbol"
                onClick={() => useStore.getState().removeCustomSymbol(s.id)}
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}

      <p className="hint">
        Pick a symbol, then click the canvas to stamp it. R rotates, [ and ] scale while placing.
      </p>
    </aside>
  )
}
