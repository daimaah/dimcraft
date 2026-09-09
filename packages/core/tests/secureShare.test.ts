import { describe, expect, it } from 'vitest'
import { decryptSharePayload, encryptSharePayload, parseShortLinkLocation } from '../src/export/secureShare'
import { deflateBytes, inflateBytes } from '../src/export/share'

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
