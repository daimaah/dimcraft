import type { ChartDoc } from '@dimcraft/core/model/types'
import type { TerminologyPreset } from '@dimcraft/core/craft'

/**
 * Knitting abbreviations are broadly universal (k, p, yo, k2tog, ssk…), but
 * regional vocabularies exist — the Finnish preset follows the definitions
 * published with Drops (Garnstudio) Finnish patterns, e.g. pattern 9166:
 * "os" = oikea silmukka, "ns" = nurja silmukka, "ly" = langankierto, with
 * decreases named by their construction ("neulo 2 silmukkaa oikein yhteen",
 * "nosta 1 silmukka neulomatta … vedä yli").
 */

export const TERMINOLOGY_PRESETS: TerminologyPreset[] = [
  { id: 'universal', name: 'Universal knitting abbreviations', labels: {} },
  {
    id: 'fi',
    name: 'Suomi (FI)',
    labels: {
      k: 'os',
      p: 'ns',
      yo: 'ly',
      // Drops Finnish: "neulo 2 silmukkaa oikein yhteen"
      k2tog: '2 oik. yht.',
      // Drops 201: "nosta 1 silmukka oikein neulomatta, neulo 1 silmukka
      // oikein, vedä nostettu silmukka neulotun yli"
      ssk: 'nosta 1, neulo 1, vedä yli',
      // Drops 301: "nosta 1 silmukka oikein neulomatta, neulo 2 silmukkaa
      // oikein yhteen, vedä nostettu silmukka kavennuksen yli"
      s2kp2: 'nosta 1, 2 oik. yht., vedä yli',
      // the wrong-side workings from the same two-sided definitions
      // (202: "…neulo 2 silmukkaa nurin yhteen nurjalta puolelta")
      p2tog: '2 nurj. yht.',
    },
  },
]

export function applyTerminologyToDoc(doc: ChartDoc, presetId: string): void {
  const preset = TERMINOLOGY_PRESETS.find((p) => p.id === presetId)
  if (!preset || preset.id === 'universal' || !preset.labels) {
    doc.labelOverrides = {}
    return
  }
  doc.labelOverrides = { ...preset.labels }
}