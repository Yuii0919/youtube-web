/**
 * 與後端 API 通訊的封裝（課本 services/api.ts）。
 */

import { normalizeCues, type SrtCue } from '../lib/srt'

const BASE_URL = 'https://youtube-web-backend.onrender.com'
export const apiUrl = (path: string): string => `${BASE_URL}${path}`

/**
 * 解析 FastAPI 錯誤本文（detail 字串或驗證錯誤陣列）供使用者閱讀。
 */
async function parseApiErrorBody(res: Response, fallback: string): Promise<string> {
  const text = await res.text().catch(() => '')
  if (!text) return fallback
  try {
    const j = JSON.parse(text) as { detail?: unknown }
    const d = j.detail
    if (typeof d === 'string') return d
    if (Array.isArray(d) && d.length > 0) {
      const first = d[0] as { msg?: unknown }
      if (first && typeof first.msg === 'string') return first.msg
    }
  } catch {
    /* 非 JSON 則用原文 */
  }
  const trimmed = text.trim()
  // 常見：前端打到錯的 server（或後端未更新）時會回純文字 Not Found
  if (res.status === 404 && /^not\s+found$/i.test(trimmed)) {
    return '找不到後端 API 路由（可能後端未啟動、未重啟，或前端未使用 dev proxy）。'
  }
  return trimmed.length > 800 ? `${trimmed.slice(0, 800)}…` : trimmed
}

export type TranslateResponseBody = {
  translated: string
}

export type VideoListItem = {
  id: number
  youtube_id: string
  title: string
  channel: string
  duration: number | null
  thumbnail_url: string
  segment_count: number
  folder_id: number | null
  created_at: string
}

export type VideoFolderItem = {
  id: number
  name: string
  created_at: string
}

export type GetVideosParams = {
  /** 僅列出此資料夾（與 uncategorizedOnly 擇一） */
  folderId?: number
  /** 僅未分類 */
  uncategorizedOnly?: boolean
}

export type ApiSubtitleSegment = {
  id: number
  index: number
  start_time: number
  end_time: number
  text_en: string
  text_zh: string
  letter_template: string
}

export type VideoDetail = {
  id: number
  youtube_id: string
  title: string
  channel: string
  duration: number | null
  thumbnail_url: string
  segments: ApiSubtitleSegment[]
}

/**
 * 呼叫後端翻譯代理。
 */
export async function postTranslate(q: string): Promise<TranslateResponseBody> {
  const res = await fetch(apiUrl('/translate'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ q: q.trim() }),
  })
  if (!res.ok) {
    const msg = await parseApiErrorBody(res, res.statusText || `HTTP ${res.status}`)
    throw new Error(msg || `HTTP ${res.status}`)
  }
  return (await res.json()) as TranslateResponseBody
}

/**
 * 健康檢查。
 */
export async function getHealth(): Promise<{ status: string }> {
  const res = await fetch(apiUrl('/health'))
  if (!res.ok) throw new Error(`health ${res.status}`)
  return (await res.json()) as { status: string }
}

/**
 * 影片列表；可依資料夾篩選。
 */
export async function getVideos(params?: GetVideosParams): Promise<VideoListItem[]> {
  const q = new URLSearchParams()
  if (params?.uncategorizedOnly) q.set('uncategorized_only', 'true')
  else if (params?.folderId !== undefined) q.set('folder_id', String(params.folderId))
  const qs = q.toString()
  const res = await fetch(apiUrl(`/videos${qs ? `?${qs}` : ''}`))
  if (!res.ok) throw new Error(`videos ${res.status}`)
  return (await res.json()) as VideoListItem[]
}

/**
 * 列出影片資料夾。
 */
export async function getFolders(): Promise<VideoFolderItem[]> {
  const res = await fetch(apiUrl('/folders'))
  if (!res.ok) throw new Error(`folders ${res.status}`)
  return (await res.json()) as VideoFolderItem[]
}

/**
 * 新增資料夾。
 */
export async function postFolder(name: string): Promise<VideoFolderItem> {
  const res = await fetch(apiUrl('/folders'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: name.trim() }),
  })
  if (!res.ok) {
    const msg = await parseApiErrorBody(res, res.statusText || `HTTP ${res.status}`)
    throw new Error(msg || `HTTP ${res.status}`)
  }
  return (await res.json()) as VideoFolderItem
}

/**
 * 重新命名資料夾。
 */
export async function patchFolder(id: number, name: string): Promise<VideoFolderItem> {
  const res = await fetch(apiUrl(`/folders/${id}`), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: name.trim() }),
  })
  if (!res.ok) {
    const msg = await parseApiErrorBody(res, res.statusText || `HTTP ${res.status}`)
    throw new Error(msg || `HTTP ${res.status}`)
  }
  return (await res.json()) as VideoFolderItem
}

/**
 * 刪除資料夾（旗下影片改未分類）。
 */
export async function deleteFolder(id: number): Promise<void> {
  const res = await fetch(apiUrl(`/folders/${id}`), { method: 'DELETE' })
  if (!res.ok) {
    const msg = await parseApiErrorBody(res, res.statusText || `HTTP ${res.status}`)
    throw new Error(msg || `HTTP ${res.status}`)
  }
}

/**
 * 變更影片所屬資料夾；folderId null 為未分類。
 */
export async function patchVideoFolder(
  videoId: number,
  folderId: number | null,
): Promise<VideoListItem> {
  const res = await fetch(apiUrl(`/videos/${videoId}`), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ folder_id: folderId }),
  })
  if (!res.ok) {
    const msg = await parseApiErrorBody(res, res.statusText || `HTTP ${res.status}`)
    throw new Error(msg || `HTTP ${res.status}`)
  }
  return (await res.json()) as VideoListItem
}

/**
 * 新增影片（YouTube 網址）。
 */
export async function postVideo(youtubeUrl: string): Promise<VideoListItem> {
  const res = await fetch(apiUrl('/videos'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ youtube_url: youtubeUrl }),
  })
  if (!res.ok) {
    const msg = await parseApiErrorBody(res, res.statusText || `HTTP ${res.status}`)
    throw new Error(msg || `HTTP ${res.status}`)
  }
  return (await res.json()) as VideoListItem
}

/**
 * 影片詳情（含字幕）。
 */
export async function getVideoDetail(videoId: number): Promise<VideoDetail> {
  const res = await fetch(apiUrl(`/videos/${videoId}`))
  if (!res.ok) throw new Error(`video ${res.status}`)
  return (await res.json()) as VideoDetail
}

/**
 * 將 API 分段轉成前端 SrtCue。
 */
export function apiSegmentsToCues(segments: ApiSubtitleSegment[]): SrtCue[] {
  const raw = segments.map((s) => ({
    index: s.index,
    startSec: s.start_time,
    endSec: s.end_time,
    text: s.text_en,
  }))
  return normalizeCues(raw)
}

/**
 * 上傳 SRT 至伺服器並回傳更新後的影片詳情。
 */
export async function postVideoSrt(videoId: number, file: File): Promise<VideoDetail> {
  const body = new FormData()
  body.append('file', file)
  const res = await fetch(apiUrl(`/videos/${videoId}/subtitles/srt`), {
    method: 'POST',
    body,
  })
  if (!res.ok) {
    const t = await res.text().catch(() => res.statusText)
    throw new Error(t || `HTTP ${res.status}`)
  }
  return (await res.json()) as VideoDetail
}

/**
 * 自動抓 YouTube 英文字幕並寫入指定影片。
 */
export async function postVideoAutoSubtitle(
  videoId: number,
  youtubeUrl: string,
): Promise<VideoDetail> {
  const res = await fetch(apiUrl(`/videos/${videoId}/subtitles/auto`), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ youtube_url: youtubeUrl.trim() }),
  })
  if (!res.ok) {
    const msg = await parseApiErrorBody(res, res.statusText || `HTTP ${res.status}`)
    throw new Error(msg || `HTTP ${res.status}`)
  }
  return (await res.json()) as VideoDetail
}

/**
 * 刪除庫內影片。
 */
export async function deleteVideo(videoId: number): Promise<void> {
  const res = await fetch(apiUrl(`/videos/${videoId}`), { method: 'DELETE' })
  if (!res.ok) throw new Error(`delete ${res.status}`)
}

export type VideoDownloadResult = {
  video_path: string
  message: string
}

/**
 * 下載 YouTube 影片至後端 downloads 目錄（課本：影片庫下載）。
 */
export async function postVideoDownload(videoId: number): Promise<VideoDownloadResult> {
  const res = await fetch(apiUrl(`/videos/${videoId}/download`), {
    method: 'POST',
  })
  if (!res.ok) {
    const t = await res.text().catch(() => res.statusText)
    throw new Error(t || `HTTP ${res.status}`)
  }
  return (await res.json()) as VideoDownloadResult
}

export type AiProvider = 'openai' | 'gemini' | 'ollama'

export type AiSettingsDto = {
  provider: string
  openai_base_url: string
  openai_model: string
  openai_key_masked: string
  has_openai_key: boolean
  gemini_model: string
  gemini_key_masked: string
  has_gemini_key: boolean
  ollama_base_url: string
  ollama_model: string
  updated_at: string | null
}

/**
 * 讀取 AI 解說設定（金鑰已遮罩）。
 */
export async function getAiSettings(): Promise<AiSettingsDto> {
  const res = await fetch(apiUrl('/ai/settings'))
  if (!res.ok) {
    const msg = await parseApiErrorBody(res, res.statusText || `HTTP ${res.status}`)
    throw new Error(msg || `HTTP ${res.status}`)
  }
  return (await res.json()) as AiSettingsDto
}

export type PutAiSettingsBody = {
  provider?: AiProvider
  openai_api_key?: string
  openai_base_url?: string
  openai_model?: string
  gemini_api_key?: string
  gemini_model?: string
  ollama_base_url?: string
  ollama_model?: string
}

/**
 * 更新 AI 解說設定。
 */
export async function putAiSettings(body: PutAiSettingsBody): Promise<AiSettingsDto> {
  const res = await fetch(apiUrl('/ai/settings'), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const msg = await parseApiErrorBody(res, res.statusText || `HTTP ${res.status}`)
    throw new Error(msg || `HTTP ${res.status}`)
  }
  return (await res.json()) as AiSettingsDto
}

export type OllamaModelsResponse = {
  models: string[]
}

/**
 * 列出 Ollama 已安裝模型；可傳入目前表單的 base URL。
 */
export async function getOllamaModels(baseUrl?: string | null): Promise<OllamaModelsResponse> {
  const q = new URLSearchParams()
  if (baseUrl?.trim()) q.set('base_url', baseUrl.trim())
  const qs = q.toString()
  const res = await fetch(apiUrl(`/ai/ollama/models${qs ? `?${qs}` : ''}`))
  if (!res.ok) {
    const msg = await parseApiErrorBody(res, res.statusText || `HTTP ${res.status}`)
    throw new Error(msg || `HTTP ${res.status}`)
  }
  return (await res.json()) as OllamaModelsResponse
}

export type TestConnectionBody = PutAiSettingsBody

export type TestConnectionResult = {
  ok: boolean
  message: string
}

/**
 * 測試目前表單對應 provider 的連線（金鑰可沿用已儲存）。
 */
export async function postAiTestConnection(body: TestConnectionBody): Promise<TestConnectionResult> {
  const res = await fetch(apiUrl('/ai/test-connection'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const msg = await parseApiErrorBody(res, res.statusText || `HTTP ${res.status}`)
    throw new Error(msg || `HTTP ${res.status}`)
  }
  return (await res.json()) as TestConnectionResult
}

export type PostAiExplainBody = {
  sentence_en: string
  full_sentence_zh?: string | null
}

export type AiExplainResult = {
  explanation: string
}

/**
 * 請後端代理呼叫 LLM 產生繁中解說。
 */
export async function postAiExplain(body: PostAiExplainBody): Promise<AiExplainResult> {
  const res = await fetch(apiUrl('/ai/explain'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sentence_en: body.sentence_en.trim(),
      full_sentence_zh: body.full_sentence_zh?.trim() || undefined,
    }),
  })
  if (!res.ok) {
    const msg = await parseApiErrorBody(res, res.statusText || `HTTP ${res.status}`)
    throw new Error(msg || `HTTP ${res.status}`)
  }
  return (await res.json()) as AiExplainResult
}
