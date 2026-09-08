// Compatibility guarantees for exports/imports. The fixtures under
// tests/fixtures/ are real serialized exports (see gen-fixtures.test.ts);
// these tests prove they still import after any schema evolution, that the
// export envelope's shape cannot drift silently, and that documents from a
// *future* version degrade safely instead of crashing.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { readProjectFile, readSymbolPackFile, serializeProject } from '../src/export/projectFile'
import { SCHEMA_VERSION, sanitizeDoc } from '../src/model/doc'

const fixture = (...parts: string[]) => readFileSync(join('tests', 'fixtures', ...parts), 'utf8')
const asFile = (text: string, name: string) => new File([text], name, { type: 'application/json' })

describe('golden fixtures: real v1-era files keep importing', () => {
  it('imports the committed starter project export', async () => {
    const parsed = await readProjectFile(asFile(fixture('v1-starter.dimcrochet.json'), 'v1-starter.dimcrochet.json'))
    expect(parsed).not.toBeNull()
    expect(parsed!.name).toBe('Golden starter (v1 era)')
    expect(parsed!.doc.schemaVersion).toBe(SCHEMA_VERSION)
    // starter invariants survive the trip
    expect(parsed!.doc.placements).toHaveLength(21) // ring + 12 dc + 8 ch
    expect(parsed!.doc.guides[0]).toMatchObject({ kind: 'polygon', n: 4 })
    expect(parsed!.doc.brackets).toHaveLength(1)
    expect(parsed!.doc.texts[0].content).toContain('Granny square')
    expect(parsed!.doc.legend.visible).toBe(true)
  })

  it('imports the committed symbol pack export with provenance', async () => {
    const set = await readSymbolPackFile(asFile(fixture('v1-pack.pack.json'), 'v1-pack.pack.json'))
    expect(set).not.toBeNull()
    expect(set!.name).toBe('Golden variants pack')
    expect(set!.license).toBe('CC BY-SA 4.0')
    expect(set!.authors).toBe('Fixture authors')
    expect(set!.artwork['dc']).toContain('@INK@')
  })
})

describe('export envelope shape is pinned', () => {
  it('serializeProject emits exactly the documented envelope', () => {
    const rec = {
      id: 'proj-x',
      name: 'X',
      createdAt: 1,
      updatedAt: 2,
      doc: sanitizeDoc({ schemaVersion: 1, title: 'X', placements: [], guides: [] })!,
    }
    const envelope = JSON.parse(serializeProject(rec))
    expect(Object.keys(envelope)).toEqual(['app', 'version', 'name', 'savedAt', 'doc'])
    expect(envelope.app).toBe('dimcrochet')
    // doc-level keys a reader may rely on
    for (const key of [
      'schemaVersion',
      'placements',
      'guides',
      'lines',
      'brackets',
      'texts',
      'customSymbols',
      'labelOverrides',
      'legend',
      'ink',
    ]) {
      expect(envelope.doc).toHaveProperty(key)
    }
  })
})

describe('future files degrade safely (downgrade shim)', () => {
  it('opens a doc from a newer schemaVersion without throwing and preserves unknown fields', () => {
    const future = sanitizeDoc({
      schemaVersion: 99,
      title: 'From the future',
      placements: [],
      guides: [],
      futureField: { nested: [1, 2, 3] },
    } as Parameters<typeof sanitizeDoc>[0])
    expect(future).not.toBeNull()
    expect(future!.schemaVersion).toBe(SCHEMA_VERSION)
    expect((future as unknown as Record<string, unknown>).futureField).toEqual({ nested: [1, 2, 3] })
  })

  it('accepts a project file with a higher envelope version', async () => {
    const futureDoc = { schemaVersion: 99, title: 'Future', placements: [], guides: [], wonderField: true }
    const text = JSON.stringify({ app: 'dimcrochet', version: 2, name: 'Future chart', savedAt: 1, doc: futureDoc })
    const parsed = await readProjectFile(asFile(text, 'future.dimcrochet.json'))
    expect(parsed).not.toBeNull()
    expect((parsed!.doc as unknown as Record<string, unknown>).wonderField).toBe(true)
  })
})
