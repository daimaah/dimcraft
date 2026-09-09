import { serializeProject, } from './projectFile'
import { sanitizeDoc } from '../model/doc'
import { deflateBytes, inflateBytes } from './share'
import type { ChartDoc, ProjectRecord } from '../model/types'

/**
 * Encrypted short links for a self-hosted sidecar: the browser encrypts the
 * chart (AES-GCM-256) before anything leaves it, the decryption key travels
 * only in the URL fragment (never sent to the server), and the sidecar stores
 * an opaque blob it cannot read. Tampering breaks GCM authentication, so a
 * modified blob simply fails to decrypt.
 */

export interface ShortLinkParts {
  id: string
  key: string
}

export const sidecarAvailable = () => typeof crypto !== 'undefined' && !!crypto.subtle

// ---- base64url (same encoding as the fragment share) ----------------------
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

const randomBytes = (n: number) => crypto.getRandomValues(new Uint8Array(n))

// ---- payload crypto --------------------------------------------------------

async function importKey(raw: Uint8Array): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', raw as BufferSource, 'AES-GCM', false, ['encrypt', 'decrypt'])
}

/** Encrypt raw payload bytes. Returns base64url(iv + ciphertext) and the key. */
export async function encryptSharePayload(bytes: Uint8Array): Promise<{ blob: string; key: string }> {
  const rawKey = randomBytes(32)
  const iv = randomBytes(12)
  const key = await importKey(rawKey)
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv as BufferSource }, key, bytes as BufferSource)
  const combined = new Uint8Array(iv.length + ct.byteLength)
  combined.set(iv)
  combined.set(new Uint8Array(ct), iv.length)
  return { blob: base64UrlEncode(combined), key: base64UrlEncode(rawKey) }
}

/** Decrypt a payload. Returns null when the key is wrong or the blob was tampered with. */
export async function decryptSharePayload(blob: string, keyB64: string): Promise<Uint8Array | null> {
  try {
    const combined = base64UrlDecode(blob)
    const iv = combined.subarray(0, 12)
    const ct = combined.subarray(12)
    const key = await importKey(base64UrlDecode(keyB64))
    const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: iv as BufferSource }, key, ct as BufferSource)
    return new Uint8Array(plain)
  } catch {
    return null
  }
}

// ---- sidecar client --------------------------------------------------------

/** Create an encrypted short link on a sidecar: POST the blob, keep the key. */
export async function createShortLink(
  sidecarBase: string,
  rec: ProjectRecord,
): Promise<{ url: string; id: string }> {
  const json = serializeProject(rec)
  const deflated = await deflateBytes(json)
  const { blob, key } = await encryptSharePayload(deflated)
  const base = sidecarBase.replace(/\/+$/, '')
  const res = await fetch(`${base}/api/links`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data: blob }),
  })
  if (!res.ok) throw new Error(`sidecar responded ${res.status}`)
  const { id } = (await res.json()) as { id: string }
  if (!/^[A-Za-z0-9]+$/.test(id)) throw new Error('sidecar returned an invalid link id')
  return { url: `${base}/x/${id}#k=${key}`, id }
}

/** Fetch + decrypt a shared chart from a sidecar. Returns null on any failure. */
export async function fetchShortLink(
  sidecarBase: string,
  id: string,
  key: string,
): Promise<{ name: string; doc: ChartDoc } | null> {
  try {
    const base = sidecarBase.replace(/\/+$/, '')
    const res = await fetch(`${base}/api/links/${encodeURIComponent(id)}`)
    if (!res.ok) return null
    const { data } = (await res.json()) as { data: string }
    const deflated = await decryptSharePayload(data, key)
    if (!deflated) return null
    const json = await inflateBytes(deflated)
    const parsed = JSON.parse(json) as { app?: string; name?: string; doc?: unknown }
    if (parsed.app !== 'dimcrochet' || !parsed.doc) return null
    const doc = sanitizeDoc(parsed.doc)
    if (!doc) return null
    return { name: parsed.name ?? doc.title, doc }
  } catch {
    return null
  }
}

/**
 * Recognize a short-link location served by the sidecar: path /x/<id> with
 * the decryption key in the fragment (#k=...). Returns null otherwise.
 */
export function parseShortLinkLocation(pathname: string, hash: string): ShortLinkParts | null {
  const m = /^\/x\/([A-Za-z0-9]+)$/.exec(pathname)
  const k = /^[?#]?k=([A-Za-z0-9_-]+)$/.exec(hash.startsWith('#') ? hash.slice(1) : hash)
  if (!m || !k) return null
  return { id: m[1], key: k[1] }
}
