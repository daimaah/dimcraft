import { sanitizeDoc, uid } from '../model/doc'
import { APP_ID } from '../appId'
import { downloadBlob, safeFilename } from './download'
import type { ChartDoc, CustomSet, ProjectRecord } from '../model/types'

export interface ProjectFile {
  app: string
  version: number
  name: string
  savedAt: number
  doc: ProjectRecord['doc']
}

export function serializeProject(rec: ProjectRecord): string {
  const file: ProjectFile = {
    app: APP_ID,
    version: 1,
    name: rec.name,
    savedAt: rec.updatedAt,
    doc: rec.doc,
  }
  return JSON.stringify(file, null, 2)
}

export function exportProjectFile(rec: ProjectRecord): void {
  downloadBlob(`${safeFilename(rec.name)}.${APP_ID}.json`, new Blob([serializeProject(rec)], { type: 'application/json' }))
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
  app: string
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
  | { type: 'backup'; backup: BackupFile }

/** A full-user backup: every project plus the app's own settings. */
export interface BackupFile {
  app: string
  version: 1
  savedAt: number
  settings: Record<string, string>
  projects: Array<{ id: string; name: string; createdAt: number; updatedAt: number; doc: ChartDoc }>
}

export function parseBackupText(text: string): BackupFile | null {
  try {
    const parsed = JSON.parse(text) as Partial<BackupFile>
    if (!parsed || parsed.app !== `${APP_ID}-backup` || parsed.version !== 1 || !Array.isArray(parsed.projects)) {
      return null
    }
    const projects: BackupFile['projects'] = []
    for (const p of parsed.projects) {
      if (!p || typeof p.id !== 'string' || typeof p.name !== 'string' || !p.doc) continue
      const doc = sanitizeDoc(p.doc)
      if (!doc) continue
      projects.push({
        id: p.id,
        name: p.name,
        createdAt: typeof p.createdAt === 'number' ? p.createdAt : Date.now(),
        updatedAt: typeof p.updatedAt === 'number' ? p.updatedAt : Date.now(),
        doc,
      })
    }
    const settings: Record<string, string> = {}
    if (parsed.settings && typeof parsed.settings === 'object') {
      for (const [k, v] of Object.entries(parsed.settings)) {
        if (k.startsWith(`${APP_ID}.`) && typeof v === 'string') settings[k] = v
      }
    }
    return {
      app: `${APP_ID}-backup`,
      version: 1,
      savedAt: typeof parsed.savedAt === 'number' ? parsed.savedAt : Date.now(),
      settings,
      projects,
    }
  } catch {
    return null
  }
}

/** Validate + migrate a serialized project envelope. Only envelopes stamped
 *  with this build's APP_ID parse — the gate that keeps sibling apps from
 *  reading each other's charts, packs, backups and share links. */
export function parseProjectText(text: string): ProjectFile | null {
  try {
    const parsed = JSON.parse(text) as Partial<ProjectFile>
    if (!parsed || parsed.app !== APP_ID || !parsed.doc) return null
    const doc = sanitizeDoc(parsed.doc)
    if (!doc) return null
    return {
      app: APP_ID,
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

/** Accepts chart exports, symbol packs, and full-user backups. */
export function parseInterchangeText(text: string): InterchangeImport | null {
  try {
    const parsed = JSON.parse(text) as Record<string, unknown>
    if (!parsed || typeof parsed !== 'object') return null
    if (parsed.app === `${APP_ID}-symbol-pack`) {
      const set = parsePackText(text)
      return set ? { type: 'pack', set } : null
    }
    if (parsed.app === `${APP_ID}-backup`) {
      const backup = parseBackupText(text)
      return backup ? { type: 'backup', backup } : null
    }
    if (parsed.app === APP_ID) {
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

