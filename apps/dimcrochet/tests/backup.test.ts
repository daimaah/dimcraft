import { describe, expect, it } from 'vitest'
import { applyBackup } from '@dimcraft/core/export/backup'
import { parseBackupText, parseInterchangeText } from '@dimcraft/core/export/projectFile'
import { createStarterDoc } from '../src/model/starter'

const validProject = {
  id: 'proj-abc',
  name: 'My chart',
  createdAt: 100,
  updatedAt: 200,
  doc: { ...createStarterDoc(), title: 'My chart' },
}

const backupJson = (projects: unknown[], settings: Record<string, string> = { 'dimcrochet.lefty': 'true' }) =>
  JSON.stringify({ app: 'dimcrochet-backup', version: 1, savedAt: 12345, settings, projects })

describe('backup parsing', () => {
  it('parses valid projects, drops broken ones, and filters settings', () => {
    const backup = parseBackupText(
      backupJson([validProject, { id: 'proj-bad', name: 'broken', doc: { nope: true } }]),
    )!
    expect(backup.projects).toHaveLength(1)
    expect(backup.projects[0]).toMatchObject({ id: 'proj-abc', name: 'My chart' })
    expect(backup.projects[0].doc.placements).toHaveLength(21)
    expect(backup.settings).toEqual({ 'dimcrochet.lefty': 'true' })
  })

  it('rejects files that are not backups', () => {
    expect(parseBackupText(JSON.stringify({ app: 'dimcrochet' }))).toBeNull()
    expect(parseBackupText('not json')).toBeNull()
    expect(parseInterchangeText(backupJson([validProject]))?.type).toBe('backup')
  })
})

describe('applyBackup', () => {
  it('reports the restored count (storage writes exercised in-browser)', async () => {
    const backup = parseBackupText(backupJson([validProject, validProject]))!
    const restored = await applyBackup(backup)
    expect(restored).toBe(2)
  })
})
