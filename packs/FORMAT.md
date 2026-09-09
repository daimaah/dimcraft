# Symbol pack format & authoring guide

A DimCrochet symbol pack is a single JSON file. No build tools, no code —
just symbols, names and provenance. This document is the complete spec; the
app's importer (`src/export/projectFile.ts`, `parseInterchangeText`) is the
normative reader, and `tests/packs.test.ts` is the gate every pack in
`packs/` must pass.

## The file

```json
{
  "app": "dimcrochet-symbol-pack",
  "version": 1,
  "name": "My regional symbols",
  "license": "CC BY-SA 4.0",
  "authors": "Your Name",
  "sourceUrl": "https://example.com/my-symbols",
  "notes": "Optional: what the pack is for, regional quirks, sources per symbol…",
  "artwork": {
    "tr": "<svg viewBox=\"0 0 40 40\" …>…</svg>"
  }
}
```

| Field        | Required | Notes                                                                                                                                             |
| ------------ | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `app`        | yes      | Must be exactly `dimcrochet-symbol-pack`.                                                                                                          |
| `version`    | yes      | Pack envelope version — `1` today.                                                                                                                 |
| `name`       | yes      | Shown in the Symbols panel and the Licenses dialog. Unique across `packs/`; 60 characters max.                                                     |
| `license`    | yes*     | An open license: `CC BY 4.0`, `CC BY-SA 4.0`, `MIT`, `CC0` / `Public domain`, … (*required for the `packs/` shelf; optional but recommended when sharing informally.) |
| `authors`    | yes*     | Who drew/collected the symbols. Credit third-party sources here too.                                                                               |
| `sourceUrl`  | yes*     | Where the pack (or its artwork) comes from — a repo, a wiki category, your own site.                                                               |
| `notes`      | no       | Free text: per-symbol sources, regional usage notes, version history.                                                                              |
| `artwork`    | yes      | The symbols: keys are **symbol ids**, values are SVG strings. 1–300 symbols, each ≤ 64 kB.                                                         |

## Symbol ids and artwork

- **Ids** are short ASCII kebab-case strings (`fpdc`, `dc3tog`, `bobble-alt`).
  They don't have to match DimCrochet's built-in ids — a pack is an extra
  set alongside the built-ins, and its symbols get their labels from the ids
  (editable per chart, as always).
- **Every SVG value must contain `@INK@`** — the placeholder the app replaces
  with the chart's ink colour, so packs follow the user's colour scheme.
  Draw the artwork in any solid colour, then put `@INK@` in place of the
  colour value: `fill="@INK@"` or `stroke="@INK@"`.
- Keep glyphs on a square `viewBox` (e.g. `0 0 40 40`) with the symbol
  visually centred and a small margin — built-in sets use ~40×40.
- The artwork must be **vector and self-contained**: no `<script>`, no event
  handler attributes, no `<image>` rasters, no external references (`href` to
  the web). CI rejects these.
- `stroke-width` between 2 and 4 (on a 40-unit canvas) keeps glyphs legible
  at chart zoom levels.

## Authoring in the app (no code)

This is the recommended path — the app writes the JSON for you:

1. Open any chart, then **Symbols & region → Custom symbol → + Import SVG…**
   and add your SVGs to a custom set, one symbol at a time.
   (Set the ink placeholder: wherever you want the chart colour, use `@INK@`
   in the SVG before importing.)
2. Give the set a name in the Symbols & region panel.
3. **Export pack** downloads the finished `.json` file.
4. Test it: import it into a fresh chart and draw with it.

## Submitting

See [README.md](README.md) in this folder — pull request or issue, your
choice. In the PR description, mention what the pack is for (region, style,
which symbols) and confirm the artwork is yours or properly attributed.
