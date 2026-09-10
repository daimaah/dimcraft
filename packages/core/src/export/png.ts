import type { ChartDoc } from '../model/types'
import { buildExportSvg, type SvgExportOptions } from './svg'
import { downloadBlob, safeFilename } from './download'

export interface PngExportOptions extends SvgExportOptions {
  scale: number
}

/** Rasterise an SVG string to a PNG blob via canvas. */
export async function rasterizeSvgToPngBlob(
  svg: string,
  width: number,
  height: number,
  scale: number,
  background?: string | null,
): Promise<Blob> {
  const svgBlob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' })
  const url = URL.createObjectURL(svgBlob)
  try {
    const img = new Image()
    img.decoding = 'sync'
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve()
      img.onerror = () => reject(new Error('Could not rasterise the SVG'))
      img.src = url
    })
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(width * scale))
    canvas.height = Math.max(1, Math.round(height * scale))
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas is unavailable')
    if (background) {
      ctx.fillStyle = background
      ctx.fillRect(0, 0, canvas.width, canvas.height)
    }
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
    if (!blob) throw new Error('PNG encoding failed')
    return blob
  } finally {
    URL.revokeObjectURL(url)
  }
}

/** Rasterise the chart SVG on a canvas — transparent background supported. */
export async function exportPng(doc: ChartDoc, name: string, options: PngExportOptions): Promise<void> {
  const { svg, width, height } = buildExportSvg(doc, options)
  const blob = await rasterizeSvgToPngBlob(svg, width, height, options.scale, options.background)
  downloadBlob(`${safeFilename(name)}.png`, blob)
}
