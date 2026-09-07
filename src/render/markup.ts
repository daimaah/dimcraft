import type { ChartDoc, RepeatBracket, SymbolDef, TextElement } from '../model/types'
import { legendItems } from '../geometry/legend'
import { LEGEND_HEAD, LEGEND_ROW_H, LEGEND_W } from '../geometry/bounds'
import { symbolInner } from '../symbols/registry'

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
    const def = defMap.get(item.symbolId)!
    const b = def.bbox
    const k = 18 / Math.max(b.w, b.h)
    parts.push(
      `<g transform="translate(2 ${rowY}) scale(${k}) translate(${-(b.x + b.w / 2)} ${-(b.y + b.h / 2)})">` +
        symbolInner(def, ink) +
        `</g>`,
    )
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
