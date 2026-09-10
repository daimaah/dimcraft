# DimKnit — knitting chart composer

Draw knitting charts on a stitch grid: place stitches into cells, read the
chart the way knitting is actually worked, and export it for other knitters.
DimKnit is the knitting sibling of [DimCrochet](https://github.com/daimaah/dimcraft) —
the two apps share the same chart-editor kernel (the `packages/core` package
in this repository) while keeping their own craft, identity and data.

**Why another knitting chart tool?** The existing options tend to be paid
subscriptions, dormant desktop downloads, or free tiers with size caps and
paywalled basics. DimKnit is **free and open source, self-hosted, with no
account, no stitch caps and nothing paywalled** — and it bridges design and
knitting time: follow mode reads the chart's rows out, stitch by stitch,
while you work. And because the source is open, the tool can always be
picked up if its maintainers ever step away.

> **Status:** DimKnit is young but real. The charting core — grid editing, row reading,
> stitch-count validation, written instructions, follow mode, exports and sharing — is tested and
> release-quality, and the craft surface keeps growing: colourwork, repeat brackets, row/column
> numbering, chart resizing and gauge-true printing are in. Cables and in-the-round charts are
> next on the roadmap. What's missing today is scope, not stability —
> [issue reports](https://github.com/daimaah/dimcraft/issues) help decide
> what gets built next.

## What it does

- **Stitch grid charts** — knit, purl, yarn over, decreases and "no stitch"
  placeholders drawn with Craft Yarn Council–style symbols.
- **Serpentine row reading** — Row 1 sits at the bottom and is a right-side
  row worked right-to-left; wrong-side rows read left-to-right.
- **RS/WS-aware written instructions** — a chart shows the right side of the
  fabric; the written instructions apply the duality for you (a blank cell is
  a knit on RS but a purl on WS) and run-length-encode repeats the way
  patterns print them (`k4, p2, k4`).
- **Stitch-count accounting** — yarn overs add a stitch, decreases take one
  away; the app checks row by row that the counts balance and flags rows
  where they don't.
- **Follow mode** — step through the chart row by row (or stitch by stitch)
  in true working order, the current row spelled out in a movable bar, with
  playback and speed control.
- **Colourwork** — build a yarn palette (MC, CC1, CC2…), arm a yarn and paint cells; colours
  show in the legend, written instructions (`k3 CC1, k2tog MC`), follow mode and every export.
- **Chart from picture** — turn a logo, silhouette or pixel-art image into a colourwork chart:
  choose the chart width and yarn count, clean stray pixels, pick the background treatment, and
  compare live against the original before creating anything.
- **Chart furniture** — repeat brackets with auto-counts and ×N labels, row numbers printed where
  each row starts (right for RS rows, left for WS rows), column numbers along the bottom, and
  insert/delete of whole rows and columns.
- **Gauge & true-scale PDF** — set stitches and rows per 10 cm: cells take their real aspect (no
  square-knitting-cell compromise) and the vector PDF prints at true size.
- **2D fabric preview** — see the chart as simulated knitted fabric (Vs, bumps, eyelets) in
  your yarn colours, and download it as a PNG.
- **Knit-aware editing** — the same editor shell as DimCrochet: a floating,
  customizable action bar (undo/redo, snapping, zoom, fullscreen), an
  inspector sidebar for selection and chart properties, and **mirroring that
  swaps leaning decreases for their true mirror image** (k2tog ↔ ssk) the way
  the fabric actually reverses.
- **Learn-to-knit starters** — stockinette, 2×2 rib, seed stitch and eyelet
  lace, each card saying what you'll learn.
- **Export & share** — vector PDF (A4) alongside SVG and PNG; share links
  that carry the chart inside the URL itself, or encrypted short links
  through your own self-hosted sidecar. Charts save automatically in your
  browser; nothing is uploaded anywhere.

## Keyboard shortcuts

| Keys | Action |
| --- | --- |
| `V` `P` `B` `H` `F` | Select · Place stitch · Repeat bracket · Pan · Follow mode |
| `Delete` | Delete selection |
| `Ctrl+D` | Duplicate selection |
| `Ctrl+Z` / `Ctrl+Shift+Z` / `Ctrl+Y` | Undo / redo |
| `Ctrl+E` | Export dialog |
| Arrows | Nudge the selection one cell |
| `Ctrl +` `Ctrl -` `Ctrl+0` | Zoom in · out · fit chart |
| Space-drag / middle-drag | Pan the view |
| Wheel · Ctrl+wheel | Pan · zoom |
| In follow mode: `←` `→` `Space` | Step stitch · play/pause |

## Deploying (Docker / Portainer)

Same delivery model as DimCrochet: one container serves the app plus the
self-hosted encrypted short-link sidecar. The repository's root
`docker-compose.yml` runs **both apps by default** — DimCrochet on 8080,
DimKnit on 8081, each with its own data volume, detecting each other
automatically. Only want knitting? Comment the DimCrochet service block out
(and vice versa) and deploy:

```bash
docker compose up -d --build   # both apps: 8080 + 8081
```

As a Portainer stack, point the stack at the `dimcraft` repository with the
compose path `docker-compose.yml`. Images are also pre-built on every passing
run as `ghcr.io/daimaah/dimknit` (`develop` tracks the development branch,
`latest` the newest passing main build, `dimknit-vX.Y.Z` the releases — pin a
version for deployments).

## Development

From the repository root:

```bash
npm install
npm run dev:knit   # DimKnit on http://localhost:5174
npm test           # core + both apps' test suites
npm run typecheck  # TypeScript across all packages
```

## AI assistance disclosure

This project is built with the assistance of AI coding tools (Z.AI GLM
models via ZCode). All chart symbols, domain conventions and instructions
output are checked against published knitting-industry references (Craft
Yarn Council chart standards and published pattern conventions) by a human
maintainer. Issue reports about symbol accuracy or domain conventions are
especially welcome.

## License

MIT — see the repository license. Symbol artwork is original to DimKnit;
bundled symbol sets keep their own stated licenses.
