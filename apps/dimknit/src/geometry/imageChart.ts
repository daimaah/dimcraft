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
  const bitmap = await createImageBitmap(file)
  const canvas = document.createElement('canvas')
  canvas.width = bitmap.width
  canvas.height = bitmap.height
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!
  ctx.drawImage(bitmap, 0, 0)
  const data = ctx.getImageData(0, 0, bitmap.width, bitmap.height)
  bitmap.close()
  return { width: data.width, height: data.height, data: data.data }
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