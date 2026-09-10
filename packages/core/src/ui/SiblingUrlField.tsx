import { useEffect, useState } from 'react'
import {
  discoverSibling,
  getManualSiblingUrl,
  probeSibling,
  saveManualSiblingUrl,
  siblingAppName,
  type SiblingInfo,
} from '../sibling'


/**
 * Companion-app URL field for the Options dialog: the URL input, a Verify
 * button that probes the entered address (or the default ports when the
 * field is empty), and a live status line showing whether auto-detection
 * currently finds the sibling. Shared by both apps' Options dialogs.
 */
export function SiblingUrlField() {
  const [url, setUrl] = useState(getManualSiblingUrl)
  const [auto, setAuto] = useState<{ kind: 'probing' | 'ok' | 'none'; info?: SiblingInfo }>({ kind: 'probing' })
  const [verify, setVerify] = useState<{ kind: 'idle' | 'busy' | 'ok' | 'fail' | 'none'; info?: SiblingInfo }>({ kind: 'idle' })

  const runAuto = () => {
    setAuto({ kind: 'probing' })
    void discoverSibling().then((found) => setAuto(found ? { kind: 'ok', info: found } : { kind: 'none' }))
  }

  useEffect(() => {
    runAuto()
    window.addEventListener('dimcraft-sibling-changed', runAuto)
    return () => window.removeEventListener('dimcraft-sibling-changed', runAuto)
  }, [])

  const doVerify = () => {
    setVerify({ kind: 'busy' })
    void (url.trim()
      ? probeSibling(url.trim().replace(/\/+$/, ''))
      : discoverSibling()
    ).then((found) => setVerify(found ? { kind: 'ok', info: found } : { kind: url.trim() ? 'fail' : 'none' }))
  }

  const manual = url.trim().length > 0
  const autoText =
    auto.kind === 'probing'
      ? 'Checking for the sibling app…'
      : auto.kind === 'ok'
        ? `✓ ${siblingAppName()} v${auto.info!.version || '?'}${auto.info!.core ? ` · core ${auto.info!.core}` : ''} at ${auto.info!.url} (${manual ? 'from the URL above' : 'auto-detected'})`
        : `✗ No ${siblingAppName()} answered ${manual ? 'at this URL' : 'on the default ports (8080/8081)'}.`

  return (
    <div className="form-row" data-testid="opt-sibling">
      <span>
        <strong>Companion app URL</strong>
        <br />
        <span className="hint">
          Link to {siblingAppName()} when it runs on another address. Leave empty to auto-detect it
          on this host.
        </span>
        <span className={`hint sibling-status${auto.kind === 'ok' ? ' ok' : auto.kind === 'none' ? ' fail' : ''}`} data-testid="sibling-auto">
          {autoText}
        </span>
        {verify.kind !== 'idle' && (
          <span
            className={`hint sibling-status${verify.kind === 'ok' ? ' ok' : verify.kind === 'fail' || verify.kind === 'none' ? ' fail' : ''}`}
            data-testid="sibling-verify"
          >
            {verify.kind === 'busy'
              ? 'Checking…'
              : verify.kind === 'ok'
                ? `✓ Verify: ${siblingAppName()} v${verify.info!.version || '?'} answered at ${verify.info!.url}`
                : `✗ Verify: no ${siblingAppName()} answered ${manual ? 'at this URL' : 'on the default ports'}.`}
          </span>
        )}
      </span>
      <div className="sibling-field">
        <input
          type="url"
          value={url}
          placeholder="auto-detect"
          spellCheck={false}
          onChange={(e) => setUrl(e.target.value)}
          onBlur={() => saveManualSiblingUrl(url)}
        />
        <button
          className="btn"
          data-testid="sibling-verify-btn"
          disabled={verify.kind === 'busy'}
          title="Probe this URL (or the default ports when empty) for the sibling app"
          onClick={doVerify}
        >
          {verify.kind === 'busy' ? '…' : 'Verify'}
        </button>
      </div>
    </div>
  )
}