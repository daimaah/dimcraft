import { useStore } from '../state/store'
import { BUILTIN_SETS } from '../symbols/sets'

const DEPS: { name: string; license: string; url: string }[] = [
  { name: 'React / React DOM', license: 'MIT', url: 'https://react.dev' },
  { name: 'zustand', license: 'MIT', url: 'https://github.com/pmndrs/zustand' },
  { name: 'jsPDF', license: 'MIT', url: 'https://github.com/parallax/jsPDF' },
  { name: 'svg2pdf.js', license: 'Apache-2.0', url: 'https://github.com/yWorks/svg2pdf.js' },
  { name: 'idb-keyval', license: 'ISC', url: 'https://github.com/jakearchibald/idb-keyval' },
  { name: 'Vite', license: 'MIT', url: 'https://vitejs.dev' },
  { name: 'vite-plugin-pwa / Workbox', license: 'MIT', url: 'https://vite-pwa-org.netlify.app' },
  { name: 'TypeScript', license: 'Apache-2.0', url: 'https://www.typescriptlang.org' },
]

/** AI model attribution — keep current as the models in use change. */
const AI_MODELS = 'GLM-5.3-Flash and GLM-5.3 (Z.AI)'

export function LicensesDialog() {
  const doc = useStore((s) => s.doc)

  return (
    <div className="modal-backdrop" onPointerDown={() => useStore.getState().closeDialog()}>
      <div className="modal wide" onPointerDown={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>Licenses &amp; attributions</h2>
            <span className="hint">DimCrochet v{__APP_VERSION__}{__GIT_COMMIT__ ? ` · ${__GIT_COMMIT__}` : ''}</span>
          <button className="icon-btn" onClick={() => useStore.getState().closeDialog()}>
            ✕
          </button>
        </div>

        <div className="licenses-body">
          <h3>DimCrochet</h3>
          <p>
            Copyright © 2026 DimCrochet contributors. Released under the{' '}
            <a href="/LICENSE" target="_blank" rel="noreferrer">
              MIT License
            </a>
            . The bundled symbol sets (Standard, Japanese-style, Solid print) are original artwork
            created for DimCrochet under the same MIT license. Symbol shapes follow widely published
            chart conventions; no third-party symbol artwork is bundled.
          </p>

          <h3>Bundled symbol sets</h3>
          <ul className="license-list">
            {BUILTIN_SETS.map((s) => (
              <li key={s.id}>
                <strong>{s.name}</strong> — {s.license}
                {s.sourceUrl && (
                  <div>
                    Source:{' '}
                    <a href={s.sourceUrl} target="_blank" rel="noreferrer">
                      {s.sourceUrl}
                    </a>
                  </div>
                )}
                {s.notes && <div>{s.notes}</div>}
              </li>
            ))}
          </ul>

          <h3>Symbol packs in this chart</h3>
          {(doc.customSets ?? []).length === 0 && (
            <p className="hint">No imported symbol packs are used by this chart.</p>
          )}
          <ul className="license-list">
            {(doc.customSets ?? []).map((s) => (
              <li key={s.id}>
                <strong>{s.name}</strong>
                {s.license ? <span> — {s.license}</span> : <span> — no license information provided (use at your own discretion)</span>}
                {s.authors && <div>Authors: {s.authors}</div>}
                {s.sourceUrl && (
                  <div>
                    Source: <a href={s.sourceUrl} target="_blank" rel="noreferrer">{s.sourceUrl}</a>
                  </div>
                )}
                {s.notes && <div>{s.notes}</div>}
              </li>
            ))}
          </ul>
          <p className="hint">
            Packs keep their own licenses. If a pack is distributed with this app or shared onward,
            its license terms (for example CC BY-SA attribution and share-alike, or GPL) must be
            respected. Attribution above travels automatically with exported packs.
          </p>
          <p className="hint">
            Made your own set? Share it — the project's <strong>packs/</strong> folder on GitHub
            accepts community packs by pull request or issue, and your license and authorship
            travel with the file.
          </p>

          <h3>Open-source dependencies</h3>
          <ul className="license-list">
            {DEPS.map((d) => (
              <li key={d.name}>
                <a href={d.url} target="_blank" rel="noreferrer">
                  {d.name}
                </a>{' '}
                — {d.license}
              </li>
            ))}
          </ul>
          <p className="hint">All trademarks belong to their respective owners.</p>

          <h3>AI assistance</h3>
          <p>
            DimCrochet is designed and developed with the assistance of Z.AI large language models:{' '}
            <strong>{AI_MODELS}</strong> — most contributions via GLM-5.3-Flash with high reasoning.
            All code and artwork are human-reviewed. This attribution is kept up to date whenever
            the models in use change.
          </p>
        </div>

        <div className="modal-actions">
          <button className="btn accent" onClick={() => useStore.getState().closeDialog()}>
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
