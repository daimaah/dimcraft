# Changelog

All notable changes to DimKnit are documented here. The format loosely
follows [Keep a Changelog](https://keepachangelog.com/).

## [Unreleased]

### Added

- **Colourwork** — the chart's yarn palette lives in the inspector (add yarns, recolour, name
  them MC/CC1/CC2…); under the symbols, a **Yarns** row lets you arm a yarn (or the ink) and
  paint cells by clicking, and armed-yarn colours ride along when you place. Coloured stitches
  render in the editor, gallery previews and every export; the legend grows a **Yarns** section
  (swatch, name, stitch count); written instructions and follow mode carry the yarn abbreviation
  the way patterns write them (`k3 CC1, p2, k2tog MC`) with the RS/WS duality applied per cell.
  Recolouring a yarn repaints its stitches in the same undo step, and knit-aware mirroring keeps
  colours. Stamping on an occupied cell now re-works that cell (new symbol + colour) instead of
  stacking stitches.

- **Repeat brackets** (B) — mark the repeated section of a chart; the bracket auto-counts the
  stitches it spans and carries an editable ×N label, exactly like DimCrochet's.
- **Row & column numbers** — toggle row numbers (each printed where its row starts: right for RS
  rows, left for WS rows) and column numbers along the bottom; they show on canvas and in every
  export.
- **Rows & columns editing** — with a stitch selected: insert an empty row above/below or column
  left/right (the chart slides aside), or delete the row/column and close the gap — one undo step
  each.
- **Gauge & true-scale PDF** — set stitches and rows per 10 cm and the chart cells take their
  real aspect (no more square knitting cells); the PDF export's true-scale mode then prints each
  axis by its own gauge.
- **Cables, twists and leaned increases** — C4B/C4F (2/2 right and left cross, drawn at their
  true four-stitch width with the front strand continuous and the back strand broken), the 1/1
  right/left twists (RT/LT), and M1R/M1L leaned increases. The row engine accounts every symbol
  by its real stitch count (a cable works and leaves 4, a twist 2, an increase creates 1 while
  the row below still supplies every stitch it had), cables mirror to their opposite crossing,
  wrong-side rows read the mirrored word (a C4B row reads C4F on the WS), and repeated operations
  write honestly ("C4B ×2", never a digit suffix). The legend renders wide symbols full-width
  with the label shifted beside them.
- **Knitting in the round** — toggle in the chart panel: every row is a right-side row read
  right-to-left, written instructions and follow mode speak right-side words on every row, and
  all row numbers print on the right.
- **Chart from written rows** — the gallery's **＋ From written rows** takes run-length row text
  ("Row 3 (RS): k3, yo, k2tog, k3" — the same format the Rows dialog produces, counts, ×N
  repeats, colourway names tolerated) and builds an editable chart. Rows are read serpentine and
  wrong-side rows are inverted into the chart's right-side symbols automatically, so pasting a
  pattern's instructions reproduces its chart.
- **True-scale PDF tiling** — charts larger than one A4 sheet at true scale now tile across
  pages (each page a full-size window of the chart) instead of silently shrinking to fit.

### Fixed

- **The side panels scroll when their content outgrows the window** — with the inspector's new
  sections the chart panel's bottom (legend preview, Delete, rows & columns) was silently cut
  off on shorter windows instead of being reachable by scrolling. Both side columns now bound
  their panel's height so each panel scrolls internally; collapse animation and edge tabs are
  unchanged.
- **Action bar** — the floating, draggable tool palette from DimCrochet, restyled for the knit
  shell: select/pan/place tools plus undo/redo, snapping, grid, guides, the zoom cluster
  (in/out/editable %/fit), fullscreen, licenses and options. Drag anywhere, collapse to a
  tools-only pill, one or two rows — all persisted. Customize per-button (order + visibility) in
  Options → Buttons.
- **Right sidebar inspector** — when a stitch is selected: symbol, position, mirror, distribute,
  rotate, duplicate, z-order, delete; when nothing is selected: chart properties (ink colour) and
  legend controls with a live preview. Collapses to an edge tab like the symbols panel.
- **Knit-aware mirroring** — mirroring a selection horizontally swaps leaning decreases for their
  mirror image (k2tog ↔ ssk, p2tog ↔ ssp) rather than mirroring the glyph, the way the fabric
  would actually reverse. Symmetric stitches (k, p, yo, s2kp2, ns) are unaffected.
- **PDF export** — vector A4 (portrait or landscape) joins SVG and PNG in the export dialog.
- **Toolbar opacity options** — rest/hover dual-slider dimming for the action bar, with a
  keep-the-island-visible toggle.

## [0.1.0] — 2026-09-10

First release of DimKnit: the knitting chart composer sharing the DimCraft
chart-editor kernel with DimCrochet. Stitch-grid charts with a CYC-style
palette, serpentine row reading with RS/WS-aware written instructions,
follow mode, stitch-count accounting, four learn-to-knit starters, SVG/PNG
export and per-chart .json files, encrypted short links and share links via
the self-hosted sidecar, and automatic sibling discovery with DimCrochet.

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
- **Zero-config sibling pairing for stacks** — the shipped `docker-compose.yml`
  now hands each sidecar the sibling's host port (`SIBLING_PORT`, following
  `DIMKNIT_PORT`/`DIMCROCHET_PORT`), and the frontends try that advertised
  address before the default-port fallback: with both apps enabled in the
  stack, they detect each other even on custom ports, no manual URL needed.
  The Options status line states how the sibling was found ("via this
  deployment's configuration" vs "on the default ports"). (Core change — see
  the root CHANGELOG.)
- **Legend spacing** — the legend title no longer crowds the first row of
  entries (shared-rendering fix, also in DimCrochet).
- **Encrypted short links** — Export → Short link posts the chart
  AES-GCM-encrypted to a self-hosted sidecar: the decryption key rides only in
  the link fragment and the sidecar stores ciphertext it cannot read. A link
  arriving at `/x/<id>#k=…` opens through a **Shared chart** dialog that saves
  it as a new copy ("Open as my copy"); links expire after 30 idle days
  (sidecar default). Same flow as DimCrochet.
- **Share links and the Sidecar URL option** — the Export dialog gains the
  Share section (chart embedded in the URL fragment, nothing uploaded) and
  the Short-link panel, plus per-chart **Save .json file** export; Options →
  General gains the Sidecar URL field (defaults to the app's own address),
  matching the DimCrochet shell.

### Added

- First development builds of DimKnit: knitting chart composer sharing the
  DimCraft chart-editor kernel.
- CYC-style knitting palette (k, p, yo, k2tog, ssk, s2kp2, no-stitch) and a
  stitch-grid canvas.
- Serpentine row reading with RS/WS-aware written instructions, row-serpentine
  follow mode, stitch-count accounting checks, four learn-to-knit starters,
  SVG/PNG export, per-app storage and encrypted short-link sidecar.

### Changed

- **Options dialog layout** — the General and Danger-zone tabs read as a
  settings list: roomy rows with separators, toggle rows rebuilt on the
  shared check-row layout, matching DimCrochet's shell (theme aside).

This is the first numbered release: **0.1.0**, tagged `dimknit-v0.1.0`.
