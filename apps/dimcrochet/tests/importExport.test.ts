import { describe, expect, it } from 'vitest'
import { readProjectFile, readSymbolPackFile, serializeProject } from '@dimcraft/core/export/projectFile'
import { createStarterDoc } from '../src/model/starter'

const makeFile = (text: string, name = 'chart.dimcrochet.json') => new File([text], name, { type: 'application/json' })

describe('project file round-trip (export → import)', () => {
  it('imports an exported project file with an identical document', async () => {
    const doc = createStarterDoc()
    const rec = { id: 'proj-1', name: 'My square', createdAt: 1, updatedAt: 2, doc }
    const file = makeFile(serializeProject(rec))

    const parsed = await readProjectFile(file)
    expect(parsed).not.toBeNull()
    expect(parsed!.name).toBe('My square')
    expect(parsed!.doc.placements).toHaveLength(doc.placements.length)
    expect(parsed!.doc.placements.map((p) => p.id)).toEqual(doc.placements.map((p) => p.id))
    expect(parsed!.doc.labelOverrides).toEqual(doc.labelOverrides)
    expect(parsed!.doc.legend).toEqual(doc.legend)
  })

  it('migrates legacy files that predate newer fields', async () => {
    const legacy = {
      app: 'dimcrochet',
      version: 1,
      name: 'Old chart',
      savedAt: 123,
      doc: { schemaVersion: 1, title: 'Old chart', placements: [], guides: [] },
    }
    const parsed = await readProjectFile(makeFile(JSON.stringify(legacy)))
    expect(parsed).not.toBeNull()
    expect(parsed!.doc.lines).toEqual([])
    expect(parsed!.doc.customSets).toEqual([])
  })

  it('rejects files from other apps', async () => {
    const parsed = await readProjectFile(makeFile(JSON.stringify({ app: 'other-app', doc: {} })))
    expect(parsed).toBeNull()
    expect(await readProjectFile(makeFile('not json at all'))).toBeNull()
  })
})

describe('symbol pack import', () => {
  it('reads pack files with provenance and drops unusable artwork', async () => {
    const pack = {
      app: 'dimcrochet-symbol-pack',
      version: 1,
      name: 'Nordic variants',
      artwork: {
        dc: '<path d="M 1 1" fill="@INK@" stroke-width="1.6"/>',
        broken: '<path d="M 1 1" fill="blue"/>',
      },
      license: 'CC BY-SA 4.0',
      authors: 'Commons contributors',
      sourceUrl: 'https://commons.wikimedia.org/wiki/Category:Crochet_symbols',
    }
    const set = await readSymbolPackFile(makeFile(JSON.stringify(pack), 'nordic.pack.json'))
    expect(set).not.toBeNull()
    expect(set!.name).toBe('Nordic variants')
    expect(set!.license).toBe('CC BY-SA 4.0')
    expect(Object.keys(set!.artwork)).toEqual(['dc'])
    expect(set!.id).toMatch(/^set-/)
  })

  it('rejects packs without usable artwork', async () => {
    const set = await readSymbolPackFile(makeFile(JSON.stringify({ app: 'dimcrochet-symbol-pack', name: 'x', artwork: {} })))
    expect(set).toBeNull()
  })
})
