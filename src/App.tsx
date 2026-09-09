import { useEffect } from 'react'
import { ChartCanvas } from './canvas/ChartCanvas'
import { Gallery } from './gallery/Gallery'
import { FollowBar, stepFollow, toggleFollowPlayback } from './panels/FollowBar'
import { Inspector } from './panels/Inspector'
import { Dialogs } from './panels/dialogs'
import { LayersPanel } from './panels/LayersPanel'
import { SharedChartDialog } from './panels/SharedChartDialog'
import { SymbolPalette } from './panels/SymbolPalette'
import { useStore } from './state/store'
import { decodeShareFragment } from './export/share'
import { parseShortLinkLocation, fetchShortLink } from './export/secureShare'
import { loadProject, saveProject } from './storage/db'
import { chartHash, GALLERY_HASH, parseRoute } from './route'
import { StatusBar } from './ui/StatusBar'
import { Toolbar } from './ui/Toolbar'
import { ToolPalette } from './ui/ToolPalette'

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
  const sharedChart = useStore((s) => s.sharedChart)
  const viewAnimations = useStore((s) => s.viewAnimations)

  // collapsible-bar / zoom animations read this off the root element
  useEffect(() => {
    document.documentElement.dataset.anim = viewAnimations ? 'on' : 'off'
  }, [viewAnimations])

  // centre the view on the chart whenever a project opens
  useEffect(() => {
    if (!projectId) return
    const t = setTimeout(fitCenter, 60)
    return () => clearTimeout(t)
  }, [projectId])

  // shared charts: either embedded in the fragment (#c=..., never sent to a
  // server) or fetched encrypted from a self-hosted sidecar (/x/<id>#k=...,
  // where the server only ever saw ciphertext)
  useEffect(() => {
    const short = parseShortLinkLocation(location.pathname, location.hash)
    if (short) {
      fetchShortLink(location.origin, short.id, short.key).then((res) => {
        if (res) {
          useStore.getState().setSharedChart({
            ...res,
            note: 'The chart arrived encrypted — the sidecar stored only ciphertext it cannot read.',
          })
        }
        history.replaceState(null, '', location.pathname.replace(/\/x\/[^/]+$/, '/') + location.search)
      })
      return
    }
    if (!location.hash.startsWith('#c=')) return
    decodeShareFragment(location.hash).then((res) => {
      if (res) useStore.getState().setSharedChart(res)
      // remove the fragment so reloading doesn't re-import
      history.replaceState(null, '', location.pathname + location.search)
    })
  }, [])

  // restore last project + preferences
  useEffect(() => {
    try {
      const prefs = JSON.parse(localStorage.getItem(PREFS_KEY) ?? '{}')
      if (typeof prefs.snapEnabled === 'boolean') useStore.setState({ snapEnabled: prefs.snapEnabled })
      if (typeof prefs.gridVisible === 'boolean') useStore.setState({ gridVisible: prefs.gridVisible })
      if (typeof prefs.guidesVisible === 'boolean') useStore.setState({ guidesVisible: prefs.guidesVisible })
      if (typeof prefs.leftCollapsed === 'boolean') useStore.setState({ leftCollapsed: prefs.leftCollapsed })
      if (typeof prefs.rightCollapsed === 'boolean') useStore.setState({ rightCollapsed: prefs.rightCollapsed })
      if (typeof prefs.lefty === 'boolean') useStore.setState({ lefty: prefs.lefty })
      if (typeof prefs.viewAnimations === 'boolean') useStore.setState({ viewAnimations: prefs.viewAnimations })
      if (typeof prefs.clock24h === 'boolean') useStore.setState({ clock24h: prefs.clock24h })
      if (typeof prefs.islandFullOpacity === 'boolean') useStore.setState({ islandFullOpacity: prefs.islandFullOpacity })
      if (typeof prefs.toolbarOpacity === 'number') useStore.getState().setToolbarOpacity(prefs.toolbarOpacity)
      if (typeof prefs.toolbarHoverOpacity === 'number') useStore.getState().setToolbarHoverOpacity(prefs.toolbarHoverOpacity)
      const legacy = (() => {
        try {
          return JSON.parse(localStorage.getItem('dimcrochet.toolPalette') ?? '{}')
        } catch {
          return {}
        }
      })()
      if (prefs.palette && typeof prefs.palette === 'object') {
        const pal = prefs.palette as Record<string, unknown>
        useStore.setState({
          palette: {
            rows: pal.rows === 2 ? 2 : 1,
            pos: (pal.pos as { x: number; y: number } | null) ?? null,
            collapsed: pal.collapsed === true,
            order: Array.isArray(pal.order) ? (pal.order as string[]) : null,
            hidden: Array.isArray(pal.hidden) ? (pal.hidden as string[]) : [],
          },
        })
      } else if (legacy.x !== undefined) {
        // migrate the pre-options follow-bar-style storage
        useStore.getState().setPalette({ pos: { x: legacy.x, y: legacy.y }, collapsed: legacy.collapsed === true })
      }
      localStorage.removeItem('dimcrochet.toolPalette')
    } catch {
      /* ignore bad prefs */
    }
    void (async () => {
      // the URL decides what opens: #/chart/<id> reopens that design, anything
      // else is the gallery — a bare root never silently restores a chart
      const route = parseRoute(location.hash)
      if (route.kind !== 'chart') return
      const rec = await loadProject(route.id)
      if (rec) useStore.getState().openProject(rec)
      else history.replaceState(null, '', GALLERY_HASH)
    })()
  }, [])

  // keep the hash in step with the open project; pushState (not replace) so
  // the browser Back button returns to the previous view. It never fires
  // hashchange, so the listener below stays the only store→URL writer.
  useEffect(
    () =>
      useStore.subscribe((s, prev) => {
        if (s.projectId === prev.projectId) return
        const want = s.projectId ? chartHash(s.projectId) : GALLERY_HASH
        if (location.hash !== want) history.pushState(null, '', want)
      }),
    [],
  )

  // Back/Forward navigation and hand-edited hashes drive the view
  useEffect(() => {
    const onHash = () => {
      const st = useStore.getState()
      const route = parseRoute(location.hash)
      if (route.kind === 'gallery') {
        if (st.projectId) st.closeProject()
        return
      }
      if (route.id === st.projectId) return
      void loadProject(route.id).then((rec) => {
        if (rec) useStore.getState().openProject(rec)
        else history.replaceState(null, '', GALLERY_HASH)
      })
    }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  // persist preferences
  useEffect(() => {
    const unsub = useStore.subscribe((s, prev) => {
      if (
        s.snapEnabled !== prev.snapEnabled ||
        s.gridVisible !== prev.gridVisible ||
        s.guidesVisible !== prev.guidesVisible ||
        s.leftCollapsed !== prev.leftCollapsed ||
        s.rightCollapsed !== prev.rightCollapsed ||
        s.lefty !== prev.lefty ||
        s.viewAnimations !== prev.viewAnimations ||
        s.palette !== prev.palette ||
        s.clock24h !== prev.clock24h ||
        s.toolbarOpacity !== prev.toolbarOpacity ||
        s.islandFullOpacity !== prev.islandFullOpacity ||
        s.toolbarHoverOpacity !== prev.toolbarHoverOpacity
      ) {
        localStorage.setItem(
          PREFS_KEY,
          JSON.stringify({
            snapEnabled: s.snapEnabled,
            gridVisible: s.gridVisible,
            guidesVisible: s.guidesVisible,
            leftCollapsed: s.leftCollapsed,
            rightCollapsed: s.rightCollapsed,
            lefty: s.lefty,
            viewAnimations: s.viewAnimations,
            palette: s.palette,
            clock24h: s.clock24h,
            toolbarOpacity: s.toolbarOpacity,
            islandFullOpacity: s.islandFullOpacity,
            toolbarHoverOpacity: s.toolbarHoverOpacity,
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
          case 'c':
            e.preventDefault()
            st.copySelection()
            return
          case 'x':
            e.preventDefault()
            st.cutSelection()
            return
          case 'v':
            e.preventDefault()
            st.pasteClipboard()
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
          case ']':
          case '}':
            e.preventDefault()
            // Shift+bracket produces } / { on US layouts — both mean "to front"
            st.reorderPlacements(e.shiftKey ? 'front' : 'forward')
            return
          case '[':
          case '{':
            e.preventDefault()
            st.reorderPlacements(e.shiftKey ? 'back' : 'backward')
            return
          default:
            return
        }
      }
      if (st.dialog) {
        if (e.key === 'Escape') st.closeDialog()
        return
      }
      // follow mode playback: arrows step stitches when nothing is selected, space plays
      if (st.followActive && st.selPlacements.length === 0) {
        switch (e.key) {
          case 'ArrowLeft':
            e.preventDefault()
            stepFollow(-1)
            return
          case 'ArrowRight':
            e.preventDefault()
            stepFollow(1)
            return
          case ' ':
            e.preventDefault()
            if (!e.repeat) toggleFollowPlayback()
            return
        }
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
        {sharedChart && <SharedChartDialog />}
      </>
    )

  return (
    <div className="app">
      <Toolbar />
      <div className="main">
        {/* panels stay mounted so collapse/expand can animate (see .side-wrap) */}
        <div className={`side-wrap left${leftCollapsed ? ' closed' : ''}`}>
          <SymbolPalette />
        </div>
        <div className="canvas-wrap">
          <ChartCanvas />
          <ToolPalette />
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
        <div className={`side-wrap right${rightCollapsed ? ' closed' : ''}`}>
          <div className="right-col">
            <section className="panel inspector-panel">
              <Inspector />
            </section>
            <LayersPanel />
          </div>
        </div>
      </div>
      <StatusBar />
      <Dialogs />
      {sharedChart && <SharedChartDialog />}
    </div>
  )
}
