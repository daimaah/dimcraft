import { useEffect } from 'react'
import { ChartCanvas } from '@dimcraft/core/canvas/ChartCanvas'
import { importInterchangeFile } from '@dimcraft/core/export/projectFile'
import { applyBackup } from '@dimcraft/core/export/backup'
import { loadProject, saveProject } from '@dimcraft/core/storage/db'
import { chartHash, GALLERY_HASH, parseRoute } from '@dimcraft/core/route'
import { Gallery } from './gallery/Gallery'
import { FollowBar, stepFollow, toggleFollowPlayback } from './panels/FollowBar'
import { Dialogs } from './panels/Dialogs'
import { SymbolPalette } from './ui/SymbolPalette'
import { StatusBar } from './ui/StatusBar'
import { Toolbar } from './ui/Toolbar'
import { useStore } from './state/store'

const PREFS_KEY = 'dimknit.prefs'

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

  // restore preferences; the URL decides what opens (#/chart/<id> reopens it,
  // anything else is the gallery)
  useEffect(() => {
    try {
      const prefs = JSON.parse(localStorage.getItem(PREFS_KEY) ?? '{}')
      if (typeof prefs.snapEnabled === 'boolean') useStore.setState({ snapEnabled: prefs.snapEnabled })
      if (typeof prefs.gridVisible === 'boolean') useStore.setState({ gridVisible: prefs.gridVisible })
      if (typeof prefs.guidesVisible === 'boolean') useStore.setState({ guidesVisible: prefs.guidesVisible })
      if (typeof prefs.viewAnimations === 'boolean') useStore.setState({ viewAnimations: prefs.viewAnimations })
      if (typeof prefs.clock24h === 'boolean') useStore.setState({ clock24h: prefs.clock24h })
      document.documentElement.dataset.anim = prefs.viewAnimations === false ? 'off' : 'on'
    } catch {
      /* ignore bad prefs */
    }
    void (async () => {
      const route = parseRoute(location.hash)
      if (route.kind !== 'chart') return
      const rec = await loadProject(route.id)
      if (rec) useStore.getState().openProject(rec)
      else history.replaceState(null, '', GALLERY_HASH)
    })()
  }, [])

  // keep the hash in step with the open project (pushState so Back works;
  // never fires hashchange, so the listener below stays the only writer)
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
  useEffect(
    () =>
      useStore.subscribe((s, prev) => {
        if (
          s.snapEnabled !== prev.snapEnabled ||
          s.gridVisible !== prev.gridVisible ||
          s.guidesVisible !== prev.guidesVisible ||
          s.viewAnimations !== prev.viewAnimations ||
          s.clock24h !== prev.clock24h
        ) {
          localStorage.setItem(
            PREFS_KEY,
            JSON.stringify({
              snapEnabled: s.snapEnabled,
              gridVisible: s.gridVisible,
              guidesVisible: s.guidesVisible,
              viewAnimations: s.viewAnimations,
              clock24h: s.clock24h,
            }),
          )
        }
      }),
    [],
  )

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
          st.setTool('select')
          return
        case 'ArrowLeft':
          e.preventDefault()
          st.nudge(-24, 0)
          return
        case 'ArrowRight':
          e.preventDefault()
          st.nudge(24, 0)
          return
        case 'ArrowUp':
          e.preventDefault()
          st.nudge(0, -24)
          return
        case 'ArrowDown':
          e.preventDefault()
          st.nudge(0, 24)
          return
      }
      switch (e.key.toLowerCase()) {
        case 'v':
          st.setTool('select')
          return
        case 'p':
          st.setTool('place')
          return
        case 'h':
          st.setTool(st.tool === 'pan' ? 'select' : 'pan')
          return
        case 'f':
          st.setFollow(!st.followActive)
          return
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // drag-and-drop import: chart exports and backups, purely client-side
  useEffect(() => {
    const onDrop = async (e: DragEvent) => {
      e.preventDefault()
      const file = e.dataTransfer?.files?.[0]
      if (!file) return
      const parsed = await importInterchangeFile(file)
      if (!parsed) {
        window.alert(`Could not read ${file.name}. Expected a DimKnit chart or backup export.`)
        return
      }
      if (parsed.type === 'chart') useStore.getState().newProject(parsed.name, parsed.doc)
      else if (parsed.type === 'backup') {
        const n = await applyBackup(parsed.backup)
        window.alert(`Restored ${n} chart${n === 1 ? '' : 's'} from the backup.`)
      } else window.alert('Symbol packs from DimCrochet are not compatible with knitting charts.')
    }
    const prevent = (e: DragEvent) => e.preventDefault()
    window.addEventListener('dragover', prevent)
    window.addEventListener('drop', onDrop)
    return () => {
      window.removeEventListener('dragover', prevent)
      window.removeEventListener('drop', onDrop)
    }
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
        <div className="side-wrap left">
          <SymbolPalette />
        </div>
        <div className="canvas-wrap">
          <ChartCanvas />
          {followActive && <FollowBar />}
        </div>
      </div>
      <StatusBar />
      <Dialogs />
    </div>
  )
}
