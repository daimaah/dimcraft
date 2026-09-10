import { useStore } from '../state/store'
import { getDefMap } from '@dimcraft/core/symbols/registry'
import type { ChartDoc } from '@dimcraft/core/model/types'

interface StitchGroup {
  key: string
  kind: 'round' | 'group' | 'loose'
  label: string
  count: number
  visible: boolean
  ids: string[]
}

/** Partition placements into editable groups: even-placement rounds, explicit groups, then loose stitches per symbol. */
export function stitchGroups(doc: ChartDoc): StitchGroup[] {
  const map = new Map<string, StitchGroup>()
  for (const p of doc.placements) {
    let key: string
    let kind: StitchGroup['kind']
    let label: string
    if (p.guideTag) {
      key = `round:${p.guideTag}`
      kind = 'round'
      const guide = doc.guides.find((g) => g.id === p.guideTag)
      label = guide?.name ?? 'Round'
    } else if (p.groupId) {
      key = `group:${p.groupId}`
      kind = 'group'
      label = 'Group'
    } else {
      key = `loose:${p.symbolId}`
      kind = 'loose'
      label = 'Loose'
    }
    let g = map.get(key)
    if (!g) {
      g = { key, kind, label, count: 0, visible: true, ids: [] }
      map.set(key, g)
    }
    g.count++
    if (p.visible === false) g.visible = false
    g.ids.push(p.id)
  }
  for (const g of map.values()) {
    const symbol = doc.placements.find((p) => g.ids.includes(p.id))?.symbolId
    g.label = `${g.label} · ${g.count} × ${getDefMap(doc).get(symbol ?? '')?.label ?? symbol ?? '?'}`
  }
  return [...map.values()]
}

export function LayersPanel() {
  const doc = useStore((s) => s.doc)
  const selGuides = useStore((s) => s.selGuides)
  const groups = stitchGroups(doc)
  const anyHidden = groups.some((g) => !g.visible)

  const toggleGroup = (g: StitchGroup) => useStore.getState().setPlacementsVisible(g.ids, !g.visible)

  return (
    <aside className="panel layers">
      <div className="panel-title">
        Stitch groups <span className="count">{groups.length}</span>
      </div>
      {groups.length === 0 && <p className="hint">No stitches yet.</p>}
      <ul>
        {groups.map((g) => (
          <li key={g.key} className={g.visible ? '' : 'hidden-group'}>
            <button
              className={`icon-btn eye${g.visible ? ' on' : ''}`}
              title={g.visible ? 'Hide group' : 'Show group'}
              onClick={() => toggleGroup(g)}
            >
              {g.visible ? '●' : '○'}
            </button>
            <span className="name">{g.label}</span>
          </li>
        ))}
      </ul>
      {anyHidden && (
        <button
          className="btn wide"
          onClick={() => useStore.getState().setPlacementsVisible(doc.placements.map((p) => p.id), true)}
        >
          Show all
        </button>
      )}

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
