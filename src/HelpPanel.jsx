import { useState } from 'react'
import styles from './HelpPanel.module.css'

export default function HelpPanel() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button className={styles.helpBtn} onClick={() => setOpen(true)} title="使い方">？</button>

      {open && (
        <div className={styles.overlay} onClick={() => setOpen(false)}>
          <div className={styles.panel} onClick={e => e.stopPropagation()}>
            <div className={styles.header}>
              <h2 className={styles.title}>使い方</h2>
              <button className={styles.closeBtn} onClick={() => setOpen(false)}>✕</button>
            </div>

            <div className={styles.body}>
              <section>
                <h3 className={styles.sectionTitle}>📐 基本操作</h3>
                <table className={styles.table}>
                  <tbody>
                    <tr><td>線を描く</td><td>描画ツール選択 → グリッド上をクリック</td></tr>
                    <tr><td>長さを選ぶ</td><td>サイドバーの「長さ」ボタン or 数字キー（1〜9）</td></tr>
                    <tr><td>線を選択</td><td>選択ツール → クリックまたはドラッグ</td></tr>
                    <tr><td>グループを選択</td><td>グループ内の線を1本クリック</td></tr>
                  </tbody>
                </table>
              </section>

              <section>
                <h3 className={styles.sectionTitle}>⌨️ キーボードショートカット（PC）</h3>
                <table className={styles.table}>
                  <tbody>
                    <tr><td><kbd>D</kbd></td><td>描画ツールに切替</td></tr>
                    <tr><td><kbd>S</kbd></td><td>選択ツールに切替</td></tr>
                    <tr><td><kbd>1</kbd>〜<kbd>9</kbd></td><td>線の長さを選択（こぎん: 1/3/5/7/9、菱刺し: 2/4/6/8/10）</td></tr>
                    <tr><td><kbd>Ctrl</kbd>+<kbd>Z</kbd></td><td>元に戻す</td></tr>
                    <tr><td><kbd>Ctrl</kbd>+<kbd>C</kbd></td><td>選択した線をコピー</td></tr>
                    <tr><td><kbd>Ctrl</kbd>+<kbd>V</kbd></td><td>ペースト（+2マスずれて配置）</td></tr>
                    <tr><td><kbd>Ctrl</kbd>+<kbd>S</kbd></td><td>JSONファイルとして保存</td></tr>
                    <tr><td><kbd>Delete</kbd></td><td>選択した線を削除</td></tr>
                    <tr><td><kbd>Escape</kbd></td><td>選択解除・操作キャンセル</td></tr>
                  </tbody>
                </table>
              </section>

              <section>
                <h3 className={styles.sectionTitle}>💾 保存・読み込み</h3>
                <table className={styles.table}>
                  <tbody>
                    <tr><td>保存</td><td>ヘッダーの「💾 保存」→ JSONファイルをダウンロード<br/><span className={styles.note}>※ 後で読み込んで編集を再開できます</span></td></tr>
                    <tr><td>読み込み</td><td>ヘッダーの「📂 読込」→ 保存したJSONファイルを選択</td></tr>
                    <tr><td>画像出力</td><td>ヘッダーの「🖼 PNG」→ 画像ファイルとして書き出し</td></tr>
                  </tbody>
                </table>
              </section>

              <section>
                <h3 className={styles.sectionTitle}>🔄 反転・回転のスナップ</h3>
                <p className={styles.note}>
                  反転・回転の基準点を選ぶとき、カーソルが描画線の中心に近い場合は自動的に<span className={styles.snapLine}>●線の中心</span>にスナップ、それ以外は<span className={styles.snapGrid}>＋グリッド交点</span>にスナップします。
                </p>
              </section>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
