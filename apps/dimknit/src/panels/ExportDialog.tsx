import { useState } from 'react'
import { downloadBlob, safeFilename } from '@dimcraft/core/export/download'
import { buildExportSvg, type SvgExportOptions } from '@dimcraft/core/export/svg'
import { exportPng } from '@dimcraft/core/export/png'
import { exportPdf, type PageOrientation } from '@dimcraft/core/export/pdf'
import { exportProjectFile } from '@dimcraft/core/export/projectFile'
import { createShareFragment } from '@dimcraft/core/export/share'
import { createShortLink, sidecarAvailable } from '@dimcraft/core/export/secureShare'
import { Modal } from './Dialogs'
import { useStore } from '../state/store'

/** Export the chart as SVG, PNG or PDF, save it as a .dimknit.json file, or
 *  hand it over a link: embedded in the URL fragment, or encrypted on a
 *  self-hosted sidecar (short link) — matching the DimCrochet export dialog. */
export function ExportDialog() {
  const doc = useStore((s) => s.doc)
  const projectName = useStore((s) => s.projectName)
  const projectId = useStore((s) => s.projectId)
  const [format, setFormat] = useState<'svg' | 'png' | 'pdf'>('svg')
  const [scale, setScale] = useState(2)
  const [orientation, setOrientation] = useState<PageOrientation>('portrait')
  const [white, setWhite] = useState(false)
  const [shareLink, setShareLink] = useState<string | null>(null)
  const [shareBusy, setShareBusy] = useState(false)
  const [sidecarUrl, setSidecarUrl] = useState(
    () => localStorage.getItem('dimknit.sidecarUrl') ?? location.origin,
  )
  const [shortLink, setShortLink] = useState<string | null>(null)
  const [shortBusy, setShortBusy] = useState(false)
  const [shortError, setShortError] = useState<string | null>(null)

  const cryptoOk = sidecarAvailable()

  const asRecord = () => ({
    id: projectId ?? 'proj-share',
    name: projectName,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    doc,
  })

  const createShort = async () => {
    setShortBusy(true)
    setShortError(null)
    try {
      localStorage.setItem('dimknit.sidecarUrl', sidecarUrl.trim())
      const { url } = await createShortLink(sidecarUrl.trim(), asRecord())
      setShortLink(url)
    } catch (err) {
      setShortError(err instanceof Error ? err.message : String(err))
    } finally {
      setShortBusy(false)
    }
  }

  const createShareLink = async () => {
    setShareBusy(true)
    try {
      const fragment = await createShareFragment(asRecord())
      setShareLink(`${location.origin}${location.pathname}${fragment}`)
    } catch (err) {
      window.alert(`Could not create the link: ${err instanceof Error ? err.message : err}`)
    } finally {
      setShareBusy(false)
    }
  }

  const opts: SvgExportOptions = {
    includeGuides: false,
    includeLegend: true,
    background: white ? '#ffffff' : null,
    padding: 24,
  }

  const run = async () => {
    const safe = safeFilename(projectName)
    if (format === 'svg') {
      const { svg } = buildExportSvg(doc, opts)
      downloadBlob(`${safe}.svg`, new Blob([svg], { type: 'image/svg+xml' }))
    } else if (format === 'pdf') {
      await exportPdf(doc, safe, { ...opts, format: 'a4', orientation })
    } else {
      await exportPng(doc, safe, { ...opts, scale })
    }
    useStore.getState().closeDialog()
  }

  return (
    <Modal title="Export chart" onClose={() => useStore.getState().closeDialog()}>
      <div className="field-row">
        <label>
          <input type="radio" checked={format === 'svg'} onChange={() => setFormat('svg')} /> SVG (vector)
        </label>
        <label>
          <input type="radio" checked={format === 'png'} onChange={() => setFormat('png')} /> PNG
        </label>
        <label>
          <input type="radio" checked={format === 'pdf'} onChange={() => setFormat('pdf')} /> PDF (A4)
        </label>
      </div>
      {format === 'png' && (
        <div className="field-row">
          <label>
            Scale
            <select value={scale} onChange={(e) => setScale(Number(e.target.value))}>
              <option value={1}>1×</option>
              <option value={2}>2×</option>
              <option value={4}>4×</option>
            </select>
          </label>
        </div>
      )}
      {format === 'pdf' && (
        <div className="field-row">
          <label>
            Orientation
            <select value={orientation} onChange={(e) => setOrientation(e.target.value as PageOrientation)}>
              <option value="portrait">Portrait</option>
              <option value="landscape">Landscape</option>
            </select>
          </label>
        </div>
      )}
      <label className="field-row">
        <input type="checkbox" checked={white} onChange={(e) => setWhite(e.target.checked)} /> White background
        (otherwise transparent)
      </label>
      <div className="modal-actions">
        <button
          className="btn"
          data-testid="save-json"
          onClick={() => {
            exportProjectFile(asRecord())
            useStore.getState().closeDialog()
          }}
        >
          Save .json file
        </button>
        <button className="btn accent" onClick={() => void run()}>
          ⭳ Export {format.toUpperCase()}
        </button>
      </div>

      <div className="share-section">
        <div className="panel-title">Share</div>
        {!shareLink ? (
          <>
            <button className="btn wide" disabled={shareBusy} onClick={() => void createShareLink()}>
              {shareBusy ? 'Encoding…' : 'Create share link'}
            </button>
            <p className="hint">
              Embeds a copy of this chart in the link itself. Anyone who has the link can view it.
              Nothing is uploaded to a server — but treat the link like the file it contains.
            </p>
          </>
        ) : (
          <>
            <input
              className="share-link"
              readOnly
              value={shareLink}
              onFocus={(e) => e.target.select()}
              onClick={(e) => (e.target as HTMLInputElement).select()}
            />
            <div className="modal-actions">
              <button
                className="btn"
                onClick={() => {
                  void navigator.clipboard.writeText(shareLink).catch(() => {})
                }}
              >
                Copy link
              </button>
              <button className="btn" onClick={() => setShareLink(null)}>
                New link
              </button>
            </div>
            {shareLink.length > 20000 && (
              <p className="hint">
                This link is very long ({shareLink.length} characters) — some apps truncate long
                URLs. For big charts, prefer the short link below or the file export.
              </p>
            )}
          </>
        )}
      </div>

      <div className="share-section">
        <div className="panel-title">Short link (self-hosted sidecar)</div>
        <label className="form-row">
          <span>Sidecar</span>
          <input
            value={sidecarUrl}
            onChange={(e) => setSidecarUrl(e.target.value)}
            placeholder="https://charts.example.com"
            spellCheck={false}
          />
        </label>
        {!shortLink ? (
          <button
            className="btn wide"
            disabled={shortBusy || !cryptoOk || !sidecarUrl.trim()}
            title={
              cryptoOk
                ? 'Encrypt the chart here, store only ciphertext on your sidecar'
                : 'Encrypted links need a secure context — open DimKnit via HTTPS or localhost'
            }
            data-testid="create-short-link"
            onClick={() => void createShort()}
          >
            {shortBusy ? 'Encrypting…' : 'Create short link'}
          </button>
        ) : (
          <>
            <input
              className="share-link"
              readOnly
              value={shortLink}
              onFocus={(e) => e.target.select()}
              onClick={(e) => (e.target as HTMLInputElement).select()}
            />
            <div className="modal-actions">
              <button
                className="btn"
                onClick={() => {
                  void navigator.clipboard.writeText(shortLink).catch(() => {})
                }}
              >
                Copy link
              </button>
              <button className="btn" onClick={() => setShortLink(null)}>
                New link
              </button>
            </div>
          </>
        )}
        {shortError && <p className="hint">Short link failed: {shortError}</p>}
        <p className="hint">
          The chart is encrypted in your browser (AES-GCM) — the sidecar stores only ciphertext it
          cannot read, and the decryption key rides in the link fragment. Links expire (default 30
          days since last opening).
        </p>
      </div>
    </Modal>
  )
}