import '../src/craft'
import { describe, expect, it } from 'vitest'
import { createShareFragment, decodeShareFragment } from '@dimcraft/core/export/share'
import { createShortLink, fetchShortLink, parseShortLinkLocation } from '@dimcraft/core/export/secureShare'
import { KNIT_STARTERS, createStarter } from '../src/model/starters'
import type { ProjectRecord } from '@dimcraft/core/model/types'

/** Stub the sidecar API for one test, restoring the real fetch afterwards. */
async function withSidecarStub<T>(handler: (url: string, init?: RequestInit) => Promise<Response>, run: () => Promise<T>): Promise<T> {
  const original = globalThis.fetch
  globalThis.fetch = (async (input: unknown, init?: RequestInit) => handler(String(input), init)) as typeof fetch
  try {
    return await run()
  } finally {
    globalThis.fetch = original
  }
}

describe('knit share links', () => {
  const rec = (): ProjectRecord => ({
    id: 'proj-1',
    name: 'Rib swatch',
    createdAt: 1,
    updatedAt: 2,
    doc: createStarter(KNIT_STARTERS[0].id),
  })

  it('round-trips a knit chart through a share fragment', async () => {
    const fragment = await createShareFragment(rec())
    expect(fragment.startsWith('#c=')).toBe(true)
    const decoded = await decodeShareFragment(fragment)
    expect(decoded).not.toBeNull()
    expect(decoded!.name).toBe('Rib swatch')
    expect(decoded!.doc.placements.length).toBe(rec().doc.placements.length)
  })

  it('round-trips a knit chart through a stubbed sidecar short link', async () => {
    let stored: string | null = null
    await withSidecarStub(
      (url, init) => {
        if (url.endsWith('/api/links') && init?.method === 'POST') {
          stored = (JSON.parse(String(init.body)) as { data: string }).data
          return Promise.resolve(new Response(JSON.stringify({ id: 'rib7Kk' }), { status: 200 }))
        }
        if (url.endsWith('/api/links/rib7Kk') && stored) {
          return Promise.resolve(new Response(JSON.stringify({ data: stored }), { status: 200 }))
        }
        return Promise.resolve(new Response('not found', { status: 404 }))
      },
      async () => {
        const { url } = await createShortLink('http://sidecar.test', rec())
        const parts = parseShortLinkLocation('/x/rib7Kk', '#' + url.split('#')[1])
        expect(parts).not.toBeNull()
        const fetched = await fetchShortLink('http://sidecar.test', parts!.id, parts!.key)
        expect(fetched).not.toBeNull()
        expect(fetched!.name).toBe('Rib swatch')
        expect(fetched!.doc.placements.length).toBe(rec().doc.placements.length)
      },
    )
  })

  it('created links always carry a key fragment and the /x/ receive path', async () => {
    await withSidecarStub(
      (_url, init) => {
        void init
        return Promise.resolve(new Response(JSON.stringify({ id: 'rib7Kk' }), { status: 200 }))
      },
      async () => {
        const { url } = await createShortLink('http://sidecar.test', rec())
        expect(url).toMatch(/^http:\/\/sidecar\.test\/x\/rib7Kk#k=[A-Za-z0-9_-]+$/)
      },
    )
  })
})