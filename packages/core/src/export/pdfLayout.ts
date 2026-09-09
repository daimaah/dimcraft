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
}

/** Pure layout math: fit-to-page vs gauge-driven true scale. */
export function computePdfLayout(input: {
  widthUnits: number
  heightUnits: number
  format: PaperFormat
  orientation: PageOrientation
  unitsPer10cm?: number | null
  trueScale?: boolean
}): PdfLayout {
  const [short, long] = PAGE_MM[input.format]
  const pageW = input.orientation === 'landscape' ? long : short
  const pageH = input.orientation === 'landscape' ? short : long
  const availW = pageW - MARGIN_MM * 2
  const availH = pageH - MARGIN_MM * 2

  const fitScale = Math.min(availW / input.widthUnits, availH / input.heightUnits)
  const trueSizeCm = input.unitsPer10cm
    ? { w: (input.widthUnits / input.unitsPer10cm) * 10, h: (input.heightUnits / input.unitsPer10cm) * 10 }
    : null

  if (input.trueScale && input.unitsPer10cm) {
    // 1 unit = 10 / N cm = 100 / N mm
    const mmPerUnit = 100 / input.unitsPer10cm
    const w = input.widthUnits * mmPerUnit
    const h = input.heightUnits * mmPerUnit
    if (w <= availW && h <= availH) {
      return {
        scale: mmPerUnit,
        w,
        h,
        x: (pageW - w) / 2,
        y: (pageH - h) / 2,
        trueScaleApplied: true,
        trueSizeCm,
      }
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
