import { useStore } from '../state/store'

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

export function LicensesDialog() {
  const doc = useStore((s) => s.doc)

  return (
    <div className="modal-backdrop" onPointerDown={() => useStore.getState().closeDialog()}>
      <div className="modal wide" onPointerDown={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>Licenses &amp; attributions</h2>
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
