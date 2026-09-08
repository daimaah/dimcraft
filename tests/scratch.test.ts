import { describe, it } from 'vitest'
import { preprocessCrochetParade } from '../src/geometry/paradeAdapter'
import { parsePattern } from '../src/geometry/patternParser'

describe('scratch dump', () => {
  it('dumps preprocessing', () => {
    const parade = [
      '#Granny square showcase',
      'DEF: p=3ch,ss@1[%,%-4] # Picot stitch',
      'COLOR: Pink',
      '6ch.Ring+1!,ss@[%,0]',
      '[ch,15sc].Ring1[]@Ring,ss@[%,0],COLOR: Violet,sc@Ring1[][0]',
      '$c=0$,@Ring1[][0],[5ch.chain_space[0,c++]+!,sk,>,sc]*8,ss@[-1,-1]',
      '$t=0,c=0$,ch,[sc,hdc,dc,p,tr.Tip[t++],dc,p,hdc,>,sc]@chain_space[0,c++]*8,ss@[%,0]',
      'COLOR: Green',
      '$t=0,c=0$,dc4bobble_start_new@Tip[t],[dc4bobble@Tip[t],<,2ch.chsp[c++]+!,tr4bobble@Tip[t],2ch.chsp[c++]+!,dc4bobble@Tip[t],4ch.chsp[c++]+!,hdc@Tip[++t],4ch.chsp[c++]+!,$t++$]*4,sc@[%,3]',
      'COLOR: Pink',
      '$c=0$,3ch,[3tr@chsp[c++],3ch,3tr@chsp[c++],ch,>,(4dc@chsp[c++],ch)*2]*4,4dc@chsp[c++],ch,3dc@chsp[c++],ss@[%,1]',
      'COLOR: Green',
      'ch,2sk,5sc,[sc,dc@[@],sc@[@],13sc,>,6sc]*4,ss@[%,0]',
      'DOT: start=1',
    ].join('\n')
    const pre = preprocessCrochetParade(parade)
    console.log('PREPROCESSED LINES:')
    pre.text.split('\n').forEach((l, i) => console.log(`  ${i + 1}: ${JSON.stringify(l)}`))
    console.log('bracket balance per line:', pre.text.split('\n').map((l) => {
      let d = 0
      for (const ch of l) { if (ch === '[' || ch === '(') d++; if (ch === ']' || ch === ')') d-- }
      return d
    }).join(','))
    const parsed = parsePattern(parade)
    console.log('rounds:', parsed.rounds.map((r) => `${r.label}=${r.total}`).join(', '))
  })
})
