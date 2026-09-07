import { jsPDF } from 'jspdf'
import { svg2pdf } from 'svg2pdf.js'
import type { ChartDoc } from '../model/types'
import { buildExportSvg, type SvgExportOptions } from './svg'
import { downloadBlob, safeFilename } from './download'

export type PaperFormat = 'a4' | 'letter'
export type PageOrientation = 'portrait' | 'landscape'

export interface PdfExportOptions extends SvgExportOptions {
  format: PaperFormat
  orientation: PageOrientation
}

const PAGE_MM: Record<PaperFormat, [number, number]> = {
  a4: [210, 297],
  letter: [215.9, 279.4],
}

const MARGIN_MM = 12

/** Vector PDF via svg2pdf, centred and scaled to fit the page. */
export async function exportPdf(doc: ChartDoc, name: string, options: PdfExportOptions): Promise<void> {
  const { svg, width, height } = buildExportSvg(doc, options)
  const [short, long] = PAGE_MM[options.format]
  const landscape = options.orientation === 'landscape'
  const pageW = landscape ? long : short
  const pageH = landscape ? short : long

  const scale = Math.min((pageW - MARGIN_MM * 2) / width, (pageH - MARGIN_MM * 2) / height)
  const w = width * scale
  const h = height * scale
  const x = (pageW - w) / 2
  const y = (pageH - h) / 2

  const pdf = new jsPDF({ orientation: landscape ? 'l' : 'p', unit: 'mm', format: options.format })
  const el = new DOMParser().parseFromString(svg, 'image/svg+xml').documentElement as unknown as SVGSVGElement
  svg2pdf(el, pdf, { x, y, width: w, height: h })
  downloadBlob(`${safeFilename(name)}.pdf`, pdf.output('blob'))
}
