import { useEffect, useRef, useCallback } from 'react'
import { calcSnap, hitTestLine, boxSelect, applyOffset, applyTransform, DRAG_THRESHOLD } from './utils'

const CS = 20

export default function EditorCanvas({
  lines, setLines, groups, sel, setSel,
  tool, mode, len, strokeW, color,
  gridW, gridH, op, setOp, cmState,
  snapPt, setSnapPt, mouseCell, setMouseCell,
  dragRef, moveRef,
  st, cancelOp,
  gidCounter, setGidCounter, setGroups, newGid,
  pasteOffset,
}) {
  const canvasRef = useRef(null)
  const cs = CS

  // 最新の状態をrefで保持（タッチハンドラのクロージャ問題を回避）
  const stateRef = useRef({})
  stateRef.current = { lines, sel, tool, mode, len, strokeW, color, gridW, gridH, op, cmState, snapPt }

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    ctx.strokeStyle = '#c8d0e0'; ctx.lineWidth = 0.5
    for (let x = 0; x <= gridW; x++) {
      ctx.beginPath(); ctx.moveTo(x * cs + 0.5, 0); ctx.lineTo(x * cs + 0.5, canvas.height); ctx.stroke()
    }
    for (let y = 0; y <= gridH; y++) {
      ctx.beginPath(); ctx.moveTo(0, y * cs + 0.5); ctx.lineTo(canvas.width, y * cs + 0.5); ctx.stroke()
    }
    for (let x = 0; x <= gridW; x++) for (let y = 0; y <= gridH; y++) {
      ctx.fillStyle = '#b0bcd0'; ctx.beginPath(); ctx.arc(x * cs, y * cs, 1.5, 0, Math.PI * 2); ctx.fill()
    }

    const gidMap = {}
    lines.forEach(ln => { if (ln.gid == null) return; if (!gidMap[ln.gid]) gidMap[ln.gid] = []; gidMap[ln.gid].push(ln) })
    Object.entries(gidMap).forEach(([gid, lns]) => {
      const grp = groups[parseInt(gid)]; if (!grp) return
      const xs = lns.flatMap(l => [l.x1, l.x2]), ys = lns.flatMap(l => [l.y1, l.y2])
      const x1 = Math.min(...xs), x2 = Math.max(...xs), y1 = Math.min(...ys), y2 = Math.max(...ys)
      ctx.save(); ctx.strokeStyle = grp.color; ctx.lineWidth = 1; ctx.globalAlpha = 0.5; ctx.setLineDash([3, 3])
      ctx.strokeRect((x1 - 0.3) * cs, (y1 - 0.3) * cs, (x2 - x1 + 0.6) * cs, (y2 - y1 + 0.6) * cs)
      ctx.setLineDash([]); ctx.globalAlpha = 0.7; ctx.fillStyle = grp.color; ctx.font = 'bold 10px sans-serif'
      ctx.fillText('G' + gid, (x1 - 0.3) * cs + 2, (y1 - 0.3) * cs + 11); ctx.restore()
    })

    const drawLine = (x1, y1, x2, y2, c, sw, alpha) => {
      ctx.save(); ctx.globalAlpha = alpha; ctx.strokeStyle = c; ctx.lineWidth = sw; ctx.lineCap = 'round'
      ctx.beginPath(); ctx.moveTo(x1 * cs, y1 * cs); ctx.lineTo(x2 * cs, y2 * cs); ctx.stroke(); ctx.restore()
    }

    lines.forEach((ln, i) => {
      const s = sel.includes(i), hide = op === 'move' && moveRef.current.dragging && s
      if (!hide) drawLine(ln.x1, ln.y1, ln.x2, ln.y2, s ? '#534AB7' : ln.color, ln.sw + (s ? 2 : 0), 1)
    })
    if (op === 'move' && moveRef.current.preview) {
      moveRef.current.preview.forEach(ln => drawLine(ln.x1, ln.y1, ln.x2, ln.y2, ln.color, ln.sw, 0.55))
    }
    if (tool === 'draw' && mouseCell) {
      const x2 = Math.min(gridW, mouseCell.x + len)
      if (x2 !== mouseCell.x) drawLine(mouseCell.x, mouseCell.y, x2, mouseCell.y, color, strokeW, 0.5)
    }
    const d = dragRef.current
    if (d.active && d.wasDrag && tool === 'select' && !op) {
      ctx.save(); ctx.strokeStyle = '#534AB7'; ctx.lineWidth = 1; ctx.setLineDash([4, 3])
      ctx.strokeRect(Math.min(d.sx, d.cx), Math.min(d.sy, d.cy), Math.abs(d.cx - d.sx), Math.abs(d.cy - d.sy))
      ctx.fillStyle = 'rgba(83,74,183,0.07)'; ctx.fillRect(Math.min(d.sx, d.cx), Math.min(d.sy, d.cy), Math.abs(d.cx - d.sx), Math.abs(d.cy - d.sy))
      ctx.restore()
    }
    if (snapPt && (op === 'flipv' || op === 'fliph' || op === 'rot')) {
      const px = snapPt.x * cs, py = snapPt.y * cs
      ctx.save(); ctx.setLineDash([4, 3]); ctx.lineWidth = 1; ctx.strokeStyle = '#cc3333'
      if (op === 'flipv') { ctx.beginPath(); ctx.moveTo(px, 0); ctx.lineTo(px, canvas.height); ctx.stroke() }
      else if (op === 'fliph') { ctx.beginPath(); ctx.moveTo(0, py); ctx.lineTo(canvas.width, py); ctx.stroke() }
      else {
        ctx.setLineDash(); ctx.beginPath(); ctx.arc(px, py, 7, 0, Math.PI * 2); ctx.stroke()
        ctx.beginPath(); ctx.moveTo(px - 11, py); ctx.lineTo(px + 11, py); ctx.moveTo(px, py - 11); ctx.lineTo(px, py + 11); ctx.stroke()
      }
      ctx.setLineDash([]); ctx.fillStyle = snapPt.type === 'line' ? '#EF9F27' : '#1D9E75'
      ctx.beginPath(); ctx.arc(px, py, 4, 0, Math.PI * 2); ctx.fill(); ctx.restore()
    }
  }, [lines, groups, sel, tool, mode, len, strokeW, color, gridW, gridH, op, snapPt, mouseCell, dragRef, moveRef, cs])

  useEffect(() => {
    const canvas = canvasRef.current
    if (canvas) { canvas.width = gridW * cs + 1; canvas.height = gridH * cs + 1 }
    draw()
  }, [gridW, gridH, cs, draw])
  useEffect(() => { draw() }, [draw])

  const getRawXY = (e, useChanged = false) => {
    const r = canvasRef.current.getBoundingClientRect()
    const touch = useChanged ? e.changedTouches?.[0] : (e.touches?.[0])
    if (touch) return { rx: touch.clientX - r.left, ry: touch.clientY - r.top }
    return { rx: e.clientX - r.left, ry: e.clientY - r.top }
  }

  const handleDown = (rx, ry) => {
    const { op, tool, sel, lines, moveRef: _m } = stateRef.current
    if (op === 'move') {
      moveRef.current = { dragging: true, start: { rx, ry }, preview: sel.map(i => ({ ...lines[i] })) }
      draw(); return
    }
    if (op === 'flipv' || op === 'fliph' || op === 'rot') return
    if (tool === 'select') {
      dragRef.current = { active: true, wasDrag: false, sx: rx, sy: ry, cx: rx, cy: ry }
    }
  }

  const handleMove = (rx, ry) => {
    const { op, tool, lines, sel, gridW, gridH } = stateRef.current
    if (op === 'move' && moveRef.current.dragging) {
      const dx = Math.round((rx - moveRef.current.start.rx) / cs)
      const dy = Math.round((ry - moveRef.current.start.ry) / cs)
      moveRef.current.preview = applyOffset(sel.map(i => lines[i]), dx, dy); draw(); return
    }
    if (op === 'flipv' || op === 'fliph' || op === 'rot') {
      setSnapPt(calcSnap(rx, ry, lines, gridW, gridH, cs)); return
    }
    if (tool === 'draw') {
      setMouseCell({ x: Math.max(0, Math.min(gridW, Math.round(rx / cs))), y: Math.max(0, Math.min(gridH, Math.round(ry / cs))) })
    }
    if (tool === 'select' && dragRef.current.active) {
      dragRef.current.cx = rx; dragRef.current.cy = ry
      if (Math.abs(rx - dragRef.current.sx) > DRAG_THRESHOLD || Math.abs(ry - dragRef.current.sy) > DRAG_THRESHOLD) dragRef.current.wasDrag = true
      draw()
    }
  }

  const handleUp = (rx, ry) => {
    const { op, tool, sel, lines, gridW, gridH, cmState, len, color, strokeW, mode } = stateRef.current
    if (op === 'move' && moveRef.current.dragging) {
      const preview = moveRef.current.preview
      moveRef.current = { dragging: false, start: null, preview: null }
      if (preview) {
        setLines(prev => { const rest = prev.filter((_, i) => !sel.includes(i)); setSel(preview.map((_, i) => rest.length + i)); return [...rest, ...preview] })
      }
      cancelOp(); st('移動しました', true); return
    }
    if (op === 'flipv' || op === 'fliph' || op === 'rot') {
      const pt = calcSnap(rx, ry, lines, gridW, gridH, cs)
      const isCopy = cmState[op] === 'copy'
      const transformed = applyTransform(op, pt, sel.map(i => lines[i]))
      if (isCopy) setLines(prev => [...prev, ...transformed])
      else setLines(prev => [...prev.filter((_, i) => !sel.includes(i)), ...transformed])
      const labels = { flipv: '左右反転', fliph: '上下反転', rot: '180°回転' }
      setSel([]); cancelOp(); st(`${labels[op]}（${isCopy ? 'コピー' : '移動'}）しました`); return
    }
    if (tool === 'select' && dragRef.current.active) {
      const d = dragRef.current
      dragRef.current = { active: false, wasDrag: false, sx: 0, sy: 0, cx: 0, cy: 0 }
      if (d.wasDrag) {
        const found = boxSelect(d.sx, d.sy, d.cx, d.cy, lines, cs)
        setSel(found); st(found.length > 0 ? `${found.length}本選択 — 操作を選んでください` : '範囲内に線がありません', found.length > 0)
      } else {
        const hit = hitTestLine(rx, ry, lines, cs)
        if (hit !== null) {
          const ln = lines[hit]
          if (ln.gid != null) { const grouped = lines.reduce((acc, l, i) => { if (l.gid === ln.gid) acc.push(i); return acc }, []); setSel(grouped); st(`グループG${ln.gid}を選択（${grouped.length}本）`, true) }
          else { setSel([hit]); st('1本選択 — 操作を選んでください', true) }
        } else { setSel([]); st('クリックまたはドラッグで選択') }
      }
      return
    }
    if (tool === 'draw' && !dragRef.current.active) {
      const p = { x: Math.max(0, Math.min(gridW, Math.round(rx / cs))), y: Math.max(0, Math.min(gridH, Math.round(ry / cs))) }
      const x2 = Math.min(gridW, p.x + len)
      if (x2 !== p.x) setLines(prev => [...prev, { x1: p.x, y1: p.y, x2, y2: p.y, color, sw: strokeW, mode, len, gid: null }])
    }
  }

  // マウスイベント
  const onMouseDown = (e) => { if (e.button !== 0) return; const { rx, ry } = getRawXY(e); handleDown(rx, ry) }
  const onMouseMove = (e) => { const { rx, ry } = getRawXY(e); handleMove(rx, ry) }
  const onMouseUp = (e) => { if (e.button !== 0) return; const { rx, ry } = getRawXY(e); handleUp(rx, ry) }
  const onMouseLeave = () => {
    if (stateRef.current.tool === 'draw') setMouseCell(null)
    const op = stateRef.current.op
    if (op === 'flipv' || op === 'fliph' || op === 'rot') setSnapPt(null)
  }

  // タッチイベント（ネイティブ登録でpassive制御）
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const touchStart = (e) => {
      if (e.touches.length >= 2) return // 2本指はスクロールに委ねる
      e.preventDefault()
      const r = canvas.getBoundingClientRect()
      handleDown(e.touches[0].clientX - r.left, e.touches[0].clientY - r.top)
    }
    const touchMove = (e) => {
      if (e.touches.length >= 2) return // 2本指はスクロールに委ねる
      e.preventDefault()
      const r = canvas.getBoundingClientRect()
      handleMove(e.touches[0].clientX - r.left, e.touches[0].clientY - r.top)
    }
    const touchEnd = (e) => {
      if (e.touches.length >= 1) return // まだ指が残っている場合はスキップ
      e.preventDefault()
      const r = canvas.getBoundingClientRect()
      handleUp(e.changedTouches[0].clientX - r.left, e.changedTouches[0].clientY - r.top)
    }

    canvas.addEventListener('touchstart', touchStart, { passive: false })
    canvas.addEventListener('touchmove', touchMove, { passive: false })
    canvas.addEventListener('touchend', touchEnd, { passive: false })
    return () => {
      canvas.removeEventListener('touchstart', touchStart)
      canvas.removeEventListener('touchmove', touchMove)
      canvas.removeEventListener('touchend', touchEnd)
    }
  }) // 毎レンダー再登録でstateRefの最新値を参照

  return (
    <div
      style={{ flex: 1, overflow: 'auto', padding: 16, background: '#f0f0f0' }}
      onTouchStart={e => { if (e.touches.length === 1) e.stopPropagation() }}
    >
      <canvas
        ref={canvasRef}
        style={{ display: 'block', background: '#fff', border: '0.5px solid #d0d0d8', borderRadius: 4, touchAction: 'pan-x pan-y', userSelect: 'none', cursor: tool === 'draw' ? 'crosshair' : 'default' }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseLeave}
      />
    </div>
  )
}
