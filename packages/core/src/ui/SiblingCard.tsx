import type { ReactNode } from 'react'
import { siblingAppName, siblingAppId, type SiblingInfo } from '../sibling'

/** Brand mark + slogan per app — static identity, not per-deployment data. */
const MARKS: Record<string, { fill: string; art: ReactNode; slogan: string }> = {
  dimcrochet: {
    fill: '#d96f4e',
    art: (
      <>
        <circle cx="32" cy="32" r="15" fill="none" stroke="#fff8f2" strokeWidth="4" />
        <g fill="#fff8f2">
          {Array.from({ length: 8 }, (_, i) => {
            const a = (i * Math.PI) / 4
            return <circle key={i} cx={32 + 15 * Math.cos(a)} cy={32 + 15 * Math.sin(a)} r="3.4" />
          })}
        </g>
      </>
    ),
    slogan: 'Crochet round & motif chart composer',
  },
  dimknit: {
    fill: '#3fc1b0',
    art: (
      <g fill="none" stroke="#f4f6f5" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M 14 40 L 24 26 L 34 40" />
        <path d="M 30 40 L 40 26 L 50 40" />
      </g>
    ),
    slogan: 'Knitting chart composer',
  },
}

/**
 * The detected sibling app as a compact identity card: its mark, name,
 * version (from the whoami handshake), slogan and a jump button. Rendered
 * next to the active app's brand block on the projects screen.
 */
export function SiblingCard({ sibling }: { sibling: SiblingInfo }) {
  const id = siblingAppId()
  const mark = MARKS[id]
  if (!mark) return null
  return (
    <div className="sibling-card" data-testid="sibling-card">
      <svg viewBox="0 0 64 64" width="30" height="30" aria-hidden>
        <rect width="64" height="64" rx="14" fill={mark.fill} />
        {mark.art}
      </svg>
      <div className="sibling-meta">
        <div className="sibling-name">
          <strong>{siblingAppName()}</strong>
          <span className="level-chip level-1">detected</span>
        </div>
        <span className="hint">
          v{sibling.version || '?'}
          {sibling.core ? ` · core ${sibling.core}` : ''}
        </span>
        <p className="hint">{mark.slogan}</p>
      </div>
      <button
        className="btn accent"
        title={`Opens ${siblingAppName()} at ${sibling.url}`}
        onClick={() => window.open(sibling.url, '_blank', 'noopener')}
      >
        Open →
      </button>
    </div>
  )
}