import '../src/craft' // register the knit craft before anything touches the registry
import { beforeEach, describe, expect, it } from 'vitest'
import type { ChartDoc, Placement } from '@dimcraft/core/model/types'
import { createEmptyDoc, uid } from '@dimcraft/core/model/doc'
import { getCraft } from '@dimcraft/core/craft'
import { useStore } from '../src/state/store'
import { groupRows, mirrorSymbol, rowCountIssues, rowInstruction, writtenInstructions } from '../src/geometry/rows'
import { KNIT_SYMBOLS } from '../src/symbols/definitions'

const CELL = 24

function cell(symbolId: string, r: number, c: number): Placement {
  return { id: uid(), symbolId, x: c * CELL, y: (1 - r) * CELL, rotation: 0, scale: 1, flip: false }
}

function gridDoc(rows: string[][]): ChartDoc {
  const doc = createEmptyDoc('stitch test')
  doc.placements = rows.map((row, i) => row.map((sym, c) => cell(sym, i + 1, c))).flat()
  return doc
}

beforeEach(() => {
  useStore.getState().newProject('Stitch test')
})

describe('texture symbols', () => {
  it('draws cables spanning their true stitch count', () => {
    const byId = new Map(KNIT_SYMBOLS.map((d) => [d.id, d]))
    expect(byId.get('c4b')!.bbox.w).toBe(4 * CELL - 5)
    expect(byId.get('c4f')!.bbox.w).toBe(4 * CELL - 5)
    expect(byId.get('rt')!.bbox.w).toBe(2 * CELL - 5)
    expect(byId.get('lt')!.bbox.w).toBe(2 * CELL - 5)
    // 1-cell symbols keep the shared frame size
    expect(byId.get('m1r')!.bbox.w).toBe(9)
  })

  it('accounts cables as four stitches worked and left', () => {
    const doc = gridDoc([
      ['k', 'k', 'k', 'k'],
      ['c4b'],
    ])
    expect(rowCountIssues(doc)).toEqual([])
    const doc2 = gridDoc([
      ['k', 'k', 'k'],
      ['c4f'],
    ])
    expect(rowCountIssues(doc2)).toEqual(['Row 2 works 4 stitches, but row 1 leaves 3.'])
  })

  it('accounts a twist as two stitches and leaned increases as created stitches', () => {
    expect(rowCountIssues(gridDoc([['k', 'k'], ['rt']]))).toEqual([])
    expect(rowCountIssues(gridDoc([['k', 'k'], ['lt']]))).toEqual([])
    // M1 lifts a new stitch between two worked ones — every stitch below is
    // still worked, so an M1 row has one more cell than the row below
    expect(rowCountIssues(gridDoc([['k', 'k', 'k'], ['k', 'm1r', 'k', 'k']]))).toEqual([])
    expect(rowCountIssues(gridDoc([['k', 'k', 'k'], ['k', 'k', 'm1l', 'k']]))).toEqual([])
    // a row that only lifts strands never works the stitches below
    expect(rowCountIssues(gridDoc([['k', 'k'], ['m1r', 'm1l']]))).toEqual([
      'Row 2 works 0 stitches, but row 1 leaves 2.',
    ])
  })

  it('reads cable crossings with their WS mirror word', () => {
    const doc = gridDoc([
      ['c4b'],
      ['k', 'k', 'k', 'k'],
    ])
    expect(writtenInstructions(doc)).toEqual(['Row 1 (RS): C4B', 'Row 2 (WS): p4'])
    // a cable placed on a wrong-side row reads as its mirror crossing
    expect(writtenInstructions(gridDoc([['c4f'], ['k', 'k', 'k', 'k']]))).toEqual([
      'Row 1 (RS): C4F',
      'Row 2 (WS): p4',
    ])
    expect(rowInstruction(groupRows(gridDoc([['rt'], ['k', 'k']]))[0])).toBe('Row 1 (RS): RT')
  })

  it('repeats multi-stitch operations as ×N, never a digit suffix', () => {
    const doc = gridDoc([['c4b', 'c4b']])
    expect(rowInstruction(groupRows(doc)[0])).toBe('Row 1 (RS): C4B ×2')
  })

  it('mirrors crossings and leaned increases to their twins', () => {
    expect(mirrorSymbol('c4b')).toBe('c4f')
    expect(mirrorSymbol('c4f')).toBe('c4b')
    expect(mirrorSymbol('rt')).toBe('lt')
    expect(mirrorSymbol('lt')).toBe('rt')
    expect(mirrorSymbol('m1r')).toBe('m1l')
    expect(mirrorSymbol('m1l')).toBe('m1r')
    expect(getCraft().mirrorSymbol?.('c4b')).toBe('c4f')
  })

  it('mirroring a placed cable swaps it for its twin keeping colour', () => {
    const st = useStore.getState()
    useStore.setState({ armedSymbolId: 'c4b' })
    st.stampPlacement(0, 0)
    useStore.setState({ armedSymbolId: 'c4f' })
    st.stampPlacement(4 * CELL, 0)
    const ids = useStore.getState().doc.placements.map((p) => p.id)
    useStore.setState({ selPlacements: ids })
    st.mirrorSelection('v')
    const after = useStore.getState().doc.placements
    expect(after.map((p) => p.symbolId).sort()).toEqual(['c4b', 'c4f'])
  })
})