import { sanitizeDoc, uid } from '../model/doc'
import { downloadBlob, safeFilename } from './download'
import type { ChartDoc, CustomSet, ProjectRecord } from '../model/types'

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
  return parseProjectText(await file.text())
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
  return parsePackText(await file.text())
}

// ---- universal interchange: one importer for every export kind -----------

export type InterchangeImport =
  | { type: 'chart'; name: string; doc: ChartDoc }
  | { type: 'pack'; set: CustomSet }

function parseProjectText(text: string): ProjectFile | null {
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

function parsePackText(text: string): CustomSet | null {
  try {
    const parsed = JSON.parse(text) as Partial<SymbolPackFile>
    if (!parsed || typeof parsed.name !== 'string' || !parsed.artwork || typeof parsed.artwork !== 'object') return null
    const clean: Record<string, string> = {}
    for (const [k, v] of Object.entries(parsed.artwork)) {
      if (typeof v === 'string' && v.includes('@INK@')) clean[k] = v
    }
    if (Object.keys(clean).length === 0) return null
    const str = (v: unknown) => (typeof v === 'string' ? v : undefined)
    const set: CustomSet = { id: uid('set'), name: parsed.name, artwork: clean }
    for (const key of ['license', 'authors', 'sourceUrl', 'notes'] as const) {
      const value = str(parsed[key])
      if (value !== undefined) set[key] = value
    }
    return set
  } catch {
    return null
  }
}

/** Accepts chart exports, symbol packs and future bundle kinds. */
export function parseInterchangeText(text: string): InterchangeImport | null {
  try {
    const parsed = JSON.parse(text) as Record<string, unknown>
    if (!parsed || typeof parsed !== 'object') return null
    if (parsed.app === 'dimcrochet-symbol-pack') {
      const set = parsePackText(text)
      return set ? { type: 'pack', set } : null
    }
    if (parsed.app === 'dimcrochet') {
      const project = parseProjectText(text)
      return project ? { type: 'chart', name: project.name, doc: project.doc } : null
    }
    return null
  } catch {
    return null
  }
}

export async function importInterchangeFile(file: File): Promise<InterchangeImport | null> {
  return parseInterchangeText(await file.text())
}

