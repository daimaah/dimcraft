// Integration tests for the zero-dependency sidecar (plain ESM — no TS types needed).
import { afterAll, describe, expect, it } from 'vitest'
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { startServer } from '../sidecar/server.mjs'

const makeDist = () => {
  const dir = mkdtempSync(join(tmpdir(), 'dimcrochet-dist-'))
  writeFileSync(join(dir, 'index.html'), '<!doctype html><title>app</title>')
  mkdirSync(join(dir, 'assets'), { recursive: true })
  writeFileSync(join(dir, 'assets', 'index-test.js'), 'console.log(1)')
  return dir
}

const makeDistWithWhoami = () => {
  const dir = makeDist()
  writeFileSync(join(dir, 'whoami.json'), JSON.stringify({ app: 'dimknit', version: '0.1.0', core: '0.1.0' }))
  return dir
}

const contexts = []
async function start(opts = {}) {
  const dataDir = mkdtempSync(join(tmpdir(), 'dimcrochet-links-'))
  const distDir = opts.distDir ?? makeDist()
  const { server } = startServer({ dataDir, distDir, port: 0, ...opts })
  await new Promise((done) => server.listen(0, '127.0.0.1', done))
  const { port } = server.address()
  const base = `http://127.0.0.1:${port}`
  contexts.push(server)
  return { base, dataDir, distDir }
}

afterAll(() => {
  for (const server of contexts) server.close()
})

const post = async (base, body) => {
  const res = await fetch(`${base}/api/links`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return { status: res.status, json: await res.json().catch(() => ({})) }
}
const getLink = async (base, id) => {
  const res = await fetch(`${base}/api/links/${id}`)
  return { status: res.status, json: await res.json().catch(() => ({})) }
}

describe('sidecar', () => {
  it('round-trips an encrypted blob and refreshes the sliding expiry', async () => {
    const { base } = await start()
    const { status, json } = await post(base, { data: 'AbCdEf-_123' })
    expect(status).toBe(200)
    expect(json.id).toMatch(/^[A-Za-z0-9]{7}$/)

    const got = await getLink(base, json.id)
    expect(got.status).toBe(200)
    expect(got.json.data).toBe('AbCdEf-_123')
  })

  it('404s unknown and malformed ids', async () => {
    const { base } = await start()
    expect((await getLink(base, 'zzzzzzz')).status).toBe(404)
    expect((await getLink(base, '../etc-passwd')).status).toBe(404)
  })

  it('rejects non-base64url and oversized payloads', async () => {
    const { base } = await start()
    expect((await post(base, { data: 'not base64!' })).status).toBe(400)
    expect((await post(base, {})).status).toBe(400)
    const { base: tiny } = await start({ maxBodyBytes: 64 })
    expect((await post(tiny, { data: 'A'.repeat(100) })).status).toBe(413)
  })

  it('expires links and deletes them on access', async () => {
    const { base } = await start({ maxAgeMs: -1 })
    const { json } = await post(base, { data: 'AbCdEf-_123' })
    expect((await getLink(base, json.id)).status).toBe(404)
  })

  it('rate limits link creation per IP', async () => {
    const { base } = await start({ rateLimitMax: 3, rateLimitWindowMs: 60_000 })
    for (let i = 0; i < 3; i++) {
      expect((await post(base, { data: 'AbCdEf-_123' })).status).toBe(200)
    }
    expect((await post(base, { data: 'AbCdEf-_123' })).status).toBe(429)
  })

  it('serves the app with a SPA fallback for /x/<id>', async () => {
    const { base } = await start()
    const page = await fetch(`${base}/x/K7mQp3a`)
    expect(page.status).toBe(200)
    expect(await page.text()).toContain('<!doctype html>')
    const asset = await fetch(`${base}/assets/index-test.js`)
    expect(asset.status).toBe(200)
    const missing = await fetch(`${base}/assets/nope.js`)
    expect(missing.status).toBe(404)
  })

  it('serves /api/whoami with permissive CORS when the app baked its identity', async () => {
    const { base } = await start({ distDir: makeDistWithWhoami() })
    const res = await fetch(`${base}/api/whoami`)
    expect(res.status).toBe(200)
    expect(res.headers.get('access-control-allow-origin')).toBe('*')
    expect(await res.json()).toEqual({ app: 'dimknit', version: '0.1.0', core: '0.1.0' })
  })

  it('404s /api/whoami when the dist has no baked identity', async () => {
    const { base } = await start()
    const res = await fetch(`${base}/api/whoami`)
    expect(res.status).toBe(404)
  })
})
