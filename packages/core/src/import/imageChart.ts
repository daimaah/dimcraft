import { createEmptyDoc, uid } from '../model/doc'
import type { ChartDoc, Placement, Yarn } from '../model/types'

/**
 * Image → colourwork chart: the guided-cleanup pipeline (downsample to the
 * stitch grid, quantize to a small yarn palette, remove isolated pixels,
 * choose the background treatment) — pure pixel math, no DOM, so it is
 * unit-testable and shareable by every craft app. The browser side (file →
 * pixels) lives in the apps.
 *
 * The picture's visual aspect is preserved against the chart's cell aspect:
 * `cellAspect` is a cell's height over width (gridAspect(doc)); without a
 * gauge it is 1 and cells are square.
 */

export interface PixelImage {
  width: number
  height: number
  /** RGBA, row-major, length = width * height * 4 */
  data: Uint8ClampedArray | number[]
}

export interface ImageChartOptions {
  /** stitches across the chart */
  widthStitches: number
  /** yarn palette size (2–8); the most frequent cluster becomes the background */
  colours: number
  /** cell height/width ratio (gridAspect); default square cells */
  cellAspect?: number
  /** replace isolated single cells with their surroundings' majority colour */
  denoise?: boolean
}

export interface QuantizedChart {
  cols: number
  rows: number
  /** colour per cell, row-major bottom-up (row 0 = the chart's bottom row) */
  cells: (string | null)[][]
  /** quantized palette, most frequent first (index 0 = background) */
  palette: string[]
  /** how many dominant colours the source picture itself has (the yarn-count
   *  suggestion for the import dialog) */
  detected: number
}

const hex = (r: number, g: number, b: number): string =>
  '#' + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')

/** k-means quantization over the downsampled pixels: deterministic (no
 *  randomness — initial centres picked evenly across the pixel order), few
 *  iterations, then clusters sorted by frequency. */
export function quantize(image: PixelImage, options: ImageChartOptions): QuantizedChart {
  const cols = Math.max(2, Math.min(200, Math.round(options.widthStitches)))
  const aspect = options.cellAspect && options.cellAspect > 0 ? options.cellAspect : 1
  const rows = Math.max(2, Math.min(240, Math.round((image.height / image.width) * cols / aspect)))
  const colours = Math.max(2, Math.min(8, Math.round(options.colours)))

  // --- downsample: one cell per block, sampling the block's centre pixel.
  // Nearest-neighbour keeps uniform regions exact (averaging would smear the
  // patch edges into intermediate clusters); the denoise pass cleans strays.
  const px: { r: number; g: number; b: number }[] = []
  for (let row = 0; row < rows; row++) {
    const y = Math.min(image.height - 1, Math.floor(((row + 0.5) * image.height) / rows))
    for (let col = 0; col < cols; col++) {
      const x = Math.min(image.width - 1, Math.floor(((col + 0.5) * image.width) / cols))
      const i = (y * image.width + x) * 4
      const a = image.data[i + 3] / 255
      if (a < 0.5) {
        px.push({ r: 255, g: 255, b: 255 })
      } else {
        px.push({ r: image.data[i] * 1, g: image.data[i + 1] * 1, b: image.data[i + 2] * 1 })
      }
    }
  }

  // --- the picture's own palette ------------------------------------------
  // Count exact cell-colour frequencies. SVGs, logos and pixel art have a
  // small true palette — those colours are kept EXACTLY (no invented
  // averages). Anti-alias blends are one-offs and filtered by a 2-cell
  // floor; photos have many mid-size colours and fall through to k-means
  // seeded with their most frequent colours.
  const freq = new Map<string, { n: number; r: number; g: number; b: number }>()
  const exact: string[] = px.map((p) => hex(p.r, p.g, p.b))
  for (let i = 0; i < px.length; i++) {
    const e = freq.get(exact[i])
    if (e) e.n++
    else freq.set(exact[i], { n: 1, ...px[i] })
  }
  const contentFloor = Math.max(2, Math.floor(px.length * 0.004))
  const keepable = [...freq.entries()]
    .map(([hexc, v]) => ({ hex: hexc, n: v.n, r: v.r, g: v.g, b: v.b }))
    .sort((a, b) => b.n - a.n)
    .filter((c) => c.n >= contentFloor)
  let detected = keepable.length

  if (keepable.length <= 64) {
    // --- exact mode: keep the picture's own colours ------------------------
    // the user's yarn count caps the palette; rarer colours snap to the
    // nearest kept one rather than being averaged away
    const palette = keepable.slice(0, colours).map((c) => c.hex)
    const palRgb = keepable.slice(0, colours).map((c) => ({ r: c.r, g: c.g, b: c.b }))
    const nearest = (r: number, g: number, b: number): number => {
      let best = 0
      let bestD = Infinity
      palRgb.forEach((c, i) => {
        const d = (r - c.r) ** 2 + (g - c.g) ** 2 + (b - c.b) ** 2
        if (d < bestD) {
          bestD = d
          best = i
        }
      })
      return best
    }
    const kept = new Set(palette)
    const cells: (string | null)[][] = []
    for (let row = 0; row < rows; row++) {
      const line: (string | null)[] = []
      for (let col = 0; col < cols; col++) {
        const i = row * cols + col
        const idx = kept.has(exact[i]) ? palette.indexOf(exact[i]) : nearest(px[i].r, px[i].g, px[i].b)
        line.push(palette[idx] ?? palette[0])
      }
      cells.push(line)
    }
    cells.reverse()
    return { cols, rows, cells, palette, detected }
  }

  // --- k-means: seeded with the most frequent colours, 8 refinement passes
  const centres: { r: number; g: number; b: number }[] = keepable
    .slice(0, colours)
    .map((d) => ({ r: d.r, g: d.g, b: d.b }))
  const assign = new Array<number>(px.length).fill(0)
  for (let iter = 0; iter < 8; iter++) {
    let moved = false
    for (let i = 0; i < px.length; i++) {
      let best = 0
      let bestD = Infinity
      for (let c = 0; c < centres.length; c++) {
        const dr = px[i].r - centres[c].r
        const dg = px[i].g - centres[c].g
        const db = px[i].b - centres[c].b
        const d = dr * dr + dg * dg + db * db
        if (d < bestD) {
          bestD = d
          best = c
        }
      }
      if (assign[i] !== best) {
        assign[i] = best
        moved = true
      }
    }
    const sums = centres.map(() => ({ r: 0, g: 0, b: 0, n: 0 }))
    for (let i = 0; i < px.length; i++) {
      const s = sums[assign[i]]
      s.r += px[i].r
      s.g += px[i].g
      s.b += px[i].b
      s.n++
    }
    for (let c = 0; c < centres.length; c++) {
      if (sums[c].n > 0) centres[c] = { r: sums[c].r / sums[c].n, g: sums[c].g / sums[c].n, b: sums[c].b / sums[c].n }
    }
    if (!moved && iter > 0) break
  }

  // --- palette by frequency, hex-quantized to avoid float drift ----------
  const counts = new Array<number>(centres.length).fill(0)
  for (const a of assign) counts[a]++
  const order = centres
    .map((c, i) => ({ i, count: counts[i], hex: hex(c.r, c.g, c.b) }))
    .sort((a, b) => b.count - a.count)
  // merge clusters that collapsed onto the same hex
  const palette: string[] = []
  const remap = new Array<number>(centres.length)
  for (const o of order) {
    let at = palette.indexOf(o.hex)
    if (at < 0) {
      at = palette.length
      palette.push(o.hex)
    }
    remap[o.i] = at
  }

  // --- cell grid, row 0 = bottom -----------------------------------------
  const cells: (string | null)[][] = []
  for (let row = 0; row < rows; row++) {
    const line: (string | null)[] = []
    for (let col = 0; col < cols; col++) {
      line.push(palette[remap[assign[row * cols + col]]])
    }
    cells.push(line)
  }
  // image row 0 is the TOP of the picture — flip so the grid reads bottom-up
  cells.reverse()

  return { cols, rows, cells, palette, detected }
}

/** Remove isolated single cells: any cell whose colour differs from all four
 *  (or eight) neighbours takes on the majority colour around it. */
export function denoiseCells(chart: QuantizedChart): QuantizedChart {
  const { cols, rows, cells, palette } = chart
  const out = cells.map((line) => [...line])
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const here = cells[row][col]
      const around: Record<string, number> = {}
      let neighbours = 0
      let same = 0
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (!dx && !dy) continue
          const y = row + dy
          const x = col + dx
          if (y < 0 || y >= rows || x < 0 || x >= cols) continue
          neighbours++
          const c = cells[y][x]
          if (c === null) continue
          if (c === here) same++
          else around[c] = (around[c] ?? 0) + 1
        }
      }
      if (same === 0 && neighbours > 0) {
        const majority = Object.entries(around).sort((a, b) => b[1] - a[1])[0]
        if (majority) out[row][col] = majority[0]
      }
    }
  }
  void palette
  return { ...chart, cells: out }
}

export interface ImageChartResult {
  doc: ChartDoc
  /** the palette entry treated as background (blank cells) */
  backgroundColour: string
}

/** Build a colourwork document from a quantized image: the most frequent
 *  palette entry becomes the background (blank knit cells with no colour),
 *  the rest become the chart's yarns (CC1, CC2, … by frequency). */
export function chartFromQuantized(
  chart: QuantizedChart,
  title: string,
  background: 'blank' | 'no-stitch' | 'yarn' = 'blank',
): ImageChartResult {
  const doc = createEmptyDoc(title)
  const backgroundColour = chart.palette[0]
  const yarns: Yarn[] = []
  const colourYarn = new Map<string, Yarn>()
  for (const hexc of chart.palette.slice(1)) {
    const yarn = { id: uid('y'), colour: hexc }
    colourYarn.set(hexc, yarn)
    yarns.push(yarn)
  }
  if (background === 'yarn') {
    // the background joins the palette as MC: it becomes yarns[0] and the
    // coloured yarns shift to CC1, CC2, … by frequency
    const bg = { id: uid('y'), colour: backgroundColour }
    yarns.unshift(bg)
    colourYarn.set(backgroundColour, bg)
  }

  for (let row = 0; row < chart.rows; row++) {
    for (let col = 0; col < chart.cols; col++) {
      const colour = chart.cells[row][col]
      if (colour == null) continue
      const isBackground = colour === backgroundColour
      let symbolId = 'k'
      let cellColour: string | undefined
      if (isBackground) {
        if (background === 'no-stitch') symbolId = 'ns'
        else if (background === 'yarn') cellColour = backgroundColour
        // 'blank': background cells are plain knit — no colour
      } else {
        cellColour = colour
      }
      const placement: Placement = {
        id: uid('p'),
        symbolId,
        x: col * 24,
        y: -row * 24,
        rotation: 0,
        scale: 1,
        flip: false,
        ...(cellColour ? { colour: cellColour } : {}),
      }
      doc.placements.push(placement)
    }
  }
  if (yarns.length) doc.yarns = yarns
  return { doc, backgroundColour }
}