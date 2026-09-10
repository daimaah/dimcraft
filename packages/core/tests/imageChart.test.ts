import { describe, expect, it } from 'vitest'
import { chartFromQuantized, denoiseCells, quantize, type PixelImage } from '../src/import/imageChart'

/** solid-colour image with one rectangular patch of another colour */
function image(width: number, height: number, bg: [number, number, number], patch: { x: number; y: number; w: number; h: number; rgb: [number, number, number] }): PixelImage {
  const data = new Uint8ClampedArray(width * height * 4)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const inPatch = x >= patch.x && x < patch.x + patch.w && y >= patch.y && y < patch.y + patch.h
      const rgb = inPatch ? patch.rgb : bg
      const i = (y * width + x) * 4
      data[i] = rgb[0]
      data[i + 1] = rgb[1]
      data[i + 2] = rgb[2]
      data[i + 3] = 255
    }
  }
  return { width, height, data }
}

describe('quantize', () => {
  it('finds the two colours of a two-tone image, most frequent first', () => {
    const img = image(40, 30, [240, 240, 240], { x: 10, y: 5, w: 12, h: 8, rgb: [180, 40, 40] })
    const chart = quantize(img, { widthStitches: 20, colours: 4 })
    expect(chart.palette).toHaveLength(2)
    expect(chart.palette[0]).toBe('#f0f0f0')
    expect(chart.palette[1]).toBe('#b42828')
    expect(chart.cols).toBe(20)
    // 12/40 of the width and 8/30 of the height carry the patch colour
    const patchCells = chart.cells.flat().filter((c) => c === '#b42828').length
    expect(patchCells).toBeGreaterThan(0)
  })

  it('preserves the picture aspect against the cell aspect', () => {
    const img = image(60, 40, [255, 255, 255], { x: 0, y: 0, w: 1, h: 1, rgb: [0, 0, 0] })
    const square = quantize(img, { widthStitches: 30, colours: 2 })
    expect(square.rows).toBe(Math.round((40 / 60) * 30))
    // knitting cells are wider than tall (aspect 20/28): fewer rows... no —
    // wider cells mean the same picture needs MORE rows
    const knit = quantize(img, { widthStitches: 30, colours: 2, cellAspect: 20 / 28 })
    expect(knit.rows).toBe(Math.round((40 / 60) * 30 / (20 / 28)))
    expect(knit.rows).toBeGreaterThan(square.rows)
  })

  it('bottom-up rows: the top of the picture is the last grid row', () => {
    // dark band across the TOP of the image
    const img = image(20, 20, [250, 250, 250], { x: 0, y: 0, w: 20, h: 6, rgb: [30, 30, 30] })
    const chart = quantize(img, { widthStitches: 10, colours: 2 })
    const topGridRow = chart.cells[chart.cells.length - 1]
    expect(topGridRow.every((c) => c === '#1e1e1e')).toBe(true)
    const bottomGridRow = chart.cells[0]
    expect(bottomGridRow.every((c) => c === '#fafafa')).toBe(true)
  })
})

describe('denoiseCells', () => {
  it('absorbs isolated single cells into their surroundings', () => {
    const img = image(30, 30, [240, 240, 240], { x: 0, y: 0, w: 30, h: 30, rgb: [240, 240, 240] })
    // sprinkle a single red cell in the middle: build it directly on the grid
    const chart = quantize(img, { widthStitches: 15, colours: 3 })
    const mid = { row: 7, col: 7 }
    chart.cells[mid.row][mid.col] = '#b42828'
    const cleaned = denoiseCells(chart)
    expect(cleaned.cells[mid.row][mid.col]).not.toBe('#b42828')
    // real content survives: a 3×3 block stays
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) chart.cells[8 + dy][8 + dx] = '#b42828'
    const kept = denoiseCells(chart)
    expect(kept.cells[8][8]).toBe('#b42828')
  })
})

describe('chartFromQuantized', () => {
  const img = image(40, 30, [240, 240, 240], { x: 10, y: 5, w: 12, h: 8, rgb: [180, 40, 40] })
  const chart = quantize(img, { widthStitches: 20, colours: 4 })

  it('blank background: background cells are plain knits, the patch becomes CC1', () => {
    const { doc, backgroundColour } = chartFromQuantized(chart, 'two-tone')
    expect(backgroundColour).toBe('#f0f0f0')
    expect(doc.yarns).toHaveLength(1)
    expect(doc.yarns![0].colour).toBe('#b42828')
    const coloured = doc.placements.filter((p) => p.colour)
    expect(coloured.every((p) => p.symbolId === 'k')).toBe(true)
    expect(coloured.every((p) => p.colour === '#b42828')).toBe(true)
    // background cells carry no colour
    const plain = doc.placements.filter((p) => !p.colour)
    expect(plain.length).toBeGreaterThan(0)
  })

  it('no-stitch background: background cells become ns placeholders', () => {
    const { doc } = chartFromQuantized(chart, 'two-tone', 'no-stitch')
    expect(doc.placements.some((p) => p.symbolId === 'ns')).toBe(true)
    expect(doc.placements.filter((p) => p.symbolId === 'ns').every((p) => !p.colour)).toBe(true)
  })

  it('yarn background: the background becomes MC and shifts the others to CC1…', () => {
    const { doc } = chartFromQuantized(chart, 'two-tone', 'yarn')
    expect(doc.yarns).toHaveLength(2)
    expect(doc.yarns![0].colour).toBe('#f0f0f0')
    expect(doc.yarns![1].colour).toBe('#b42828')
    // background cells now carry the MC colour
    expect(doc.placements.some((p) => p.colour === '#f0f0f0')).toBe(true)
  })
})