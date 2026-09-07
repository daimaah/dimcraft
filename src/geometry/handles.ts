import type { Guide, Vec } from '../model/types'
import { guideCenter, guideEndpoints } from './guides'

const D2R = Math.PI / 180
const R2D = 180 / Math.PI

export interface GuideHandle {
  id: string
  pos: Vec
  cursor: string
}

function pt(cx: number, cy: number, r: number, deg: number): Vec {
  const a = deg * D2R
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) }
}

/** Editable control points for the selected guide. */
export function guideHandles(g: Guide): GuideHandle[] {
  switch (g.kind) {
    case 'circle':
      return [
        { id: 'center', pos: { x: g.cx, y: g.cy }, cursor: 'move' },
        { id: 'radius', pos: pt(g.cx, g.cy, g.r, -90), cursor: 'nesw-resize' },
      ]
    case 'arc': {
      const mid = g.a0 + (((g.a1 - g.a0 + 360) % 360) || 360) / 2
      return [
        { id: 'center', pos: { x: g.cx, y: g.cy }, cursor: 'move' },
        { id: 'radius', pos: pt(g.cx, g.cy, g.r, mid), cursor: 'nwse-resize' },
        { id: 'a0', pos: pt(g.cx, g.cy, g.r, g.a0), cursor: 'grab' },
        { id: 'a1', pos: pt(g.cx, g.cy, g.r, g.a1), cursor: 'grab' },
      ]
    }
    case 'spiral': {
      const endA = g.a0 + 360 * g.turns
      return [
        { id: 'center', pos: { x: g.cx, y: g.cy }, cursor: 'move' },
        { id: 'end', pos: pt(g.cx, g.cy, g.r1, endA), cursor: 'nwse-resize' },
      ]
    }
    case 'line':
      return [
        { id: 'p1', pos: { x: g.x1, y: g.y1 }, cursor: 'move' },
        { id: 'p2', pos: { x: g.x2, y: g.y2 }, cursor: 'move' },
      ]
    case 'polygon':
      return [
        { id: 'center', pos: { x: g.cx, y: g.cy }, cursor: 'move' },
        { id: 'corner', pos: pt(g.cx, g.cy, g.r, g.rot), cursor: 'move' },
      ]
  }
}

/** Drag a handle to `world`, returning the updated guide (same kind/id). */
export function applyGuideHandle(g: Guide, handleId: string, world: Vec, snap45: boolean): Guide {
  switch (g.kind) {
    case 'circle':
      if (handleId === 'center') return { ...g, cx: world.x, cy: world.y }
      return { ...g, r: Math.max(2, Math.hypot(world.x - g.cx, world.y - g.cy)) }
    case 'arc': {
      if (handleId === 'center') return { ...g, cx: world.x, cy: world.y }
      const dx = world.x - g.cx
      const dy = world.y - g.cy
      const r = Math.hypot(dx, dy)
      const ang = Math.atan2(dy, dx) * R2D
      if (handleId === 'radius') return { ...g, r: Math.max(2, r) }
      if (handleId === 'a0') return { ...g, a0: ang }
      return { ...g, a1: ang }
    }
    case 'spiral':
      if (handleId === 'center') return { ...g, cx: world.x, cy: world.y }
      return { ...g, r1: Math.max(4, Math.hypot(world.x - g.cx, world.y - g.cy)) }
    case 'line': {
      if (handleId === 'p1') {
        if (snap45) return { ...g, x1: world.x, y1: world.y, ...snapLine(g.x2, g.y2, world.x, world.y) }
        return { ...g, x1: world.x, y1: world.y }
      }
      if (snap45) return { ...g, ...snapLine(g.x1, g.y1, world.x, world.y) }
      return { ...g, x2: world.x, y2: world.y }
    }
    case 'polygon': {
      if (handleId === 'center') return { ...g, cx: world.x, cy: world.y }
      const dx = world.x - g.cx
      const dy = world.y - g.cy
      return {
        ...g,
        r: Math.max(2, Math.hypot(dx, dy)),
        rot: Math.atan2(dy, dx) * R2D,
      }
    }
  }
}

/** Keep the free end on a 45° ray from the fixed end. */
function snapLine(fx: number, fy: number, mx: number, my: number): { x2: number; y2: number } {
  const dx = mx - fx
  const dy = my - fy
  const len = Math.hypot(dx, dy)
  if (len < 1e-6) return { x2: mx, y2: my }
  const step = Math.PI / 4
  const angle = Math.round(Math.atan2(dy, dx) / step) * step
  return { x2: fx + len * Math.cos(angle), y2: fy + len * Math.sin(angle) }
}

export { guideCenter, guideEndpoints }
