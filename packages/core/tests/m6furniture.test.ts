import { describe, expect, it } from 'vitest'
import { registerCraft, type CraftModule } from '../src/craft'
import { createEmptyDoc } from '../src/model/doc'
import { gridAspect } from '../src/geometry/bounds'
import { numberingBBox, numberingSvg } from '../src/render/markup'
import { computePdfLayout } from '../src/export/pdfLayout'
import { getDefMap, symbolInner } from '../src/symbols/registry'
import type { SymbolDef } from '../src/model/types'

const k: SymbolDef = {
  id: 'k',
  name: 'Knit',
  label: 'k',
  content: '<rect x="2.5" y="6.5" width="19" height="23" fill="none" stroke="@INK@" stroke-opacity="0.22"/>',
  bbox: { x: 2.5, y: 6.5, w: 19, h: 23 },
}

const stub: CraftModule = {
  craft: 'knit',
  baseSymbols: [k],
  builtinSets: [{ id: 'standard', name: 'Standard', description: 'stub', license: 'MIT', artwork: {} }],
  defaultSymbolId: 'k',
  applyTerminology: () => {},
  followSteps: () => [],
  paletteTools: [{ id: 'select', icon: 'select', label: 'Select & move', key: 'V' }],
  terminologyPresets: [],
  symbolPacks: false,
  colourwork: true,
  replaceOnStamp: false,
  rowsAndColumns: true,
  gridInfo: () => ({
    rows: [
      { index: 1, y: 0, side: 'RS' },
      { index: 2, y: -24, side: 'WS' },
    ],
    colXs: [0, 24, 48],
  }),
  gauge: { label: 'Stitches / 10 cm', label2: 'Rows / 10 cm', hint: () => 'gauge' },
}

registerCraft(stub)

describe('gridAspect', () => {
  it('derives the cell height/width ratio from the two-axis gauge', () => {
    const doc = createEmptyDoc('x')
    expect(gridAspect(doc)).toBe(1)
    // both gauges in chart units per 10 cm: 20 stitches × 24 units and
    // 28 rows × 24 units per 10 cm → cells 5 mm wide, 3.57 mm tall
    doc.unitsPer10cm = 480
    doc.rowGauge = 672
    expect(gridAspect(doc)).toBeCloseTo(20 / 28, 10)
  })
})

describe('numbering', () => {
  const doc = createEmptyDoc('x')
  doc.placements = [
    { id: 'p1', symbolId: 'k', x: 0, y: 0, rotation: 0, scale: 1, flip: false },
    { id: 'p2', symbolId: 'k', x: 48, y: -24, rotation: 0, scale: 1, flip: false },
  ]
  doc.numbering = { rows: true, cols: true }
  const defMap = getDefMap(doc)

  it('renders row numbers at the row bands and column numbers along the bottom', () => {
    const svg = numberingSvg(doc, defMap, '#000', 1)
    expect(svg).toContain('>1</text>')
    expect(svg).toContain('>2</text>')
    expect(svg).toContain('>3</text>')
  })

  it('stays empty without the numbering flag or a grid-aware craft', () => {
    const off = { ...doc, numbering: undefined }
    expect(numberingSvg(off, defMap, '#000')).toBe('')
    const noGrid = { ...stub, gridInfo: undefined }
    registerCraft(noGrid)
    expect(numberingSvg(doc, defMap, '#000')).toBe('')
    registerCraft(stub)
  })

  it('reports extents that cover the side labels', () => {
    const bb = numberingBBox(doc, defMap, 1)
    expect(bb).not.toBeNull()
    expect(bb!.w).toBeGreaterThan(48)
  })
})

describe('pdfLayout with a two-axis gauge', () => {
  it('scales width and height by their own gauges at true scale', () => {
    const layout = computePdfLayout({
      widthUnits: 240,
      heightUnits: 240,
      format: 'a4',
      orientation: 'portrait',
      unitsPer10cm: 240, // 240 chart units span 10 cm of stitches
      unitsPer10cmY: 336, // ...but only 7.14 cm of rows
      trueScale: true,
    })
    expect(layout.trueScaleApplied).toBe(true)
    expect(layout.w).toBeCloseTo(100, 6)
    expect(layout.h).toBeCloseTo(24000 / 336, 6)
    expect(layout.trueSizeCm).toEqual({ w: 10, h: 2400 / 336 })
  })

  it('falls back to one axis when the craft has a single gauge', () => {
    const layout = computePdfLayout({
      widthUnits: 100,
      heightUnits: 100,
      format: 'a4',
      orientation: 'portrait',
      unitsPer10cm: 100, // 1 unit = 1 mm on both axes
      trueScale: true,
    })
    expect(layout.trueScaleApplied).toBe(true)
    expect(layout.w).toBeCloseTo(100, 6)
    expect(layout.h).toBeCloseTo(100, 6)
  })
})

describe('symbol rendering keeps per-stitch colours', () => {
  it('bakes the placement colour over the ink', () => {
    expect(symbolInner(k, '#123456')).toContain('#123456')
  })
})
