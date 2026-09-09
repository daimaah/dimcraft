import { describe, expect, it } from 'vitest'
import { sortProjects, DESIGNS_SORTS } from '../src/model/projectSort'
import type { ProjectRecord } from '../src/model/types'

const rec = (id: string, name: string, updatedAt: number): ProjectRecord => ({
  id,
  name,
  createdAt: 0,
  updatedAt,
  doc: {
    schemaVersion: 1,
    title: name,
    placements: [],
    guides: [],
    lines: [],
    brackets: [],
    texts: [],
    customSymbols: [],
    labelOverrides: {},
    legend: { visible: true, x: 0, y: 0, title: 'Legend', showCounts: true, scale: 1 },
    ink: '#26221f',
  },
})

const list = () => [rec('a', 'Zebra', 300), rec('b', 'apple', 100), rec('c', 'Mango', 200)]

describe('project sorting', () => {
  it('offers four modes with labels', () => {
    expect(DESIGNS_SORTS.map((s) => s.id)).toEqual(['updated-desc', 'updated-asc', 'name-asc', 'name-desc'])
  })

  it('sorts by last updated descending by default', () => {
    const sorted = sortProjects(list(), 'updated-desc')
    expect(sorted.map((p) => p.id)).toEqual(['a', 'c', 'b'])
  })

  it('sorts by last updated ascending', () => {
    const sorted = sortProjects(list(), 'updated-asc')
    expect(sorted.map((p) => p.id)).toEqual(['b', 'c', 'a'])
  })

  it('sorts by name in both directions (case-insensitive)', () => {
    expect(sortProjects(list(), 'name-asc').map((p) => p.name)).toEqual(['apple', 'Mango', 'Zebra'])
    expect(sortProjects(list(), 'name-desc').map((p) => p.name)).toEqual(['Zebra', 'Mango', 'apple'])
  })

  it('does not mutate the input array', () => {
    const l = list()
    const before = l.map((p) => p.id)
    sortProjects(l, 'name-asc')
    expect(l.map((p) => p.id)).toEqual(before)
  })
})
