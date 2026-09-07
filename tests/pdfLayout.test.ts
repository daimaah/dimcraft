import { describe, expect, it } from 'vitest'
import { computePdfLayout } from '../src/export/pdfLayout'

describe('pdf layout', () => {
  it('fits oversized charts to the page with margins', () => {
    const l = computePdfLayout({ widthUnits: 1000, heightUnits: 1000, format: 'a4', orientation: 'portrait' })
    expect(l.trueScaleApplied).toBe(false)
    expect(l.w).toBeCloseTo(186, 1) // 210 − 2×12
    expect(l.h).toBeCloseTo(186, 1)
    expect(l.x).toBeCloseTo(12, 1)
  })

  it('true scale uses the gauge exactly when the chart fits', () => {
    // 100 units at 100 units / 10 cm → 1 mm per unit → 100 × 100 mm chart
    const l = computePdfLayout({
      widthUnits: 100,
      heightUnits: 100,
      format: 'a4',
      orientation: 'portrait',
      unitsPer10cm: 100,
      trueScale: true,
    })
    expect(l.trueScaleApplied).toBe(true)
    expect(l.scale).toBeCloseTo(1, 6)
    expect(l.w).toBeCloseTo(100, 6)
    expect(l.h).toBeCloseTo(100, 6)
    expect(l.trueSizeCm).toEqual({ w: 10, h: 10 })
  })

  it('falls back to fit when the true-size chart overflows the page', () => {
    const l = computePdfLayout({
      widthUnits: 2000,
      heightUnits: 2000,
      format: 'a4',
      orientation: 'portrait',
      unitsPer10cm: 10, // 1 unit = 1 cm → 20 m wide
      trueScale: true,
    })
    expect(l.trueScaleApplied).toBe(false)
    expect(l.w).toBeCloseTo(186, 1)
  })

  it('landscape uses the long edge', () => {
    const l = computePdfLayout({ widthUnits: 1000, heightUnits: 400, format: 'a4', orientation: 'landscape' })
    expect(l.w).toBeCloseTo(273, 1) // 297 − 24
  })

  it('reports the true size in cm even when falling back to fit', () => {
    const l = computePdfLayout({
      widthUnits: 300,
      heightUnits: 300,
      format: 'letter',
      orientation: 'portrait',
      unitsPer10cm: 30,
      trueScale: false,
    })
    expect(l.trueSizeCm).toEqual({ w: 100, h: 100 })
    expect(l.trueScaleApplied).toBe(false)
  })
})
