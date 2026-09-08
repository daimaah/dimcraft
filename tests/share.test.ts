import { describe, expect, it } from 'vitest'
import { createShareFragment, decodeShareFragment, estimateShareLength } from '../src/export/share'
import { parseInterchangeText } from '../src/export/projectFile'
import { createStarterDoc } from '../src/model/starter'
import { createEmptyDoc } from '../src/model/doc'

const makeFile = (text: string, name: string) => new File([text], name, { type: 'application/json' })

describe('share fragments', () => {
  it('round-trips a chart through encode → decode', async () => {
    const doc = createStarterDoc()
    const rec = { id: 'proj-1', name: 'Share me', createdAt: 1, updatedAt: 2, doc }
    const fragment = await createShareFragment(rec)
    expect(fragment.startsWith('#c=')).toBe(true)

    const decoded = await decodeShareFragment(fragment)
    expect(decoded).not.toBeNull()
    expect(decoded!.name).toBe('Share me')
    expect(decoded!.doc.placements.map((p) => p.id)).toEqual(doc.placements.map((p) => p.id))
    // undefined fields are normalized by the migration gate
    expect(decoded!.doc.symbolSet).toBe('standard')
  })

  it('rejects garbage fragments', async () => {
    expect(await decodeShareFragment('#c=not-valid-base64!!!')).toBeNull()
    expect(await decodeShareFragment('#c=QUJD')).toBeNull() // "ABC" — valid b64, invalid payload
    expect(await decodeShareFragment('')).toBeNull()
  })

  it('encodes to a fragment well under browser URL limits for typical charts', async () => {
    const doc = createStarterDoc()
    const fragment = await createShareFragment({ id: 'p', name: 'x', createdAt: 1, updatedAt: 2, doc })
    expect(fragment.length).toBeLessThan(10000)
  })

  it('estimateShareLength gives a cheap upper-ish estimate', () => {
    const doc = createEmptyDoc()
    const estimate = estimateShareLength(doc)
    expect(estimate).toBeGreaterThan(0)
    expect(estimate).toBeLessThan(1000)
  })
})

describe('interchange dispatcher', () => {
  it('routes chart exports to chart', () => {
    const doc = createStarterDoc()
    const text = JSON.stringify({
      app: 'dimcrochet',
      version: 1,
      name: 'Chart',
      savedAt: 1,
      doc,
    })
    const parsed = parseInterchangeText(text)
    expect(parsed?.type).toBe('chart')
    expect(parsed?.type === 'chart' && parsed.doc.placements).toHaveLength(doc.placements.length)
  })

  it('routes symbol packs to pack with provenance', () => {
    const text = JSON.stringify({
      app: 'dimcrochet-symbol-pack',
      version: 1,
      name: 'Pack',
      artwork: { dc: '<path d="M 1 1" fill="@INK@"/>' },
      license: 'CC BY-SA 4.0',
    })
    const parsed = parseInterchangeText(text)
    expect(parsed?.type).toBe('pack')
    expect(parsed?.type === 'pack' && parsed.set.license).toBe('CC BY-SA 4.0')
  })

  it('rejects unknown payloads', () => {
    expect(parseInterchangeText('{"app":"other"}')).toBeNull()
    expect(parseInterchangeText('not json')).toBeNull()
  })

  it('dispatches File objects through the same path', async () => {
    const doc = createStarterDoc()
    const file = makeFile(
      JSON.stringify({ app: 'dimcrochet', version: 1, name: 'F', savedAt: 1, doc }),
      'f.dimcrochet.json',
    )
    const { importInterchangeFile } = await import('../src/export/projectFile')
    const parsed = await importInterchangeFile(file)
    expect(parsed?.type).toBe('chart')
  })
})
