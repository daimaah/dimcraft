import type { ChartDoc } from '../model/types'
import { contentBBox } from '../geometry/bounds'
import { guideSvgPath } from '../geometry/guides'
import { placementTransform } from '../geometry/transform'
import { bracketSvg, legendSvgPlaced, lineSvg, textSvg } from '../render/markup'
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
  const bbox =
    contentBBox(doc, defMap, {
      includeGuides: options.includeGuides ?? false,
      includeLegend: options.includeLegend ?? true,
    }) ?? { x: -200, y: -200, w: 400, h: 400 }

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

  if (doc.brackets.length) {
    parts.push(`<g>${doc.brackets.map((b) => bracketSvg(b, ink)).join('')}</g>`)
  }

  const stitches = doc.placements
    .map((p) => {
      const def = defMap.get(p.symbolId)
      if (!def) return ''
      return `<g transform="${placementTransform(p)}">${symbolInner(def, ink)}</g>`
    })
    .join('')
  if (stitches) parts.push(`<g>${stitches}</g>`)

  if (doc.lines.length) {
    parts.push(`<g>${doc.lines.map((l) => lineSvg(l, ink)).join('')}</g>`)
  }

  if (doc.texts.length) {
    parts.push(`<g>${doc.texts.map((t) => textSvg(t, ink)).join('')}</g>`)
  }

  const legend = legendSvgPlaced(doc, defMap, ink)
  if (legend && options.includeLegend !== false) parts.push(legend)

  parts.push('</svg>')
  return { svg: parts.join(''), viewX, viewY, width, height }
}

const round = (v: number) => Math.round(v * 100) / 100
