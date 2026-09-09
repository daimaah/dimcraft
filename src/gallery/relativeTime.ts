/**
 * Human-friendly "edited" age for the design listing: relative wording while
 * it helps ("5 minutes ago"), absolute date+time once the age stops being
 * glanceable (a week and beyond). `now` is injectable for tests; `hour12`
 * carries the user's 24-hour clock preference (undefined = locale default).
 */
export function editedLabel(updatedAt: number, now = Date.now(), hour12?: boolean): string {
  const min = Math.floor(Math.max(0, now - updatedAt) / 60_000)
  if (min < 1) return 'just now'
  if (min < 60) return min === 1 ? '1 minute ago' : `${min} minutes ago`
  const h = Math.floor(min / 60)
  if (h < 24) return h === 1 ? '1 hour ago' : `${h} hours ago`
  const d = Math.floor(h / 24)
  if (d === 1) return 'yesterday'
  if (d < 7) return `${d} days ago`
  return editedTimestamp(updatedAt, hour12)
}

/** Exact local timestamp for tooltips and the absolute branch. */
export function editedTimestamp(updatedAt: number, hour12?: boolean): string {
  return new Date(updatedAt).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    ...(hour12 === undefined ? {} : { hour12 }),
  })
}
