import { afterEach, describe, expect, it } from 'vitest'
import { probeSibling, siblingAppName, siblingAppId, siblingCandidates } from '../src/sibling'
import { registerCraft } from '../src/craft'
import type { CraftModule } from '../src/craft'

// sibling.ts is craft-agnostic (keys off APP_ID), but the module needs no
// craft registration — only a known APP_ID. In tests APP_ID falls back to
// 'dimcrochet', so the expected sibling is dimknit.
const fakeCraft = { craft: 'crochet' } as unknown as CraftModule
registerCraft(fakeCraft)

const realFetch = globalThis.fetch

afterEach(() => {
  globalThis.fetch = realFetch
})

describe('sibling identity', () => {
  it('derives the sibling from this app id', () => {
    expect(siblingAppId()).toBe('dimknit')
    expect(siblingAppName()).toBe('DimKnit')
  })
})

describe('siblingCandidates', () => {
  it('is empty outside a browser (no location)', () => {
    // node env: no location, no manual URL (no localStorage)
    expect(siblingCandidates()).toEqual([])
  })
})

describe('probeSibling', () => {
  it('accepts a deployment that answers with the sibling app id', async () => {
    globalThis.fetch = (async () =>
      new Response(JSON.stringify({ app: 'dimknit', version: '0.1.0', core: '0.1.0' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })) as typeof fetch
    const info = await probeSibling('http://host:8081')
    expect(info).toEqual({ url: 'http://host:8081', app: 'dimknit', version: '0.1.0', core: '0.1.0' })
  })

  it('rejects an endpoint that answers as the wrong app (self-identification)', async () => {
    globalThis.fetch = (async () =>
      new Response(JSON.stringify({ app: 'dimcrochet', version: '0.8.0' }), { status: 200 })) as typeof fetch
    expect(await probeSibling('http://host:8080')).toBeNull()
  })

  it('resolves null on non-OK responses', async () => {
    globalThis.fetch = (async () => new Response('{"error":"unknown app"}', { status: 404 })) as typeof fetch
    expect(await probeSibling('http://host:8081')).toBeNull()
  })

  it('resolves null when the endpoint never answers (abort/timeout)', async () => {
    globalThis.fetch = ((_url: unknown, init?: { signal?: AbortSignal }) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => {
          const err = new Error('aborted')
          err.name = 'AbortError'
          reject(err)
        })
      })) as unknown as typeof fetch
    const start = Date.now()
    expect(await probeSibling('http://host:8081', 50)).toBeNull()
    expect(Date.now() - start).toBeLessThan(1000)
  })
})