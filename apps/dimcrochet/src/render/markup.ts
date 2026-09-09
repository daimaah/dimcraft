import type { ChartDoc, RepeatBracket, StitchLine, SymbolDef, TextElement } from '@dimcraft/core/model/types'
import { LINE_LEGEND_ID } from '@dimcraft/core/model/types'
import { legendItems } from '@dimcraft/core/geometry/legend'
import { LEGEND_HEAD, LEGEND_ROW_H, LEGEND_W } from '@dimcraft/core/geometry/bounds'
import { symbolInner } from '../symbols/registry'

const r2 = (v: number) => Math.round(v * 100) / 100

/** Chart line-work (backstitch) as SVG — a solid ink polyline. */
export function lineSvg(l: StitchLine, ink: string, opts: { interactive?: boolean } = {}): string {
  if (l.points.length < 2) return ''
  const d =
    'M ' + l.points.map((p) => `${r2(p.x)} ${r2(p.y)}`).join(' L ') + (l.closed ? ' Z' : '')
  const hit = opts.interactive
    ? `<path d="${d}" fill="none" stroke="transparent" stroke-width="${Math.max(14, l.width * 5)}"/>`
    : ''
  return (
    `<g>` +
    hit +
    `<path d="${d}" fill="none" stroke="${ink}" stroke-width="${r2(l.width)}" stroke-linecap="round" stroke-linejoin="round"/>` +
    `</g>`
  )
}

export function escapeXml(s: string): string {
  return s.replace(/[<>&"']/g, (c) =>
    c === '<' ? '&lt;' : c === '>' ? '&gt;' : c === '&' ? '&amp;' : c === '"' ? '&quot;' : '&#39;',
  )
}

const FONT = `'Segoe UI', system-ui, -apple-system, sans-serif`

export function bracketLabel(b: RepeatBracket): string {
  return b.label && b.label.trim() ? b.label : `× ${b.count}`
}

export function bracketSvg(b: RepeatBracket, ink: string, opts: { interactive?: boolean } = {}): string {
  const dx = b.x2 - b.x1
  const dy = b.y2 - b.y1
  const len = Math.hypot(dx, dy) || 1
  const nx = -dy / len
  const ny = dx / len
  const off = 26 * b.side
  const cx = (b.x1 + b.x2) / 2 + nx * off
  const cy = (b.y1 + b.y2) / 2 + ny * off
  const lx = (b.x1 + b.x2) / 2 + nx * (off + 16 * b.side)
  const ly = (b.y1 + b.y2) / 2 + ny * (off + 16 * b.side)
  const label = bracketLabel(b)
  const hit =
    opts.interactive
      ? `<line x1="${b.x1}" y1="${b.y1}" x2="${b.x2}" y2="${b.y2}" stroke="transparent" stroke-width="18" />`
      : ''
  return (
    `<g stroke="none" fill="${ink}" font-family="${FONT}" font-size="15" font-weight="600" text-anchor="middle">` +
    hit +
    `<path d="M ${b.x1} ${b.y1} Q ${cx} ${cy} ${b.x2} ${b.y2}" fill="none" stroke="${ink}" stroke-width="1.8" stroke-linecap="round"/>` +
    `<text x="${lx}" y="${ly}" stroke="none">${escapeXml(label)}</text>` +
    `</g>`
  )
}

export function textSvg(t: TextElement, ink: string, opts: { interactive?: boolean } = {}): string {
  const w = Math.max(20, t.content.length * t.size * 0.58)
  const hit = opts.interactive
    ? `<rect x="0" y="${-t.size * 0.85}" width="${w}" height="${t.size * 1.1}" fill="transparent"/>`
    : ''
  return (
    `<g transform="translate(${t.x} ${t.y}) rotate(${t.rotation})">` +
    hit +
    `<text x="0" y="0" fill="${ink}" stroke="none" font-family="${FONT}" font-size="${t.size}">${escapeXml(t.content)}</text>` +
    `</g>`
  )
}

/** Full legend block as SVG markup, drawn with its top-left corner at (0,0). */
export function legendSvg(doc: ChartDoc, defMap: Map<string, SymbolDef>, ink: string): string {
  const items = legendItems(doc, defMap)
  if (items.length === 0 && !doc.legend.title) return ''
  const parts: string[] = []
  parts.push(
    `<text x="2" y="16" fill="${ink}" font-family="${FONT}" font-size="15" font-weight="700" stroke="none">${escapeXml(
      doc.legend.title,
    )}</text>`,
  )
  items.forEach((item, i) => {
    const rowY = LEGEND_HEAD + i * LEGEND_ROW_H
    if (item.symbolId === LINE_LEGEND_ID) {
      parts.push(
        `<g transform="translate(1 ${rowY})"><path d="M 2 9 L 20 -7" fill="none" stroke="${ink}" stroke-width="2" stroke-linecap="round"/></g>`,
      )
    } else {
      const def = defMap.get(item.symbolId)!
      const b = def.bbox
      const k = 18 / Math.max(b.w, b.h)
      parts.push(
        `<g transform="translate(2 ${rowY}) scale(${k}) translate(${-(b.x + b.w / 2)} ${-(b.y + b.h / 2)})">` +
          symbolInner(def, ink) +
          `</g>`,
      )
    }
    parts.push(
      `<text x="28" y="${rowY + 5}" fill="${ink}" font-family="${FONT}" font-size="13" stroke="none">${escapeXml(
        item.label,
      )}</text>`,
    )
    if (doc.legend.showCounts) {
      parts.push(
        `<text x="${LEGEND_W - 6}" y="${rowY + 5}" fill="${ink}" font-family="${FONT}" font-size="13" text-anchor="end" stroke="none">× ${item.count}</text>`,
      )
    }
  })
  return `<g>${parts.join('')}</g>`
}

/** Legend block positioned in world coordinates. */
export function legendSvgPlaced(doc: ChartDoc, defMap: Map<string, SymbolDef>, ink: string): string {
  if (!doc.legend.visible) return ''
  const inner = legendSvg(doc, defMap, ink)
  if (!inner) return ''
  return `<g transform="translate(${doc.legend.x} ${doc.legend.y}) scale(${doc.legend.scale})">${inner}</g>`
}
