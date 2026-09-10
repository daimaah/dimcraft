import { jsPDF } from 'jspdf'
import { svg2pdf } from 'svg2pdf.js'
import type { ChartDoc } from '../model/types'
import { buildExportSvg, type SvgExportOptions } from './svg'
import { downloadBlob, safeFilename } from './download'
import { computePdfLayout, type PaperFormat, type PageOrientation } from './pdfLayout'

export type { PaperFormat, PageOrientation }

export interface PdfExportOptions extends SvgExportOptions {
  format: PaperFormat
  orientation: PageOrientation
  /** print at gauge-derived true size instead of fit-to-page */
  trueScale?: boolean
  /** doc gauge: chart units per 10 cm of finished fabric (width axis) */
  unitsPer10cm?: number | null
  /** height-axis gauge for non-square cells (rows / 10 cm) */
  unitsPer10cmY?: number | null
}

/** Vector PDF via svg2pdf — fit-to-page, gauge-driven true scale, and when
 *  the true size exceeds one sheet, tiled across pages (each page shows the
 *  full chart shifted; viewers clip to the page). */
export async function exportPdf(doc: ChartDoc, name: string, options: PdfExportOptions): Promise<void> {
  const { svg, width, height } = buildExportSvg(doc, options)
  const layout = computePdfLayout({
    widthUnits: width,
    heightUnits: height,
    format: options.format,
    orientation: options.orientation,
    unitsPer10cm: options.unitsPer10cm,
    unitsPer10cmY: options.unitsPer10cmY,
    trueScale: options.trueScale,
  })

  const pdf = new jsPDF({ orientation: options.orientation === 'landscape' ? 'l' : 'p', unit: 'mm', format: options.format })
  const el = new DOMParser().parseFromString(svg, 'image/svg+xml').documentElement as unknown as SVGSVGElement
  // svg2pdf is async — output() before it settles produces blank pages
  if (layout.tiles) {
    const { cols, rows, pageW, pageH } = layout.tiles
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (r + c > 0) pdf.addPage()
        // draw the full chart shifted so the tile's window lands on the page
        await svg2pdf(el, pdf, { x: -c * pageW, y: -r * pageH, width: layout.w, height: layout.h })
      }
    }
  } else {
    await svg2pdf(el, pdf, { x: layout.x, y: layout.y, width: layout.w, height: layout.h })
  }
  downloadBlob(`${safeFilename(name)}.pdf`, pdf.output('blob'))
}
