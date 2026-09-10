import { afterEach, describe, expect, it } from 'vitest'
import {
  deploymentSiblingHint,
  discoverSibling,
  probeSibling,
  siblingAppName,
  siblingAppId,
  siblingCandidates,
  verifySiblingUrl,
} from '../src/sibling'
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
  delete (globalThis as { location?: unknown }).location
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

describe('verifySiblingUrl (the Options Verify button)', () => {
  it('probes the exact URL given, trimming slashes', async () => {
    const seen: string[] = []
    globalThis.fetch = (async (input: unknown) => {
      seen.push(String(input))
      return new Response(JSON.stringify({ app: 'dimknit', version: '0.2.0' }), { status: 200 })
    }) as typeof fetch
    const info = await verifySiblingUrl('http://host:9000///')
    expect(info?.version).toBe('0.2.0')
    expect(seen).toEqual(['http://host:9000/api/whoami'])
  })

  it('with an empty URL it checks what auto-detection would find', async () => {
    // node env: no candidates, so nothing to probe — resolves null without throwing
    expect(await verifySiblingUrl('   ')).toBeNull()
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
// discoverSibling reads location (origin/hostname) for the deployment hint and
// the default-port fallback — node tests install a fake location global.
const fakeLocation = {
  origin: 'http://host:9000',
  hostname: 'host',
  protocol: 'http:',
  port: '9000',
} as unknown as Location

describe('discoverSibling (candidate order)', () => {
  it('prefers the port this deployment advertises on its own /api/whoami', async () => {
    ;(globalThis as { location?: unknown }).location = fakeLocation
    globalThis.fetch = (async (input: unknown) => {
      const url = String(input)
      if (url === 'http://host:9000/api/whoami') {
        return new Response(JSON.stringify({ app: 'dimcrochet', version: '0.8.0', siblingPort: '9097' }), { status: 200 })
      }
      if (url === 'http://host:9097/api/whoami') {
        return new Response(JSON.stringify({ app: 'dimknit', version: '0.2.0', core: '0.1.0' }), { status: 200 })
      }
      return new Response('nope', { status: 404 })
    }) as typeof fetch
    const info = await discoverSibling()
    expect(info).toMatchObject({ url: 'http://host:9097', app: 'dimknit', version: '0.2.0', source: 'deployment' })
  })

  it('prefers a full advertised sibling URL over the advertised port', async () => {
    ;(globalThis as { location?: unknown }).location = fakeLocation
    const seen: string[] = []
    globalThis.fetch = (async (input: unknown) => {
      const url = String(input)
      seen.push(url)
      if (url === 'http://host:9000/api/whoami') {
        return new Response(JSON.stringify({ app: 'dimcrochet', version: '0.8.0', siblingUrl: 'https://knit.example.com/knit' }), { status: 200 })
      }
      if (url === 'https://knit.example.com/knit/api/whoami') {
        return new Response(JSON.stringify({ app: 'dimknit', version: '0.2.0' }), { status: 200 })
      }
      return new Response('nope', { status: 404 })
    }) as typeof fetch
    const info = await discoverSibling()
    expect(info).toMatchObject({ url: 'https://knit.example.com/knit', app: 'dimknit', source: 'deployment' })
    // the default-port fallback must never fire when the advertised URL answers
    expect(seen).not.toContain('http://host:8080/api/whoami')
  })

  it('skips the advertised port when it is just our own origin', async () => {
    ;(globalThis as { location?: unknown }).location = fakeLocation
    const seen: string[] = []
    globalThis.fetch = (async (input: unknown) => {
      const url = String(input)
      seen.push(url)
      if (url === 'http://host:9000/api/whoami') {
        return new Response(JSON.stringify({ app: 'dimcrochet', version: '0.8.0', siblingPort: '9000' }), { status: 200 })
      }
      return new Response('nope', { status: 404 })
    }) as typeof fetch
    expect(await discoverSibling()).toBeNull()
    // no second probe of our own origin — the self-match was skipped, and the
    // default-port fallback ran (and 404'd) as usual
    expect(seen).toEqual(['http://host:9000/api/whoami', 'http://host:8080/api/whoami', 'http://host:8081/api/whoami'])
  })

  it('falls back to the default ports when the deployment advertises nothing', async () => {
    ;(globalThis as { location?: unknown }).location = fakeLocation
    globalThis.fetch = (async (input: unknown) => {
      const url = String(input)
      if (url === 'http://host:9000/api/whoami') {
        return new Response(JSON.stringify({ app: 'dimcrochet', version: '0.8.0' }), { status: 200 })
      }
      if (url === 'http://host:8081/api/whoami') {
        return new Response(JSON.stringify({ app: 'dimknit', version: '0.1.0' }), { status: 200 })
      }
      return new Response('nope', { status: 404 })
    }) as typeof fetch
    const info = await discoverSibling()
    expect(info).toMatchObject({ url: 'http://host:8081', app: 'dimknit', source: 'default' })
  })

  it('deploymentSiblingHint resolves null without a browser location', async () => {
    expect(await deploymentSiblingHint()).toBeNull()
  })
})
