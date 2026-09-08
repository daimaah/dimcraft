import type { ProjectRecord } from './types'

export type DesignsSort = 'updated-desc' | 'updated-asc' | 'name-asc' | 'name-desc'

/** Sorting options for the My designs list. */
export const DESIGNS_SORTS: { id: DesignsSort; label: string }[] = [
  { id: 'updated-desc', label: 'Last updated (newest first)' },
  { id: 'updated-asc', label: 'Last updated (oldest first)' },
  { id: 'name-asc', label: 'Name (A–Z)' },
  { id: 'name-desc', label: 'Name (Z–A)' },
]

/** Sort project records by the given mode; returns a new sorted array. */
export function sortProjects(
  projects: ProjectRecord[],
  mode: DesignsSort,
): ProjectRecord[] {
  const list = [...projects]
  switch (mode) {
    case 'updated-asc':
      return list.sort((a, b) => a.updatedAt - b.updatedAt)
    case 'name-asc':
      return list.sort((a, b) => a.name.localeCompare(b.name))
    case 'name-desc':
      return list.sort((a, b) => b.name.localeCompare(a.name))
    default:
      return list.sort((a, b) => b.updatedAt - a.updatedAt)
  }
}
