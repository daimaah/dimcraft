import { listProjects, saveProject } from '../storage/db'
import { downloadBlob, safeFilename } from './download'
import type { BackupFile } from './projectFile'

/**
 * Full-user backup: every saved project plus all dimcrochet.* settings from
 * localStorage, in one downloadable JSON file. Restoring adds/overwrites
 * projects by id (other charts are kept) and replays the settings.
 */

const SETTINGS_PREFIX = 'dimcrochet.'

export async function createBackup(): Promise<BackupFile> {
  const projects = (await listProjects()).map(({ id, name, createdAt, updatedAt, doc }) => ({
    id,
    name,
    createdAt,
    updatedAt,
    doc,
  }))
  const settings: Record<string, string> = {}
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith(SETTINGS_PREFIX)) settings[key] = localStorage.getItem(key) ?? ''
    }
  } catch {
    /* storage unavailable */
  }
  return { app: 'dimcrochet-backup', version: 1, savedAt: Date.now(), settings, projects }
}

export async function downloadBackup(): Promise<string> {
  const backup = await createBackup()
  const date = new Date(backup.savedAt).toISOString().slice(0, 10)
  const filename = `${safeFilename(`dimcrochet-backup-${date}`)}.json`
  downloadBlob(filename, new Blob([JSON.stringify(backup)], { type: 'application/json' }))
  return filename
}

export async function applyBackup(backup: BackupFile): Promise<number> {
  for (const p of backup.projects) {
    await saveProject({ id: p.id, name: p.name, createdAt: p.createdAt, updatedAt: p.updatedAt, doc: p.doc })
  }
  for (const [key, value] of Object.entries(backup.settings)) {
    try {
      localStorage.setItem(key, value)
    } catch {
      /* storage unavailable */
    }
  }
  return backup.projects.length
}
