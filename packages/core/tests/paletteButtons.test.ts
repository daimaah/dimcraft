import { describe, expect, it } from 'vitest'
import { registerCraft, type CraftModule } from '../src/craft'
import { defaultPaletteOrder, paletteButtons } from '../src/ui/ToolPalette'

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
