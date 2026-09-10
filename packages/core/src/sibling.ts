import { useEffect, useState } from 'react'
import { APP_ID } from './appId'

/**
 * Sibling-app discovery: can the *other* DimCraft app be reached from here?
 *
 * Deployments expose a baked `whoami.json` via the sidecar (`/api/whoami`,
 * permissive CORS, version info only). Discovery probes a small candidate
 * list on the same host — never arbitrary addresses, never cross-protocol
 * (an https app cannot reach an http sibling anyway) — and accepts an
 * explicit user-configured URL for every deployment shape the defaults
 * can't guess (custom ports, reverse-proxy paths, separate hosts).
 */

export interface SiblingInfo {
  url: string
  /** the sibling's app id ('dimcrochet' | 'dimknit') */
  app: string
  version: string
  core?: string
}

const SIBLING_OF: Record<string, string> = { dimcrochet: 'dimknit', dimknit: 'dimcrochet' }
const APP_NAMES: Record<string, string> = { dimcrochet: 'DimCrochet', dimknit: 'DimKnit' }

/** The other app's id, or '' when unknown (future apps). */
export function siblingAppId(): string {
  return SIBLING_OF[APP_ID] ?? ''
}

/** Display name ('DimKnit', 'DimCrochet') or ''. */
export function siblingAppName(): string {
  return APP_NAMES[siblingAppId()] ?? ''
}

// ---- manual companion URL (Options dialog) --------------------------------

function manualKey(): string {
  return `${APP_ID}.siblingUrl`
}

export function getManualSiblingUrl(): string {
  try {
    return localStorage.getItem(manualKey()) ?? ''
  } catch {
    return ''
  }
}

export function saveManualSiblingUrl(url: string): void {
  try {
    const clean = url.trim().replace(/\/+$/, '')
    if (clean) localStorage.setItem(manualKey(), clean)
    else localStorage.removeItem(manualKey())
  } catch {
    /* storage unavailable */
  }
  // galleries re-probe immediately; every listener may too
  window.dispatchEvent(new Event('dimcraft-sibling-changed'))
}

// ---- discovery -------------------------------------------------------------

/** Where the sibling might live: the manual URL if set, else the sibling's
 *  default ports on the same host (skipping our own port and, on https,
 *  http candidates that mixed content would block anyway). */
export function siblingCandidates(): string[] {
  const manual = getManualSiblingUrl()
  if (manual) return [manual]
  if (typeof location === 'undefined') return []
  const own = location.port || (location.protocol === 'https:' ? '443' : '80')
  const ports = ['8080', '8081'].filter((p) => p !== own)
  return ports.map((p) => `${location.protocol}//${location.hostname}:${p}`)
}

/** Probe one base URL; resolves null unless it answers as the sibling app. */
export async function probeSibling(base: string, timeoutMs = 1500): Promise<SiblingInfo | null> {
  const want = siblingAppId()
  if (!want) return null
  try {
    const ctl = new AbortController()
    const timer = setTimeout(() => ctl.abort(), timeoutMs)
    const res = await fetch(`${base}/api/whoami`, { signal: ctl.signal })
    clearTimeout(timer)
    if (!res.ok) return null
    const data = (await res.json()) as { app?: unknown; version?: unknown; core?: unknown }
    if (data?.app !== want) return null
    return {
      url: base,
      app: want,
      version: typeof data.version === 'string' ? data.version : '',
      core: typeof data.core === 'string' ? data.core : undefined,
    }
  } catch {
    return null
  }
}

/** First valid sibling among the candidates, or null. */
export async function discoverSibling(): Promise<SiblingInfo | null> {
  for (const base of siblingCandidates()) {
    const found = await probeSibling(base)
    if (found) return found
  }
  return null
}

// ---- cached result + React hook --------------------------------------------

function cacheKey(): string {
  return `${APP_ID}.sibling`
}

function readCache(): SiblingInfo | null {
  try {
    const raw = localStorage.getItem(cacheKey())
    if (!raw) return null
    const parsed = JSON.parse(raw) as SiblingInfo
    return parsed?.url && parsed?.app ? parsed : null
  } catch {
    return null
  }
}

function writeCache(info: SiblingInfo | null): void {
  try {
    if (info) localStorage.setItem(cacheKey(), JSON.stringify({ ...info, checkedAt: Date.now() }))
    else localStorage.removeItem(cacheKey())
  } catch {
    /* storage unavailable */
  }
}

/**
 * The reachable sibling app, if any. Returns the cached answer immediately
 * and re-probes in the background on every gallery mount (1–2 small
 * requests against the user's own host, aborted after 1.5 s of silence);
 * a 'dimcraft-sibling-changed' event — fired when the manual URL changes —
 * triggers a fresh probe too.
 */
export function useSiblingApp(): SiblingInfo | null {
  const [sibling, setSibling] = useState<SiblingInfo | null>(() => readCache())

  useEffect(() => {
    let alive = true
    const run = () => {
      discoverSibling().then((found) => {
        if (!alive) return
        writeCache(found)
        setSibling(found)
      })
    }
    run()
    window.addEventListener('dimcraft-sibling-changed', run)
    return () => {
      alive = false
      window.removeEventListener('dimcraft-sibling-changed', run)
    }
  }, [])

  return sibling
}