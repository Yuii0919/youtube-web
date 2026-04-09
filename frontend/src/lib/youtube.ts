/**
 * 從常見 YouTube URL 形態擷取 11 碼 videoId；失敗則回傳 null。
 */
export function extractYoutubeVideoId(input: string): string | null {
  const trimmed = input.trim()
  if (!trimmed) return null

  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed
  }

  try {
    const u = new URL(trimmed)
    const host = u.hostname.replace(/^www\./, '')

    if (host === 'youtu.be') {
      const id = u.pathname.split('/').filter(Boolean)[0]
      return id && /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : null
    }

    if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'music.youtube.com') {
      const v = u.searchParams.get('v')
      if (v && /^[a-zA-Z0-9_-]{11}$/.test(v)) return v
      const embed = u.pathname.match(/^\/embed\/([a-zA-Z0-9_-]{11})/)
      if (embed) return embed[1]
      const shortPath = u.pathname.match(/^\/shorts\/([a-zA-Z0-9_-]{11})/)
      if (shortPath) return shortPath[1]
      const livePath = u.pathname.match(/^\/live\/([a-zA-Z0-9_-]{11})/)
      if (livePath) return livePath[1]
    }
  } catch {
    /* 非 URL 則忽略 */
  }

  const watchMatch = trimmed.match(/[?&]v=([a-zA-Z0-9_-]{11})/)
  if (watchMatch) return watchMatch[1]
  const youtuBeMatch = trimmed.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/)
  if (youtuBeMatch) return youtuBeMatch[1]
  const shortsMatch = trimmed.match(/\/shorts\/([a-zA-Z0-9_-]{11})/)
  if (shortsMatch) return shortsMatch[1]
  const liveMatch = trimmed.match(/\/live\/([a-zA-Z0-9_-]{11})/)
  if (liveMatch) return liveMatch[1]

  return null
}

export type YoutubeOEmbed = {
  title: string
  author_name: string
  thumbnail_url: string
  /** oEmbed 通常不提供精確秒數，可能為 undefined */
  duration?: number
}

/**
 * 以 YouTube oEmbed 取得標題、作者、縮圖（免 API Key）。
 */
export async function fetchYoutubeOEmbed(
  pageUrl: string,
): Promise<YoutubeOEmbed | null> {
  const endpoint = `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(pageUrl)}`
  try {
    const res = await fetch(endpoint)
    if (!res.ok) return null
    const data = (await res.json()) as Record<string, unknown>
    const title = typeof data.title === 'string' ? data.title : ''
    const author_name =
      typeof data.author_name === 'string' ? data.author_name : ''
    const thumbnail_url =
      typeof data.thumbnail_url === 'string' ? data.thumbnail_url : ''
    return { title, author_name, thumbnail_url }
  } catch {
    return null
  }
}

/**
 * 將秒數格式化为 mm:ss 或 h:mm:ss 供列表顯示。
 */
export function formatTimecode(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return '0:00'
  const s = Math.floor(sec % 60)
  const m = Math.floor((sec / 60) % 60)
  const h = Math.floor(sec / 3600)
  const pad = (n: number) => String(n).padStart(2, '0')
  if (h > 0) return `${h}:${pad(m)}:${pad(s)}`
  return `${m}:${pad(s)}`
}
