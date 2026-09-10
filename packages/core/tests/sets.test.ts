import { describe, expect, it } from 'vitest'
import { applySetToDefs } from '../src/symbols/sets'
import type { SymbolDef } from '../src/model/types'

const base = (id: string): SymbolDef => ({
  id,
  name: id,
  label: id,
  content: `<rect data-base="${id}"/>`,
  bbox: { x: 9, y: 15, w: 6, h: 6 },
})

describe('applySetToDefs', () => {
  it('swaps content and keeps the base bbox for plain-string artwork', () => {
    const out = applySetToDefs(new Map([['p', base('p')]]), { p: '<circle data-set/>' })
    expect(out.get('p')!.content).toBe('<circle data-set/>')
    expect(out.get('p')!.bbox).toEqual({ x: 9, y: 15, w: 6, h: 6 })
  })

  it('applies an overridden bbox carried with the artwork', () => {
    const bbox = { x: 3.5, y: 8, w: 17, h: 20 }
    const out = applySetToDefs(new Map([['p', base('p')]]), { p: { content: '<path data-x/>', bbox } })
    expect(out.get('p')!.content).toBe('<path data-x/>')
    expect(out.get('p')!.bbox).toEqual(bbox)
  })

  it('an object override without a bbox falls back to the base bbox', () => {
    const out = applySetToDefs(new Map([['p', base('p')]]), { p: { content: '<path/>' } })
    expect(out.get('p')!.bbox).toEqual({ x: 9, y: 15, w: 6, h: 6 })
  })

  it('unknown ids become new palette entries, honouring an overridden bbox', () => {
    const out = applySetToDefs(new Map(), {
      fresh: '<path/>',
      framed: { content: '<path/>', bbox: { x: 4, y: 8, w: 16, h: 20 } },
    })
    expect(out.get('fresh')).toMatchObject({ id: 'fresh', name: 'fresh', bbox: { x: 3, y: 4, w: 18, h: 26 } })
    expect(out.get('framed')!.bbox).toEqual({ x: 4, y: 8, w: 16, h: 20 })
  })
})
