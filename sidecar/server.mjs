// DimCrochet sidecar — self-hosted encrypted short links + static app server.
//
// Zero runtime dependencies (node:http + node:fs only):
//   POST /api/links      { data: "<base64url ciphertext>" } → { id }   (rate limited)
//   GET  /api/links/:id  → { data }  (sliding expiry, refreshed on access)
//   GET  /x/<id>         → the app (SPA fallback); the app fetches + decrypts
//   GET  anything else   → static files from DIST_DIR
//
// The sidecar only ever stores ciphertext: the decryption key rides in the
// link fragment and never reaches the server. Expired links are deleted.

import http from 'node:http'
import { createReadStream, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { randomBytes } from 'node:crypto'
import { extname, join, normalize, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json',
  '.txt': 'text/plain; charset=utf-8',
  '.woff2': 'font/woff2',
}

const ID_ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'

export function createHandler(opts = {}) {
  const distDir = resolve(opts.distDir ?? './dist')
  const dataDir = resolve(opts.dataDir ?? './data')
  const linksDir = join(dataDir, 'links')
  const maxAgeMs = opts.maxAgeMs ?? 30 * 24 * 3600 * 1000 // 30 days, sliding
  const maxBodyBytes = opts.maxBodyBytes ?? 2_000_000
  const rateLimitMax = opts.rateLimitMax ?? 20
  const rateLimitWindowMs = opts.rateLimitWindowMs ?? 3600 * 1000
  const now = opts.now ?? (() => Date.now())

  mkdirSync(linksDir, { recursive: true })

  const idPath = (id) => join(linksDir, id + '.json')
  const newId = () => {
    const bytes = randomBytes(7)
    let id = ''
    for (const b of bytes) id += ID_ALPHABET[b % ID_ALPHABET.length]
    return id
  }

  const sweep = () => {
    let removed = 0
    try {
      const t = now()
      for (const f of readdirSync(linksDir)) {
        if (!f.endsWith('.json')) continue
        try {
          const rec = JSON.parse(readFileSync(join(linksDir, f), 'utf8'))
          if (rec.expires <= t) {
            rmSync(join(linksDir, f))
            removed++
          }
        } catch {
          rmSync(join(linksDir, f))
          removed++
        }
      }
    } catch {
      /* links dir unreadable — nothing to sweep */
    }
    return removed
  }

  // ---- rate limiting (in-memory, per IP) -----------------------------------
  const postLog = new Map()
  const rateLimited = (ip) => {
    const t = now()
    const list = (postLog.get(ip) ?? []).filter((ts) => t - ts < rateLimitWindowMs)
    if (list.length >= rateLimitMax) {
      postLog.set(ip, list)
      return true
    }
    list.push(t)
    postLog.set(ip, list)
    return false
  }

  const sendJson = (res, status, obj) => {
    const body = JSON.stringify(obj)
    res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' })
    res.end(body)
  }

  const readBody = (req) =>
    new Promise((resolveBody, rejectBody) => {
      const chunks = []
      let size = 0
      req.on('data', (c) => {
        size += c.length
        if (size > maxBodyBytes) {
          rejectBody(Object.assign(new Error('payload too large'), { code: 413 }))
          req.destroy()
          return
        }
        chunks.push(c)
      })
      req.on('end', () => resolveBody(Buffer.concat(chunks).toString('utf8')))
      req.on('error', rejectBody)
    })

  const serveStatic = (res, urlPath) => {
    let rel = decodeURIComponent(urlPath.split('?')[0])
    if (rel === '/') rel = '/index.html'
    const file = normalize(join(distDir, rel))
    if (!file.startsWith(distDir)) {
      res.writeHead(403)
      return res.end()
    }
    let target = existsSync(file) && statSync(file).isFile() ? file : null
    // SPA fallback: extension-less routes (like /x/<id>) serve the app
    if (!target && !extname(rel)) target = join(distDir, 'index.html')
    if (!target || !existsSync(target)) {
      res.writeHead(404)
      return res.end('not found')
    }
    const type = MIME[extname(target)] ?? 'application/octet-stream'
    const immutable = target.replaceAll('\\', '/').includes(`${distDir.replaceAll('\\', '/')}/assets/`)
    res.writeHead(200, {
      'Content-Type': type,
      'Cache-Control': immutable ? 'public, max-age=31536000, immutable' : 'no-cache',
    })
    createReadStream(target).pipe(res)
  }

  return {
    handler: async (req, res) => {
      const url = new URL(req.url ?? '/', 'http://local')
      const ip = req.socket.remoteAddress ?? '?'

      if (url.pathname === '/healthz') return sendJson(res, 200, { ok: true })

      if (req.method === 'POST' && url.pathname === '/api/links') {
        if (rateLimited(ip)) return sendJson(res, 429, { error: 'too many links, try later' })
        let body
        try {
          body = JSON.parse(await readBody(req))
        } catch (err) {
          if (err?.code === 413) return sendJson(res, 413, { error: 'payload too large' })
          return sendJson(res, 400, { error: 'invalid JSON' })
        }
        const data = typeof body?.data === 'string' ? body.data : ''
        if (!data || data.length > maxBodyBytes || !/^[A-Za-z0-9_-]+$/.test(data)) {
          return sendJson(res, 400, { error: 'data must be a base64url string' })
        }
        const t = now()
        const id = newId()
        writeFileSync(idPath(id), JSON.stringify({ data, created: t, lastSeen: t, expires: t + maxAgeMs }))
        return sendJson(res, 200, { id })
      }

      const linkMatch = req.method === 'GET' && /^\/api\/links\/([A-Za-z0-9]+)$/.exec(url.pathname)
      if (linkMatch) {
        const file = idPath(linkMatch[1])
        if (!existsSync(file)) return sendJson(res, 404, { error: 'no such link' })
        try {
          const rec = JSON.parse(readFileSync(file, 'utf8'))
          if (rec.expires <= now()) {
            rmSync(file)
            return sendJson(res, 404, { error: 'link expired' })
          }
          rec.lastSeen = now()
          rec.expires = rec.lastSeen + maxAgeMs // sliding expiry
          writeFileSync(file, JSON.stringify(rec))
          return sendJson(res, 200, { data: rec.data })
        } catch {
          return sendJson(res, 500, { error: 'stored link unreadable' })
        }
      }

      if (req.method === 'GET' || req.method === 'HEAD') return serveStatic(res, url.pathname)
      res.writeHead(405)
      res.end()
    },
    sweep,
  }
}

export function startServer(opts = {}) {
  const { handler, sweep } = createHandler(opts)
  const server = http.createServer((req, res) => {
    Promise.resolve(handler(req, res)).catch(() => {
      try {
        res.writeHead(500)
        res.end()
      } catch {
        /* response already gone */
      }
    })
  })
  const sweepTimer = setInterval(sweep, opts.sweepIntervalMs ?? 3600 * 1000)
  sweepTimer.unref?.()
  sweep()
  return { server, sweep }
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href

if (isMain) {
  const port = Number(process.env.PORT ?? 80)
  const dataDir = process.env.DATA_DIR ?? './data'
  const maxAgeMs = Number(process.env.DIMCROCHET_MAX_AGE_HOURS ?? 720) * 3600 * 1000
  const distDir = process.env.DIST_DIR ?? './dist'
  const { server } = startServer({ dataDir, distDir, maxAgeMs })
  server.listen(port, () => {
    console.log(`DimCrochet sidecar listening on :${port} (links expire after ${Math.round(maxAgeMs / 86400000)} days idle)`)
  })
}
