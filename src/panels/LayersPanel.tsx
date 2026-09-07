import { useStore } from '../state/store'

export function LayersPanel() {
  const doc = useStore((s) => s.doc)
  const selGuides = useStore((s) => s.selGuides)

  return (
    <aside className="panel layers">
      <div className="panel-title">
        Guides <span className="count">{doc.guides.length}</span>
      </div>
      {doc.guides.length === 0 && <p className="hint">None yet — press 1–5 and drag on canvas.</p>}
      <ul>
        {doc.guides.map((g) => (
          <li
            key={g.id}
            className={selGuides.includes(g.id) ? 'selected' : ''}
            onClick={() =>
              useStore.getState().setSelection({ selPlacements: [], selBrackets: [], selTexts: [], selGuides: [g.id] })
            }
          >
            <button
              className={`icon-btn eye${g.visible ? ' on' : ''}`}
              title={g.visible ? 'Hide' : 'Show'}
              onClick={(e) => {
                e.stopPropagation()
                useStore.getState().toggleGuideVisible(g.id)
              }}
            >
              {g.visible ? '●' : '○'}
            </button>
            <span className="name">
              {g.name ?? g.kind}
              <em>
                {g.kind === 'line'
                  ? ''
                  : g.kind === 'spiral'
                    ? ` · ${g.turns} turns`
                    : g.kind === 'polygon'
                      ? ` · ${g.n}-gon`
                      : g.kind === 'arc'
                        ? ` · ${Math.round(Math.abs(g.a1 - g.a0))}°`
                        : ''}
              </em>
            </span>
            <button
              className="icon-btn danger"
              title="Delete guide"
              onClick={(e) => {
                e.stopPropagation()
                useStore.getState().deleteGuide(g.id)
              }}
            >
              ✕
            </button>
          </li>
        ))}
      </ul>
      <div className="layers-summary">
        <span>{doc.placements.length} stitches</span>
        <span>{doc.lines.length} lines</span>
        <span>{doc.brackets.length} brackets</span>
        <span>{doc.texts.length} texts</span>
      </div>
    </aside>
  )
}
