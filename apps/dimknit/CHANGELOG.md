# Changelog

All notable changes to DimKnit are documented here. The format loosely
follows [Keep a Changelog](https://keepachangelog.com/).

## [Unreleased]

### Added

- **"Open DimCrochet →" companion link** — when a DimCrochet deployment
  answers on the same host (default ports), the gallery offers a jump to it;
  verified via the sibling's sidecar identity handshake. A manual companion
  URL can be set in Options → General for custom ports or proxies. When
  detected, the sibling appears as an identity card (its logo, version from
  the handshake and slogan) beside this app's branding, which now carries a
  "this app" chip. The companion-URL field has a **Verify** button (probes
  the entered URL, or the default ports when empty) and shows a live status
  line for auto-detection. (Underlying discovery machinery and the
  `/api/whoami` endpoint are core changes — see the root CHANGELOG.)
- **Legend spacing** — the legend title no longer crowds the first row of
  entries (shared-rendering fix, also in DimCrochet).

### Added

- First development builds of DimKnit: knitting chart composer sharing the
  DimCraft chart-editor kernel.
- CYC-style knitting palette (k, p, yo, k2tog, ssk, s2kp2, no-stitch) and a
  stitch-grid canvas.
- Serpentine row reading with RS/WS-aware written instructions, row-serpentine
  follow mode, stitch-count accounting checks, four learn-to-knit starters,
  SVG/PNG export, per-app storage and encrypted short-link sidecar.

The first numbered release will be **0.1.0**, tagged `dimknit-v0.1.0`.
