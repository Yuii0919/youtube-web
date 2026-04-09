/**
 * 以 localStorage 保存聽打進度（課本：學習進度追蹤）。
 */

import type { PlayMode } from '../types'

const PREFIX = 'youtube-listen-progress:v1:'

export type ListenProgressPayload = {
  v: 1
  selectedIndex: number
  playMode: PlayMode
  playbackRate: number
  updatedAt: number
}

function simpleHash(s: string): string {
  let h = 0
  for (let i = 0; i < s.length; i += 1) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0
  }
  return Math.abs(h).toString(36)
}

/**
 * 依目前練習上下文產生 progress key；無字幕時回傳 null。
 */
export function getListenProgressKey(state: {
  libraryVideoId: number | null
  videoId: string | null
  srtFileName: string | null
  cuesLength: number
}): string | null {
  if (state.cuesLength === 0) return null
  if (state.libraryVideoId != null) {
    return `${PREFIX}lib:${state.libraryVideoId}`
  }
  if (state.videoId) {
    const tag = simpleHash(`${state.srtFileName ?? ''}:${state.cuesLength}`)
    return `${PREFIX}yt:${state.videoId}:${tag}`
  }
  const tag = simpleHash(`${state.srtFileName ?? 'nosrt'}:${state.cuesLength}`)
  return `${PREFIX}manual:${tag}`
}

/**
 * 讀取進度；格式不符或缺漏時回傳 null。
 */
export function loadListenProgress(key: string): ListenProgressPayload | null {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const o = JSON.parse(raw) as Partial<ListenProgressPayload>
    if (o.v !== 1 || typeof o.selectedIndex !== 'number') return null
    const playMode = o.playMode === 'once' || o.playMode === 'loop' ? o.playMode : 'loop'
    const playbackRate =
      typeof o.playbackRate === 'number' && o.playbackRate > 0 ? o.playbackRate : 1
    return {
      v: 1,
      selectedIndex: o.selectedIndex,
      playMode,
      playbackRate,
      updatedAt: typeof o.updatedAt === 'number' ? o.updatedAt : Date.now(),
    }
  } catch {
    return null
  }
}

/**
 * 寫入進度。
 */
export function saveListenProgress(
  key: string,
  partial: Pick<ListenProgressPayload, 'selectedIndex' | 'playMode' | 'playbackRate'>,
): void {
  try {
    const payload: ListenProgressPayload = {
      v: 1,
      selectedIndex: partial.selectedIndex,
      playMode: partial.playMode,
      playbackRate: partial.playbackRate,
      updatedAt: Date.now(),
    }
    localStorage.setItem(key, JSON.stringify(payload))
  } catch {
    /* 私密模式或額滿時略過 */
  }
}
