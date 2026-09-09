// Builds the Wikimedia Commons "International variants" symbol pack.
//
// COMPLIANCE (https://www.mediawiki.org/wiki/Wikimedia_APIs/Access_policy
//             https://www.mediawiki.org/wiki/Wikimedia_APIs/Rate_limits):
// - identifies itself via User-Agent with a contact address (set the
//   DIMCROCHET_CONTACT env variable, or edit UA below, before running)
// - serial requests only, never more than 1 concurrent
// - media downloads throttled to ≥1.2 s apart
// - 429/503: waits the Retry-After header's value exactly, else ≥5 s
// - every response is cached on disk; re-running fetches only what's missing
//
// HOW TO RUN (repeat until complete — each run is resumable):
//   DIMCROCHET_CONTACT="you@example.com" npm run commons-pack
// If Wikimedia has temporarily blocked this IP for earlier unthrottled
// requests, wait (blocks usually lift within the hour), then re-run.
// The pack in src/symbols/generated/ is rewritten on every successful run.
import { writeFile, mkdir, readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const CONTACT = process.env.DIMCROCHET_CONTACT ?? 'set-DIMCROCHET_CONTACT-or-edit-scripts/build-commons-pack.mjs'
const UA = `DimCrochet-pack-builder/1.0 (${CONTACT})`

const API = 'https://commons.wikimedia.org/w/api.php'
const CATEGORY = 'Category:Crochet_symbols'

const json = async (params) => {
  const url = `${API}?${new URLSearchParams({ format: 'json', origin: '*', ...params })}`
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await politeFetch(url)
    if (res.text) return JSON.parse(res.text)
    const wait = res.retryAfter ?? [5000, 10000, 20000][attempt]
    console.log(`  API rate-limited (${res.status}), waiting ${Math.round(wait / 1000)}s…`)
    await sleep(wait)
  }
  throw new Error('Wikimedia API remained rate-limited after retries — re-run later.')
}

const stripTags = (html) =>
  String(html ?? '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()

async function categoryFiles() {
  const members = []
  let cont = {}
  do {
    const j = await json({
      action: 'query',
      list: 'categorymembers',
      cmtitle: CATEGORY,
      cmtype: 'file',
      cmlimit: 'max',
      ...cont,
    })
    members.push(...(j.query?.categorymembers ?? []).map((m) => m.title))
    cont = j.continue ? j.continue : {}
  } while (Object.keys(cont).length)
  return members.filter((f) => f.toLowerCase().endsWith('.svg'))
}

async function fileMetadata(titles) {
  const out = new Map()
  for (let i = 0; i < titles.length; i += 25) {
    const batch = titles.slice(i, i + 25)
    const j = await json({
      action: 'query',
      titles: batch.join('|'),
      prop: 'imageinfo',
      iiprop: 'url|extmetadata',
      iiextmetadatafilter: 'LicenseShortName|Artist|ImageDescription',
    })
    for (const page of Object.values(j.query?.pages ?? {})) {
      const info = page.imageinfo?.[0]
      if (!info) continue
      out.set(page.title, {
        url: info.url,
        license: stripTags(info.extmetadata?.LicenseShortName?.value) || 'unknown',
        artist: stripTags(info.extmetadata?.Artist?.value) || 'unknown',
        description: stripTags(info.extmetadata?.ImageDescription?.value),
      })
    }
  }
  return out
}

const OK_LICENSE = /(cc0|public domain|cc by(-sa)?( [0-9.]+)?($| ))|cc by(?!-nc)|cc by-sa/i
const isPermissive = (license) => /cc0|public domain|pd|cc by(-sa)?/i.test(license) && !/non-free|fair use|nc|nd/i.test(license)

function normalizeSvg(svgText, symbolId) {
  let body = svgText
    .replace(/<\?xml[\s\S]*?\?>/g, '')
    .replace(/<!DOCTYPE[\s\S]*?>/g, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<(title|desc|metadata)[\s\S]*?<\/\1>/gi, '')
  const open = body.match(/<svg[^>]*>/i)?.[0] ?? ''
  const viewBox = open.match(/viewBox="([^"]+)"/i)?.[1]
  const wAttr = parseFloat(open.match(/\bwidth="([\d.]+)/i)?.[1] ?? '')
  const hAttr = parseFloat(open.match(/\bheight="([\d.]+)/i)?.[1] ?? '')
  let [, mx, my, mw, mh] = (viewBox ?? '').split(/[\s,]+/).map(Number)
  if (!Number.isFinite(mw) || !Number.isFinite(mh) || mw <= 0 || mh <= 0) {
    mw = Number.isFinite(wAttr) ? wAttr : 24
    mh = Number.isFinite(hAttr) ? hAttr : 24
    mx = 0
    my = 0
  }
  let inner = body.slice(body.indexOf(open) + open.length, body.toLowerCase().lastIndexOf('</svg>'))
  inner = inner.replace(/<style[\s\S]*?<\/style>/gi, '')
  inner = inner.replace(/\s*class="[^"]*"/g, '')

  // de-duplicate element ids so multiple symbols can coexist on one page
  inner = inner.replace(/\bid="([^"]+)"/g, `id="c${symbolId}-$1"`)
  inner = inner.replace(/url\(#([^)]+)\)/g, `url(#c${symbolId}-$1)`)
  inner = inner.replace(/xlink:href="#([^"]+)"/g, `xlink:href="#c${symbolId}-$1"`)

  // theme: black strokes/fills become @INK@ (white stays as knockout)
  inner = inner
    .replace(/#000000/gi, '@INK@')
    .replace(/#000(?![0-9a-fA-F])/gi, '@INK@')
    .replace(/"(black)"/gi, '"@INK@"')
    .replace(/:(black)/gi, ':@INK@')

  // fit viewBox content into the target box (3,4)..(21,30) of the symbol frame
  const targetW = 18
  const targetH = 26
  const s = Math.min(targetW / mw, targetH / mh)
  const tx = 3 + (targetW - mw * s) / 2 - mx * s
  const ty = 4 + (targetH - mh * s) / 2 - my * s

  const themed = inner.includes('@INK@') ? inner : inner.replace(/<(?!\/)/g, (m) => m) // keep as-is when colours are structural
  return `<g transform="translate(${tx.toFixed(3)} ${ty.toFixed(3)}) scale(${s.toFixed(5)})">${themed}</g>`
}

function idFromTitle(title) {
  let name = title.replace(/^File:/, '').replace(/\.svg$/i, '')
  name = name.replace(/-crochet-symbols$/i, '')
  return (
    name
      .replace(/[^a-zA-Z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .toLowerCase() || 'sym'
  )
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// resumable cache so re-runs don't refetch (and re-trip rate limits)
const CACHE_DIR = fileURLToPath(new URL('./.commons-cache/', import.meta.url))
await mkdir(CACHE_DIR, { recursive: true })
const cachePath = (url) => `${CACHE_DIR}/${encodeURIComponent(url)}`

/** Fetch while honouring Retry-After / 429 back-off. Resolves {status, text?, retryAfter?}. */
async function politeFetch(url) {
  const res = await fetch(url, { headers: { 'User-Agent': UA, 'Accept-Encoding': 'gzip' } })
  if (res.status === 429 || res.status === 503) {
    const ra = parseFloat(res.headers.get('retry-after') ?? '')
    return { status: res.status, retryAfter: Number.isFinite(ra) ? ra * 1000 : null }
  }
  if (!res.ok) return { status: res.status }
  return { status: res.status, text: await res.text() }
}

async function fetchWithRetries(url) {
  try {
    return { status: 200, text: await readFile(cachePath(url), 'utf8') }
  } catch {
    /* not cached */
  }
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await politeFetch(url)
    if (res.text) {
      await writeFile(cachePath(url), res.text)
      return { status: 200, text: res.text }
    }
    if (res.status !== 429 && res.status !== 503) return { status: res.status }
    const wait = res.retryAfter ?? [5000, 10000, 20000][attempt]
    console.log(`  rate-limited (${res.status}), waiting ${Math.round(wait / 1000)}s…`)
    await sleep(wait)
  }
  return { status: 429 }
}

let done = 0
const files = await categoryFiles()
console.log(`${files.length} SVG files in category`)
const meta = await fileMetadata(files)

const artwork = {}
const attributions = []
const skipped = []

for (const title of files) {
  done++
  const m = meta.get(title)
  if (!m) {
    skipped.push({ title, reason: 'no metadata' })
    continue
  }
  if (!isPermissive(m.license)) {
    skipped.push({ title, reason: `license: ${m.license}` })
    continue
  }
  await sleep(1200)
  const res = await fetchWithRetries(m.url)
  if (!res.text) {
    skipped.push({ title, reason: `download ${res.status}` })
    console.log(`[${done}/${files.length}] SKIP ${title} (${res.status})`)
    continue
  }
  const svg = res.text
  const id = idFromTitle(title)
  artwork[id] = normalizeSvg(svg, id)
  attributions.push({ id, file: title.replace(/^File:/, ''), license: m.license, artist: m.artist })
  console.log(`[${done}/${files.length}] ok ${id} (${m.license})`)
}

await mkdir('src/symbols/generated', { recursive: true })
const header = `// GENERATED by apps/dimcrochet/scripts/build-commons-pack.mjs — do not edit by hand.
// Source: Wikimedia Commons, Category:Crochet symbols (per-file CC BY-SA / CC BY / CC0 / PD).
import type { CustomSet } from '@dimcraft/core/model/types'

export const commonsVariantsPack: CustomSet & { attributions: { id: string; file: string; license: string; artist: string }[] } = ${JSON.stringify(
  {
    id: 'commons-variants',
    name: 'International variants (Commons)',
    artwork,
    license: 'Per file: CC BY-SA / CC BY / CC0 / Public Domain (see attributions)',
    authors: 'Wikimedia Commons contributors',
    sourceUrl: 'https://commons.wikimedia.org/wiki/Category:Crochet_symbols',
    notes: 'Curated from Wikimedia Commons. Share-Alike applies to CC BY-SA symbols; attribution is listed in Licenses & attributions.',
    attributions,
  },
  null,
  2,
)}
`
await writeFile('src/symbols/generated/commons-variants.ts', header)
console.log(
  `pack: ${Object.keys(artwork).length} symbols, ${attributions.length} attributed, ${skipped.length} skipped`,
)
console.log('ids:', Object.keys(artwork).join(', '))
console.log('skipped:', JSON.stringify(skipped))
