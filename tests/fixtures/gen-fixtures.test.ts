// Golden-fixture generator. These tests are skipped normally and only run
// with GEN_FIXTURES=1, regenerating the compatibility fixtures under
// tests/fixtures/ using the *current* serializers:
//
//   GEN_FIXTURES=1 npx vitest run tests/fixtures/gen-fixtures.test.ts
//
// Workflow: whenever the schema changes, regenerate (or hand-commit exports
// from the previous app version) and make sure tests/golden.test.ts still
// passes — old files must always keep importing.
import { mkdirSync, writeFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { serializeProject } from '../../src/export/projectFile'
import { createStarterDoc } from '../../src/model/starter'

const regenerate = !!process.env.GEN_FIXTURES

describe.skipIf(!regenerate)('golden fixture generation', () => {
  it('writes the v1-era starter project export', () => {
    mkdirSync('tests/fixtures', { recursive: true })
    const doc = createStarterDoc()
    const rec = {
      id: 'proj-golden-v1',
      name: 'Golden starter (v1 era)',
      createdAt: 1757000000000,
      updatedAt: 1757000000000,
      doc,
    }
    writeFileSync('tests/fixtures/v1-starter.dimcrochet.json', serializeProject(rec))
    expect(true).toBe(true)
  })

  it('writes the v1-era symbol pack export', () => {
    const pack = {
      app: 'dimcrochet-symbol-pack',
      version: 1,
      name: 'Golden variants pack',
      artwork: {
        dc: '<path d="M 12 30 L 12 12 M 6 12 L 18 12" fill="none" stroke="@INK@" stroke-width="1.6" stroke-linecap="round"/>',
      },
      license: 'CC BY-SA 4.0',
      authors: 'Fixture authors',
      sourceUrl: 'https://commons.wikimedia.org/wiki/Category:Crochet_symbols',
      notes: 'Compatibility fixture — not a real regional pack.',
    }
    writeFileSync('tests/fixtures/v1-pack.pack.json', JSON.stringify(pack, null, 2))
    expect(true).toBe(true)
  })
})
