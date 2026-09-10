# Changelog

All notable changes to DimCrochet are documented here. The format loosely
follows [Keep a Changelog](https://keepachangelog.com/); the project is not
yet 1.0, so versions start at 0.5.0 — no license requires any particular
numbering scheme. This file summarizes the (public) git commit history; the
repository log remains the complete, transparent record.

## [Unreleased]

### Added

- **DimKnit** (`apps/dimknit`) — a sibling app for knitting charts, built on
  the same shared chart-editor kernel: CYC-style knit palette, serpentine row
  reading with RS/WS-aware written instructions, follow mode, stitch-count
  accounting, learn-to-knit starters, SVG/PNG export, its own container image
  (`ghcr.io/daimaah/dimknit`, released with `dimknit-v*` tags) and its own
  per-app browser storage. DimCrochet is unaffected — same features, same
  formats, same image, and charts never cross between the two apps.

### Changed

- **Toolchain majors:** TypeScript 7 (native compiler), Vite 8 (native
  rolldown build — noticeably faster builds) and vitest 5. Also cleans up a
  handful of lazy imports that Vite 8 flags as ineffective (they never
  actually split a chunk). No runtime behaviour changes.
- **Shared chart editor is now craft-agnostic.** The crochet palette, bundled
  symbol sets, regional terminology and the round-reading follow logic are
  injected into the shared shell (canvas, symbol registry, exports, editor
  state) through a registered craft module instead of being hard-wired — the
  architectural step that lets sibling craft apps share the same editor. No
  user-facing changes: same app, same features, same behaviour.
- Repository restructured as the DimCraft monorepo (`packages/core` +
  `apps/dimcrochet`): the craft-agnostic chart-editor kernel (document model,
  geometry toolkit, interchange formats, storage, routing) now lives in a
  shared core package.

### Fixed

- Short-link sidecar: oversized upload payloads could get their 413 response
  lost when the connection was torn down mid-reply; the request is now
  drained so the error reliably reaches the client.
- Short-link sidecar: unknown `/api/…` routes fell through to the app and
  served HTML with a 200; the API namespace now answers 404 instead.

## [0.8.0] — 2026-09-09

Community groundwork and animation polish: symbol packs get a curated
community shelf with automated provenance checks, the project opens up to
contributors with a proper guide, the physical stitch animations are redrawn
where they looked broken, the fabric preview can tint each round, and the CI
pipeline moves to the Node-24 actions.

### Added

- **Per-round colourways in the 2D fabric preview** — the Preview dialog lists
  every detected round with its own colour picker (defaulting to the yarn
  colour), so doilies and mandalas can be eye-balled in their real colour
  changes; the magic ring and backstitch lines keep the base yarn colour, and
  a reset returns everything to it.
- **Community symbol packs** — the project now curates community-made symbol
  packs in a `packs/` folder: submit by pull request or issue (no Git skills
  needed — attach the file exported from the app), and CI validates every
  pack's format, license provenance and SVG hygiene automatically. A
  CONTRIBUTING guide, issue templates for symbol reports and pack
  submissions, a README section and an in-app nudge in the Licenses dialog
  round out the invitation.

### Changed

- **Infra maintenance** — GitHub Actions bumped to the Node-24 runtime majors
  (checkout@v5, setup-node@v7, docker actions v4/v4/v6/v7), clearing the
  Node 20 deprecation warnings, with Dependabot keeping actions and npm
  dependencies current from now on.

### Fixed

- **PDF exports were blank pages** — svg2pdf.js renders asynchronously and the
  export never awaited it, so the downloaded PDF held an empty page while the
  chart rendered fine on screen. Present since the PDF feature shipped; caught
  by the Dependabot smoke test for the jsPDF 4 bump (which itself is safe).
- **"How stitches work" animations redrawn where they looked broken** — tall
  stitches now show their real loop count (treble's 5, bobble's 7, puff's 8
  all sit on the shaft instead of piling at the tip); a yarn-over wrap
  settles behind the loop stack as the thread finishes its sweep instead of
  blinking on top of an existing loop; pulled-up loops are drawn with the
  working yarn running through the fabric stitch into the loop; and
  pull-throughs show the consumed loops sliding off the hook tip with the
  yarn drawn along the shaft through them, rather than fading in place.

## [0.7.0] — 2026-09-09

Routing, validation and drawing-tool cycle: designs get their own URLs, the
pattern importer reads asterisk repeats and increases/decreases, rounds show
stitch counts, and the version history dialog renders properly.

### Added

- **Chart URLs** — opening a design puts `#/chart/<id>` in the address bar:
  refreshing or bookmarking reopens it, and the browser Back/Forward buttons
  move between the gallery and designs. The bare root always opens the gallery.
- **Stitch-count check** — every round in the follow pill and the written
  instructions ends with "(N sts)", and the instructions dialog flags rounds
  that break the constant flat-circle growth of the same-stitch run before
  them (the rule every reference teaches: sc +6, hdc +8, dc +12 — "add as
  many stitches each round as you started with"). Decreases, stitch changes
  and short runs stay exempt; the check was written after researching
  published conventions.
- **Z-order controls** — To front / Forward / Backward / To back for selected
  stitches in the Inspector, plus `Ctrl+]` / `Ctrl+[` (Shift for the ends).
  Contiguous selections move as a block; no-op commands don't pollute undo.
- **Pattern import: asterisk repeats** — `*2 dc, ch 1*; repeat from * 3 more
  times` expands to 4 passes (the style-guide reading of "repeat from * N
  times" is N+1, noted in the dialog); `*…* N times` counts N; uncounted
  "repeat to end" warns instead of guessing.
- **Pattern import: increases & decreases** — new `sc2tog` / `hdc2tog`
  symbols (with technique animations via the height-fallback), `dc2tog`
  style words now parse (previously mis-read as one stitch), "2 sc together"
  / "single crochet 2 together" phrases in both word orders, the amigurumi
  words `dec` → sc2tog and `inc` → 2 sc, and "2 dc in each st" / "inc in
  each st" rounds expand against the previous round's stitch count.
- **Status-bar version link** — the designer status bar shows the version at
  its right edge; clicking opens the version history.
- **"Changes coming in next version" section** in the version history view,
  listing unreleased work for develop-branch ("beta") builds.

### Changed

- **Version history dialog** renders entry markdown — headings, bullet
  lists, bold lead-ins, inline code and links — instead of raw changelog
  lines.
- **My designs listing** — human-friendly edited ages ("5 minutes ago",
  "yesterday") with the exact timestamp on hover; entries a week and older
  fall back to a full date+time. Timestamps follow the 24-hour clock setting.
- **Docker tags** — every push to `main` refreshes `latest` alongside `main`,
  and the `develop` branch publishes `develop` builds (release tags `vX.Y.Z`
  stay pinned).

### Fixed

- The Danger zone's type-to-confirm label rendered literal `\u201c` escapes
  instead of curly quotes.

## [0.6.0] — 2026-09-09

Interface refinement cycle: the design view becomes customizable and the
dialogs become movable.

### Added

- **Options dialog** (⚙ in the tool palette) with General / Buttons /
  Danger zone tabs: design-view animations on/off, 24-hour clock,
  left-handed view, sidecar URL, toolbar opacity (rest + hover pair, with a
  30% safe minimum), tool-palette layout (one/two rows), and per-button
  show/hide + drag & drop reordering with live icon previews.
- **Danger zone** — delete all local data (charts, settings, clipboard)
  behind a type-"reset" confirmation, for a true fresh start.
- **Draggable dialogs** — every dialog can be moved by its title bar
  (grab/grabbing cursor) and is clamped to stay fully on screen.
- **My designs sorting** — last updated (newest/oldest) and name (A–Z/Z–A).
- **Version history view** — clickable version under the gallery brand
  shows the current release highlighted plus the last five entries.
- **AI assistance attribution** in the Licenses dialog, naming the Z.AI
  models in use.

### Changed

- **Tool palette redesign** — floating palette with a permanent left island
  (drag grip + collapse/expand, always in the same spot), a tools-only
  collapsed state, editable zoom with bounce, one/two-row layout, and a
  default position aligned with the sidebar buttons.
- **Side panels** — collapse chevrons folded into the panel title rows
  (double chevrons both sides), animated collapse/expand, no dead header
  rows.
- **Follow bar** — compact pill keeps its spot, auto-fit width, rest/hover
  opacity support.

## [0.5.0] — 2026-09-08

First numbered release. Everything below landed in this cycle.

### Added

- **Chart editor** — crochet round & motif charts on guides (circle, arc,
  spiral, line, polygon) with even placement, 90+ symbols in four sets
  (Standard, Japanese-style, Solid print, International variants from
  Wikimedia Commons), custom SVG symbol import, groups/layers, repeat
  brackets, backstitch lines, text labels, snapping, and full undo/redo.
- **Exports** — SVG, transparent PNG (2×/4×), vector PDF (A4/Letter,
  optional true-scale via gauge), single-chart and symbol-pack JSON files.
- **Written instructions** — round-by-round text derived from the chart,
  and the reverse: paste written patterns (including CrochetPARADE-style
  input) to generate a suggested chart.
- **Follow mode** — round-following bar with stitch-by-stitch playback in
  true working order, "Show me how" technique animations, compact pill
  mode, and position persistence.
- **Stitch animations** — "How stitches work" dialog animates the physical
  hook/yarn technique for every palette symbol (authored for core stitches,
  family-stitch blocks for shells/decreases/clusters, height-based
  approximation otherwise); left-handed mirror included.
- **Beginner starter gallery** — five starters of increasing difficulty on
  a dedicated tab; "My designs" tab for saved work.
- **Sharing** — fragment-encoded share links (`#c=…`, nothing uploaded) and
  self-hosted encrypted short links (AES-GCM, key in the fragment, sidecar
  built into the image) with sliding expiry.
- **Backups & clipboard** — one-file backup/restore of all charts plus
  settings, and cross-project copy/cut/paste (Ctrl+C/X/V).
- **Interface** — floating collapsible tool palette with position reset,
  Options dialog (view animations, left-handed view, sidecar URL),
  editable zoom with bounce, collapsible side panels with fullscreen.

### Changed

- **Import pipeline** — consecutive rounds far enough apart for follow
  mode's round grouping.
- **Client-side import hardening** — legacy files migrate on import; the
  universal importer accepts charts, packs, and backups.

### Infrastructure

- Golden fixtures, envelope/shape pinning, and a downgrade shim guarantee
  old exports stay importable; CI gates releases on the test suite.
- Docker image serves the app and the short-link sidecar from one
  container, deployable as a Portainer stack.
- AI-assistance disclosure included (app developed with AI tools,
  human-reviewed, MIT).
