import type { ProjectRecord } from '../model/types'
import { downloadBlob, safeFilename } from './download'

export interface ProjectFile {
  app: 'dimcrochet'
  version: number
  name: string
  savedAt: number
  doc: ProjectRecord['doc']
}

export function serializeProject(rec: ProjectRecord): string {
  const file: ProjectFile = {
    app: 'dimcrochet',
    version: 1,
    name: rec.name,
    savedAt: rec.updatedAt,
    doc: rec.doc,
  }
  return JSON.stringify(file, null, 2)
}

export function exportProjectFile(rec: ProjectRecord): void {
  downloadBlob(`${safeFilename(rec.name)}.dimcrochet.json`, new Blob([serializeProject(rec)], { type: 'application/json' }))
}

export async function readProjectFile(file: File): Promise<ProjectFile | null> {
  const text = await file.text()
  try {
    const parsed = JSON.parse(text) as ProjectFile
    if (!parsed || parsed.app !== 'dimcrochet' || !parsed.doc) return null
    return parsed
  } catch {
    return null
  }
}
