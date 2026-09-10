import { useEffect, useRef, useState } from 'react'
import { Modal } from './Dialogs'
import { imageFileToChart, imageFileToPixels } from '../geometry/imageChart'
import { denoiseCells, quantize, type PixelImage, type QuantizedChart } from '@dimcraft/core/import/imageChart'
import { useStore } from '../state/store'

const EXAMPLE_HINT = 'A simple, high-contrast picture works best — logos, silhouettes, pixel art.'

/** Picture → colourwork chart: the guided pipeline. Pick a picture, choose
 *  the chart width, how many yarns it needs, whether to clean isolated
 *  pixels, and what the background becomes — with a live before/after
 *  preview before anything is created. */
export function ImageImportDialog() {
  const [file, setFile] = useState<File | null>(null)
  const [pixels, setPixels] = useState<PixelImage | null>(null)
  const [chart, setChart] = useState<QuantizedChart | null>(null)
  const [widthStitches, setWidthStitches] = useState(40)
  const [colours, setColours] = useState(4)
  const [denoise, setDenoise] = useState(true)
  const [background, setBackground] = useState<'blank' | 'no-stitch' | 'yarn'>('blank')
  const [error, setError] = useState<string | null>(null)
  const objectUrl = useRef<string | null>(null)

  useEffect(() => {
    return () => {
      if (objectUrl.current) URL.revokeObjectURL(objectUrl.current)
    }
  }, [])

  const pick = async (f: File | null) => {
    setFile(f)
    setError(null)
    setChart(null)
    if (!f) {
      setPixels(null)
      return
    }
    try {
      const px = await imageFileToPixels(f)
      setPixels(px)
      // suggest the picture's own yarn count: small palettes (SVGs, pixel
      // art, logos) import with their exact colours
      const detected = quantize(px, { widthStitches, colours: 8 }).detected
      if (detected >= 2 && detected <= 8) setColours(detected)
    } catch {
      setError('That picture could not be read.')
      setPixels(null)
    }
  }

  // recompute the preview whenever the picture or a control changes
  useEffect(() => {
    if (!pixels) {
      setChart(null)
      return
    }
    let chart = quantize(pixels, { widthStitches, colours })
    if (denoise) chart = denoiseCells(chart)
    setChart(chart)
  }, [pixels, widthStitches, colours, denoise])

  const create = async () => {
    if (!file || !chart) return
    const name = file.name.replace(/\.[^.]+$/, '') || 'Picture chart'
    const doc = await imageFileToChart(file, name, { widthStitches, colours, denoise, background })
    useStore.getState().newProject(name, doc)
  }

  return (
    <Modal title="Chart from picture" onClose={() => useStore.getState().closeDialog()}>
      <p className="hint">{EXAMPLE_HINT}</p>
      <div className="field-row">
        <label className="btn">
          Choose picture…
          <input
            type="file"
            accept="image/*"
            hidden
            data-testid="image-input"
            onChange={(e) => {
              void pick(e.target.files?.[0] ?? null)
              e.target.value = ''
            }}
          />
        </label>
        {file && <span className="hint">{file.name} — {pixels ? `${pixels.width} × ${pixels.height} px` : 'reading…'}</span>}
      </div>
      {error && <p className="hint">{error}</p>}

      {pixels && (
        <>
          <div className="field-row">
            <label>
              Chart width
              <input
                type="range"
                min={8}
                max={120}
                step={2}
                value={widthStitches}
                onChange={(e) => setWidthStitches(Number(e.target.value))}
                data-testid="img-width"
              />
              <span className="hint">{widthStitches} stitches{chart ? ` × ${chart.rows} rows` : ''}</span>
            </label>
          </div>
          <div className="field-row">
            <label>
              Yarns
              <input
                type="range"
                min={2}
                max={8}
                value={colours}
                onChange={(e) => setColours(Number(e.target.value))}
                data-testid="img-colours"
              />
              <span className="hint">{colours} colours</span>
            </label>
          </div>
          <label className="field-row check">
            <input type="checkbox" checked={denoise} onChange={(e) => setDenoise(e.target.checked)} />
            Clean isolated pixels
          </label>
          <div className="field-row">
            <label>
              Background becomes
              <select value={background} onChange={(e) => setBackground(e.target.value as 'blank' | 'no-stitch' | 'yarn')} data-testid="img-background">
                <option value="blank">Background stitches (blank cells)</option>
                <option value="yarn">Its own yarn (MC)</option>
                <option value="no-stitch">No-stitch placeholders</option>
              </select>
            </label>
          </div>

          <div className="img-preview" data-testid="img-preview">
            {file && <img src={objectUrl.current ?? (objectUrl.current = URL.createObjectURL(file))} alt="original" />}
            {chart && <PreviewGrid chart={chart} background={background} />}
          </div>
          <p className="hint">The chart's cells follow your gauge aspect, so the preview shows the knitted proportions.</p>
        </>
      )}

      <div className="modal-actions">
        <button className="btn" onClick={() => useStore.getState().closeDialog()}>
          Cancel
        </button>
        <button className="btn accent" disabled={!chart} onClick={() => void create()} data-testid="create-from-image">
          Create chart
        </button>
      </div>
    </Modal>
  )
}

/** Pixel preview: one rect per chart cell, bottom-up like the real chart. */
function PreviewGrid({ chart, background }: { chart: QuantizedChart; background: 'blank' | 'no-stitch' | 'yarn' }) {
  const cell = 10
  return (
    <svg width={chart.cols * cell} height={chart.rows * cell} viewBox={`0 0 ${chart.cols * cell} ${chart.rows * cell}`} role="img" aria-label="chart preview">
      {chart.cells.map((line, row) =>
        line.map((colour, col) => {
          if (colour == null) return null
          const isBg = colour === chart.palette[0] && background !== 'yarn'
          return (
            <rect
              key={`${row}-${col}`}
              x={col * cell}
              y={(chart.rows - 1 - row) * cell}
              width={cell}
              height={cell}
              fill={colour}
              stroke={isBg && background === 'blank' ? 'rgba(128,128,128,0.35)' : 'none'}
              strokeWidth={isBg && background === 'blank' ? 0.5 : 0}
            />
          )
        }),
      )}
    </svg>
  )
}