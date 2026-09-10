# Changelog — DimCraft core

All notable changes to the **DimCraft core** — the shared chart-editor kernel
(`packages/core`), the self-hosted short-link sidecar (`sidecar/`), and the
shared build/deploy infrastructure — are documented here. The format loosely
follows [Keep a Changelog](https://keepachangelog.com/).

The core is versioned independently of the apps: git tags `core-vX.Y.Z`,
bumped only when something ships to both apps (kernel, sidecar, or shared
infra). The apps pick up a core version on their next release. App-specific
changes live in each app's own changelog:
[DimCrochet](apps/dimcrochet/CHANGELOG.md) ·
[DimKnit](apps/dimknit/CHANGELOG.md).

## [Unreleased]

### Added

- **The editor shell is now part of the core** — the floating action bar (`ui/ToolPalette`), the
  context-sensitive inspector sidebar (`ui/Inspector`), the Options "Buttons" customization tab,
  and the toolbar-opacity controls moved from DimCrochet into the kernel so both apps render the
  same shell from one implementation. Apps flavour them through the craft seam.
- **Craft seam capabilities** — `paletteTools` (each app lists its own action-bar tools),
  `mirrorSymbol` (stitch-aware horizontal mirroring), and gating flags (`terminologyPresets`,
  `symbolPacks`, `gauge`) so panels only render what a craft can actually use.
- **DimKnit is public-facing** — the READMEs now say so out loud: a "why another knitting chart
  tool" positioning block and an honest status note in DimKnit's README (young app, release-quality
  core, growing craft surface), refreshed feature lists (PDF export, share links, the shared
  editor shell, knit-aware mirroring) and a keyboard-shortcut table.
- **Colourwork model** — `Placement.colour` (per-stitch yarn colour, undefined = chart ink) and
  `ChartDoc.yarns` (the chart's yarn palette with MC/CC1… naming conventions) are part of the
  shared document model, sanitized on import; the legend grows a yarns section (swatch, name,
  count) in canvas previews and every export, and the shared inspector gains the yarn editor and
  selection colour swatches for crafts that opt in (`craft.colourwork`). Grid crafts can also opt
  into `craft.replaceOnStamp`: stamping on an occupied cell re-works that cell instead of stacking
  a second stitch on it.

### Added (M6 — publication furniture)

- **Chart furniture in the core**: row/column numbering — rendered beside the grid in the canvas
  and every export, driven by a `craft.gridInfo` hook and per-document numbering toggles — and
  insert/delete of whole rows and columns for grid crafts (`craft.rowsAndColumns`): an empty band
  slides in and the rest of the chart shifts aside; deleting removes the band and closes the gap,
  one undo step each.
- **Gauge-correct cells** — with a two-axis gauge (stitches and rows per 10 cm via `craft.gauge`
  label2), chart cells render at their true aspect in the canvas and exports instead of squares,
  and the PDF's true-scale mode prints each axis by its own gauge (`unitsPer10cmY`).

### Changed

- `mirrorSelection` consults `craft.mirrorSymbol` when present: on a horizontal mirror the craft
  swaps directional stitches for their mirror image (knitting's k2tog ↔ ssk) instead of flipping
  the artwork. Crafts without the hook keep the pure-geometry behaviour.
- Symbol-pack exports write the app-scoped envelope via `APP_ID` (byte-identical output for
  DimCrochet; the pack machinery is now shared).

### Fixed

- **The action bar's zoom controls (− % +) wrap as one block**: when the floating palette runs
  out of width, the whole zoom cluster moves to the next row together instead of stranding the
  − button at the end of the row. Buttons the user deliberately dragged apart still render
  individually.

## [0.1.0] — 2026-09-10

First release of the DimCraft core: the craft-agnostic chart-editor kernel
extracted from DimCrochet into a monorepo package shared by DimCrochet and
DimKnit — document model, geometry toolkit, interchange and storage, exports,
the shared editor shell, and the zero-dependency short-link sidecar. Storage
keys and interchange envelopes are keyed by an injected app id; sibling-app
discovery runs through the sidecar's `/api/whoami` handshake with
deployment-configured pairing (`SIBLING_PORT` / `SIBLING_URL`); share receive
paths accept only the serving build's own envelopes.

### Added

- **Sibling-app discovery with a two-brand front page** — the sidecar now serves a baked `/api/whoami`
  (app id + version, permissive CORS, no user data), and each app probes the
  sibling's default port on the same host: when the other DimCraft app answers
  and identifies itself, the gallery shows an "Open DimKnit / DimCrochet →"
  button. A wrong app on that port is ignored (the handshake is verified). For
  custom ports, reverse-proxy paths or separate hosts, the Options → General
  tab takes a manual companion URL. On the projects screen the detected
  sibling appears as an identity card (its logo, version from the handshake
  and slogan) beside the active app's own branding, which now carries a
  "this app" chip. The Options companion-URL field gains a **Verify**
  button (probes the entered URL, or the default ports when empty) and a
  live status line that always states whether and where the sibling app is
  currently detected.

- **DimKnit** (`apps/dimknit`) — a sibling app for knitting charts, built on
  the same core: CYC-style knit palette, serpentine row reading with
  RS/WS-aware written instructions, row-language follow mode, stitch-count
  accounting, learn-to-knit starters, SVG/PNG export. The Docker/Portainer
  stack runs DimCrochet by default and ships a commented dimknit block —
  uncomment it to serve DimKnit alongside (or instead of) DimCrochet on its
  own port. Each app keeps its own browser storage and interchange envelopes
  (`dimcrochet` / `dimknit` app ids) — charts never cross between the two.

### Changed

- **Sibling pairing is deployment-configured.** The sidecar now reads
  `SIBLING_PORT` (a host port) or `SIBLING_URL` (a full base URL, for proxies
  and separate hosts) and advertises the hint on `/api/whoami`; the shipped
  `docker-compose.yml` wires it to follow `DIMKNIT_PORT` /
  `DIMCROCHET_PORT`, so a stack with both apps enabled needs no manual
  companion-URL entry — even on custom ports. The stack runs **both apps by
  default** (DimCrochet 8080, DimKnit 8081); to drop one, comment its service
  block out. Discovery order in both
  frontends: the user's manual URL, then the deployment's advertisement,
  then the default-port probe (8080/8081), and the Options status line now
  states which path found the sibling ("via this deployment's
  configuration" / "on the default ports").

- **Share receive paths are app-id aware.** The fragment-share decoder and
  the short-link receiver (`fetchShortLink`) used to hard-code the
  DimCrochet app id; both now validate the envelope against the serving
  build's own app id via the shared project-envelope parser. Behaviour for
  DimCrochet is unchanged, and DimKnit gains working share links — a
  sibling app's link simply fails to parse instead of loading a chart with
  foreign stitch semantics.

- Repository restructured as the DimCraft monorepo: the craft-agnostic
  chart-editor kernel (document model, geometry toolkit, interchange formats,
  storage, routing) now lives in `packages/core`, and the apps import it as
  `@dimcraft/core/…` with the package boundary making kernel→app imports a
  compile error. Before 2026-09-10 the shared layer was versioned as part of
  DimCrochet (v0.5.0–v0.8.0 — see the app's changelog); the core starts its
  own numbering at 0.1.0.
- **The shared chart editor is craft-agnostic.** The palette, bundled symbol
  sets, terminology and the chart-reading follow logic are injected into the
  shared shell (canvas, symbol registry, exports, editor state) through a
  registered craft module instead of being hard-wired to crochet.
- **Toolchain majors:** TypeScript 7 (native compiler), Vite 8 (native
  rolldown build) and vitest 5 across all packages.
- Interchange envelopes and per-app storage are keyed by an injected app id;
  each app only opens its own files and rejects the sibling's cleanly
  (byte-identical behaviour for existing DimCrochet files).

### Fixed

- Short-link sidecar: `/api/whoami` 404s cleanly when a deployment's dist has
  no baked identity (dev mode).

- Short-link sidecar: oversized upload payloads could get their 413 response
  lost when the connection was torn down mid-reply; the request is now
  drained so the error reliably reaches the client.
- Short-link sidecar: unknown `/api/…` routes fell through to the app and
  served HTML with a 200; the API namespace now answers 404 instead

.