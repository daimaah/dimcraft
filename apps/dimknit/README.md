# DimKnit — knitting chart composer

Draw knitting charts on a stitch grid: place stitches into cells, read the
chart the way knitting is actually worked, and export it for other knitters.
DimKnit is the knitting sibling of [DimCrochet](https://github.com/daimaah/dimcraft) —
the two apps share the same chart-editor kernel (the `packages/core` package
in this repository) while keeping their own craft, identity and data.

## What it does

- **Stitch grid charts** — knit, purl, yarn over, decreases and "no stitch"
  placeholders drawn with Craft Yarn Council–style symbols.
- **Serpentine row reading** — Row 1 sits at the bottom and is a right-side
  row worked right-to-left; wrong-side rows read left-to-right. Follow mode
  walks the chart stitch by stitch in true working order.
- **RS/WS-aware written instructions** — a chart shows the right side of the
  fabric; the written instructions apply the duality for you (a blank cell is
  a knit on RS but a purl on WS) and run-length-encode repeats the way
  patterns print them (`k4, p2, k4`).
- **Stitch-count accounting** — yarn overs add a stitch, decreases take one
  away; the app checks row by row that the counts balance and flags rows
  where they don't.
- **Export** — SVG (vector) and PNG. Charts save automatically in your
  browser; nothing is uploaded anywhere.

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
