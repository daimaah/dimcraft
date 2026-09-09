import type { ChartDoc, Placement, SymbolDef, StitchLine } from '../model/types'
import { placementCorners, placementTransform, cornersBBox, unionBBox, type BBox } from '../geometry/transform'
import { groupRounds } from '../geometry/instructions'

// ---- colour helpers -------------------------------------------------------
function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  const v = h.length === 3 ? h.split('').map((c) => c + c).join('') : h
  const n = parseInt(v.slice(0, 6), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

const toHex = (n: number) => Math.round(n).toString(16).padStart(2, '0')

/** Mix a colour towards white (t > 0) or black (t < 0). */
export function shade(hex: string, t: number): string {
  const [r, g, b] = hexToRgb(hex)
  const target = t >= 0 ? 255 : 0
  const k = Math.abs(t)
  return `#${toHex(r + (target - r) * k)}${toHex(g + (target - g) * k)}${toHex(b + (target - b) * k)}`
}

// ---- fabric glyphs --------------------------------------------------------
// Same 24×32 frame / (12,30) anchor as the schematic symbols, but drawn as
// stylised crocheted fabric: fat yarn strokes with a lighter sheen line.
// Tokens: @YARN@ main colour, @HI@ highlight colour.

const Y = 'fill="none" stroke="@YARN@" stroke-linecap="round" stroke-linejoin="round"'
const H = 'fill="none" stroke="@HI@" stroke-linecap="round"'

/** twisted column body shared by dc-height stitches */
const twist = (topY: number) =>
  `<path d="M 9.2 30 C 8.7 ${30 - (30 - topY) * 0.45} 10.2 ${(topY + 30) / 2 + 1} 12.6 ${topY + 2.2}" ${Y} stroke-width="3.1"/>` +
  `<path d="M 14.8 30 C 15.3 ${30 - (30 - topY) * 0.45} 13.8 ${(topY + 30) / 2 + 1} 11.4 ${topY + 2.2}" ${Y} stroke-width="3.1"/>` +
  `<path d="M 10 27 C 9.8 21 11 15.5 12.3 11.5" ${H} stroke-width="0.9" opacity="0.7"/>`

const topLoops = (y: number) =>
  `<ellipse cx="10.4" cy="${y}" rx="2.7" ry="1.9" transform="rotate(-8 10.4 ${y})" ${Y} stroke-width="2.1"/>` +
  `<ellipse cx="13.6" cy="${y}" rx="2.7" ry="1.9" transform="rotate(8 13.6 ${y})" ${Y} stroke-width="2.1"/>`

const chainDonut = `<ellipse cx="12" cy="23" rx="4.3" ry="6.4" ${Y} stroke-width="3.2"/><path d="M 9.6 19.5 C 11 18.4 13 18.4 14.4 19.5" ${H} stroke-width="1" opacity="0.7"/>`

const bump = (topY: number, w: number) =>
  `<path d="M ${12 - w} 30 C ${12 - w} ${topY + 6} ${12 + w} ${topY + 6} ${12 + w} 30" ${Y} stroke-width="3.4"/>` +
  `<path d="M ${12 - w + 1.2} 27.5 C ${12 - w + 1.2} ${topY + 8} ${12 + w - 1.2} ${topY + 8} ${12 + w - 1.2} 27.5" ${H} stroke-width="1" opacity="0.7"/>`

const blob = (topY: number, w: number) =>
  `<path d="M ${12 - w} 30 C ${12 - w - 1} ${topY + 9} ${12 - w * 0.5} ${topY} 12 ${topY} C ${12 + w * 0.5} ${topY} ${12 + w + 1} ${topY + 9} ${12 + w} 30 Z" fill="@YARN@" stroke="none"/>` +
  `<path d="M ${12 - w * 0.45} ${topY + 4} C ${12 - w * 0.3} ${topY + 2} ${12 + w * 0.3} ${topY + 2} ${12 + w * 0.45} ${topY + 4}" ${H} stroke-width="1.2" opacity="0.8"/>` +
  `<path d="M ${12 - w + 0.5} 30 C ${12 - w} ${topY + 10} ${12 - w * 0.4} ${topY + 1} 12 ${topY + 0.5}" fill="none" stroke="@YARN@" stroke-width="1.4" stroke-linecap="round" opacity="0.9"/>`

/** Fabric-style artwork per known symbol id; others fall back to fat schematic strokes. */
const FABRIC_GLYPHS: Record<string, string> = {
  ch: chainDonut,
  slst: `<circle cx="12" cy="27.4" r="2.7" fill="@YARN@" stroke="none"/><circle cx="11.2" cy="26.6" r="0.9" fill="@HI@" stroke="none" opacity="0.8"/>`,
  sc: bump(23.5, 4.2),
  hdc: bump(20.5, 4.4) + `<ellipse cx="12" cy="20.8" rx="2.5" ry="1.7" ${Y} stroke-width="2"/>`,
  dc: twist(10.5) + topLoops(9.6),
  tr: twist(6.5) + topLoops(5.4) + `<ellipse cx="12" cy="9.4" rx="2.5" ry="1.7" ${Y} stroke-width="1.9"/>`,
  dtr: twist(3.4) + topLoops(2.4) + `<ellipse cx="12" cy="6.6" rx="2.4" ry="1.6" ${Y} stroke-width="1.8"/>` + `<ellipse cx="12" cy="9.6" rx="2.4" ry="1.6" ${Y} stroke-width="1.8"/>`,
  magicring:
    `<circle cx="12" cy="22" r="6.2" ${Y} stroke-width="3.2"/>` +
    `<path d="M 17.2 17.2 C 19 15.4 20 13.6 20.6 11.4" ${Y} stroke-width="2.6"/>` +
    `<path d="M 9.4 18.6 C 11.6 17.4 13.8 17.8 15.2 19.6" ${H} stroke-width="1.1" opacity="0.7"/>`,
  popcorn: blob(11, 5),
  puff: blob(15, 4.6),
  bobble: blob(16, 4.2),
  shell:
    `<path d="M 6.5 29 C 7 22 9 17.5 12 16.4" ${Y} stroke-width="2.9"/>` +
    `<path d="M 12 29 L 12 15.6" ${Y} stroke-width="2.9"/>` +
    `<path d="M 17.5 29 C 17 22 15 17.5 12 16.4" ${Y} stroke-width="2.9"/>`,
  dc2tog: twist(12.5) + topLoops(11.8),
  tr3tog: twist(10) + topLoops(9.2),
}

/**
 * Fabric artwork for a placement's symbol. Known stitches get purpose-drawn
 * yarn glyphs; everything else (custom symbols, post stitches, …) keeps the
 * schematic artwork re-stroked as fat yarn so nothing disappears.
 */
export function fabricGlyph(symbolId: string, def: SymbolDef | undefined, yarn: string): string {
  const hi = shade(yarn, 0.45)
  const known = FABRIC_GLYPHS[symbolId]
  if (known) {
    return `<g data-fab="${symbolId}">${known.replaceAll('@YARN@', yarn).replaceAll('@HI@', hi)}</g>`
  }
  if (def) {
    const fat = def.content
      .replaceAll('@INK@', yarn)
      .replaceAll('stroke-width="1.6"', 'stroke-width="3"')
    return `<g data-fab="schematic">${fat}</g>`
  }
  return ''
}

// ---- jitter ----------------------------------------------------------------
function hash01(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return ((h >>> 0) % 1000) / 1000 - 0.5 // −0.5 … 0.5
}

function jittered(p: Placement, on: boolean): Placement {
  if (!on) return p
  const a = hash01(p.id + 'a')
  const b = hash01(p.id + 'b')
  const c = hash01(p.id + 'c')
  return {
    ...p,
    x: p.x + a * 2.6,
    y: p.y + b * 2.6,
    rotation: p.rotation + c * 5,
    scale: p.scale * (1 + a * 0.06),
  }
}

// ---- document-level preview -------------------------------------------------
export interface FabricPreviewOptions {
  yarn: string
  background: string | null
  jitter: boolean
  /** optional per-round yarn colours, indexed by the chart's detected rounds */
  roundColors?: string[]
}

/** The round grouping the preview colours use (same detection as follow mode). */
function previewTolerance(doc: ChartDoc): number {
  return doc.follow?.tolerance ?? 18
}

/** Per-round info for the preview colour picker, matching buildFabricSvg's mapping. */
export function previewRounds(doc: ChartDoc): { index: number; count: number }[] {
  return groupRounds(doc, previewTolerance(doc)).rounds.map((r, index) => ({ index, count: r.items.length }))
}

function paddedBBox(b: BBox, pad: number): BBox {
  return { x: b.x - pad, y: b.y - pad, w: b.w + pad * 2, h: b.h + pad * 2 }
}

const r2 = (v: number) => Math.round(v * 100) / 100

/** Build a standalone SVG of the chart as simulated crocheted fabric. */
export function buildFabricSvg(doc: ChartDoc, opts: FabricPreviewOptions): { svg: string; width: number; height: number } {
  const defs = new Map<string, SymbolDef>()
  for (const p of doc.placements) {
    if (!defs.has(p.symbolId)) {
      defs.set(p.symbolId, doc.customSymbols.find((s) => s.id === p.symbolId) ?? {
        id: p.symbolId,
        name: p.symbolId,
        label: p.symbolId,
        content: '',
        bbox: { x: 6, y: 12, w: 12, h: 18 },
      })
    }
  }

  const boxes: BBox[] = []
  for (const p of doc.placements) {
    if (p.visible === false) continue
    const def = defs.get(p.symbolId)
    if (!def) continue
    const fat = { ...def, bbox: paddedBBox(def.bbox, 2.5) }
    boxes.push(cornersBBox(placementCorners(jittered(p, opts.jitter), fat)))
  }
  for (const l of doc.lines) {
    if (l.points.length === 0) continue
    const xs = l.points.map((p) => p.x)
    const ys = l.points.map((p) => p.y)
    boxes.push(paddedBBox({ x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) }, l.width + 2))
  }
  const bbox = unionBBox(boxes) ?? { x: -100, y: -100, w: 200, h: 200 }
  const PAD = 16
  const viewX = bbox.x - PAD
  const viewY = bbox.y - PAD
  const width = Math.max(1, bbox.w + PAD * 2)
  const height = Math.max(1, bbox.h + PAD * 2)

  // which round each stitch belongs to (magic ring and backstitch lines stay
  // on the base yarn colour; round i uses roundColors[i] ?? opts.yarn)
  const roundOfId = new Map<string, number>()
  groupRounds(doc, previewTolerance(doc)).rounds.forEach((r, i) => {
    for (const { p } of r.items) roundOfId.set(p.id, i)
  })
  const yarnFor = (p: Placement) => {
    const idx = roundOfId.get(p.id)
    return (idx !== undefined ? opts.roundColors?.[idx] : undefined) ?? opts.yarn
  }

  const parts: string[] = []
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${r2(width)}" height="${r2(height)}" viewBox="${r2(viewX)} ${r2(viewY)} ${r2(width)} ${r2(height)}">`,
  )
  if (opts.background) {
    parts.push(`<rect x="${r2(viewX)}" y="${r2(viewY)}" width="${r2(width)}" height="${r2(height)}" fill="${opts.background}"/>`)
  }

  if (doc.lines.length) {
    const strands = doc.lines
      .map((l) => yarnStrand(l, opts.yarn))
      .join('')
    parts.push(`<g>${strands}</g>`)
  }

  const stitches = doc.placements
    .filter((p) => p.visible !== false)
    .map((p) => {
      const def = defs.get(p.symbolId)
      const glyph = fabricGlyph(p.symbolId, def, yarnFor(p))
      if (!glyph) return ''
      return `<g transform="${placementTransform(jittered(p, opts.jitter))}">${glyph}</g>`
    })
    .join('')
  parts.push(`<g>${stitches}</g>`)

  parts.push('</svg>')
  return { svg: parts.join(''), width, height }
}

/** A backstitch line drawn as a fat yarn strand with a sheen. */
function yarnStrand(l: StitchLine, yarn: string): string {
  if (l.points.length < 2) return ''
  const d = 'M ' + l.points.map((p) => `${r2(p.x)} ${r2(p.y)}`).join(' L ') + (l.closed ? ' Z' : '')
  const w = Math.max(3, l.width + 1.4)
  return (
    `<g>` +
    `<path d="${d}" fill="none" stroke="${shade(yarn, -0.25)}" stroke-width="${r2(w)}" stroke-linecap="round" stroke-linejoin="round" transform="translate(0.7 0.9)" opacity="0.55"/>` +
    `<path d="${d}" fill="none" stroke="${yarn}" stroke-width="${r2(w)}" stroke-linecap="round" stroke-linejoin="round"/>` +
    `<path d="${d}" fill="none" stroke="${shade(yarn, 0.5)}" stroke-width="${r2(w * 0.22)}" stroke-linecap="round" stroke-linejoin="round" transform="translate(-0.5 -0.7)" opacity="0.8"/>` +
    `</g>`
  )
}
