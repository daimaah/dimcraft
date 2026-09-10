import { describe, expect, it } from 'vitest'
import {
  createShortLink,
  decryptSharePayload,
  encryptSharePayload,
  fetchShortLink,
  parseShortLinkLocation,
} from '../src/export/secureShare'
import { deflateBytes, deflateToBase64Url, decodeShareFragment, inflateBytes } from '../src/export/share'
import { createEmptyDoc } from '../src/model/doc'
import type { ProjectRecord } from '../src/model/types'

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

describe('encrypted share payload', () => {
  it('round-trips bytes through encrypt/decrypt', async () => {
    const deflated = await deflateBytes(JSON.stringify({ hello: 'granny' }))
    const { blob, key } = await encryptSharePayload(deflated)
    expect(blob).toMatch(/^[A-Za-z0-9_-]+$/)
    expect(key).toMatch(/^[A-Za-z0-9_-]+$/)
    const back = await decryptSharePayload(blob, key)
    expect(back).toBeTruthy()
    expect(JSON.parse(await inflateBytes(back!))).toEqual({ hello: 'granny' })
  })

  it('rejects tampered blobs and wrong keys', async () => {
    const deflated = await deflateBytes('{"app":"dimcrochet"}')
    const { blob, key } = await encryptSharePayload(deflated)
    const tampered = blob.slice(0, -2) + (blob.endsWith('AA') ? 'BB' : 'AA')
    expect(await decryptSharePayload(tampered, key)).toBeNull()
    expect(await decryptSharePayload(blob, key.slice(0, -2) + 'AA')).toBeNull()
  })
})

describe('short-link location parsing', () => {
  it('parses /x/<id> with a key fragment', () => {
    expect(parseShortLinkLocation('/x/K7mQp3a', '#k=x9Abc-_1')).toEqual({ id: 'K7mQp3a', key: 'x9Abc-_1' })
  })
  it('rejects wrong paths and fragments', () => {
    expect(parseShortLinkLocation('/', '#k=abc')).toBeNull()
    expect(parseShortLinkLocation('/x/', '#k=abc')).toBeNull()
    expect(parseShortLinkLocation('/x/abc', '')).toBeNull()
    expect(parseShortLinkLocation('/x/abc/../etc', '#k=abc')).toBeNull()
  })
})

describe('sidecar round-trip', () => {
  const rec = (): ProjectRecord => {
    const doc = createEmptyDoc('Rib swatch')
    doc.placements.push({ id: 'p1', symbolId: 'k', x: 0, y: 0, rotation: 0, scale: 1, flip: false })
    return { id: 'proj-1', name: 'Rib swatch', createdAt: 1, updatedAt: 2, doc }
  }

  it('createShortLink → fetchShortLink round-trips a chart', async () => {
    let stored: string | null = null
    await withSidecarStub(
      (url, init) => {
        if (url.endsWith('/api/links') && init?.method === 'POST') {
          stored = (JSON.parse(String(init.body)) as { data: string }).data
          return Promise.resolve(new Response(JSON.stringify({ id: 'abc123' }), { status: 200 }))
        }
        if (url.endsWith('/api/links/abc123') && stored) {
          return Promise.resolve(new Response(JSON.stringify({ data: stored }), { status: 200 }))
        }
        return Promise.resolve(new Response('not found', { status: 404 }))
      },
      async () => {
        const { url, id } = await createShortLink('http://sidecar.test/', rec())
        expect(id).toBe('abc123')
        expect(url).toMatch(/^http:\/\/sidecar\.test\/x\/abc123#k=[A-Za-z0-9_-]+$/)
        const parts = parseShortLinkLocation('/x/abc123', '#' + url.split('#')[1])
        expect(parts).not.toBeNull()
        const fetched = await fetchShortLink('http://sidecar.test', parts!.id, parts!.key)
        expect(fetched).not.toBeNull()
        expect(fetched!.name).toBe('Rib swatch')
        expect(fetched!.doc.placements).toHaveLength(1)
        expect(fetched!.doc.placements[0].symbolId).toBe('k')
      },
    )
  })

  it('fetchShortLink rejects envelopes stamped by a sibling app', async () => {
    const envelope = JSON.stringify({
      app: 'dimknit',
      version: 1,
      name: 'Knit chart',
      savedAt: 1,
      doc: createEmptyDoc('Knit chart'),
    })
    const { blob, key } = await encryptSharePayload(await deflateBytes(envelope))
    await withSidecarStub(
      () => Promise.resolve(new Response(JSON.stringify({ data: blob }), { status: 200 })),
      async () => {
        expect(await fetchShortLink('http://sidecar.test', 'abc', key)).toBeNull()
      },
    )
  })

  it('fetchShortLink rejects tampered sidecar data', async () => {
    const { blob, key } = await encryptSharePayload(await deflateBytes(JSON.stringify({ app: 'dimcrochet' })))
    const tampered = blob.slice(0, -2) + (blob.endsWith('AA') ? 'BB' : 'AA')
    await withSidecarStub(
      () => Promise.resolve(new Response(JSON.stringify({ data: tampered }), { status: 200 })),
      async () => {
        expect(await fetchShortLink('http://sidecar.test', 'abc', key)).toBeNull()
      },
    )
  })

  it('decodeShareFragment gates on the app id too', async () => {
    const own = '#c=' + (await deflateToBase64Url(JSON.stringify({
      app: 'dimcrochet',
      version: 1,
      name: 'Own chart',
      savedAt: 1,
      doc: createEmptyDoc(),
    })))
    const sibling = '#c=' + (await deflateToBase64Url(JSON.stringify({
      app: 'dimknit',
      version: 1,
      name: 'Knit chart',
      savedAt: 1,
      doc: createEmptyDoc(),
    })))
    expect((await decodeShareFragment(own))?.name).toBe('Own chart')
    expect(await decodeShareFragment(sibling)).toBeNull()
  })
})
