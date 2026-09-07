import { describe, expect, it } from 'vitest'
import { buildExportSvg } from '../src/export/svg'
import { createEmptyDoc, uid } from '../src/model/doc'
import { createStarterDoc } from '../src/model/starter'
import type { CircleGuide, Placement } from '../src/model/types'

const place = (over: Partial<Placement>): Placement => ({
  id: uid('p'),
  symbolId: 'dc',
  x: 0,
  y: 0,
  rotation: 0,
  scale: 1,
  flip: false,
  ...over,
})

describe('SVG export', () => {
  it('renders a standalone svg with a sensible default viewBox for an empty doc', () => {
    const { svg, width, height } = buildExportSvg(createEmptyDoc())
    expect(svg.startsWith('<svg xmlns=')).toBe(true)
    expect(svg.endsWith('</svg>')).toBe(true)
    expect(width).toBeGreaterThan(0)
    expect(height).toBeGreaterThan(0)
  })

  it('wraps the viewBox tightly around the content', () => {
    const doc = createEmptyDoc()
    doc.legend.visible = false
    doc.placements = [place({ x: 200, y: 300 })]
    const { svg } = buildExportSvg(doc, { padding: 10 })
    const vb = /viewBox="([^"]+)"/.exec(svg)![1].split(' ').map(Number)
    // dc bbox spans anchor-relative x −6…+6, y −18…0
    expect(vb[0]).toBeCloseTo(200 - 6 - 10, 6)
    expect(vb[1]).toBeCloseTo(300 - 18 - 10, 6)
    expect(vb[2]).toBeCloseTo(12 + 20, 6)
    expect(vb[3]).toBeCloseTo(18 + 20, 6)
  })

  it('places each stitch with a transform and keeps the legend out when hidden', () => {
    const doc = createEmptyDoc()
    doc.placements = [place({ x: 5, y: 5 }), place({ x: 50, y: 50 })]
    doc.legend.visible = false
    const { svg } = buildExportSvg(doc)
    expect((svg.match(/<g transform="translate\(/g) ?? []).length).toBeGreaterThanOrEqual(2)
    expect(svg).not.toContain('Legend')
  })

  it('includes repeat brackets with their ×N label', () => {
    const doc = createEmptyDoc()
    doc.legend.visible = false
    doc.brackets.push({ id: 'b1', x1: 0, y1: 0, x2: 100, y2: 0, side: 1, count: 6 })
    const { svg } = buildExportSvg(doc)
    expect(svg).toContain('× 6')
  })

  it('omits guides unless requested', () => {
    const doc = createEmptyDoc()
    doc.legend.visible = false
    doc.guides.push({ id: 'g', kind: 'circle', cx: 0, cy: 0, r: 500, visible: true } as CircleGuide)
    const plain = buildExportSvg(doc).svg
    expect(plain).not.toContain('stroke-dasharray="7 5"')
    const withGuides = buildExportSvg(doc, { includeGuides: true }).svg
    expect(withGuides).toContain('stroke-dasharray="7 5"')
  })

  it('exports the starter granny square with legend, brackets and ink applied', () => {
    const doc = createStarterDoc()
    const { svg } = buildExportSvg(doc)
    expect(svg).toContain('Granny square')
    expect(svg).toContain('× 4')
    expect(svg).toContain('stroke="#26221f"')
    expect(svg).not.toContain('@INK@')
  })

  it('escapes user text content', () => {
    const doc = createEmptyDoc()
    doc.legend.visible = false
    doc.texts.push({ id: 't1', x: 0, y: 0, content: '<script>&"', size: 16, rotation: 0 })
    const { svg } = buildExportSvg(doc)
    expect(svg).not.toContain('<script>')
    expect(svg).toContain('&lt;script&gt;&amp;&quot;')
  })

  it('exports backstitch lines as solid ink strokes and lists them in the legend', () => {
    const doc = createEmptyDoc()
    doc.placements = [place({ x: 0, y: 0 })]
    doc.lines = [
      { id: 'l1', points: [{ x: 0, y: 0 }, { x: 60, y: 0 }], closed: false, width: 2.2 },
    ]
    const { svg } = buildExportSvg(doc)
    // solid (no dash array on the line itself) and ink-coloured
    expect(svg).toContain('stroke="#26221f" stroke-width="2.2"')
    expect(svg).toContain('L 60 0')
    // legend gains a backstitch row
    expect(svg).toContain('backstitch')
    // viewBox expands to include the line work
    const vb = /viewBox="([^"]+)"/.exec(svg)![1].split(' ').map(Number)
    expect(vb[2]).toBeGreaterThan(60 + 12)
  })
})
