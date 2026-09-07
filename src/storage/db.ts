import { createStore, del, entries, get, set } from 'idb-keyval'
import type { ProjectRecord } from '../model/types'

const store = typeof indexedDB !== 'undefined' ? createStore('dimcrochet-db', 'projects') : undefined

export async function listProjects(): Promise<ProjectRecord[]> {
  if (!store) return []
  const all = await entries<string, ProjectRecord>(store)
  return all.map(([, rec]) => rec).sort((a, b) => b.updatedAt - a.updatedAt)
}

export async function saveProject(rec: ProjectRecord): Promise<void> {
  if (!store) return
  await set(rec.id, rec, store)
}

export async function loadProject(id: string): Promise<ProjectRecord | undefined> {
  if (!store) return undefined
  return get<ProjectRecord>(id, store)
}

export async function deleteProject(id: string): Promise<void> {
  if (!store) return
  await del(id, store)
}
