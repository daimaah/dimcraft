# Roadmap

Shipped features live in the [README](README.md). This file tracks what's next,
in rough priority order, with design notes where the "how" matters.

---

## Recently shipped

- **Shareable URLs** — charts embedded (deflate + base64url) in the URL fragment; opt-in
  "Create share link" in the Export dialog; "Open as my copy" import at startup. Privacy copy
  in the dialog and the README ("Privacy & sharing").
- **Universal file interchange** — `importInterchangeFile` accepts chart exports and symbol
  packs through one dispatcher (file picker and drag-and-drop); a chart file carries its custom
  symbol packs inside `doc.customSets`, so charts using custom regional sets travel with them.
- **Commons variants pack** — all 70 SVG symbols from
  [Wikimedia Commons, Category:Crochet symbols](https://commons.wikimedia.org/wiki/Category:Crochet_symbols)
  (per-file CC BY-SA / CC BY / CC0 / PD attribution) bundled as the built-in
  "International variants (Commons)" symbol set, built by the resumable, rate-limit-compliant
  `scripts/build-commons-pack.mjs` (`npm run commons-pack`).
- **Written pattern → chart v1** — deterministic parser (round headers, stitch abbreviations
  via terminology presets, counts, bracketed/×N repeats) with radial cluster layout.
- **CrochetPARADE dialect support** — `DEF:` stitches, `COLOR:` changes, position anchors and
  `$vars$` are preprocessed before parsing; spikes (`<`, `>`) drawn as single crochet.
- **Follow mode** (round-by-round with a movable/resizable, position-persisted bar),
  **written instructions** (Rounds dialog), **stitch-group layers**, **gauge + true-scale PDF**,
  **2D fabric preview**, **backstitch lines**, **regional symbol sets & terminology presets**,
  **collapsible panels & fullscreen**, **licensing infrastructure** (MIT app, pack provenance,
  in-app Licenses & attributions), **golden-file compatibility tests + CI gate**.

---

## Backlog (unprioritised)

- **Cross-project copy/paste** — a clipboard store so motifs can move between
  charts, closing the copy/paste complaints aimed at Stitch Fiddle.
- **Z-ordering** — bring forward / send backward for placements; today layer
  order is fixed (guides → brackets → stitches → lines → text).
- **Multi-chart documents** — several artboards per pattern (motif + schematic
  + edging) in one project.
- **Written pattern → chart refinements** — asterisk-style repeats ("repeat from
  \* 3 more times"), increases/decreases ("2 dc in next st", "sc2tog") as placement
  annotations, multi-round radius refinement, and optionally an AI-assisted freeform
  parser on top of the deterministic core.
- **Print tiling** — split oversized charts across multiple pages with
  alignment marks.
- **Stitch-count validation** — heuristic warnings when a round's stitch count
  doesn't fit the previous round (CrochetPARADE-style structural checks).
- **Community pack curation** — the Commons variants pack is bundled; next steps are
  glyph review by regional crocheters, and accepting community packs via repository
  PRs into a `packs/` folder.
- **Optional link-shortener sidecar** — a tiny self-hosted companion (for people
  already running Portainer) if long share links prove annoying in chat apps.

---

## File-format compatibility policy (adopted)

1. **Additive-only within a schema version** — new fields get defaults; never rename
   or remove an exported field.
2. **Breaking change ⇒ bump `schemaVersion` + a migration** in `sanitizeDoc`
   (the single gate for file import, IndexedDB load, and URL fragments).
   Migrations are never deleted.
3. **Preserve unknown fields** — future files degrade safely in the current app,
   and older app versions round-trip newer files without data loss.
4. **Golden fixtures** — `tests/fixtures/` holds real serialized exports; the test
   suite imports them on every run (and CI gates every build on it). On schema
   changes: `GEN_FIXTURES=1 npx vitest run tests/fixtures/gen-fixtures.test.ts`
   to regenerate, after committing/keeping fixtures from the previous era.

---

## Historical design & research notes

### Share links — design decisions

- **Mechanism:** the entire project is encoded into the URL *fragment*
  (`#c=<deflate + base64url of project JSON>`). Fragments are never sent to the
  server, so there is no backend, no uploads, no accounts, and it works on
  static hosting including the Portainer container.
- **Opt-in only:** nothing is ever shared automatically; the share dialog shows
  the encoded size and steers very large charts to file export.
- **Opening a link** shows a preview plus "Open as my copy" — the chart is
  imported into the opener's own IndexedDB as a *new* project; it never
  silently merges with or overwrites local data.
- Measured sizes: starter chart ≈ 0.8 kB of URL; a 400-stitch doily ≈ 9 kB;
  a 1,200-stitch chart ≈ 26 kB. Chat apps may truncate long URLs — files remain
  the fallback.

### Community symbol packs — sourcing notes (researched)

There is no single canonical open database, but three real open sources exist:

1. **Wikimedia Commons — [Category:Crochet symbols](https://commons.wikimedia.org/wiki/Category:Crochet_symbols)** —
   ~76 SVGs, explicitly "international **and variant** symbols", per-file
   CC BY-SA / CC BY / CC0 / PD licenses. **Used**: all 70 permissively licensed
   SVGs are bundled as the "International variants (Commons)" set, with per-file
   attribution in Licenses & attributions.
2. **[Neon22/Crochet-Charts-replacement-stitches](https://github.com/Neon22/Crochet-Charts-replacement-stitches)** (GitHub, GPL-3.0) —
   small set (Tunisian, direction arrows, sc variants) in the Crochet Charts 1.2 app
   format. Users can import these as packs freely; *bundling* them in this repo would
   require GPL-compatibility for those assets.
3. **Open-source app libraries** — [iPenguin/CrochetCharts](https://github.com/iPenguin/CrochetCharts) (GPLv3),
   [CrochetPARADE](https://github.com/crochetparade/CrochetPARADE), [CrochetProject/CrochetCraze](https://github.com/CrochetProject/CrochetCraze)
   (SVG stitch symbols + animations). Formats are app-specific; a converter per format is the work.

**Not usable as sources:** Craft Yarn Council's official symbol chart (copyrighted — we already
draw our own CYC-*style* set), Japanese JIS standard (paywalled), Nordic yarn-company glossaries
(Novita/Sandnes/Sandra PDFs are copyrighted).

**Nordic reality check:** published Nordic charts use the standard international symbol shapes —
the regional difference is *terminology*, which the built-in sv/no/da/fi presets already cover
(cross-check source: [lalylala multilingual crochet terms](https://lalylala.com/blogs/lalylala-blog-2/multilingual-crochet-terms)).
A distinct Nordic *glyph* pack has low value; the sv/no/da/fi **terminology presets** are the
deliverable, and the Commons variants pack covers glyph differences.

**Licensing decision (recorded):** attribution-based inclusion is acceptable. Pack files carry
`license` / `authors` / `sourceUrl` / `notes`, provenance survives import/export round-trips,
and the app's **Licenses & attributions** dialog (ⓘ toolbar button + gallery footer) covers the
app license (MIT), bundled sets (original artwork + Commons pack with per-file attribution) and
imported packs.
