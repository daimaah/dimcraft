# DimCrochet

**Crochet round & motif chart composer** — draw granny squares, doilies, lace motifs and circular crochet charts in the browser, then export a clean SVG, transparent PNG or print-ready PDF. No account, no uploads: every chart lives in your browser's local storage.

See [ROADMAP.md](ROADMAP.md) for what's planned next and notes on design decisions.

## Features

- **Vector canvas** with pan/zoom, grid, and keyboard-first editing (`V` select, `P` place, `B` bracket, `T` text, `1–5` guides); **collapsible side panels** and a **full-screen mode** for maximum chart space
- **90+ crochet symbols** in four bundled sets — Standard (CYC-style), Japanese-style, Solid print, and **International variants** (70 symbols from Wikimedia Commons, per-file attribution included) — plus **custom SVG symbol import**
- **Regional terminology presets**: one-click legend relabelling for US/UK English, Svenska, Norsk, Dansk, Suomi, Deutsch, Nederlands, Français, Español, Italiano and Русский; import/export symbol packs as JSON so communities can share authentic national sets
- **Guides**: circle, arc, spiral, line and regular polygon — drawn on canvas, edited numerically or by dragging handles
- **“Place N stitches evenly along a guide”** with true arc-length spacing and three stitch orientations (radiate out / follow path / upright)
- **Backstitch lines**: draw chart line-work (surface/backstitch rows) from stitch to stitch with anchor snapping; reshape by dragging point handles, insert/remove points, close into loops; exported as solid strokes and listed in the legend
- **Learn-with-starters gallery**: five built-in starter charts in increasing difficulty — the chain, a single-crochet coaster, a double-crochet coaster, the classic granny square, and a granny circle — each card saying what you'll learn. The gallery splits into **Learn with starters** and **My designs** tabs (starters by default until you save something), with a pulsing "My designs" badge until you've found it. Round starters are generated through the written-pattern pipeline, so their charts and instructions always agree
- **Follow mode**: step through the chart round by round — the current round's stitches stay in full ink while the rest fade, the round text shows in a **movable bar that auto-fits the canvas** and can shrink to a compact pill in the same spot (state kept across sessions), and progress is saved with the project (`F`). **Stitch playback** builds the chart stitch by stitch in true working order (counterclockwise, as a right-handed crocheter works joined rounds — rounds are not turned): play/pause, step stitch-by-stitch (`←`/`→` when nothing is selected, `Space` to play), speed control, a pulsing marker on the next stitch, and the fabric "grows" as worked stitches light up
- **How stitches work (2D technique animations)**: animated, step-by-step side-view guides for the physical motions. The nine core stitches (slip knot, chain, slip stitch, single/half double/double/treble crochet, dc2tog, magic ring) have hand-authored choreographies; family stitches (shells, popcorn, puff, bobble, picot, FPdc/BPdc, crossed dc, blo/flo, multi-stitch decreases) are composed from the same primitive blocks, and **every other palette symbol falls back to the standard motion of the same stitch height** (marked as an approximation). Each animation plays with plain-language captions, live "loops on hook" counts, per-step replay and speed control; follow mode's **▶ Show me how** opens the animation for the round you're on; a **Left-handed** toggle mirrors both the animations and the working order. Decompositions are unit-tested against the standard instructions
- **Written pattern → chart**: paste round-based instructions ("R1: [3 dc, ch 2] × 4 …") and get a suggested chart — stitch abbreviations, counts and bracketed repeats are parsed via regional terminology presets, rounds are laid out radially, and everything stays fully editable. CrochetPARADE-style patterns (with `DEF:`, `COLOR:` and position anchors) are auto-detected and converted too
- **Written instructions**: the Rounds dialog derives round-by-round text from the chart ("R1: [3 dc, ch 2] × 4"), detecting rounds by distance from the centre and collapsing repeating units — copy or download as .txt
- **Stitch groups**: even-placement rounds, groups and loose stitches appear as toggleable layers (hide/show; hidden stitches are skipped in exports, legend and the fabric preview)
- **Gauge & true-scale PDF**: set a gauge (units per 10 cm) to see the finished size and print the PDF at true scale
- **2D fabric preview**: see the motif as simulated crocheted fabric — yarn-styled stitches with a sheen, optional handmade jitter, yarn & background colours, one-click PNG download
- **Editing**: marquee + shift multi-select, move/rotate/scale, nudge, duplicate, group, mirror H/V, distribute, align edges/centers (left/center/right/top/middle/bottom), snapping to guide points & anchors, full undo/redo
- **Repeat brackets** with automatic “× N” counts and an **automatic legend** (symbol swatch, editable labels, stitch counts)
- **Export**: standalone SVG (tight viewBox, editor chrome stripped), transparent PNG at 2×/4×, vector PDF (A4/Letter, portrait/landscape, true-scale option), and project/symbol-pack `.json` files
- **Share links**: embed a compressed copy of the chart in a URL — no server, no upload; opening a link imports it as a new local copy
- **Local projects**: gallery with rename/duplicate/delete, drag-and-drop import of chart and symbol-pack files, debounced autosave to IndexedDB, bundled granny-square starter chart
- Works fully offline once loaded (PWA / service worker)

## Run locally (development)

```bash
npm install
npm run dev        # http://localhost:5173
```

Tests:

```bash
npm test           # vitest
```

Production build:

```bash
npm run build      # typechecks, then emits dist/
npm run preview
```

## Deploy with Docker / Portainer

The container is **stateless** — it serves the static build via nginx. All user data lives in each visitor's browser (IndexedDB), so there is nothing to back up on the host and **upgrading is just a redeploy**.

### Portainer — Repository method (builds the image for you)

1. **Stacks → Add stack**
2. Name: `dimcrochet`, Build method: **Repository**
3. Repository URL: this repository's Git URL; Compose path: `docker-compose.yml`
4. **Update the stack** — Portainer clones the repo and builds the image
5. Open `http://your-server:8080`

To change the port, add an environment variable in the stack editor: `DIMCROCHET_PORT = 3000`.

### Portainer — Web editor method (pre-built image)

If you publish the image to a registry (the included [GitHub workflow](.github/workflows/docker.yml) pushes `ghcr.io/<owner>/<repo>` on every push to `main`), paste this as the stack:

```yaml
services:
  dimcrochet:
    image: ghcr.io/YOUR_OWNER/dimcrochet:main
    container_name: dimcrochet
    restart: unless-stopped
    ports:
      - "8080:80"
```

### Plain Docker / docker compose

```bash
docker compose up -d --build   # build & run on http://localhost:8080
```

### Reverse proxy & HTTPS notes

- Behind Traefik / Nginx Proxy Manager / Caddy the container is plain HTTP on port 80 — point your proxy at it as usual.
- Chart editing works over plain HTTP. Installing the app as a PWA (and offline caching) requires a **secure context** — HTTPS, or access via `localhost`. Behind a reverse proxy with a TLS certificate, everything works.

## Keyboard shortcuts

| Keys | Action |
| --- | --- |
| `V` `P` `L` `H` `B` `T` `F` | Select · Place · Backstitch · Pan · Bracket · Text · Follow mode |
| `1`–`5` | Circle · Arc · Spiral · Line · Polygon guide |
| `R`, `Shift+R` | Rotate placed symbol ±15° (while in place mode) |
| `[` `]` | Scale placed symbol down/up |
| `Ctrl+Z` / `Ctrl+Shift+Z` | Undo / redo |
| `Ctrl+D` | Duplicate selection |
| `Ctrl+G` / `Ctrl+Shift+G` | Group / ungroup |
| `Ctrl+E` | Export dialog |
| Arrows (+`Shift`) | Nudge selection by 1 (10) units |
| `Ctrl +` `Ctrl-` `Ctrl+0` | Zoom in · out · fit |
| Space-drag / middle-drag / hand tool | Pan the view |
| Wheel / two-finger scroll | Pan (Shift+wheel: horizontal) |
| Ctrl/Cmd + wheel or pinch | Zoom |
| `Delete` | Delete selection |

## Tips for round charts

1. Press `1` and drag to draw a circle guide.
2. Select the guide → **Place stitches evenly…** → e.g. 12 dc, “Radiate out”.
3. Press `B`, click the first and last stitch of a repeated section — the bracket suggests a count you can edit.
4. The legend updates automatically; drag it where you want it on the page.
5. `Ctrl+E` → export SVG (for editing/printing), PNG (for patterns and Etsy listings) or PDF.
6. `Ctrl+E` → **Create share link** to send the chart to someone — it travels inside the link, no server involved.

## File format & compatibility

Chart and symbol-pack files use a versioned envelope (`{ app, version, name, doc }`). Every import path — file picker, drag-and-drop, IndexedDB — funnels through one migration gate, so files exported by older versions of DimCrochet keep opening, and unknown fields from newer versions are preserved rather than dropped. Real export fixtures live in `tests/fixtures/` and are exercised by the test suite on every run, so format drift is caught before it ships. When the schema changes, regenerate or hand-commit fixtures from the previous version:

```bash
GEN_FIXTURES=1 npx vitest run tests/fixtures/gen-fixtures.test.ts
```

## Privacy & sharing

Everything stays in your browser by default: charts live in IndexedDB, exports download straight from the page, and the app works fully offline. Sharing is always an explicit act:

- **Share links** (Export → Create share link) embed a compressed copy of the chart *in the URL fragment* — the part of a URL that is never sent to any server. There is no backend and no upload. Anyone with the link can view the chart, and opening it creates a new local copy; treat the link like the file it contains.
- **Files** (Save .json file / Load chart or pack file) work the same way and have no size limit — prefer them for very large charts or archival backups.
- Symbol packs keep their own licenses and attributions (see Licenses & attributions in the app).

## AI assistance disclosure

DimCrochet was designed and developed with the assistance of AI tools (including code generation, symbol artwork drafting, and documentation). All code is human-reviewed and released under the [MIT License](LICENSE) without warranty. The Standard, Japanese-style and Solid print symbol sets were drawn for this project; the International variants set consists of third-party Wikimedia Commons artwork under its own per-file licenses.

## License & symbols

DimCrochet is released under the **MIT License** (see [LICENSE](LICENSE)). The Standard (CYC-style), Japanese-style and Solid print symbol sets are original artwork created for DimCrochet under the same license. The **International variants (Commons)** set contains third-party Wikimedia Commons artwork under per-file licenses (CC BY-SA / CC BY / CC0 / Public Domain) — attribution for every symbol is shown in-app under **Licenses & attributions** (ⓘ in the toolbar, or the link on the projects screen), and travels inside exported packs. Imported symbol packs keep **their own licenses** the same way. Terminology follows widely published chart conventions; labels are editable per chart for regional differences (e.g. “tr” vs “dtr” UK/US conventions).
