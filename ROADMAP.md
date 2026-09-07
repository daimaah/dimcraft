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
- **Community symbol packs** — once packs ship, curate/verify contributed
  national sets (Nordic, Japanese, Russian traditions) instead of inventing
  them ourselves.
