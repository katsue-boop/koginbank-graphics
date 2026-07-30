import { useRef, useEffect, useCallback } from 'react'
import { useEditor } from './useEditor'
import EditorCanvas from './EditorCanvas'
import Sidebar from './Sidebar'
import HelpPanel from './HelpPanel'
import { getLengths, saveToFile } from './utils'
import { gaEvent } from './analytics'
import styles from './App.module.css'

export default function App() {
  const editor = useEditor()
  const {
    lines, setLines, groups, setGroups, gidCounter, setGidCounter,
    sel, setSel, tool, mode, len, setLen, strokeW, setStrokeW,
    color, setColor, gridW, setGridW, gridH, setGridH, title, setTitle,
    op, setOp, cmState, setCmState, snapPt, setSnapPt,
    mouseCell, setMouseCell, status, st,
    clipboard, clipOrigin, pasteOffset,
    dragRef, moveRef,
    newGid, setTool, setMode, startOp, cancelOp, cancelAll,
    groupSel, ungroupSel, deleteSel,
    copySelected, pasteClipboard, doSaveToFile, loadFromJSON, newPattern,
  } = editor

  const appRef = useRef(null)
  const fileInputRef = useRef(null)
  const sidebarRef = useRef(null)
  const isMobileRef = useRef(false)
  const menuOpenRef = useRef(false)

  // レスポンシブ
  useEffect(() => {
    const check = () => {
      const mobile = appRef.current?.offsetWidth < 600
      isMobileRef.current = mobile
      appRef.current?.classList.toggle('mobile', mobile)
      if (!mobile) closeMenu()
    }
    const ro = new ResizeObserver(check)
    if (appRef.current) ro.observe(appRef.current)
    check()
    return () => ro.disconnect()
  }, [])

  const toggleMenu = () => {
    menuOpenRef.current = !menuOpenRef.current
    sidebarRef.current?.classList.toggle('open', menuOpenRef.current)
    document.getElementById('overlay')?.classList.toggle('open', menuOpenRef.current)
  }
  const closeMenu = () => {
    menuOpenRef.current = false
    sidebarRef.current?.classList.remove('open')
    document.getElementById('overlay')?.classList.remove('open')
  }
  const closeMenuIfOk = () => { if (isMobileRef.current && op !== 'flipv' && op !== 'fliph' && op !== 'rot') closeMenu() }

  // キーボードショートカット
  useEffect(() => {
    const onKey = (e) => {
      if (e.target.tagName === 'INPUT') return
      const ls = getLengths(mode)
      const num = parseInt(e.key)
      if (!isNaN(num) && ls.includes(num)) { setLen(num); return }
      if ((e.ctrlKey || e.metaKey) && e.key === 'c') { e.preventDefault(); copySelected(sel, lines); return }
      if ((e.ctrlKey || e.metaKey) && e.key === 'v') { e.preventDefault(); pasteClipboard(clipboard, clipOrigin, pasteOffset, groups, gidCounter); return }
      if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); doSaveToFile(lines, groups, gidCounter, gridW, gridH, title); return }
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); setLines(prev => prev.slice(0, -1)); return }
      if (e.key === 'd') setTool('draw')
      if (e.key === 's') setTool('select')
      if (e.key === 'Escape') cancelAll()
      if ((e.key === 'Delete' || e.key === 'Backspace') && sel.length > 0 && !op) deleteSel(sel)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [mode, sel, lines, clipboard, clipOrigin, pasteOffset, groups, gidCounter, gridW, gridH, title, op])

  const handleFileLoad = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result)
        loadFromJSON(data)
        st(`「${file.name}」を読み込みました`, true)
      } catch {
        st('ファイルの読み込みに失敗しました', true)
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const handleNew = () => {
    if (lines.length === 0 || confirm('新規作成しますか？現在の図案は保存されません。')) {
      newPattern()
    }
  }

  return (
    <div ref={appRef} className={styles.app} tabIndex={0}>
      <input type="file" ref={fileInputRef} accept=".json" style={{ display: 'none' }} onChange={handleFileLoad} />

      {/* ヘッダー */}
      <header className={styles.header}>
        <input
          className={styles.titleInput}
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="図案名"
        />
        <div className={styles.spacer} />
        <button className={styles.hbtn} onClick={() => fileInputRef.current?.click()}>📂 読込</button>
        <button className={styles.hbtn} onClick={() => {
          const canvas = document.querySelector('canvas')
          if (!canvas) return
          const a = document.createElement('a')
          a.download = (title || '図案') + '.png'
          a.href = canvas.toDataURL()
          a.click()
          gaEvent('download_zuan', { tool_name: 'zuanmaker' })
        }}>🖼 PNG</button>
        <button className={styles.hbtn} onClick={handleNew}>＋ 新規</button>
        <button className={`${styles.hbtn} ${styles.primary}`} onClick={() => doSaveToFile(lines, groups, gidCounter, gridW, gridH, title)}>💾 保存</button>
        <HelpPanel />
      </header>

      <div className={styles.main} onTouchStart={e => { if (!menuOpenRef.current) e.stopPropagation() }}>
        {/* スマホ用メニュータブ */}
        <button className={styles.menuTab} onClick={toggleMenu} aria-label="メニュー">メニュー</button>
        {/* オーバーレイ */}
        <div id="overlay" className={styles.overlay} onClick={() => { if (menuOpenRef.current) closeMenu() }} />

        {/* サイドバー */}
        <div ref={sidebarRef} className={styles.sidebar}>
          <Sidebar
            tool={tool} setTool={(t) => { setTool(t); closeMenuIfOk() }}
            mode={mode} setMode={(m) => setMode(m, len)}
            len={len} setLen={setLen}
            strokeW={strokeW} setStrokeW={setStrokeW}
            color={color} setColor={setColor}
            gridW={gridW} setGridW={setGridW}
            gridH={gridH} setGridH={setGridH}
            sel={sel} op={op}
            startOp={(o) => {
              const ok = startOp(o, sel)
              if (ok && o === 'move' && isMobileRef.current) closeMenu()
            }}
            cmState={cmState}
            setCmState={(key, val) => {
              setCmState(prev => ({ ...prev, [key]: val }))
              if (isMobileRef.current) closeMenu()
            }}
            cancelAll={() => { cancelAll(); if (isMobileRef.current) closeMenu() }}
            groupSel={() => { groupSel(sel, lines, groups, gidCounter); if (isMobileRef.current) closeMenu() }}
            ungroupSel={() => { ungroupSel(sel, lines, groups); if (isMobileRef.current) closeMenu() }}
            deleteSel={() => { deleteSel(sel); if (isMobileRef.current) closeMenu() }}
            copySelected={() => copySelected(sel, lines)}
            pasteClipboard={() => { pasteClipboard(clipboard, clipOrigin, pasteOffset, groups, gidCounter); if (isMobileRef.current) closeMenu() }}
            clipboard={clipboard}
            lines={lines} groups={groups}
            gidCounter={gidCounter} setGidCounter={setGidCounter} setGroups={setGroups} newGid={newGid}
            snapPt={snapPt}
            closeMenu={closeMenu}
            isMobile={isMobileRef.current}
          />
        </div>

        {/* キャンバス */}
        <div className={styles.canvasWrap}>
          <EditorCanvas
            lines={lines} setLines={setLines}
            groups={groups} sel={sel} setSel={setSel}
            tool={tool} mode={mode} len={len}
            strokeW={strokeW} color={color}
            gridW={gridW} gridH={gridH}
            op={op} setOp={setOp} cmState={cmState}
            snapPt={snapPt} setSnapPt={setSnapPt}
            mouseCell={mouseCell} setMouseCell={setMouseCell}
            dragRef={dragRef} moveRef={moveRef}
            st={st} cancelOp={cancelOp}
            gidCounter={gidCounter} setGidCounter={setGidCounter}
            setGroups={setGroups} newGid={newGid}
            pasteOffset={pasteOffset}
          />
        </div>
      </div>

      {/* ステータスバー */}
      <div className={`${styles.status} ${status.guide ? styles.guide : ''}`}>
        {status.msg}
      </div>
    </div>
  )
}