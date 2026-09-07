import { useEffect } from 'react'
import { ChartCanvas } from './canvas/ChartCanvas'
import { Gallery } from './gallery/Gallery'
import { FollowBar } from './panels/FollowBar'
import { Inspector } from './panels/Inspector'
import { Dialogs } from './panels/dialogs'
import { LayersPanel } from './panels/LayersPanel'
import { SymbolPalette } from './panels/SymbolPalette'
import { useStore } from './state/store'
import { loadProject, saveProject } from './storage/db'
import { StatusBar } from './ui/StatusBar'
import { Toolbar } from './ui/Toolbar'

const LAST_KEY = 'dimcrochet.lastProject'
const PREFS_KEY = 'dimcrochet.prefs'

function isTypingTarget(t: EventTarget | null): boolean {
  return t instanceof HTMLElement && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)
}

function fitCenter() {
  const el = document.querySelector('.canvas-wrap')
  if (el) {
    const r = el.getBoundingClientRect()
    useStore.getState().fitView(r.width, r.height)
  }
}

export default function App() {
  const projectId = useStore((s) => s.projectId)
  const followActive = useStore((s) => s.followActive)
  const leftCollapsed = useStore((s) => s.leftCollapsed)
  const rightCollapsed = useStore((s) => s.rightCollapsed)

  // centre the view on the chart whenever a project opens
  useEffect(() => {
    if (!projectId) return
    const t = setTimeout(fitCenter, 60)
    return () => clearTimeout(t)
  }, [projectId])

  // restore last project + preferences
  useEffect(() => {
    try {
      const prefs = JSON.parse(localStorage.getItem(PREFS_KEY) ?? '{}')
      if (typeof prefs.snapEnabled === 'boolean') useStore.setState({ snapEnabled: prefs.snapEnabled })
      if (typeof prefs.gridVisible === 'boolean') useStore.setState({ gridVisible: prefs.gridVisible })
      if (typeof prefs.guidesVisible === 'boolean') useStore.setState({ guidesVisible: prefs.guidesVisible })
      if (typeof prefs.leftCollapsed === 'boolean') useStore.setState({ leftCollapsed: prefs.leftCollapsed })
      if (typeof prefs.rightCollapsed === 'boolean') useStore.setState({ rightCollapsed: prefs.rightCollapsed })
    } catch {
      /* ignore bad prefs */
    }
    void (async () => {
      const last = localStorage.getItem(LAST_KEY)
      if (last) {
        const rec = await loadProject(last)
        if (rec) useStore.getState().openProject(rec)
      }
    })()
  }, [])

  // persist preferences
  useEffect(() => {
    const unsub = useStore.subscribe((s, prev) => {
      if (
        s.snapEnabled !== prev.snapEnabled ||
        s.gridVisible !== prev.gridVisible ||
        s.guidesVisible !== prev.guidesVisible ||
        s.leftCollapsed !== prev.leftCollapsed ||
        s.rightCollapsed !== prev.rightCollapsed
      ) {
        localStorage.setItem(
          PREFS_KEY,
          JSON.stringify({
            snapEnabled: s.snapEnabled,
            gridVisible: s.gridVisible,
            guidesVisible: s.guidesVisible,
            leftCollapsed: s.leftCollapsed,
            rightCollapsed: s.rightCollapsed,
          }),
        )
      }
    })
    return unsub
  }, [])

  // debounced autosave
  useEffect(() => {
    if (!projectId) return
    let handle: ReturnType<typeof setTimeout> | null = null
    const unsub = useStore.subscribe((s, prev) => {
      if (s.doc === prev.doc && s.projectName === prev.projectName) return
      if (handle) clearTimeout(handle)
      handle = setTimeout(() => {
        const st = useStore.getState()
        if (!st.projectId || !st.createdAt) return
        void saveProject({
          id: st.projectId,
          name: st.projectName,
          createdAt: st.createdAt,
          updatedAt: Date.now(),
          doc: st.doc,
        }).then(() => useStore.getState().markSaved(Date.now()))
      }, 600)
    })
    return () => {
      unsub()
      if (handle) clearTimeout(handle)
    }
  }, [projectId])

  // keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const st = useStore.getState()
      if (isTypingTarget(e.target)) return
      const mod = e.ctrlKey || e.metaKey
      if (mod) {
        switch (e.key.toLowerCase()) {
          case 'z':
            e.preventDefault()
            if (e.shiftKey) st.redo()
            else st.undo()
            return
          case 'y':
            e.preventDefault()
            st.redo()
            return
          case 'd':
            e.preventDefault()
            st.duplicateSelection()
            return
          case 'g':
            e.preventDefault()
            if (e.shiftKey) st.ungroupSelection()
            else st.groupSelection()
            return
          case 'e':
            e.preventDefault()
            st.openDialog('export')
            return
          case '=':
          case '+':
            e.preventDefault()
            st.zoomAt(1.2, window.innerWidth / 2, window.innerHeight / 2)
            return
          case '-':
            e.preventDefault()
            st.zoomAt(1 / 1.2, window.innerWidth / 2, window.innerHeight / 2)
            return
          case '0':
            e.preventDefault()
            fitCenter()
            return
          default:
            return
        }
      }
      if (st.dialog) {
        if (e.key === 'Escape') st.closeDialog()
        return
      }
      switch (e.key) {
        case 'Delete':
        case 'Backspace':
          e.preventDefault()
          st.deleteSelection()
          return
        case 'Escape':
          if (st.bracketStart) st.setBracketStart(null)
          else st.setTool('select')
          return
        case 'ArrowLeft':
          e.preventDefault()
          st.nudge(e.shiftKey ? -10 : -1, 0)
          return
        case 'ArrowRight':
          e.preventDefault()
          st.nudge(e.shiftKey ? 10 : 1, 0)
          return
        case 'ArrowUp':
          e.preventDefault()
          st.nudge(0, e.shiftKey ? -10 : -1)
          return
        case 'ArrowDown':
          e.preventDefault()
          st.nudge(0, e.shiftKey ? 10 : 1)
          return
      }
      switch (e.key.toLowerCase()) {
        case 'v':
          st.setTool('select')
          return
        case 'p':
          st.setTool('place')
          return
        case 'b':
          st.setTool('bracket')
          return
        case 'l':
          st.setTool('line')
          return
        case 'h':
          st.setTool(st.tool === 'pan' ? 'select' : 'pan')
          return
        case 'f':
          st.setFollow(!st.followActive)
          return
        case 't':
          st.setTool('text')
          return
        case '1':
          st.setTool('guide-circle')
          return
        case '2':
          st.setTool('guide-arc')
          return
        case '3':
          st.setTool('guide-spiral')
          return
        case '4':
          st.setTool('guide-line')
          return
        case '5':
          st.setTool('guide-polygon')
          return
        case 'r':
          if (st.tool === 'place') {
            e.preventDefault()
            st.setPlacingRotation(st.placingRotation + (e.shiftKey ? -15 : 15))
          }
          return
        case '[':
          if (st.tool === 'place') st.setPlacingScale(st.placingScale / 1.15)
          return
        case ']':
          if (st.tool === 'place') st.setPlacingScale(st.placingScale * 1.15)
          return
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  if (!projectId)
    return (
      <>
        <Gallery />
        <Dialogs />
      </>
    )

  return (
    <div className="app">
      <Toolbar />
      <div className="main">
        {!leftCollapsed && <SymbolPalette />}
        <div className="canvas-wrap">
          <ChartCanvas />
          {leftCollapsed && (
            <button
              className="edge-tab left"
              title="Show symbols"
              onClick={() => useStore.getState().setLeftCollapsed(false)}
            >
              ›
            </button>
          )}
          {rightCollapsed && (
            <button
              className="edge-tab right"
              title="Show inspector"
              onClick={() => useStore.getState().setRightCollapsed(false)}
            >
              ‹
            </button>
          )}
          {followActive && <FollowBar />}
        </div>
        {!rightCollapsed && (
          <div className="right-col">
            <div className="col-head">
              <button
                className="icon-btn"
                title="Hide inspector & layers"
                onClick={() => useStore.getState().setRightCollapsed(true)}
              >
                ›
              </button>
            </div>
            <section className="panel inspector-panel">
              <Inspector />
            </section>
            <LayersPanel />
          </div>
        )}
      </div>
      <StatusBar />
      <Dialogs />
    </div>
  )
}
