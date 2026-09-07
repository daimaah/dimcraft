import { createStore, del, entries, get, set } from 'idb-keyval'
import { sanitizeDoc } from '../model/doc'
import type { ChartDoc, ProjectRecord } from '../model/types'

const store = typeof indexedDB !== 'undefined' ? createStore('dimcrochet-db', 'projects') : undefined

/** Migrate records saved by older app versions so every reader sees a full doc. */
function migrate(rec: ProjectRecord): ProjectRecord {
  return { ...rec, doc: sanitizeDoc(rec.doc) ?? createFallbackDoc(rec) }
}

function createFallbackDoc(rec: ProjectRecord): ChartDoc {
  return {
    schemaVersion: 1,
    title: rec.name,
    placements: [],
    guides: [],
    lines: [],
    brackets: [],
    texts: [],
    customSymbols: [],
    labelOverrides: {},
    legend: { visible: true, x: 150, y: -150, title: 'Legend', showCounts: true, scale: 1 },
    ink: '#26221f',
  }
}

export async function listProjects(): Promise<ProjectRecord[]> {
  if (!store) return []
  const all = await entries<string, ProjectRecord>(store)
  return all.map(([, rec]) => migrate(rec)).sort((a, b) => b.updatedAt - a.updatedAt)
}

export async function saveProject(rec: ProjectRecord): Promise<void> {
  if (!store) return
  await set(rec.id, rec, store)
}

export async function loadProject(id: string): Promise<ProjectRecord | undefined> {
  if (!store) return undefined
  const rec = await get<ProjectRecord>(id, store)
  return rec ? migrate(rec) : undefined
}

export async function deleteProject(id: string): Promise<void> {
  if (!store) return
  await del(id, store)
}
