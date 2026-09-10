import type { ChartDoc } from '../model/types'
import type { BBox } from '../geometry/transform'
import { contentBBox, gridAspect, legendSize } from '../geometry/bounds'
import { guideSvgPath } from '../geometry/guides'
import { placementTransform, unionBBox } from '../geometry/transform'
import { bracketSvg, legendSvgPlaced, lineSvg, numberingBBox, numberingSvg, textSvg } from '../render/markup'
import { getDefMap, symbolInner } from '../symbols/registry'

export interface SvgExportOptions {
  includeGuides?: boolean
  includeLegend?: boolean
  /** background fill colour, or null/undefined for transparent */
  background?: string | null
  padding?: number
}

export interface BuiltSvg {
  svg: string
  /** world-space bounds actually used for the viewBox */
  viewX: number
  viewY: number
  width: number
  height: number
}

const PAD_DEFAULT = 18

/** Build a clean, standalone SVG of the chart (no editor chrome). */
export function buildExportSvg(doc: ChartDoc, options: SvgExportOptions = {}): BuiltSvg {
  const defMap = getDefMap(doc)
  const pad = options.padding ?? PAD_DEFAULT
  const aspect = gridAspect(doc)
  const wantNumbering = !!doc.numbering && (doc.numbering.rows || doc.numbering.cols)

  // viewBox: gauge aspect stretches the chart content; numbering and the
  // legend render unstretched on top of it
  const boxes: BBox[] = []
  const content = contentBBox(doc, defMap, { includeLegend: false, includeGuides: options.includeGuides ?? false })
  if (content) boxes.push({ x: content.x, y: content.y * aspect, w: content.w, h: content.h * aspect })
  if (wantNumbering) {
    const nb = numberingBBox(doc, defMap, aspect)
    if (nb) boxes.push(nb)
  }
  if (options.includeLegend !== false && doc.legend.visible) {
    const s = legendSize(doc, defMap)
    boxes.push({ x: doc.legend.x, y: doc.legend.y, w: s.w, h: s.h })
  }
  const bbox = unionBBox(boxes) ?? { x: -200, y: -200, w: 400, h: 400 }

  const viewX = bbox.x - pad
  const viewY = bbox.y - pad
  const width = Math.max(1, bbox.w + pad * 2)
  const height = Math.max(1, bbox.h + pad * 2)
  const ink = doc.ink

  const parts: string[] = []
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${round(width)}" height="${round(height)}" viewBox="${round(
      viewX,
    )} ${round(viewY)} ${round(width)} ${round(height)}">`,
  )
  if (options.background) {
    parts.push(`<rect x="${round(viewX)}" y="${round(viewY)}" width="${round(width)}" height="${round(height)}" fill="${options.background}"/>`)
  }

  if (options.includeGuides) {
    const gpaths = doc.guides
      .filter((g) => g.visible)
      .map((g) => `<path d="${guideSvgPath(g)}" fill="none" stroke="#b9ae9c" stroke-width="1.2" stroke-dasharray="7 5"/>`)
      .join('')
    if (gpaths) parts.push(`<g>${gpaths}</g>`)
  }

  // brackets, stitches, line-work and texts are all cell-anchored: they share
  // the gauge aspect stretch
  const layer: string[] = []

  if (doc.brackets.length) {
    layer.push(`<g>${doc.brackets.map((b) => bracketSvg(b, ink)).join('')}</g>`)
  }

  const stitches = doc.placements
    .filter((p) => p.visible !== false)
    .map((p) => {
      const def = defMap.get(p.symbolId)
      if (!def) return ''
      return `<g transform="${placementTransform(p)}">${symbolInner(def, p.colour ?? ink)}</g>`
    })
    .join('')
  if (stitches) layer.push(`<g>${stitches}</g>`)

  if (doc.lines.length) {
    layer.push(`<g>${doc.lines.map((l) => lineSvg(l, ink)).join('')}</g>`)
  }

  if (doc.texts.length) {
    layer.push(`<g>${doc.texts.map((t) => textSvg(t, ink)).join('')}</g>`)
  }

  parts.push(aspect !== 1 ? `<g transform="scale(1 ${round(aspect)})">${layer.join('')}</g>` : `<g>${layer.join('')}</g>`)

  if (wantNumbering) {
    const numbers = numberingSvg(doc, defMap, ink, aspect)
    if (numbers) parts.push(numbers)
  }

  const legend = legendSvgPlaced(doc, defMap, ink)
  if (legend && options.includeLegend !== false) parts.push(legend)

  parts.push('</svg>')
  return { svg: parts.join(''), viewX, viewY, width, height }
}

const round = (v: number) => Math.round(v * 100) / 100
