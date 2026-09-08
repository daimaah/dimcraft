# Changelog

All notable changes to DimCrochet are documented here. The format loosely
follows [Keep a Changelog](https://keepachangelog.com/); the project is not
yet 1.0, so versions start at 0.5.0 — no license requires any particular
numbering scheme. This file summarizes the (public) git commit history; the
repository log remains the complete, transparent record.

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
  editable zoom with bounce, one/two-row palette layout, collapsible side
  panels with fullscreen.
- **Versioning** — releases start at 0.5.0 (no license mandates a numbering
  scheme); the running version + commit is shown in the gallery footer and
  the Licenses dialog, and this file summarizes each release transparently
  from the public commit history.

### Changed

- Import pipeline keeps consecutive rounds far enough apart for follow
  mode's round grouping.
- Client-side import hardening: legacy files migrate on import; the
  universal importer accepts charts, packs, and backups.

### Infrastructure

- Golden fixtures, envelope/shape pinning, and a downgrade shim guarantee
  old exports stay importable; CI gates releases on the test suite.
- Docker image serves the app and the short-link sidecar from one
  container, deployable as a Portainer stack.
- AI-assistance disclosure included (app developed with AI tools,
  human-reviewed, MIT).

## [Unreleased]

Changes since 0.5.0 will be listed here as they land.
