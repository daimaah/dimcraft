# DimCraft

**DimCraft is a family of sister apps for yarn-craft charting** — one repository, one shared
chart-editor kernel, two separate products with their own identity, releases and container images:

| App | Craft | Version | Container image |
|---|---|---|---|
| **DimCrochet** | crochet round & motif charts | v0.9.0 | `ghcr.io/daimaah/dimcrochet` |
| **DimKnit** | knitting charts | v0.1.0 | `ghcr.io/daimaah/dimknit` |

Both apps embed the **DimCraft core** — the shared chart-editor kernel
(`packages/core`) plus the short-link sidecar — versioned independently as
`core-vX.Y.Z` (currently core v0.1.0). DimCraft itself has no version number:
you deploy an app at *its* version, and the apps pick up core versions on
their next releases (see [Versioning](#versioning)). Both apps share the
kernel (document model, geometry, canvas, exports, interchange with the same
format-compatibility guarantees), while everything craft-specific — symbols,
reading direction, written instructions, animations — is the app's own. One
Docker/Portainer stack file can run either app or both side by side
([Deploy](#deploy-with-docker--portainer)).

## DimCrochet

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
- **One-file backup**: the gallery footer has **⭳ Backup everything** (every chart + all settings — panel state, follow-bar pill, lefty mode, clipboard, preferences — in one JSON file) and **⭱ Restore backup** to bring it into any browser. Restoring merges by chart id and never touches unrelated charts.
- **Follow mode**: step through the chart round by round — the current round's stitches stay in full ink while the rest fade, the round text shows in a **movable bar that auto-fits the canvas** and can shrink to a compact pill in the same spot (state kept across sessions), and progress is saved with the project (`F`). **Stitch playback** builds the chart stitch by stitch in true working order (counterclockwise, as a right-handed crocheter works joined rounds — rounds are not turned): play/pause, step stitch-by-stitch (`←`/`→` when nothing is selected, `Space` to play), speed control, a pulsing marker on the next stitch, and the fabric "grows" as worked stitches light up
- **How stitches work (2D technique animations)**: animated, step-by-step side-view guides for the physical motions. The nine core stitches (slip knot, chain, slip stitch, single/half double/double/treble crochet, dc2tog, magic ring) have hand-authored choreographies; family stitches (shells, popcorn, puff, bobble, picot, FPdc/BPdc, crossed dc, blo/flo, multi-stitch decreases) are composed from the same primitive blocks, and **every other palette symbol falls back to the standard motion of the same stitch height** (marked as an approximation). Each animation plays with plain-language captions, live "loops on hook" counts, per-step replay and speed control; follow mode's **▶ Show me how** opens the animation for the round you're on; a **Left-handed** toggle mirrors both the animations and the working order. Decompositions are unit-tested against the standard instructions
- **Written pattern → chart**: paste round-based instructions ("R1: [3 dc, ch 2] × 4 …") and get a suggested chart — stitch abbreviations, counts and bracketed repeats are parsed via regional terminology presets, **asterisk repeats** ("*2 dc, ch 1*; repeat from * 3 more times") expand with the style-guide reading stated in the dialog, and **increases/decreases** are understood ("2 dc in next st", "2 sc together", `sc2tog`/`hdc2tog`/`dc2tog`, amigurumi `inc`/`dec`, "2 dc in each st" doubling from the previous round). Rounds are laid out radially and everything stays fully editable. CrochetPARADE-style patterns (with `DEF:`, `COLOR:` and position anchors) are auto-detected and converted too
- **Written instructions**: the Rounds dialog derives round-by-round text from the chart ("R1: [3 dc, ch 2] × 4 (20 sts)"), detecting rounds by distance from the centre and collapsing repeating units — copy or download as .txt. A **stitch-count check** flags rounds that break the constant flat-circle growth of the previous rounds (sc +6, hdc +8, dc +12), with decreases and stitch changes staying exempt
- **Stitch groups**: even-placement rounds, groups and loose stitches appear as toggleable layers (hide/show; hidden stitches are skipped in exports, legend and the fabric preview)
- **Gauge & true-scale PDF**: set a gauge (units per 10 cm) to see the finished size and print the PDF at true scale
- **2D fabric preview**: see the motif as simulated crocheted fabric — yarn-styled stitches with a sheen, optional handmade jitter, yarn & background colours, **per-round colourways** (each detected round gets its own yarn colour — doilies and mandalas preview in their real colour changes), one-click PNG download
- **Editing**: marquee + shift multi-select, move/rotate/scale, nudge, duplicate, group, mirror H/V, distribute, align edges/centers (left/center/right/top/middle/bottom), **z-order restacking** (To front / Forward / Backward / To back, `Ctrl+]`/`Ctrl+[`), snapping to guide points & anchors, full undo/redo, and **cross-project copy/cut/paste** (Ctrl+C/X/V; the gallery offers "Paste as new chart" while a fragment is on the clipboard). Editing/view tools live in a **floating tool palette** over the canvas — draggable, collapsible, one/two-row layout, position resettable, per-button show/hide + reorder (Options → Buttons)
- **Repeat brackets** with automatic “× N” counts and an **automatic legend** (symbol swatch, editable labels, stitch counts)
- **Export**: standalone SVG (tight viewBox, editor chrome stripped), transparent PNG at 2×/4×, vector PDF (A4/Letter, portrait/landscape, true-scale option), and project/symbol-pack `.json` files
- **Share links**: embed a compressed copy of the chart in a URL — no server, no upload; opening a link imports it as a new local copy
- **Local projects**: gallery with rename/duplicate/delete, drag-and-drop import of chart and symbol-pack files, debounced autosave to IndexedDB, bundled granny-square starter chart. **Designs get their own URL** (`#/chart/<id>`) — refreshing or bookmarking reopens exactly that chart and Back/Forward moves between gallery and designs; the bare root always opens the gallery
- Works fully offline once loaded (PWA / service worker)

## Run locally (development)

```bash
npm install
npm run dev        # DimCrochet on http://localhost:5173
npm run dev:knit   # DimKnit   on http://localhost:5174
```

Tests:

```bash
npm test           # vitest — core + both apps
npm run typecheck  # TypeScript across all packages
```

Production build:

```bash
npm run build      # typechecks, then emits apps/dimcrochet/dist/
npm run build -w @dimcraft/dimknit   # DimKnit's bundle
npm run preview
```

## Deploy with Docker / Portainer

A single container serves everything: the app's static build and the self-hosted short-link sidecar are baked into the same image (one Node process — no second service, no nginx). Charts live in each visitor's browser (IndexedDB); the only server-side state is the sidecar's short-link store in `/data`, which the volume mapping below preserves across redeploys.

The same repository builds **both apps**: DimCrochet (this chart composer) and DimKnit (the knitting sibling, `apps/dimknit`). Both run by default from the repository's `docker-compose.yml` — DimCrochet on `8080`, DimKnit on `8081`, each with its own data volume, and they detect each other automatically. Only need one of them? Comment the other service block out — that's the whole switch.

### Portainer — Repository method (builds the image for you)

1. **Stacks → Add stack**
2. Name: `dimcrochet`, Build method: **Repository**
3. Repository URL: `https://github.com/daimaah/dimcraft.git`; Compose path: `docker-compose.yml`
4. **Update the stack** — Portainer clones the repo and builds the image
5. Open `http://your-server:8080`

The repository is public — Portainer can clone it without credentials.

Ports are environment variables in the stack editor: `DIMCROCHET_PORT = 3000`, `DIMKNIT_PORT = 9090` (defaults: `8080` / `8081`). To drop one app, comment its service block out. With both enabled, the apps detect each other automatically — the `SIBLING_PORT` wiring in the compose file follows your port variables (see **Linking the two apps** below).

### Portainer — Web editor method (pre-built image)

The [GitHub workflow](.github/workflows/docker.yml) publishes pre-built images to GHCR: every push to `main` updates the `main` **and** `latest` tags, and every version tag publishes the version plus `latest` (`vX.Y.Z` for DimCrochet, `dimknit-vX.Y.Z` for DimKnit). Paste this as the stack:

```yaml
services:
  dimcrochet:
    image: ghcr.io/daimaah/dimcrochet:latest
    container_name: dimcrochet
    restart: unless-stopped
    ports:
      - "8080:80"
    environment:
      # tells the browser where DimKnit lives (follows the port below)
      - SIBLING_PORT=8081
    volumes:
      - dimcrochet-data:/data   # encrypted short-link store

  dimknit:   # comment this block out to run DimCrochet only
    image: ghcr.io/daimaah/dimknit:latest
    container_name: dimknit
    restart: unless-stopped
    ports:
      - "8081:80"
    environment:
      # tells the browser where DimCrochet lives (follows the port above)
      - SIBLING_PORT=8080
    volumes:
      - dimknit-data:/data   # encrypted short-link store

volumes:
  dimcrochet-data:
  dimknit-data:
```

The volume mapping matters: `/data` holds the sidecar's encrypted short links, and without it every stack update starts from an empty store, breaking previously shared links. Pin `v0.9.0` (DimCrochet) or `dimknit-v0.1.0` (DimKnit) instead of `latest` if you want upgrades to be explicit. The images are public on GHCR — pulling needs no login. `latest` (and `main`) track the newest passing `main` build for each app.

#### Linking the two apps

When both apps run, they find each other automatically and show an **Open DimKnit / DimCrochet →** button on their projects screens — a wrong app on a probed port is ignored. Detection needs no manual setup:

- **Repository stack / compose file** — each service carries a `SIBLING_PORT` environment variable pointing at the other app's host port (it follows `DIMKNIT_PORT` / `DIMCROCHET_PORT` automatically), so the default two-app stack pairs out of the box. The sidecar advertises the port on `/api/whoami`, and the frontends pair up even on fully custom ports.
- **Same host, default ports** — even without the env wiring, the frontends probe `8080`/`8081` as a fallback.
- **Reverse-proxy paths, separate hosts** — set `SIBLING_URL` (a full base URL) on a service instead of `SIBLING_PORT`, or leave it to each user's manual **Companion app URL** in Options → General. Serving both under one origin with path routing (`/crochet/`, `/knit/`) needs no detection at all — relative links just work.

  Separate domains, for example, wire up like this:

  ```yaml
  services:
    dimcrochet:
      environment:
        - SIBLING_URL=https://knit.daimaah.fi
    dimknit:
      environment:
        - SIBLING_URL=https://crochet.daimaah.fi
  ```

### Plain Docker / docker compose

```bash
docker compose up -d --build   # build & run both apps: 8080 + 8081
# comment out one of the service blocks in docker-compose.yml to run just one
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
| `Ctrl+]` / `Ctrl+[` | Raise / lower the selection one level in paint order |
| `Ctrl+Shift+]` / `Ctrl+Shift+[` | Selection to front / to back |
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

## DimKnit

**Knitting chart composer** — the knitting sibling
([its own README](apps/dimknit/README.md)): a knitting chart is an *operation matrix* read
serpentine, not a picture of the finished fabric, so DimKnit shares DimCrochet's editor but speaks
knitting:

- **CYC-style knit palette** — knit (blank cell), purl (dot), yarn over, k2tog / ssk / centered
  double decrease, and grey "no stitch" placeholders for shaping
- **Serpentine rows** — Row 1 sits at the bottom and is a right-side row worked right-to-left;
  wrong-side rows read left-to-right, each cell translated through the RS/WS duality
  (blank cell = knit on RS but *purl* on WS, `k2tog` becomes `p2tog`, …)
- **Written instructions** run-length-encoded the way patterns print them (`k4, p2, k4`) and a
  **stitch-count accounting check** — yarn overs add a stitch, decreases take one away, and the
  app flags rows where the counts stop balancing
- **Row-language follow mode** (same movable/auto-fitting bar), four learn-to-knit starters
  (stockinette, 2×2 rib, seed stitch, eyelet lace), and **knit-aware mirroring** — flipping a
  selection swaps leaning decreases for their true mirror image (k2tog ↔ ssk), the way the
  fabric actually reverses
- **Colourwork and chart furniture**: yarn palette with MC/CC1… naming painted cell by cell
  (legend, instructions and follow mode carry the colours), repeat brackets, row/column numbers,
  insert/delete of rows and columns, and a two-axis gauge that renders cells at their true
  aspect and prints true-scale PDFs
- **The same editor shell**: floating customizable action bar, inspector sidebar, SVG/PNG/PDF
  export, encrypted share links, own browser storage and `.dimknit.json` files — charts never
  cross between the two apps

DimKnit is public and deployable today, and honest about its age: the charting core is
release-quality and colourwork is in, while cables and in-the-round charts are still on the
roadmap — see [its README](apps/dimknit/README.md) for status and positioning.

## File format & compatibility

Chart and symbol-pack files use a versioned envelope (`{ app, version, name, doc }`) — keyed per
app (`dimcrochet` / `dimknit`), so a crochet chart and a knitting chart are never confused: each
app only opens its own envelopes and rejects the sibling's cleanly. Every import path — file
picker, drag-and-drop, IndexedDB — funnels through one migration gate in the shared core, so
files exported by older app versions keep opening, and unknown fields from newer versions are
preserved rather than dropped. Real export fixtures live in `packages/core/tests/fixtures/` and
are exercised by the test suite on every run, so format drift is caught before it ships. When the
schema changes, regenerate or hand-commit fixtures from the previous version:

```bash
GEN_FIXTURES=1 npx vitest run apps/dimcrochet/tests/gen-fixtures.test.ts
```

## Versioning

**Each app versions independently, and the shared layer versions on its own; DimCraft as a whole
has no version.** Every version names a real artifact — the app you deploy, or the kernel it
embeds:

- **DimCrochet** is versioned `vX.Y.Z` (currently **v0.9.0**, numbering started at v0.5.0 — no
  license dictates a scheme): git tags `v0.9.0`, image `ghcr.io/daimaah/dimcrochet:v0.9.0`,
  summarized in the [app changelog](apps/dimcrochet/CHANGELOG.md).
- **DimKnit** is versioned `dimknit-vX.Y.Z` (first release **v0.1.0**): git tags
  `dimknit-v0.1.0`, image `ghcr.io/daimaah/dimknit:dimknit-v0.1.0`, summarized in
  [its own changelog](apps/dimknit/CHANGELOG.md).
- **DimCraft core** — the shared chart-editor kernel, the short-link sidecar and the shared
  build/deploy infra — is versioned `core-vX.Y.Z` (currently **core v0.1.0**): bumped only when
  something ships to *both* apps, summarized in the root
  [CHANGELOG.md](CHANGELOG.md). A core release never forces an app release; each app picks it up
  on its next one.

The three cadences are independent — a DimKnit patch never moves DimCrochet's number, and
vice versa. The running versions are shown inside each app (gallery footer and version display
show `v<app> · core <kernel>`, so a bug report can name both).

Branching: day-to-day work lands on the `develop` branch (published as the `develop` Docker tag
for both apps); `main` carries released code — every push to `main` is a passing build, tagged
`main` and `latest` on GHCR, and a formal release adds a `vX.Y.Z` (DimCrochet), `dimknit-vX.Y.Z`
(DimKnit) or `core-vX.Y.Z` (shared layer, tests run but no images) tag.

## Contributing & community packs

Contributions are open and welcome — code, docs, terminology presets, glyph
reviews and symbol packs. [CONTRIBUTING.md](CONTRIBUTING.md) has the setup,
the branch model and the PR conventions.

You don't need to code to grow the symbol library: **draw or collect SVG
symbols, import them into a custom set in the app, and export a pack**
(Symbols & region → Export pack). Packs shared through pull requests or
issues land in the curated [`packs/`](packs/README.md) folder — CI checks the
format, license and provenance of every pack automatically, and each one
keeps its own license and authors, shown in-app under **Licenses &
attributions**. Found a glyph that doesn't match what your region's charts
use? The *Symbol report* issue template is the place to say so.

## Privacy & sharing

Everything stays in your browser by default: charts live in IndexedDB, exports download straight from the page, and the app works fully offline. Sharing is always an explicit act:

- **Share links** (Export → Create share link) embed a compressed copy of the chart *in the URL fragment* — the part of a URL that is never sent to any server. There is no backend and no upload. Anyone with the link can view the chart, and opening it creates a new local copy; treat the link like the file it contains.
- **Encrypted short links** (Export → Short link) for sharing through chat apps, where very long URLs get mangled: the chart is encrypted in your browser (AES-GCM-256), and only the ciphertext is stored on a sidecar you control. The decryption key rides in the link fragment, so the sidecar cannot read the pattern, and tampering fails closed. Links expire after 30 days of not being opened (configurable). The sidecar ships **inside the same image** — serve DimCrochet from it and the short-link API comes with it, no extra container:

  ```yaml
  services:
    dimcrochet:
      build: .
      ports: ["8080:80"]
      volumes: ["dimcrochet-data:/data"]   # stores encrypted short links
  volumes:
    dimcrochet-data:
  ```

  Note: creating encrypted links needs a secure context — open the app via HTTPS or localhost.
- **Files** (Save .json file / Load chart or pack file) work the same way and have no size limit — prefer them for very large charts or archival backups.
- Symbol packs keep their own licenses and attributions (see Licenses & attributions in the app).

## AI assistance disclosure

The DimCraft apps were designed and developed with the assistance of Z.AI large language models — **GLM-5.3-Flash** (primary) and **GLM-5.3** — including code generation, symbol artwork drafting, and documentation. All code is human-reviewed and released under the [MIT License](LICENSE) without warranty. The Standard, Japanese-style and Solid print symbol sets were drawn for this project; the International variants set consists of third-party Wikimedia Commons artwork under its own per-file licenses. DimKnit's knitting symbols are likewise original artwork for the project, checked against the Craft Yarn Council chart conventions. Model attribution is kept up to date in the in-app Licenses & attributions dialog as the models in use change.

## License & symbols

Both apps are released under the **MIT License** (see [LICENSE](LICENSE)). The Standard (CYC-style), Japanese-style and Solid print symbol sets are original artwork created for DimCrochet under the same license. The **International variants (Commons)** set contains third-party Wikimedia Commons artwork under per-file licenses (CC BY-SA / CC BY / CC0 / Public Domain) — attribution for every symbol is shown in-app under **Licenses & attributions** (ⓘ in the toolbar, or the link on the projects screen), and travels inside exported packs. Imported symbol packs keep **their own licenses** the same way. DimKnit's knitting symbols are original artwork created for DimKnit, following Craft Yarn Council chart conventions. Terminology follows widely published chart conventions; labels are editable per chart for regional differences (e.g. “tr” vs “dtr” UK/US conventions).
