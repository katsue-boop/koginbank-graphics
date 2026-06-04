import { getLengths, COLORS } from './utils'
import styles from './Sidebar.module.css'

export default function Sidebar({
  tool, setTool, mode, setMode, len, setLen,
  strokeW, setStrokeW, color, setColor,
  gridW, setGridW, gridH, setGridH,
  sel, op, startOp, cmState, setCmState,
  cancelAll, groupSel, ungroupSel, deleteSel,
  copySelected, pasteClipboard, clipboard,
  lines, groups, gidCounter, setGidCounter, setGroups, newGid,
  snapPt, closeMenu, isMobile,
}) {
  const lengths = getLengths(mode)
  const hasGroup = sel.some(i => lines[i]?.gid != null)
  const hasClip = clipboard.length > 0

  const handleSetTool = (t) => { setTool(t); if (isMobile) closeMenu() }

  const handleStartOp = (o) => {
    const ok = startOp(o, sel)
    if (ok && o === 'move' && isMobile) closeMenu()
  }

  const handleCopyMove = (opKey, val) => {
    setCmState(prev => ({ ...prev, [opKey]: val }))
    if (isMobile) closeMenu()
  }

  return (
    <div className={styles.sidebar}>
      {/* ツール */}
      <div className={styles.section}>
        <div className={styles.label}>ツール</div>
        <div className={styles.row}>
          {[['draw', '✏️', '描画'], ['select', '⬚', '選択']].map(([t, icon, label]) => (
            <button key={t} className={`${styles.toolBtn} ${tool === t ? styles.active : ''}`} onClick={() => handleSetTool(t)}>
              <span>{icon}</span>{label}
            </button>
          ))}
        </div>
      </div>

      {/* 選択操作 */}
      {tool === 'select' && (
        <div className={styles.section}>
          <div className={styles.label}>選択操作</div>
          <div className={styles.selCount}>
            {sel.length > 0 ? `${sel.length}本選択中` : 'クリックまたはドラッグで選択'}
          </div>

          {/* コピー＆ペースト */}
          <div className={styles.row}>
            <button className={styles.sbtn} onClick={() => copySelected(sel, lines)}>📋 コピー</button>
            <button className={styles.sbtn} onClick={() => pasteClipboard()}>📌 ペースト</button>
          </div>
          {hasClip && <div className={styles.clipInfo}>{clipboard.length}本をクリップボードに保持中</div>}

          <hr className={styles.sep} />

          {/* 移動 */}
          <button className={`${styles.sbtn} ${styles.full} ${op === 'move' ? styles.opActive : ''}`} onClick={() => handleStartOp('move')}>↔ 移動</button>

          <hr className={styles.sep} />

          {/* 反転・回転 */}
          {[
            ['flipv', '↔ 左右反転'],
            ['fliph', '↕ 上下反転'],
            ['rot', '↻ 180°回転'],
          ].map(([key, label]) => (
            <div key={key}>
              <button className={`${styles.sbtn} ${styles.full} ${op === key ? styles.opActive : ''}`} onClick={() => handleStartOp(key)}>{label}</button>
              {op === key && (
                <div className={styles.cmToggle}>
                  {['copy', 'move'].map(v => (
                    <button key={v} className={`${styles.cmbtn} ${cmState[key] === v ? styles.cmActive : ''}`} onClick={() => handleCopyMove(key, v)}>
                      {v === 'copy' ? 'コピー' : '移動'}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}

          <hr className={styles.sep} />

          {/* グループ操作 */}
          <button className={`${styles.sbtn} ${styles.full}`} onClick={() => { groupSel(sel, lines, groups, gidCounter); if (isMobile) closeMenu() }}>⊞ グループ化</button>
          {hasGroup && (
            <button className={`${styles.sbtn} ${styles.full}`} onClick={() => { ungroupSel(sel, lines, groups); if (isMobile) closeMenu() }}>⊟ アングループ</button>
          )}
          <button className={`${styles.sbtn} ${styles.full}`} onClick={() => { deleteSel(sel); if (isMobile) closeMenu() }}>🗑 削除</button>
          <button className={`${styles.sbtn} ${styles.full}`} style={{ color: '#999', fontSize: 10 }} onClick={() => { cancelAll(); if (isMobile) closeMenu() }}>✕ 選択解除</button>

          {snapPt && (
            <div className={`${styles.snapIndicator} ${snapPt.type === 'line' ? styles.snapLine : styles.snapGrid}`}>
              {snapPt.type === 'line' ? '● 描画線の中心にスナップ中' : '+ グリッド交点にスナップ中'}
            </div>
          )}
        </div>
      )}

      {/* 刺繍モード */}
      <div className={styles.section}>
        <div className={styles.label}>刺繍モード</div>
        <div className={styles.row}>
          {['kogin', 'hishi'].map(m => (
            <button key={m} className={`${styles.mbtn} ${mode === m ? styles.active : ''}`} onClick={() => setMode(m, len)}>
              {m === 'kogin' ? 'こぎん' : '菱刺し'}
            </button>
          ))}
        </div>
      </div>

      {/* 長さ */}
      <div className={styles.section}>
        <div className={styles.label}>長さ: {len}マス</div>
        <div className={styles.lenGrid}>
          {lengths.map(l => (
            <button key={l} className={`${styles.lbtn} ${l === len ? styles.active : ''}`} onClick={() => setLen(l)}>{l}</button>
          ))}
        </div>
      </div>

      {/* 太さ */}
      <div className={styles.section}>
        <div className={styles.label}>太さ: {strokeW}px</div>
        <input type="range" min={1} max={8} step={1} value={strokeW} onChange={e => setStrokeW(parseInt(e.target.value))} style={{ width: '100%' }} />
      </div>

      {/* 色 */}
      <div className={styles.section}>
        <div className={styles.label}>色</div>
        <div className={styles.colorGrid}>
          {COLORS.map(c => (
            <button key={c} className={`${styles.cbtn} ${c === color ? styles.cbtnActive : ''}`} style={{ background: c }} onClick={() => setColor(c)} />
          ))}
        </div>
      </div>

      {/* グリッド設定 */}
      <div className={styles.section}>
        <div className={styles.label}>グリッド設定</div>
        <div className={styles.gridRow}>
          <span className={styles.gridLabel}>W</span>
          <input type="number" value={gridW} min={5} max={100} onChange={e => setGridW(Math.max(5, Math.min(100, parseInt(e.target.value) || 30)))} className={styles.numInput} />
          <span className={styles.gridLabel}>H</span>
          <input type="number" value={gridH} min={5} max={100} onChange={e => setGridH(Math.max(5, Math.min(100, parseInt(e.target.value) || 20)))} className={styles.numInput} />
        </div>
      </div>
    </div>
  )
}
