export const COLORS = [
  '#111111', '#555555', '#cc3333', '#dd7722', '#ddbb11',
  '#22aa44', '#11bbbb', '#3377cc', '#7755cc', '#cc3377',
]

export const GRP_COLORS = [
  '#1D9E75', '#cc3333', '#dd7722', '#3377cc', '#7755cc', '#cc3377', '#11bbbb',
]

export const CELL_SIZE = 20
export const DRAG_THRESHOLD = 6
export const SNAP_RADIUS = 0.4  // cellSize の倍率
export const HIT_RADIUS = 0.6   // cellSize の倍率
export const PASTE_STEP = 2

export function getLengths(mode) {
  return mode === 'kogin' ? [1, 3, 5, 7, 9] : [2, 4, 6, 8, 10]
}

export function calcSnap(rx, ry, lines, gridW, gridH, cs) {
  const gx = Math.max(0, Math.min(gridW, Math.round(rx / cs)))
  const gy = Math.max(0, Math.min(gridH, Math.round(ry / cs)))
  const snapR = cs * SNAP_RADIUS
  let bestDist = snapR, bestPt = null
  for (const ln of lines) {
    const mx = (ln.x1 + ln.x2) / 2
    const my = (ln.y1 + ln.y2) / 2
    const d = Math.hypot(rx - mx * cs, ry - my * cs)
    if (d < bestDist) { bestDist = d; bestPt = { x: mx, y: my, type: 'line' } }
  }
  const gridDist = Math.hypot(rx - gx * cs, ry - gy * cs)
  if (bestPt && bestDist < gridDist) return bestPt
  return { x: gx, y: gy, type: 'grid' }
}

export function hitTestLine(rx, ry, lines, cs) {
  let best = null, bestD = cs * HIT_RADIUS
  lines.forEach((ln, i) => {
    const x1 = ln.x1 * cs, y1 = ln.y1 * cs
    const x2 = ln.x2 * cs, y2 = ln.y2 * cs
    const dx = x2 - x1, dy = y2 - y1
    const len2 = dx * dx + dy * dy
    let t = len2 > 0 ? ((rx - x1) * dx + (ry - y1) * dy) / len2 : 0
    t = Math.max(0, Math.min(1, t))
    const d = Math.hypot(rx - (x1 + t * dx), ry - (y1 + t * dy))
    if (d < bestD) { bestD = d; best = i }
  })
  return best
}

export function boxSelect(sx, sy, ex, ey, lines, cs) {
  const bx1 = Math.min(sx, ex), bx2 = Math.max(sx, ex)
  const by1 = Math.min(sy, ey), by2 = Math.max(sy, ey)
  return lines.reduce((acc, ln, i) => {
    const mx = (ln.x1 + ln.x2) / 2 * cs
    const my = ln.y1 * cs
    if (mx >= bx1 && mx <= bx2 && my >= by1 && my <= by2) acc.push(i)
    return acc
  }, [])
}

export function applyOffset(lns, dx, dy) {
  return lns.map(l => ({ ...l, x1: l.x1 + dx, y1: l.y1 + dy, x2: l.x2 + dx, y2: l.y2 + dy }))
}

export function applyTransform(opKey, pt, selectedLines) {
  if (opKey === 'flipv') {
    const ax = pt.x
    return selectedLines.map(l => ({ ...l, x1: 2 * ax - l.x1, x2: 2 * ax - l.x2, gid: null }))
  }
  if (opKey === 'fliph') {
    const ay = pt.y
    return selectedLines.map(l => ({ ...l, y1: 2 * ay - l.y1, y2: 2 * ay - l.y2, gid: null }))
  }
  // rot
  const cx = pt.x, cy = pt.y
  return selectedLines.map(l => ({
    ...l,
    x1: 2 * cx - l.x1, y1: 2 * cy - l.y1,
    x2: 2 * cx - l.x2, y2: 2 * cy - l.y2,
    gid: null,
  }))
}

export function saveToFile(data) {
  const json = JSON.stringify(data, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  const filename = (data.title || '無題の図案').replace(/[\\/:*?"<>|]/g, '_') + '.json'
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
  return filename
}
