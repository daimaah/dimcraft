import { describe, expect, it } from 'vitest'
import { registerCraft, type CraftModule } from '../src/craft'
import { createEmptyDoc, sanitizeDoc } from '../src/model/doc'
import { defaultYarnName, nextYarn, yarnName } from '../src/model/yarns'
import { yarnLegendItems } from '../src/geometry/legend'
import { legendSize } from '../src/geometry/bounds'
import { buildExportSvg } from '../src/export/svg'
import type { Placement, SymbolDef } from '../src/model/types'

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
  rowsAndColumns: false,
}

registerCraft(stub)

function cell(colour?: string): Placement {
  return { id: `p-${Math.random().toString(36).slice(2, 7)}`, symbolId: 'k', x: 0, y: 0, rotation: 0, scale: 1, flip: false, ...(colour ? { colour } : {}) }
}

describe('yarn palette', () => {
  it('names yarns by convention until the user names them', () => {
    expect(defaultYarnName(0)).toBe('MC')
    expect(defaultYarnName(1)).toBe('CC1')
    expect(defaultYarnName(2)).toBe('CC2')
    expect(yarnName({ id: 'y', colour: '#fff', name: ' Rust ' }, 3)).toBe('Rust')
  })

  it('picks a fresh default colour for the next yarn', () => {
    const doc = createEmptyDoc('x')
    expect(nextYarn(doc).colour).toBe('#b8433a')
    doc.yarns = [{ id: 'y1', colour: '#b8433a' }]
    expect(nextYarn(doc).colour).toBe('#2f6f9f')
  })
})

describe('sanitizeDoc with colourwork', () => {
  it('keeps a valid yarn palette and trims names', () => {
    const doc = sanitizeDoc({
      placements: [],
      guides: [],
      yarns: [
        { id: 'y1', colour: '#b8433a', name: ' Main ' },
        { id: 'y2', colour: 'red' },
        { id: 'y3' },
        'junk',
      ],
    })
    expect(doc!.yarns).toEqual([
      { id: 'y1', colour: '#b8433a', name: 'Main' },
      { id: 'y2', colour: 'red' },
    ])
  })

  it('leaves yarns undefined for charts without colourwork', () => {
    const doc = sanitizeDoc({ placements: [], guides: [] })
    expect(doc!.yarns).toBeUndefined()
  })
})

describe('yarnLegendItems', () => {
  it('lists used yarns in palette order with counts, hiding unused ones', () => {
    const doc = createEmptyDoc('x')
    doc.yarns = [
      { id: 'y1', colour: '#aa0000' },
      { id: 'y2', colour: '#00aa00' },
    ]
    doc.placements = [cell('#00aa00'), cell('#00aa00'), cell()]
    expect(yarnLegendItems(doc)).toEqual([{ id: 'y2', colour: '#00aa00', name: 'CC1', count: 2 }])
  })

  it('skips hidden stitches', () => {
    const doc = createEmptyDoc('x')
    doc.yarns = [{ id: 'y1', colour: '#aa0000' }]
    doc.placements = [{ ...cell('#aa0000'), visible: false }]
    expect(yarnLegendItems(doc)).toEqual([])
  })
})

describe('colour in legend size and exports', () => {
  it('grows the legend only when coloured stitches exist', () => {
    const doc = createEmptyDoc('x')
    doc.placements = [cell()]
    const defMap = new Map([[k.id, k]])
    const base = legendSize(doc, defMap)
    doc.yarns = [{ id: 'y1', colour: '#aa0000' }]
    expect(legendSize(doc, defMap)).toEqual(base)
    doc.placements = [cell('#aa0000')]
    expect(legendSize(doc, defMap).h).toBeGreaterThan(base.h)
  })

  it('exports coloured stitches and a yarns legend section', () => {
    const doc = createEmptyDoc('x')
    doc.yarns = [{ id: 'y1', colour: '#aa0000', name: 'MC' }]
    doc.placements = [cell('#aa0000'), cell()]
    const { svg } = buildExportSvg(doc, { includeGuides: false, includeLegend: true })
    expect(svg).toContain('#aa0000')
    expect(svg).toContain('YARNS')
    expect(svg).toContain('MC')
  })
})
