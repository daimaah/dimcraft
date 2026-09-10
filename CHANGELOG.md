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

- **Sibling-app discovery** — the sidecar now serves a baked `/api/whoami`
  (app id + version, permissive CORS, no user data), and each app probes the
  sibling's default port on the same host: when the other DimCraft app answers
  and identifies itself, the gallery shows an "Open DimKnit / DimCrochet →"
  button. A wrong app on that port is ignored (the handshake is verified). For
  custom ports, reverse-proxy paths or separate hosts, the Options → General
  tab takes a manual companion URL.

### Fixed

- Short-link sidecar: `/api/whoami` 404s cleanly when a deployment's dist has
  no baked identity (dev mode).

### Added

- **DimKnit** (`apps/dimknit`) — a sibling app for knitting charts, built on
  the same core: CYC-style knit palette, serpentine row reading with
  RS/WS-aware written instructions, row-language follow mode, stitch-count
  accounting, learn-to-knit starters, SVG/PNG export. The Docker/Portainer
  stack runs DimCrochet by default and ships a commented dimknit block —
  uncomment it to serve DimKnit alongside (or instead of) DimCrochet on its
  own port. Each app keeps its own browser storage and interchange envelopes
  (`dimcrochet` / `dimknit` app ids) — charts never cross between the two.

### Changed

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

- Short-link sidecar: oversized upload payloads could get their 413 response
  lost when the connection was torn down mid-reply; the request is now
  drained so the error reliably reaches the client.
- Short-link sidecar: unknown `/api/…` routes fell through to the app and
  served HTML with a 200; the API namespace now answers 404 instead.