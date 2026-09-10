import { describe, expect, it } from 'vitest'
import { registerCraft, type CraftModule } from '../src/craft'
import { defaultPaletteOrder, groupWrapUnits, paletteButtons } from '../src/ui/ToolPalette'

const stub: CraftModule = {
  craft: 'knit',
  baseSymbols: [],
  builtinSets: [],
  defaultSymbolId: 'k',
  applyTerminology: () => {},
  followSteps: () => [],
  paletteTools: [
    { id: 'select', icon: 'select', label: 'Select & move', key: 'V' },
    { id: 'place', icon: 'place', label: 'Place stitch', key: 'P' },
  ],
  terminologyPresets: [],
  symbolPacks: false,
  colourwork: false,
  replaceOnStamp: false,
  rowsAndColumns: false,
}

registerCraft(stub)

describe('paletteButtons', () => {
  it('leads with the craft\'s tools, in craft order', () => {
    const ids = paletteButtons().map((b) => b.id)
    expect(ids.slice(0, 2)).toEqual(['select', 'place'])
    expect(ids).not.toContain('line')
  })

  it('always carries the generic edit/view/zoom cluster', () => {
    const ids = paletteButtons().map((b) => b.id)
    for (const id of ['undo', 'redo', 'snap', 'grid', 'guides', 'zoom-out', 'zoom', 'zoom-in', 'fit', 'fullscreen', 'info', 'options']) {
      expect(ids).toContain(id)
    }
    expect(defaultPaletteOrder()).toEqual(ids)
  })
})

describe('groupWrapUnits', () => {
  it('merges contiguous zoom controls into one unbreakable unit', () => {
    const units = groupWrapUnits(['select', 'place', 'undo', 'zoom-out', 'zoom', 'zoom-in', 'fit'])
    expect(units).toEqual([['select'], ['place'], ['undo'], ['zoom-out', 'zoom', 'zoom-in'], ['fit']])
  })

  it('keeps zoom controls the user dragged apart as separate buttons', () => {
    expect(groupWrapUnits(['zoom-out', 'select', 'zoom-in'])).toEqual([['zoom-out'], ['select'], ['zoom-in']])
  })

  it('still groups a partial cluster when the middle button is hidden', () => {
    expect(groupWrapUnits(['undo', 'zoom-out', 'zoom-in'])).toEqual([['undo'], ['zoom-out', 'zoom-in']])
  })
})
