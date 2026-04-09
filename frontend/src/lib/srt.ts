/**
 * SRT 字幕一筆時間區間與文字。
 */
export type SrtCue = {
  index: number
  startSec: number
  endSec: number
  text: string
}

/** 兩句之間至少保留的間隔（秒），供播放器句末偵測。 */
const CUE_GAP_SEC = 0.02
/** 每句最短顯示長度（秒），避免起訖倒錯或零長度。 */
const MIN_CUE_DURATION_SEC = 0.05

/**
 * 將 SRT 時間碼字串（00:00:01,000 或 00:00:01.000；毫秒 1～3 位）轉成秒數。
 */
export function parseSrtTimestamp(raw: string): number {
  const s = raw.trim().replace(',', '.')
  const m = /^(\d{2}):(\d{2}):(\d{2})\.(\d{1,6})$/.exec(s)
  if (!m) return 0
  const hh = Number(m[1])
  const mm = Number(m[2])
  const ss = Number(m[3])
  const frac = m[4].padEnd(3, '0').slice(0, 3)
  const ms = Number(frac)
  return hh * 3600 + mm * 60 + ss + ms / 1000
}

/**
 * 依開始／結束時間排序後，裁剪重疊區間並保證每句最短長度，避免列表時間軸交錯與播放器句界錯位。
 */
export function normalizeCues(cues: SrtCue[]): SrtCue[] {
  if (cues.length === 0) return []

  const sorted = [...cues].sort(
    (a, b) =>
      a.startSec - b.startSec ||
      a.endSec - b.endSec ||
      a.index - b.index,
  )
  const work = sorted.map((c) => ({ ...c }))

  for (let k = 0; k < work.length; k++) {
    if (work[k].endSec < work[k].startSec) {
      work[k].endSec = work[k].startSec + MIN_CUE_DURATION_SEC
    }
  }

  for (let k = 0; k < work.length - 1; k++) {
    const cur = work[k]
    const nx = work[k + 1]
    const boundary = nx.startSec - CUE_GAP_SEC
    if (cur.endSec > boundary) {
      cur.endSec = boundary
    }
    if (cur.endSec < cur.startSec + MIN_CUE_DURATION_SEC) {
      cur.endSec = cur.startSec + MIN_CUE_DURATION_SEC
    }
    if (cur.endSec > boundary) {
      cur.endSec = Math.max(cur.startSec, boundary)
    }
  }

  const last = work[work.length - 1]
  if (last.endSec < last.startSec + MIN_CUE_DURATION_SEC) {
    last.endSec = last.startSec + MIN_CUE_DURATION_SEC
  }

  return work.map((c, idx) => ({
    ...c,
    index: idx + 1,
  }))
}

/**
 * 以逐行狀態機解析 SRT（字幕本文含空行時不以 \\n\\n 粗暴切塊，減少断句錯誤）。
 */
export function parseSrt(content: string): SrtCue[] {
  const stripBom = content.replace(/^\uFEFF/, '')
  const normalized = stripBom.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  const lines = normalized.split('\n')
  const cues: SrtCue[] = []
  let i = 0

  const skipBlanks = (): void => {
    while (i < lines.length && lines[i].trim() === '') i += 1
  }

  const timeRe =
    /(\d{2}:\d{2}:\d{2}[,.]\d{1,3})\s*-->\s*(\d{2}:\d{2}:\d{2}[,.]\d{1,3})/

  while (i < lines.length) {
    skipBlanks()
    if (i >= lines.length) break

    let line = lines[i]
    if (/^\d+$/.test(line.trim())) {
      i += 1
      if (i >= lines.length) break
      line = lines[i]
    }

    const timeMatch = timeRe.exec(line)
    if (!timeMatch) {
      i += 1
      continue
    }

    const startSec = parseSrtTimestamp(timeMatch[1])
    const endSec = parseSrtTimestamp(timeMatch[2])
    i += 1

    const textLines: string[] = []
    while (i < lines.length && lines[i].trim() !== '') {
      textLines.push(lines[i])
      i += 1
    }
    while (i < lines.length && lines[i].trim() === '') i += 1

    const text = textLines.join(' ').replace(/\s+/g, ' ').trim()
    if (!text) continue

    cues.push({
      index: cues.length + 1,
      startSec,
      endSec,
      text,
    })
  }

  return normalizeCues(cues)
}
