import { describe, expect, it } from 'vitest'
import { applySetToDefs, BUILTIN_SETS, resolveSet } from '../src/symbols/sets'
import { builtInDefsFor, getDefMap } from '../src/symbols/registry'
import { TERMINOLOGY_PRESETS, LADDER_IDS } from '../src/symbols/terminology'
import { createEmptyDoc } from '../src/model/doc'
import type { ChartDoc, CustomSet } from '../src/model/types'

describe('symbol sets', () => {
  it('ships four bundled sets and standard has no overrides', () => {
    expect(BUILTIN_SETS.map((s) => s.id)).toEqual(['standard', 'japanese', 'solid', 'commons-variants'])
    expect(BUILTIN_SETS[0].artwork).toEqual({})
    expect(Object.keys(BUILTIN_SETS[1].artwork).length).toBeGreaterThanOrEqual(8)
  })

  it('applySetToDefs replaces artwork only for known ids', () => {
    const doc = createEmptyDoc()
    const defs = getDefMap(doc)
    const solid = BUILTIN_SETS.find((s) => s.id === 'solid')!
    const applied = applySetToDefs(defs, solid.artwork)
    expect(applied.get('dc')!.content).not.toBe(defs.get('dc')!.content)
    expect(applied.get('dc')!.bbox).toEqual(defs.get('dc')!.bbox) // frame untouched
    // ids outside the set fall back to standard artwork
    expect(applied.get('picot')!.content).toBe(defs.get('picot')!.content)
  })

  it('getDefMap applies the document symbol set', () => {
    const doc = createEmptyDoc()
    const before = getDefMap(doc).get('dc')!.content
    doc.symbolSet = 'japanese'
    const after = getDefMap(doc).get('dc')!.content
    expect(after).not.toBe(before)
    expect(after).toContain('@INK@')
    expect(builtInDefsFor(doc).find((s) => s.id === 'dc')!.content).toBe(after)
  })

  it('resolves imported packs over bundled sets', () => {
    const pack: CustomSet = { id: 'set-1', name: 'Faroese', artwork: { dc: '<path d="M 1 1" fill="@INK@"/>' } }
    const doc: ChartDoc = { ...createEmptyDoc(), symbolSet: 'set-1', customSets: [pack] }
    expect(resolveSet(doc).name).toBe('Faroese')
    expect(getDefMap(doc).get('dc')!.content).toBe('<path d="M 1 1" fill="@INK@"/>')
    // an unknown set id falls back to standard
    expect(resolveSet({ symbolSet: 'nope' }).id).toBe('standard')
  })

  it('bundled sets carry provenance', () => {
    for (const s of BUILTIN_SETS) {
      expect(s.license.length).toBeGreaterThan(0)
    }
    // original artwork sets are MIT; the Commons pack is per-file licensed
    expect(BUILTIN_SETS[0].license).toContain('MIT')
    expect(BUILTIN_SETS[3].license).toContain('CC')
    expect(BUILTIN_SETS[3].sourceUrl).toContain('commons.wikimedia.org')
  })
})

describe('terminology presets', () => {
  it('covers the full basic ladder for every preset', () => {
    for (const p of TERMINOLOGY_PRESETS) {
      for (const id of LADDER_IDS) {
        expect(typeof p.labels[id]).toBe('string')
        expect(p.labels[id]!.length).toBeGreaterThan(0)
      }
    }
  })

  it('includes the Nordic languages plus major European markets', () => {
    const ids = TERMINOLOGY_PRESETS.map((p) => p.id)
    for (const id of ['uk', 'sv', 'no', 'da', 'fi', 'de', 'nl', 'fr', 'es', 'it', 'ru']) {
      expect(ids).toContain(id)
    }
  })

  it('bundles the Commons variants pack with per-file attribution', async () => {
    const { commonsVariantsPack } = await import('../src/symbols/generated/commons-variants')
    expect(Object.keys(commonsVariantsPack.artwork).length).toBeGreaterThanOrEqual(10)
    expect(commonsVariantsPack.attributions.length).toBeGreaterThanOrEqual(10)
    expect(commonsVariantsPack.license).toContain('CC')
    expect(commonsVariantsPack.sourceUrl).toContain('commons.wikimedia.org')
    // per-symbol attribution lines exist for every symbol in the pack
    for (const id of Object.keys(commonsVariantsPack.artwork)) {
      expect(commonsVariantsPack.attributions.some((a) => a.id === id)).toBe(true)
    }
  })

  it('applySetToDefs adds unknown ids as new palette symbols', () => {
    const doc = createEmptyDoc()
    const defs = getDefMap(doc)
    const withNew = applySetToDefs(defs, { 'dc': defs.get('dc')!.content, 'blo-commons': '<circle r="2" fill="@INK@"/>' })
    expect(withNew.has('blo-commons')).toBe(true)
    expect(withNew.get('blo-commons')!.label).toBe('blo-commons')
    expect(withNew.get('blo-commons')!.bbox).toEqual({ x: 3, y: 4, w: 18, h: 26 })
  })

  it('selecting the Commons set exposes its added symbols through getDefMap', () => {
    const doc = createEmptyDoc()
    doc.symbolSet = 'commons-variants'
    const ids = [...getDefMap(doc).keys()]
    expect(ids).toContain('blo')
    expect(ids).toContain('ch') // existing ids remain
  })

  it('maps the US↔UK ladder correctly', () => {
    const uk = TERMINOLOGY_PRESETS.find((p) => p.id === 'uk')!
    expect(uk.labels.sc).toBe('dc')
    expect(uk.labels.hdc).toBe('htr')
    expect(uk.labels.dc).toBe('tr')
    expect(uk.labels.tr).toBe('dtr')
  })
})
