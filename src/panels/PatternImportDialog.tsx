import { useMemo, useState } from 'react'
import { useStore } from '../state/store'
import { parsePattern } from '../geometry/patternParser'
import { patternToChart } from '../geometry/patternToChart'
import { TERMINOLOGY_PRESETS } from '../symbols/terminology'

/** Written pattern → suggested chart (deterministic parser, fully editable result). */
export function PatternImportDialog() {
  const [text, setText] = useState('')
  const [terminology, setTerminology] = useState('us')

  const parsed = useMemo(() => (text.trim() ? parsePattern(text, { terminology }) : null), [text, terminology])
  const chart = useMemo(
    () => (parsed && parsed.rounds.length > 0 ? patternToChart(parsed, { terminology }) : null),
    [parsed, terminology],
  )

  const create = () => {
    if (!chart) return
    const name = parsed?.title ?? 'Imported pattern'
    useStore.getState().newProject(name, chart.doc)
    useStore.getState().closeDialog()
  }

  return (
    <div className="modal-backdrop" onPointerDown={() => useStore.getState().closeDialog()}>
      <div className="modal wide" onPointerDown={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>From written pattern</h2>
          <button className="icon-btn" onClick={() => useStore.getState().closeDialog()}>
            ✕
          </button>
        </div>

        <div className="form">
          <p className="hint">
            Paste round-based instructions (R1: …, Round 2: …). The parser understands stitch
            abbreviations and counts ("3 dc", "ch 2"), bracketed repeats ("[…] × 4", "(…) 6 times"),
            asterisk repeats ("*2 dc, ch 1*; repeat from * 3 more times"), increases ("2 dc in next
            st", "inc", "2 dc in each st") and decreases ("sc2tog", "2 sc together", "dec"), then
            lays the rounds out as a suggested chart you can edit.
          </p>
          <textarea
            className="instructions-text"
            rows={9}
            placeholder={'R1: 6 sc in magic ring\nR2: [2 dc, ch 1] × 6\nR3: …'}
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <label className="form-row">
            <span>Pattern language</span>
            <select value={terminology} onChange={(e) => setTerminology(e.target.value)}>
              {TERMINOLOGY_PRESETS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>

          {parsed && (
            <div className="pattern-preview">
              {parsed.rounds.length === 0 && <p className="hint">No rounds detected yet.</p>}
              {parsed.rounds.map((r) => (
                <div key={r.label} className="pattern-round">
                  <strong>{r.label}</strong> — {r.total} stitches:{' '}
                  {r.runs.map((run) => `${run.count} × ${run.symbolId}`).join(', ')}
                </div>
              ))}
              {parsed.warnings.length > 0 && (
                <p className="hint">Unrecognised words (ignored): {parsed.warnings.join(', ')}</p>
              )}
              {(parsed.notes ?? []).map((n) => (
                <p key={n} className="hint">
                  {n}
                </p>
              ))}
              {chart && (
                <p className="hint">
                  Suggested layout: {parsed.rounds.length} round{parsed.rounds.length === 1 ? '' : 's'},{' '}
                  {chart.doc.placements.length} stitches.
                </p>
              )}
            </div>
          )}

          <div className="modal-actions">
            <button className="btn" onClick={() => useStore.getState().closeDialog()}>
              Cancel
            </button>
            <button className="btn accent" disabled={!chart} onClick={create}>
              Create chart
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
