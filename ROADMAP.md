# Roadmap

Shipped features live in the [README](README.md). This file tracks what's next,
in rough priority order, with design notes where the "how" matters.

---

## 1. Shareable URLs + universal file interchange (next up)

Designers want to share a chart with a link or a file without any server, and
to back up their own work. Everything needed already exists internally — the
project document is a small JSON tree — so this is about packaging, not
infrastructure.

### 1a. Shareable URLs (no server, no uploads)

- **Mechanism:** encode the entire project into the URL *fragment*:
  `https://host/#c=<deflate + base64url of project JSON>`.
  URL fragments are never sent to the server, so this keeps the core promise
  intact — there is still no backend, no uploads, no accounts, and it works on
  static hosting including the Portainer container.
- **Opt-in only:** an explicit "Create share link" action in the Export dialog.
  Nothing is ever shared automatically.
- **Opening a link** shows a preview plus "Open as my copy" — the chart is
  imported into the opener's own IndexedDB as a *new* project; it never
  silently merges with or overwrites local data.
- **Limits:** browser URLs cap out around 64 kB. Compress
  (`CompressionStream('deflate')` + base64url), show the encoded size in the
  dialog, and when a chart is too large, steer the user to file export instead.

### 1b. Slogan & privacy copy

"Everything stays in your browser" remains true for the base product: offline,
no uploads, no accounts. Sharing is an explicit act that puts a copy of the
chart *into the link itself* — treat the link like the file. This must be
explained in-product, not just in the README:

- Share dialog copy: *"Creating a link embeds a copy of this chart in the link.
  Anyone who has the link can view it. Nothing is uploaded to a server — but
  treat the link like the file it contains."*
- README gets a short "Privacy & sharing" section with the same wording.

### 1c. Universal interchange format

Today there are two export formats (project `.json`, symbol `.pack.json`) and
two import paths. Roadmap: **one interchangeable container** so export and
import are fully symmetric:

```
{ "app": "dimcrochet", "version": 2, "kind": "chart" | "pack" | "bundle",
  "name": "...", "created": 0, "payload": { … } }
```

- `chart` — what project export produces today (with `schemaVersion` and
  migrations, as now)
- `pack` — symbol set packs, as today
- `bundle` — chart + its symbol packs + optional instructions text in one file
  (a chart that uses a custom regional set can travel with that set)

Import accepts all three kinds; the importer dispatches on `kind`. If embedded
artwork or assets ever outgrow JSON, the same envelope can move to a zip
container without changing the schema rules. `.dimcrochet.json` stays the
extension; older v1 files keep importing forever via the existing
`sanitizeDoc` migration path.

---

## 2. Backlog (unprioritised)

- **Cross-project copy/paste** — a clipboard store so motifs can move between
  charts, closing the copy/paste complaints aimed at Stitch Fiddle.
- **Z-ordering** — bring forward / send backward for placements; today layer
  order is fixed (guides → brackets → stitches → lines → text).
- **Multi-chart documents** — several artboards per pattern (motif + schematic
  + edging) in one project.
- **Written pattern → chart** — the reverse of the Rounds generator. The brief
  positions this as a later, AI-assisted feature; the chart must remain
  deterministic and editable regardless of how the draft was produced.
- **Print tiling** — split oversized charts across multiple pages with
  alignment marks.
- **Stitch-count validation** — heuristic warnings when a round's stitch count
  doesn't fit the previous round (CrochetPARADE-style structural checks).
- **Community symbol packs** — see sourcing notes below.

### Community symbol packs — sourcing notes (researched)

There is no single canonical open database, but three real open sources exist:

1. **Wikimedia Commons — [Category:Crochet symbols](https://commons.wikimedia.org/wiki/Category:Crochet_symbols)** —
   ~76 SVGs, explicitly "international **and variant** symbols", mostly **CC BY-SA 4.0**.
   Best candidate for a first curated pack (European/regional variants). Requires extending
   the pack schema with `license` + `attribution` + `sourceUrl` fields (Share-Alike must
   travel with the artwork).
2. **[Neon22/Crochet-Charts-replacement-stitches](https://github.com/Neon22/Crochet-Charts-replacement-stitches)** (GitHub, GPL-3.0) —
   small set (Tunisian, direction arrows, sc variants) in the Crochet Charts 1.2 app format
   (SVG + XML). Users can import these as packs freely; *bundling* them in this repo would
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
A distinct Nordic *glyph* pack has low value; a Nordic **terminology-verified standard pack**
is the deliverable. The Commons "variant symbols" are where real glyph differences live.

**Plan:** when community packs ship — extend pack schema with license/attribution, build a
one-off Commons importer (fetch → normalize viewBox → @INK@ tokens → pack JSON), and start a
`packs/` folder in the repo as the distribution channel (works with Portainer/Git Hub, no backend).

**Licensing decision (recorded):** approved — attribution-based inclusion is acceptable. Done:
pack files now carry `license` / `authors` / `sourceUrl` / `notes`, provenance survives
import/export round-trips, and the app has a **Licenses & attributions** dialog (ⓘ toolbar
button + gallery footer) covering the app license (MIT), bundled sets (original artwork, MIT)
and imported packs. Remaining for full Commons integration: a curated variants pack drawn/
normalized from the CC BY-SA category with per-file attribution, shipped in a `packs/` folder.
