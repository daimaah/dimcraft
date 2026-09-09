import { describe, expect, it } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import { parseInterchangeText } from '../src/export/projectFile'

/**
 * Curation gate for the community pack shelf (`packs/`).
 *
 * Everything a pack submission must satisfy is checked here, so a PR adding a
 * pack is validated by CI before a human ever looks at the glyphs:
 * the app's own importer must accept it, provenance (license / authors /
 * sourceUrl) must be present, and the SVG artwork must be vector,
 * self-contained and sized sanely.
 */

const PACKS_DIR = fileURLToPath(new URL('../packs/', import.meta.url))
const MAX_FILE_BYTES = 2_000_000
const MAX_SYMBOLS = 300
const MAX_SYMBOL_CHARS = 64_000
const MAX_NAME_CHARS = 60

const packFiles = () =>
  readdirSync(PACKS_DIR)
    .filter((f) => f.endsWith('.json'))
    .sort()

describe('community pack shelf (packs/)', () => {
  it('exists as a real directory', () => {
    expect(statSync(PACKS_DIR).isDirectory()).toBe(true)
  })

  it('uses kebab-case file names', () => {
    for (const file of packFiles()) {
      expect(file, 'file name must be kebab-case').toMatch(/^[a-z0-9]+(-[a-z0-9]+)*\.json$/)
    }
  })

  it('validates every pack through the app import path, with provenance and SVG hygiene', () => {
    const seenNames = new Set<string>()
    for (const file of packFiles()) {
      const text = readFileSync(join(PACKS_DIR, file), 'utf8')
      expect(text.length, `${file}: file too large`).toBeLessThanOrEqual(MAX_FILE_BYTES)

      const parsed = parseInterchangeText(text)
      expect(parsed, `${file}: the app's pack importer rejected this file`).not.toBeNull()
      expect(parsed!.type, `${file}: not a symbol pack`).toBe('pack')
      const set = parsed!.type === 'pack' ? parsed!.set : null

      // provenance is the curation requirement — optional in the file format,
      // mandatory on the shelf
      expect(set!.license, `${file}: missing license`).toBeTruthy()
      expect(set!.authors, `${file}: missing authors`).toBeTruthy()
      expect(set!.sourceUrl, `${file}: missing sourceUrl`).toBeTruthy()
      expect(set!.name.length, `${file}: pack name too long`).toBeLessThanOrEqual(MAX_NAME_CHARS)
      expect(seenNames.has(set!.name), `${file}: duplicate pack name "${set!.name}"`).toBe(false)
      seenNames.add(set!.name)

      const ids = Object.keys(set!.artwork)
      expect(ids.length, `${file}: pack is empty`).toBeGreaterThan(0)
      expect(ids.length, `${file}: too many symbols`).toBeLessThanOrEqual(MAX_SYMBOLS)
      for (const id of ids) {
        const svg = set!.artwork[id]
        expect(svg.includes('@INK@'), `${file}:${id}: SVG must use the @INK@ ink placeholder`).toBe(true)
        expect(svg.length, `${file}:${id}: symbol artwork too large`).toBeLessThanOrEqual(MAX_SYMBOL_CHARS)
        expect(svg, `${file}:${id}: must be an <svg> document`).toMatch(/^\s*<svg[\s>]/)
        expect(svg.toLowerCase(), `${file}:${id}: scripts are not allowed`).not.toContain('<script')
        expect(svg.toLowerCase(), `${file}:${id}: raster images are not allowed`).not.toContain('<image')
        expect(svg, `${file}:${id}: event handlers are not allowed`).not.toMatch(/\son[a-z]+\s*=/i)
        expect(svg, `${file}:${id}: external references are not allowed`).not.toMatch(/(xlink:)?href\s*=\s*"(#|[a-z]+:)?http/i)
      }
    }
  })

  it('documents the shelf (README + format spec live next to the packs)', () => {
    expect(statSync(join(PACKS_DIR, 'README.md')).isFile()).toBe(true)
    expect(statSync(join(PACKS_DIR, 'FORMAT.md')).isFile()).toBe(true)
  })
})
