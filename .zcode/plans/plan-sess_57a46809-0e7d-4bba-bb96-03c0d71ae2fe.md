# DimCrochet — Crochet Round & Motif Chart Composer

Greenfield build in `C:\dev\dimcrochet` (currently empty). Desktop-first PWA (React + Vite + TypeScript), delivered as a **Docker container deployable as a Portainer stack**. Stateless single-service stack — all chart data lives in the browser's IndexedDB; no accounts, no backend, no uploads.

## Architecture

**Stack:** Vite + React 18 + TypeScript (strict), zustand for state, plain CSS with design tokens (no UI framework), `jspdf` + `svg2pdf.js` for vector PDF export, `idb-keyval` for IndexedDB storage, `vite-plugin-pwa` for offline/installable, vitest for geometry tests.

**Rendering: SVG-first.** The chart is one root `<svg>` with a viewport `<g>` (pan/zoom). Guides, placements, brackets, and legend are SVG groups → hit-testing, crisp symbols, and clean export fall out naturally. PNG/PDF exports derive from the same generated standalone SVG.

**Data model** (JSON-serializable, `schemaVersion`-tagged):
- `SymbolDef` — id, name, editable legend label, viewBox, original stroke `path[]` data, anchor point, intrinsic size, `custom` flag
- `Placement` — a stitch instance: symbolId, x/y, rotation, scale, flip, label override, groupId
- `Guide` — parametric: circle `{c,r}`, arc `{c,r,a0,a1}`, spiral `{c,r0,r1,turns}`, line `{a,b}`, polygon `{c,r,n,rot}`; visible toggle, excluded from export by default
- `RepeatBracket` — arc spanning a run of stitches + count label ("× 6")
- `ChartDoc` — all of the above + legend settings, texts, background

**Undo/redo:** immutable doc snapshots pushed on each committed mutation, capped at 100; drags mutate a draft layer live and commit once on release.

## MVP scope

1. **Canvas** — large pan/zoom vector canvas (wheel zoom to cursor, space/middle-drag pan), optional grid, status bar (coords/zoom/selection).
2. **Symbol palette** — ~18–20 standard symbols hand-drawn as original stroke paths (chain, slip stitch, sc, hdc, dc, tr, dtr, dc2tog/tr3tog clusters, popcorn, puff, bobble, picot, shell, crossed dc, fp/bp dc, spike, magic ring), Craft Yarn Council-style conventions, normalized cap heights. **Custom symbol import:** user SVG → sanitized, normalized into palette. Searchable grid; click/drag to stamp; R rotates, [/] scales while placing.
3. **Guides** — draw circle, arc, spiral, line, polygon on canvas (drag to define); dashed underlay layer; parametric editing in inspector; snap-to-guide points.
4. **Place N stitches evenly along path** — arc-length parameterized sampler (`pointAtLength`/`tangentAtLength` over cumulative-length tables) for true even spacing on every guide type. Dialog: N, start offset, scale, rotation mode (follow tangent / face center / upright). Re-place to update or append.
5. **Editing ops** — marquee + shift multi-select, move, rotate, scale, nudge, duplicate (Ctrl+D), group/ungroup (Ctrl+G), mirror H/V, distribute (H/V/along-guide), z-order, delete, undo/redo. Snapping: symbol anchors, guide endpoints/center, grid, 45° angles — toggleable with visual indicator.
6. **Repeat brackets + automatic legend** — bracket tool drags across a stitch run → curved bracket with auto "× N" (editable); legend derived from the doc (swatch + label + count), positioned on canvas, included in exports, labels editable.
7. **Export** — standalone **SVG** (content-bbox viewBox, chrome stripped, guides off by default), **transparent PNG** at 2×/4×, print-ready vector **PDF** (A4/Letter, orientation, fit-to-page; 300-DPI raster fallback). Project JSON import/export.
8. **Local projects, no account** — gallery start screen (new/open/rename/duplicate/delete, thumbnails), debounced IndexedDB autosave, restores last project, one bundled starter granny-square project.
9. **Keyboard-first** — V/P/G/B/T tools; Ctrl+Z/Shift+Z, Ctrl+D, Ctrl+G, Delete, space pan, Ctrl+wheel zoom.

## Docker / Portainer packaging

**Multi-stage `Dockerfile`** at repo root:
- Stage 1: `node:22-alpine` — `npm ci && npm run build` (typechecked build)
- Stage 2: `nginx:1.27-alpine` — serves `dist/` with custom `nginx.conf`: gzip, immutable cache for hashed `/assets/*`, `no-cache` for `index.html` and `sw.js` (so PWA updates propagate), SPA fallback (`try_files … /index.html`), security headers, healthcheck endpoint.

**`docker-compose.yml`** (the Portainer stack definition), single service:
- `build: .` + `image: dimcrochet:local` — works via `docker compose up -d --build` on the host AND via Portainer's *Repository* deployment (which supports builds)
- `restart: unless-stopped`, healthcheck (`wget` against `/`)
- Port via env var: `ports: - "${DIMCROCHET_PORT:-8080}:80"` — adjustable in Portainer's stack env editor
- No volumes needed (stateless); documented note that user data lives in browsers, so upgrading = redeploy stack

**Portainer deployment paths** (both documented in README):
1. *Repository* stack pointing at this repo → Portainer clones and builds the image itself (works with zero registry)
2. *Web editor* stack with a registry image — optional `.github/workflows/docker.yml` (runs only on GitHub, tags → `ghcr.io/<owner>/dimcrochet`) publishes the image; then the web-editor compose file is just `services: [image + port + restart]`

**Notes:** behind Traefik/Nginx-Proxy-Manager the container is plain HTTP and just works; PWA install/service worker require HTTPS or localhost (secure context) — chart editing itself works fine without them, documented.

## File layout

```
Dockerfile, .dockerignore, docker-compose.yml, docker/nginx.conf
.github/workflows/docker.yml (optional ghcr publish)
src/
  model/       types.ts, doc.ts, migrations
  symbols/     definitions.ts (stroke path data), registry.ts
  geometry/    pathSample.ts, guides.ts, transform.ts
  state/       store.ts, history.ts
  canvas/      ChartCanvas.tsx, layers/*, interactions.ts, snap.ts
  tools/       placement, guideDraw, bracket, text
  export/      svg.ts, png.ts, pdf.ts, projectJson.ts
  storage/     db.ts, gallery
  panels/      SymbolPalette, Inspector, LayersPanel, LegendEditor, ExportDialog
  ui/          Toolbar, StatusBar, dialogs, icons
  App.tsx, main.tsx, styles/
tests/         geometry, legend aggregation, export-svg (vitest)
README.md      (app usage + Portainer deployment guide)
```

## Build order

1. **Scaffold & shell** — Vite react-ts + PWA plugin, app frame, pan/zoom/grid canvas, store skeleton, IndexedDB autosave + gallery.
2. **Model & symbols** — types, symbol registry, palette UI, place/select/move, undo/redo.
3. **Transform ops** — multi-select, duplicate, group, mirror, distribute, rotate, nudge, snapping.
4. **Guides & even placement** — 5 guide types + param editors, arc-length sampler, "Place N evenly" dialog.
5. **Brackets & legend** — bracket tool, count labels, derived legend with positioning/label editing.
6. **Export** — SVG → PNG → PDF (+ project JSON).
7. **Docker packaging** — Dockerfile, nginx.conf, .dockerignore, compose stack, README Portainer guide, optional ghcr workflow; build the image and smoke-test the container locally.
8. **Polish** — shortcuts, PWA icons/manifest, starter project, empty states.
9. **Verify** — vitest green, production build, container smoke test (build image, `docker compose up`, load the app, place a round of dc on a circle guide, bracket a repeat, check legend, export SVG/PNG/PDF), visual review of rendered pages.

## Risks & notes

- **Symbol artwork is the credibility make-or-break**: all stroke-based paths drawn from scratch (no fill, consistent stroke widths, normalized cap heights), so scaling and export stay clean and there are no licensing questions.
- `jspdf`/`svg2pdf.js` pinned to a compatible pair; vector PDF expected to work since we generate the export SVG ourselves, raster fallback as insurance.
- If Docker isn't available on this machine during verification, the compose stack is still delivered and syntax-checked; container smoke test would then be deferred to your Portainer host.

End result: `git clone` → Portainer stack → browser at `:8080` → draw a circle guide, drop 12 dc stitches evenly around it, bracket "× 6", read the auto-legend, export SVG/PNG/PDF.