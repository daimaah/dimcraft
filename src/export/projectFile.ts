import { sanitizeDoc, uid } from '../model/doc'
import { downloadBlob, safeFilename } from './download'
import type { CustomSet, ProjectRecord } from '../model/types'

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

/**
 * Read an exported project file. The doc is run through sanitizeDoc so files
 * from older versions (or hand-edited ones) are migrated on import.
 * Reading is purely client-side: file.text() never touches a server.
 */
export async function readProjectFile(file: File): Promise<ProjectFile | null> {
  const text = await file.text()
  try {
    const parsed = JSON.parse(text) as Partial<ProjectFile>
    if (!parsed || parsed.app !== 'dimcrochet' || !parsed.doc) return null
    const doc = sanitizeDoc(parsed.doc)
    if (!doc) return null
    return {
      app: 'dimcrochet',
      version: parsed.version ?? 1,
      name: parsed.name ?? doc.title,
      savedAt: typeof parsed.savedAt === 'number' ? parsed.savedAt : Date.now(),
      doc,
    }
  } catch {
    return null
  }
}

export interface SymbolPackFile {
  app: 'dimcrochet-symbol-pack'
  version: number
  name: string
  artwork: Record<string, string>
  license?: string
  authors?: string
  sourceUrl?: string
  notes?: string
}

/** Read a symbol pack file (provenance fields preserved). */
export async function readSymbolPackFile(file: File): Promise<CustomSet | null> {
  const text = await file.text()
  try {
    const parsed = JSON.parse(text) as Partial<SymbolPackFile>
    if (!parsed || typeof parsed.name !== 'string' || !parsed.artwork || typeof parsed.artwork !== 'object') return null
    const clean: Record<string, string> = {}
    for (const [k, v] of Object.entries(parsed.artwork)) {
      if (typeof v === 'string' && v.includes('@INK@')) clean[k] = v
    }
    if (Object.keys(clean).length === 0) return null
    const str = (v: unknown) => (typeof v === 'string' ? v : undefined)
    return {
      id: uid('set'),
      name: parsed.name,
      artwork: clean,
      license: str(parsed.license),
      authors: str(parsed.authors),
      sourceUrl: str(parsed.sourceUrl),
      notes: str(parsed.notes),
    }
  } catch {
    return null
  }
}
