# Community symbol packs

This folder is DimCrochet's curated shelf for **community-made symbol packs**.
Pack files here are reviewed, format-checked by CI, and safe to import — but
they keep **their own licenses and authors**, exactly like every pack in the
app (see **Licenses & attributions** in the app).

Nothing in this folder is bundled with the app. You import what you want,
when you want it.

## Using a pack

1. Download a pack file from this folder (files ending in `.json`).
2. In DimCrochet, either **drag the file anywhere onto the window**, or open a
   chart and use **Symbols & region → Import pack…**.
3. The pack appears as a symbol set for that chart, with its authors and
   license shown under **Licenses & attributions**.

Packs are plain JSON — you can read what's inside before importing, and the
app never phones home: importing is purely local.

## Submitting a pack

Two ways, both equally welcome:

- **Pull request (preferred)** — fork the repo, add your pack as
  `packs/<your-pack-name>.json` (kebab-case), and open a PR against
  `develop`. CI validates the format, the provenance fields and the SVG
  hygiene automatically; a maintainer then reviews the glyphs.
- **Issue (no Git skills needed)** — open an issue with the
  *Pack submission* template and attach your `.json` file. A maintainer will
  land it as a PR on your behalf with you credited as the author.

Authoring a pack needs **no coding at all**: you draw or collect SVG symbols,
import them into a custom set in the app, and use **Symbols & region →
Export pack**. The full step-by-step, plus the format spec and the licensing
rules, is in [FORMAT.md](FORMAT.md).

## What review checks (the CI gate)

Every pack in this folder must pass `tests/packs.test.ts`, which:

- parses the file through the app's own pack importer (what you download is
  exactly what the app will read),
- requires `license`, `authors` and `sourceUrl` — a pack without provenance
  is not accepted,
- rejects SVG hygiene problems (scripts, event handlers, external or raster
  references, oversized symbols),
- enforces sane size limits and unique pack names.

Human review then does what CI can't: check that the glyphs actually look
like what regional charts use. If you spot a wrong or misleading symbol in
any pack — including the bundled Commons set — please open an issue with the
*Symbol report* template.

## Licensing rule

Attribution-based inclusion is the project's recorded policy: packs must name
their license, authors and source. Original artwork by the pack author may be
released under any open license the author chooses (CC BY, CC BY-SA, MIT,
CC0/public domain…). **Third-party artwork may only be submitted if its
license permits redistribution with attribution** — copy the license and
author for each source into the pack's provenance fields. Unlicensed artwork
found online is not acceptable and will be declined.
