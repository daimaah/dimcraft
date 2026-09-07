import type { ChartDoc } from '../model/types'
import { buildExportSvg, type SvgExportOptions } from './svg'
import { downloadBlob, safeFilename } from './download'

export interface PngExportOptions extends SvgExportOptions {
  scale: number
}

/** Rasterise the export SVG on a canvas — transparent background supported. */
export async function exportPng(doc: ChartDoc, name: string, options: PngExportOptions): Promise<void> {
  const { svg, width, height } = buildExportSvg(doc, options)
  const svgBlob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' })
  const url = URL.createObjectURL(svgBlob)
  try {
    const img = new Image()
    img.decoding = 'sync'
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve()
      img.onerror = () => reject(new Error('Could not rasterise the chart SVG'))
      img.src = url
    })
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(width * options.scale))
    canvas.height = Math.max(1, Math.round(height * options.scale))
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas is unavailable')
    if (options.background) {
      ctx.fillStyle = options.background
      ctx.fillRect(0, 0, canvas.width, canvas.height)
    }
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
    if (!blob) throw new Error('PNG encoding failed')
    downloadBlob(`${safeFilename(name)}.png`, blob)
  } finally {
    URL.revokeObjectURL(url)
  }
}
