import { chartFromQuantized, denoiseCells, quantize, type PixelImage } from '@dimcraft/core/import/imageChart'
import { gridAspect } from '@dimcraft/core/geometry/bounds'
import type { ChartDoc } from '@dimcraft/core/model/types'

/**
 * Browser side of the image → chart pipeline: file → decoded pixels → the
 * core's quantize/cleanup/document builder. Lives app-side because it needs
 * the DOM (createImageBitmap); the math it calls is pure and unit-tested.
 */

export interface ImageChartRequest {
  widthStitches: number
  colours: number
  denoise: boolean
  background: 'blank' | 'no-stitch' | 'yarn'
  /** honour the doc's stitch/row gauge for the cell aspect (default: yes) */
  useGauge?: boolean
}

export async function imageFileToPixels(file: File): Promise<PixelImage> {
  // decode through an <img> element: handles PNG/JPEG/WebP and — unlike
  // createImageBitmap in Chromium — SVG files with intrinsic dimensions
  const url = URL.createObjectURL(file)
  try {
    const img = new Image()
    img.src = url
    await img.decode()
    const width = img.naturalWidth || 400
    const height = img.naturalHeight || 300
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!

    // Chromium quirk: drawing an SVG <img> can race its internal layout and
    // produce a blank raster even after decode() — verify the draw actually
    // painted something and retry with settle delays until it did
    let data: ImageData | null = null
    for (let attempt = 0; attempt < 6; attempt++) {
      if (attempt > 0) await new Promise((resolve) => setTimeout(resolve, 60 * attempt))
      ctx.clearRect(0, 0, width, height)
      ctx.drawImage(img, 0, 0, width, height)
      data = ctx.getImageData(0, 0, width, height)
      if (painted(data)) break
    }
    if (!data) data = ctx.getImageData(0, 0, width, height)
    return { width, height, data: data.data }
  } finally {
    URL.revokeObjectURL(url)
  }
}

/** does the raster contain at least one opaque, non-uniform pixel block?
 *  A raced SVG draw leaves either all-transparent or a single flat colour. */
function painted(data: ImageData): boolean {
  const { data: d, width, height } = data
  const step = Math.max(1, Math.floor(Math.sqrt((width * height) / 64)))
  let opaque = 0
  let first: [number, number, number] | null = null
  let varied = false
  for (let y = 0; y < height && !varied; y += step) {
    for (let x = 0; x < width; x += step) {
      const i = (y * width + x) * 4
      if (d[i + 3] < 10) continue
      opaque++
      const rgb: [number, number, number] = [d[i], d[i + 1], d[i + 2]]
      if (!first) first = rgb
      else if (rgb[0] !== first[0] || rgb[1] !== first[1] || rgb[2] !== first[2]) {
        varied = true
        break
      }
    }
  }
  return opaque > 0 && varied
}

export async function imageFileToChart(
  file: File,
  title: string,
  request: ImageChartRequest,
  existing?: ChartDoc,
): Promise<ChartDoc> {
  const pixels = await imageFileToPixels(file)
  const cellAspect = request.useGauge === false ? 1 : existing ? gridAspect(existing) : 1
  let chart = quantize(pixels, {
    widthStitches: request.widthStitches,
    colours: request.colours,
    cellAspect,
  })
  if (request.denoise) chart = denoiseCells(chart)
  const { doc } = chartFromQuantized(chart, title, request.background)
  return doc
}