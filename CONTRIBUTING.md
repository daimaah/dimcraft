# Contributing to DimCrochet

Pull requests are welcome — for code, documentation, terminology presets,
glyph reviews and **symbol packs** (see [packs/README.md](packs/README.md);
making a pack needs no coding at all). This file is the short version of how
the project works so your PR lands smoothly.

## AI-assistance disclosure

DimCrochet is developed with the assistance of Z.AI large language models
(**GLM-5.3-Flash** primary, **GLM-5.3**) — code generation, artwork drafting
and docs. Everything is human-reviewed before it lands. AI-assisted
contributions are accepted under the same condition: **you review what you
submit** and stand behind it as if you wrote it. Please say so in the PR
description if a notable part was machine-generated.

## Getting started

```bash
git clone https://github.com/daimaah/dimcrochet.git
cd dimcrochet
npm ci          # Node 22
npm run dev     # Vite dev server
npm test        # unit + compatibility suite (also what CI runs)
```

The app is a React + Vite + TypeScript PWA. Storage is browser-local
(IndexedDB); there is no backend except the optional short-link sidecar in
`sidecar/`.

## Branch model

- **`develop`** is where work lands. **Target your PRs at `develop`.**
- `main` carries released code only — maintainers merge it there at release
  time with a `vX.Y.Z` tag. Please don't PR against `main`.
- CI runs the test suite (including golden compatibility fixtures) on every
  push and PR; `develop` pushes publish the `:develop` Docker image, `main`
  refreshes `main` + `latest`.

## What a good PR includes

1. **A CHANGELOG entry.** Add a bullet under `## [Unreleased]` in
   CHANGELOG.md describing the change in user-visible terms. (That section
   powers the app's "Changes coming in next version" view — it stays
   untouched on every release, so never renumber it yourself.)
2. **Tests for behavior changes.** The suite is fast; behavior without a test
   tends to regress quietly. Chart/pack file changes additionally must keep
   the golden fixtures passing (see below).
3. **Docs in sync.** User-facing features belong in the README feature list,
   and the two backlog entries this project tracks live in ROADMAP.md.
4. **Format compatibility.** Chart and pack files are versioned and migrate
   through one gate (`sanitizeDoc`). Within a schema version: additive-only.
   Breaking change ⇒ bump `schemaVersion`, add a migration, keep all old
   migrations, and regenerate fixtures
   (`GEN_FIXTURES=1 npx vitest run tests/fixtures/gen-fixtures.test.ts`)
   only after committing fixtures from the previous era.

## Symbol packs

- **Bundled sets** (in `src/symbols/`) are curated and their licensing is
  checked carefully — please open an issue first if you want to change one.
- **Community packs** live in `packs/` as plain JSON files. CI validates
  format, provenance and SVG hygiene automatically; humans review glyphs.
  The format spec and submission rules: [packs/README.md](packs/README.md),
  [packs/FORMAT.md](packs/FORMAT.md).
- Wrong or region-specific glyphs anywhere — report them with the
  *Symbol report* issue template.

## Licensing

- Code and bundled original artwork: MIT (see [LICENSE](LICENSE)). By
  contributing code you agree it's released under the MIT license.
- Symbol packs keep **their own licenses**; submissions must carry license,
  authors and source (the CI gate enforces this). Third-party artwork is only
  accepted when its license permits redistribution with attribution.
