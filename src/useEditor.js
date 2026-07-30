import { useState, useRef, useCallback } from 'react'
import {
  getLengths, calcSnap, hitTestLine, boxSelect,
  applyOffset, applyTransform, saveToFile,
  GRP_COLORS, COLORS, PASTE_STEP, DRAG_THRESHOLD,
} from './utils'
import { gaEvent } from './analytics'

const INITIAL_GRID_W = 30
const INITIAL_GRID_H = 20

export function useEditor() {
  const [lines, setLines] = useState([])
  const [groups, setGroups] = useState({})
  const [gidCounter, setGidCounter] = useState(0)
  const [sel, setSel] = useState([])

  const [tool, setToolState] = useState('draw')
  const [mode, setModeState] = useState('kogin')
  const [len, setLen] = useState(3)
  const [strokeW, setStrokeW] = useState(3)
  const [color, setColor] = useState('#111111')
  const [gridW, setGridW] = useState(INITIAL_GRID_W)
  const [gridH, setGridH] = useState(INITIAL_GRID_H)
  const [title, setTitle] = useState('無題の図案')

  const [op, setOp] = useState(null) // 'move'|'flipv'|'fliph'|'rot'|null
  const [cmState, setCmState] = useState({ flipv: 'copy', fliph: 'copy', rot: 'copy' })
  const [snapPt, setSnapPt] = useState(null)
  const [mouseCell, setMouseCell] = useState(null)
  const [status, setStatus] = useState({ msg: `${INITIAL_GRID_W}×${INITIAL_GRID_H} マス`, guide: false })

  const [clipboard, setClipboard] = useState([])
  const [clipOrigin, setClipOrigin] = useState({ x: 0, y: 0 })
  const [pasteOffset, setPasteOffset] = useState(PASTE_STEP)

  // ドラッグ状態はrefで管理（再レンダリング不要）
  const dragRef = useRef({ active: false, wasDrag: false, sx: 0, sy: 0, cx: 0, cy: 0 })
  const moveRef = useRef({ dragging: false, start: null, preview: null })

  const st = (msg, guide = false) => setStatus({ msg, guide })

  const newGid = useCallback((grps, counter) => {
    const id = counter + 1
    const c = GRP_COLORS[(id - 1) % GRP_COLORS.length]
    return { id, color: c, newGroups: { ...grps, [id]: { id, color: c } }, newCounter: id }
  }, [])

  const setTool = useCallback((t) => {
    setToolState(t)
    setOp(null)
    setSel([])
    setMouseCell(null)
    setSnapPt(null)
    dragRef.current = { active: false, wasDrag: false, sx: 0, sy: 0, cx: 0, cy: 0 }
    moveRef.current = { dragging: false, start: null, preview: null }
    st(t === 'draw' ? `${INITIAL_GRID_W}×${INITIAL_GRID_H} マス` : 'クリックまたはドラッグで選択')
  }, [])

  const setMode = useCallback((m, currentLen) => {
    setModeState(m)
    const ls = getLengths(m)
    if (!ls.includes(currentLen)) setLen(ls[1])
  }, [])

  const startOp = useCallback((o, currentSel) => {
    if (!currentSel.length) { st('先に線を選択してください', true); return false }
    setOp(o)
    setSnapPt(null)
    moveRef.current = { dragging: false, start: null, preview: null }
    if (o === 'move') st('選択線群をドラッグして移動', true)
    else {
      const labels = { flipv: '左右反転', fliph: '上下反転', rot: '180°回転' }
      st(`${labels[o]} — コピー/移動を選んでください`, true)
    }
    return true
  }, [])

  const cancelOp = useCallback(() => {
    setOp(null)
    setSnapPt(null)
    moveRef.current = { dragging: false, start: null, preview: null }
  }, [])

  const cancelAll = useCallback(() => {
    setOp(null)
    setSel([])
    setSnapPt(null)
    dragRef.current = { active: false, wasDrag: false, sx: 0, sy: 0, cx: 0, cy: 0 }
    moveRef.current = { dragging: false, start: null, preview: null }
  }, [])

  const groupSel = useCallback((currentSel, currentLines, currentGroups, currentCounter) => {
    if (currentSel.length < 2) { st('2本以上選択してグループ化してください', true); return }
    const { id, color: c, newGroups, newCounter } = newGid(currentGroups, currentCounter)
    setLines(prev => prev.map((ln, i) => currentSel.includes(i) ? { ...ln, gid: id } : ln))
    setGroups(newGroups)
    setGidCounter(newCounter)
    setSel([])
    setOp(null)
    st(`グループ化しました（${currentSel.length}本）`, true)
  }, [newGid])

  const ungroupSel = useCallback((currentSel, currentLines, currentGroups) => {
    const gids = new Set(currentSel.map(i => currentLines[i]?.gid).filter(g => g != null))
    setLines(prev => prev.map((ln, i) => ln.gid != null && gids.has(ln.gid) ? { ...ln, gid: null } : ln))
    setGroups(prev => {
      const next = { ...prev }
      gids.forEach(gid => delete next[gid])
      return next
    })
    setSel([])
    st('アングループしました', true)
  }, [])

  const deleteSel = useCallback((currentSel) => {
    if (!currentSel.length) return
    setLines(prev => prev.filter((_, i) => !currentSel.includes(i)))
    setSel([])
    setOp(null)
    st('削除しました')
  }, [])

  const copySelected = useCallback((currentSel, currentLines) => {
    if (!currentSel.length) { st('先に線を選択してください', true); return }
    const selected = currentSel.map(i => currentLines[i])
    const xs = selected.flatMap(l => [l.x1, l.x2])
    const ys = selected.flatMap(l => [l.y1, l.y2])
    const ox = Math.min(...xs), oy = Math.min(...ys)
    setClipOrigin({ x: ox, y: oy })
    setClipboard(selected.map(l => ({ ...l, x1: l.x1 - ox, y1: l.y1 - oy, x2: l.x2 - ox, y2: l.y2 - oy })))
    setPasteOffset(PASTE_STEP)
    st(`${currentSel.length}本コピーしました`, true)
  }, [])

  const pasteClipboard = useCallback((currentClipboard, currentClipOrigin, currentPasteOffset, currentGroups, currentCounter) => {
    if (!currentClipboard.length) { st('コピーされた線がありません', true); return }
    let grps = { ...currentGroups }
    let counter = currentCounter
    const gidMap = {}
    currentClipboard.forEach(l => {
      if (l.gid != null && !gidMap[l.gid]) {
        const { id, color: c, newGroups, newCounter } = newGid(grps, counter)
        gidMap[l.gid] = id
        grps = newGroups
        counter = newCounter
      }
    })
    const pasted = currentClipboard.map(l => ({
      ...l,
      x1: currentClipOrigin.x + l.x1 + currentPasteOffset,
      y1: currentClipOrigin.y + l.y1 + currentPasteOffset,
      x2: currentClipOrigin.x + l.x2 + currentPasteOffset,
      y2: currentClipOrigin.y + l.y2 + currentPasteOffset,
      gid: l.gid != null ? gidMap[l.gid] : null,
    }))
    setLines(prev => {
      const next = [...prev, ...pasted]
      const startIdx = prev.length
      setSel(pasted.map((_, i) => startIdx + i))
      return next
    })
    setGroups(grps)
    setGidCounter(counter)
    setPasteOffset(p => p + PASTE_STEP)
    st(`${pasted.length}本ペーストしました`, true)
  }, [newGid])

  const doSaveToFile = useCallback((currentLines, currentGroups, currentGidCounter, currentGridW, currentGridH, currentTitle) => {
    const data = { version: 1, title: currentTitle, gridW: currentGridW, gridH: currentGridH, lines: currentLines, groups: currentGroups, gidCounter: currentGidCounter }
    const filename = saveToFile(data)
    st(`「${filename}」を保存しました`, true)
    gaEvent('download_zuan', { tool_name: 'zuanmaker' })
  }, [])

  const loadFromJSON = useCallback((data) => {
    setLines(data.lines || [])
    setGroups(data.groups || {})
    setGidCounter(data.gidCounter || 0)
    setGridW(data.gridW || 30)
    setGridH(data.gridH || 20)
    setTitle(data.title || '無題の図案')
    setSel([])
    cancelAll()
    st(`読み込みました`, true)
  }, [cancelAll])

  const newPattern = useCallback(() => {
    setLines([])
    setGroups({})
    setGidCounter(0)
    setSel([])
    setClipboard([])
    setPasteOffset(PASTE_STEP)
    setTitle('無題の図案')
    cancelAll()
    st(`${INITIAL_GRID_W}×${INITIAL_GRID_H} マス`)
  }, [cancelAll])

  return {
    // 状態
    lines, setLines, groups, setGroups, gidCounter, setGidCounter,
    sel, setSel, tool, mode, len, setLen, strokeW, setStrokeW,
    color, setColor, gridW, setGridW, gridH, setGridH, title, setTitle,
    op, setOp, cmState, setCmState, snapPt, setSnapPt,
    mouseCell, setMouseCell, status, st,
    clipboard, clipOrigin, pasteOffset,
    dragRef, moveRef,
    // 操作
    newGid, setTool, setMode, startOp, cancelOp, cancelAll,
    groupSel, ungroupSel, deleteSel,
    copySelected, pasteClipboard, doSaveToFile, loadFromJSON, newPattern,
    applyOffset, applyTransform, calcSnap, hitTestLine, boxSelect,
  }
}