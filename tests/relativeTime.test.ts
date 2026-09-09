import { describe, expect, it } from 'vitest'
import { editedLabel } from '../src/gallery/relativeTime'

const MIN = 60_000
const HOUR = 60 * MIN
const DAY = 24 * HOUR

describe('editedLabel', () => {
  const now = 1_700_000_040_000

  it('very fresh edits say just now, also when the timestamp is in the future', () => {
    expect(editedLabel(now - 30_000, now)).toBe('just now')
    expect(editedLabel(now + 5 * MIN, now)).toBe('just now')
  })

  it('minutes and hours use singular and plural correctly', () => {
    expect(editedLabel(now - 1 * MIN, now)).toBe('1 minute ago')
    expect(editedLabel(now - 5 * MIN, now)).toBe('5 minutes ago')
    expect(editedLabel(now - 59 * MIN, now)).toBe('59 minutes ago')
    expect(editedLabel(now - 1 * HOUR, now)).toBe('1 hour ago')
    expect(editedLabel(now - 23 * HOUR, now)).toBe('23 hours ago')
  })

  it('the first day gap reads yesterday, then days up to a week', () => {
    expect(editedLabel(now - 25 * HOUR, now)).toBe('yesterday')
    expect(editedLabel(now - 3 * DAY, now)).toBe('3 days ago')
    expect(editedLabel(now - 6 * DAY, now)).toBe('6 days ago')
  })

  it('a week and older falls back to an absolute date+time', () => {
    const old = now - 30 * DAY
    const label = editedLabel(old, now)
    expect(label).not.toContain('ago')
    expect(label.length).toBeGreaterThan(0)
  })
})
