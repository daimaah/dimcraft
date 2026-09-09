/**
 * Hash routing: `#/` is the gallery, `#/chart/<projectId>` a design view.
 * The hash (not the path) carries the route so every URL serves the same
 * static index.html — no SPA fallback needed in the sidecar, and the other
 * fragment features (`#c=…` share links, `/x/<id>#k=…` receive) keep their
 * meaning. An empty or unrecognised hash means gallery.
 */

export type Route = { kind: 'gallery' } | { kind: 'chart'; id: string }

const CHART_RE = /^\/chart\/([A-Za-z0-9_-]+)\/?$/

export const GALLERY_HASH = '#/'

export function chartHash(projectId: string): string {
  return `#/chart/${projectId}`
}

export function parseRoute(hash: string): Route {
  const h = hash.startsWith('#') ? hash.slice(1) : hash
  const m = CHART_RE.exec(h)
  return m ? { kind: 'chart', id: m[1] } : { kind: 'gallery' }
}
