import { describe, expect, it } from 'vitest'
import { buildFabricSvg, fabricGlyph, previewRounds, shade } from '../src/render/fabric'
import { createStarterDoc, } from '../src/model/starter'
import { createEmptyDoc, uid } from '@dimcraft/core/model/doc'
import type { Placement, StitchLine } from '@dimcraft/core/model/types'

const place = (over: Partial<Placement> = {}): Placement => ({
  id: uid('p'),
  symbolId: 'dc',
  x: 0,
  y: 0,
  rotation: 0,
  scale: 1,
  flip: false,
  ...over,
})

describe('fabric glyphs', () => {
  it('draws purpose-made fabric glyphs for standard stitches', () => {
    expect(fabricGlyph('dc', undefined, '#c9553d')).toContain('data-fab="dc"')
    expect(fabricGlyph('ch', undefined, '#c9553d')).toContain('data-fab="ch"')
    expect(fabricGlyph('magicring', undefined, '#c9553d')).toContain('data-fab="magicring"')
  })

  it('falls back to fat yarn re-styling for unknown/custom symbols', () => {
    const custom = {
      id: 'sym-1',
      name: 'custom',
      label: 'custom',
      content: '<path d="M 5 25 L 19 10" fill="none" stroke="@INK@" stroke-width="1.6" stroke-linecap="round"/>',
      bbox: { x: 5, y: 10, w: 14, h: 15 },
      custom: true,
    }
    const g = fabricGlyph('sym-1', custom, '#3f7d64')
    expect(g).toContain('data-fab="schematic"')
    expect(g).toContain('#3f7d64')
    expect(g).toContain('stroke-width="3"')
    expect(g).not.toContain('@INK@')
  })

  it('shade mixes towards white and black', () => {
    expect(shade('#000000', 0.5)).toBe('#808080')
    expect(shade('#ffffff', -0.5)).toBe('#808080')
  })
})

describe('fabric preview document', () => {
  it('renders every placement with fabric glyphs', () => {
    const doc = createEmptyDoc()
    doc.placements = [place(), place({ symbolId: 'ch', id: uid('p') })]
    const { svg } = buildFabricSvg(doc, { yarn: '#c9553d', background: '#ffffff', jitter: false })
    expect(svg).toContain('data-fab="dc"')
    expect(svg).toContain('data-fab="ch"')
    expect(svg).toContain('fill="#ffffff"')
  })

  it('without jitter the transforms match the chart exactly', () => {
    const doc = createEmptyDoc()
    doc.placements = [place({ id: 'p-fixed', x: 40, y: -60, rotation: 35 })]
    const { svg } = buildFabricSvg(doc, { yarn: '#c9553d', background: null, jitter: false })
    expect(svg).toContain('transform="translate(40 -60) rotate(35) scale(1 1) translate(-12 -30)"')
  })

  it('with jitter the same placement lands somewhere slightly else — deterministically', () => {
    const doc = createEmptyDoc()
    doc.placements = [place({ id: 'p-fixed', x: 40, y: -60 })]
    const a = buildFabricSvg(doc, { yarn: '#c9553d', background: null, jitter: true }).svg
    const b = buildFabricSvg(doc, { yarn: '#c9553d', background: null, jitter: true }).svg
    expect(a).toBe(b) // seeded by placement id, so stable
    expect(a).not.toContain('translate(40 -60) rotate(0)') // moved
  })

  it('draws backstitch lines as fat yarn strands', () => {
    const doc = createEmptyDoc()
    const line: StitchLine = {
      id: 'l1',
      points: [{ x: 0, y: 0 }, { x: 80, y: 0 }],
      closed: false,
      width: 2.2,
    }
    doc.lines = [line]
    const { svg } = buildFabricSvg(doc, { yarn: '#c9553d', background: null, jitter: false })
    expect(svg).toContain('stroke-width="3.6"') // width + 1.4
    expect(svg).toContain('L 80 0')
  })

  it('previews the starter granny square with correct yarn colours and bounds', () => {
    const doc = createStarterDoc()
    const { svg, width, height } = buildFabricSvg(doc, { yarn: '#c9553d', background: '#f4ecdd', jitter: true })
    expect(svg).toContain('data-fab="magicring"')
    expect((svg.match(/data-fab="dc"/g) ?? []).length).toBe(12)
    expect((svg.match(/data-fab="ch"/g) ?? []).length).toBe(8)
    expect(width).toBeGreaterThan(200)
    expect(height).toBeGreaterThan(200)
    expect(svg).not.toContain('@YARN@')
    expect(svg).not.toContain('@HI@')
  })
})

describe('per-round colourways', () => {
  /** one round of `count` stitches at radius r (plus the circle guide) */
  const round = (doc: ReturnType<typeof createEmptyDoc>, symbolId: string, count: number, r: number) => {
    doc.guides.push({ id: uid('g'), kind: 'circle', cx: 0, cy: 0, r, visible: true })
    for (let i = 0; i < count; i++) {
      const a = ((-90 + (i * 360) / count) * Math.PI) / 180
      doc.placements.push(place({ symbolId, x: r * Math.cos((a * Math.PI) / 180), y: r * Math.sin((a * Math.PI) / 180) }))
    }
  }

  it('colours each detected round from roundColors, base for the rest', () => {
    const doc = createEmptyDoc()
    doc.placements.push(place({ symbolId: 'magicring' }))
    round(doc, 'sc', 6, 30)
    round(doc, 'dc', 12, 55)
    const { svg } = buildFabricSvg(doc, {
      yarn: '#c9553d',
      background: '#ffffff',
      jitter: false,
      roundColors: ['#111111', '#222222'],
    })
    expect(svg).toContain('#111111')
    expect(svg).toContain('#222222')
    // the magic ring is not part of any round: base yarn colour only
    expect(svg).toContain('data-fab="magicring"')
    expect((svg.match(/#c9553d/g) ?? []).length).toBeGreaterThan(0)
  })

  it('missing entries fall back to the base yarn colour', () => {
    const doc = createEmptyDoc()
    round(doc, 'sc', 6, 30)
    round(doc, 'dc', 12, 55)
    const partial = buildFabricSvg(doc, { yarn: '#c9553d', background: null, jitter: false, roundColors: ['#111111'] }).svg
    expect(partial).toContain('#111111')
    expect(partial).not.toContain('#222222')
    const none = buildFabricSvg(doc, { yarn: '#c9553d', background: null, jitter: false }).svg
    expect(none).not.toContain('#111111')
  })

  it('previewRounds reports one entry per detected round with counts', () => {
    const doc = createEmptyDoc()
    round(doc, 'sc', 6, 30)
    round(doc, 'dc', 12, 55)
    expect(previewRounds(doc)).toEqual([
      { index: 0, count: 6 },
      { index: 1, count: 12 },
    ])
  })
})
