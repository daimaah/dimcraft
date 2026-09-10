export type PaperFormat = 'a4' | 'letter'
export type PageOrientation = 'portrait' | 'landscape'

const PAGE_MM: Record<PaperFormat, [number, number]> = {
  a4: [210, 297],
  letter: [215.9, 279.4],
}

const MARGIN_MM = 12

export interface PdfLayout {
  /** mm per chart unit */
  scale: number
  w: number
  h: number
  x: number
  y: number
  trueScaleApplied: boolean
  /** finished-fabric size in cm at true scale (null without a gauge) */
  trueSizeCm: { w: number; h: number } | null
  /** multi-page tiling: when true scale exceeds one page's printable area,
   *  the chart is cut into cols×rows pages (each page shows the full chart
   *  shifted; viewers clip to the page). Present only when tiled. */
  tiles?: { cols: number; rows: number; pageW: number; pageH: number }
}

/** Pure layout math: fit-to-page vs gauge-driven true scale, tiling across
 *  pages when the true size exceeds one sheet. */
export function computePdfLayout(input: {
  widthUnits: number
  heightUnits: number
  format: PaperFormat
  orientation: PageOrientation
  unitsPer10cm?: number | null
  /** second gauge axis for crafts whose cells aren't square (rows / 10 cm) */
  unitsPer10cmY?: number | null
  trueScale?: boolean
}): PdfLayout {
  const [short, long] = PAGE_MM[input.format]
  const pageW = input.orientation === 'landscape' ? long : short
  const pageH = input.orientation === 'landscape' ? short : long
  const availW = pageW - MARGIN_MM * 2
  const availH = pageH - MARGIN_MM * 2

  const fitScale = Math.min(availW / input.widthUnits, availH / input.heightUnits)
  const unitsY = input.unitsPer10cmY ?? input.unitsPer10cm
  const trueSizeCm =
    input.unitsPer10cm && unitsY
      ? { w: (input.widthUnits / input.unitsPer10cm) * 10, h: (input.heightUnits / unitsY) * 10 }
      : null

  if (input.trueScale && input.unitsPer10cm && unitsY) {
    // 1 unit = 10 / N cm = 100 / N mm, per axis
    const mmPerUnitX = 100 / input.unitsPer10cm
    const mmPerUnitY = 100 / unitsY
    const w = input.widthUnits * mmPerUnitX
    const h = input.heightUnits * mmPerUnitY
    if (w <= availW && h <= availH) {
      return {
        scale: mmPerUnitX,
        w,
        h,
        x: (pageW - w) / 2,
        y: (pageH - h) / 2,
        trueScaleApplied: true,
        trueSizeCm,
      }
    }
    // larger than one sheet: tile across pages, each showing the sheet-sized
    // window of the chart at true scale
    const cols = Math.ceil(w / availW)
    const rows = Math.ceil(h / availH)
    return {
      scale: mmPerUnitX,
      w,
      h,
      x: 0,
      y: 0,
      trueScaleApplied: true,
      trueSizeCm,
      tiles: { cols, rows, pageW: availW, pageH: availH },
    }
  }
  const w = input.widthUnits * fitScale
  const h = input.heightUnits * fitScale
  return {
    scale: fitScale,
    w,
    h,
    x: (pageW - w) / 2,
    y: (pageH - h) / 2,
    trueScaleApplied: false,
    trueSizeCm,
  }
}
