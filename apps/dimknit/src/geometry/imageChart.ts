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
    ctx.drawImage(img, 0, 0, width, height)
    const data = ctx.getImageData(0, 0, width, height)
    return { width, height, data: data.data }
  } finally {
    URL.revokeObjectURL(url)
  }
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