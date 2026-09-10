import { describe, expect, it } from 'vitest'
import { getCraft } from '@dimcraft/core/craft'
import { createStarter } from '../src/model/starters'
import '../src/craft'

describe('knit craft module', () => {
  it('registers itself as the active craft', () => {
    expect(getCraft().craft).toBe('knit')
    expect(getCraft().defaultSymbolId).toBe('k')
  })

  it('ships the CYC-style palette with the RS/WS duality cells', () => {
    const ids = getCraft().baseSymbols.map((d) => d.id)
    expect(ids).toEqual(['k', 'p', 'yo', 'k2tog', 'ssk', 's2kp2', 'ns'])
  })

  it('produces follow steps through the craft module interface', () => {
    const doc = createStarter('rib')
    const steps = getCraft().followSteps(doc, 20, 'ccw')
    expect(steps.length).toBe(8)
    expect(steps[0].text).toMatch(/^Row 1 \(RS\):/)
  })
})
