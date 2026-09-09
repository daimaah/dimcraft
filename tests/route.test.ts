import { describe, expect, it } from 'vitest'
import { chartHash, GALLERY_HASH, parseRoute } from '../src/route'

describe('hash routing', () => {
  it('empty, bare and gallery hashes all mean the gallery', () => {
    for (const h of ['', '#', '#/']) {
      expect(parseRoute(h)).toEqual({ kind: 'gallery' })
    }
  })

  it('parses chart routes out of the hash', () => {
    expect(parseRoute('#/chart/proj-abc123')).toEqual({ kind: 'chart', id: 'proj-abc123' })
    expect(parseRoute('#/chart/proj-abc123/')).toEqual({ kind: 'chart', id: 'proj-abc123' })
  })

  it('anything unrecognised falls back to the gallery, keeping #c= share links safe', () => {
    for (const h of ['#c=eyJ', '#/chart/', '#/chart', '#/settings', '#hello']) {
      expect(parseRoute(h)).toEqual({ kind: 'gallery' })
    }
  })

  it('round-trips a project id into a chart hash', () => {
    const id = 'proj-1a2b3c4'
    expect(parseRoute(chartHash(id))).toEqual({ kind: 'chart', id })
    expect(chartHash(id)).toMatch(/^#\//)
  })

  it('gallery constant is a hash route', () => {
    expect(GALLERY_HASH).toBe('#/')
    expect(parseRoute(GALLERY_HASH)).toEqual({ kind: 'gallery' })
  })
})
