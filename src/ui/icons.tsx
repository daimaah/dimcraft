const ICONS: Record<string, React.ReactNode> = {
  select: <path d="M5 2.5 L15.5 10 L10.8 11.2 L13.2 16.8 L11 17.7 L8.6 12.2 L5 15.5 Z" />,
  place: <path d="M10 3 V13 M5 3 H15 M6.5 17 L13.5 12.8" />,
  'guide-circle': <circle cx="10" cy="10" r="7" />,
  'guide-arc': <path d="M3 15.5 A 9.5 9.5 0 0 1 17 15.5" />,
  'guide-spiral': <path d="M10 10 a1.6 1.6 0 0 1 3.2 0 a3.2 3.2 0 0 1 -6.4 0 a4.8 4.8 0 0 1 9.6 0 a6.4 6.4 0 0 1 -12.8 0" />,
  'guide-line': <path d="M3 17 L17 3" />,
  'guide-polygon': <path d="M10 2.5 L17.5 8 L14.7 17 L5.3 17 L2.5 8 Z" />,
  bracket: <path d="M4 4 Q 10 11.5 16 4 M4 4 l0 3.2 M16 4 l0 3.2 M10 7.2 v2.6" />,
  text: <path d="M4 4.5 H16 M10 4.5 V16" />,
  undo: <path d="M4 8 H12.5 A4 4 0 0 1 12.5 16 H8 M4 8 l4 -4 M4 8 l4 4" />,
  redo: <path d="M16 8 H7.5 A4 4 0 0 0 7.5 16 H12 M16 8 l-4 -4 M16 8 l-4 4" />,
  snap: <path d="M5 3 v6.5 a5 5 0 0 0 10 0 V3 M8.6 3 v4.4 M11.4 3 v4.4" />,
  grid: <path d="M3 3 H17 V17 H3 Z M3 10 H17 M10 3 V17" />,
  guides: <circle cx="10" cy="10" r="7" strokeDasharray="3.4 2.6" />,
  export: <path d="M10 3 V13 M6 9.5 l4 4 4 -4 M4 17 h12" />,
  gallery: <path d="M3 9 L10 3 L17 9 M5.5 8 V16.5 H14.5 V8" />,
  fit: <path d="M3 7 V3 H7 M13 3 H17 V7 M17 13 V17 H13 M7 17 H3 V13" />,
  trash: <path d="M4 6 H16 M7.5 6 V4 H12.5 V6 M6 6 L7 17 H13 L14 6" />,
  plus: <path d="M10 4 V16 M4 10 H16" />,
  eye: <path d="M2.5 10 C 5 5.5 8 4 10 4 C 12 4 15 5.5 17.5 10 C 15 14.5 12 16 10 16 C 8 16 5 14.5 2.5 10 Z M 10 7.4 A 2.6 2.6 0 1 0 10 12.6 A 2.6 2.6 0 1 0 10 7.4" />,
  hand: <path d="M10 3 V17 M3 10 H17 M10 3 L7.8 5.2 M10 3 L12.2 5.2 M10 17 L7.8 14.8 M10 17 L12.2 14.8 M3 10 L5.2 7.8 M3 10 L5.2 12.2 M17 10 L14.8 7.8 M17 10 L14.8 12.2" />,
  list: <path d="M7 5.5 H16.5 M7 10 H16.5 M7 14.5 H13 M4 5.5 h0.01 M4 10 h0.01 M4 14.5 h0.01" />,
  play: <path d="M6.5 4 L15.5 10 L6.5 16 Z" />,
  expand: <path d="M3 7 V3 H7 M13 3 H17 V7 M17 13 V17 H13 M7 17 H3 V13 M7.5 7.5 H12.5 V12.5 H7.5 Z" />,
  info: <path d="M10 17.5 A 7.5 7.5 0 1 0 10 2.5 A 7.5 7.5 0 1 0 10 17.5 M10 8.8 V14 M10 5.8 h0.01" />,
}

export type IconName = keyof typeof ICONS

export function Icon({ name, size = 16 }: { name: IconName | string; size?: number }) {
  return (
    <svg viewBox="0 0 20 20" width={size} height={size} aria-hidden>
      <g fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        {ICONS[name] ?? null}
      </g>
    </svg>
  )
}
