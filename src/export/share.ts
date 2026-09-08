import { serializeProject } from './projectFile'
import { sanitizeDoc } from '../model/doc'
import type { ChartDoc, ProjectRecord } from '../model/types'

export const SHARE_PREFIX = '#c='

// ---- base64url (browser-safe, chunked to avoid call-stack limits) ---------
function base64UrlEncode(bytes: Uint8Array): string {
  let bin = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function base64UrlDecode(s: string): Uint8Array {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (s.length % 4)) % 4)
  const bin = atob(b64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return bytes
}

export async function deflateToBase64Url(text: string): Promise<string> {
  const bytes = await deflateBytes(text)
  return base64UrlEncode(bytes)
}

export async function deflateBytes(text: string): Promise<Uint8Array> {
  const stream = new Blob([text]).stream().pipeThrough(new CompressionStream('deflate'))
  return new Uint8Array(await new Response(stream).arrayBuffer())
}

export async function inflateFromBase64Url(encoded: string): Promise<string> {
  return inflateBytes(base64UrlDecode(encoded))
}

export async function inflateBytes(bytes: Uint8Array): Promise<string> {
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate'))
  return await new Response(stream).text()
}

/**
 * Encode a project into a URL fragment. The fragment is never sent to any
 * server — the entire chart travels inside the link itself.
 */
export async function createShareFragment(rec: ProjectRecord): Promise<string> {
  const json = serializeProject(rec)
  return SHARE_PREFIX + (await deflateToBase64Url(json))
}

/** Build a full share link from a fragment. */
export function shareLink(fragment: string): string {
  return `${location.origin}${location.pathname}${fragment.startsWith('#') ? '' : '#'}${fragment}`
}

/** Decode a share fragment back into a chart. Returns null when invalid. */
export async function decodeShareFragment(fragment: string): Promise<{ name: string; doc: ChartDoc } | null> {
  let enc = fragment.startsWith(SHARE_PREFIX) ? fragment.slice(SHARE_PREFIX.length) : fragment
  enc = enc.trim()
  if (!enc) return null
  try {
    const json = await inflateFromBase64Url(enc)
    const parsed = JSON.parse(json) as { app?: string; name?: string; doc?: unknown }
    if (parsed.app !== 'dimcrochet' || !parsed.doc) return null
    const doc = sanitizeDoc(parsed.doc)
    if (!doc) return null
    return { name: parsed.name ?? doc.title, doc }
  } catch {
    return null
  }
}

/** Read the share fragment (if any) from the current location. */
export function locationShareFragment(): string | null {
  const h = location.hash
  return h.startsWith(SHARE_PREFIX) ? h : null
}

/** Approximate share-link length for a document, without compressing. */
export function estimateShareLength(doc: ChartDoc): number {
  return Math.ceil((JSON.stringify(doc).length * 0.22) | 0) + 40
}
