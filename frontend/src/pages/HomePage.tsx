import { useCallback, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  deleteVideo,
  getFolders,
  getVideos,
  patchVideoFolder,
  postVideo,
  postVideoDownload,
  type VideoFolderItem,
  type VideoListItem,
} from '../services/api'
import { toFriendlyApiError } from '../lib/apiErrors'
import { notifyLibraryUpdated } from '../lib/libraryEvents'
import { toCanonicalYoutubeWatchUrl } from '../lib/youtube'

function formatDuration(sec: number | null): string {
  if (sec == null || !Number.isFinite(sec)) return '—'
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

/**
 * 影片列表／匯入（開發計畫：後端 SQLite + 前往聽打）。
 */
export function HomePage() {
  const [searchParams] = useSearchParams()
  const uncategorized = searchParams.get('uncategorized') === '1'
  const folderIdRaw = searchParams.get('folderId')
  const filterFolderId =
    folderIdRaw && /^\d+$/.test(folderIdRaw) ? Number(folderIdRaw) : null

  const [items, setItems] = useState<VideoListItem[]>([])
  const [folders, setFolders] = useState<VideoFolderItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [newUrl, setNewUrl] = useState('')
  const [adding, setAdding] = useState(false)
  const [downloadingId, setDownloadingId] = useState<number | null>(null)
  const [movingId, setMovingId] = useState<number | null>(null)

  const handlePasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText()
      if (text?.trim()) setNewUrl(text.trim())
    } catch {
      window.alert('無法讀取剪貼簿，請手動貼上（Ctrl+V）。')
    }
  }

  const refresh = useCallback(async () => {
    setError(null)
    setLoading(true)
    try {
      const videoParams =
        uncategorized
          ? { uncategorizedOnly: true as const }
          : filterFolderId != null
            ? { folderId: filterFolderId }
            : undefined
      const [list, flist] = await Promise.all([
        getVideos(videoParams),
        getFolders(),
      ])
      setItems(list)
      setFolders(flist)
    } catch (e) {
      setError(toFriendlyApiError(e, '無法載入影片庫（請確認後端已啟動）'))
      setItems([])
      setFolders([])
    } finally {
      setLoading(false)
    }
  }, [uncategorized, filterFolderId])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const handleAdd = async () => {
    const u = newUrl.trim()
    if (!u) return
    const canonical = toCanonicalYoutubeWatchUrl(u)
    if (!canonical) {
      setError('無法從輸入辨識 YouTube 影片，請貼上完整連結（含 youtu.be、watch?v= 等）或 11 碼影片 ID。')
      return
    }
    setAdding(true)
    setError(null)
    try {
      await postVideo(canonical)
      setNewUrl('')
      await refresh()
      notifyLibraryUpdated()
    } catch (e) {
      setError(toFriendlyApiError(e, '新增失敗'))
    } finally {
      setAdding(false)
    }
  }

  const handleDownload = async (id: number, title: string) => {
    setDownloadingId(id)
    setError(null)
    try {
      const r = await postVideoDownload(id)
      window.alert(
        `「${title || id}」${r.message}\n\n路徑：${r.video_path}`,
      )
    } catch (e) {
      window.alert(e instanceof Error ? e.message : '下載失敗')
    } finally {
      setDownloadingId(null)
    }
  }

  const handleDelete = async (id: number, title: string) => {
    if (!window.confirm(`確定刪除「${title || id}」？字幕一併刪除。`)) return
    try {
      await deleteVideo(id)
      await refresh()
      notifyLibraryUpdated()
    } catch (e) {
      window.alert(e instanceof Error ? e.message : '刪除失敗')
    }
  }

  const handleMoveVideo = async (videoId: number, folderId: number | null) => {
    setMovingId(videoId)
    try {
      await patchVideoFolder(videoId, folderId)
      await refresh()
      notifyLibraryUpdated()
    } catch (e) {
      window.alert(e instanceof Error ? e.message : '移動失敗')
    } finally {
      setMovingId(null)
    }
  }

  const filterLabel = uncategorized
    ? '未分類'
    : filterFolderId != null
      ? folders.find((f) => f.id === filterFolderId)?.name ?? `資料夾 #${filterFolderId}`
      : '全部影片'

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-8 pb-24 md:pb-10">
      <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
        <div className="bg-zinc-100 px-6 py-6 text-center dark:bg-zinc-800">
          <h2 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">
            YouTube 聽打練習
          </h2>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
            練習 YouTube 影片英文字幕聽寫能力
          </p>
        </div>

        <div className="px-6 py-5">
          <div className="mb-2 text-left text-sm font-semibold text-zinc-800 dark:text-zinc-200">
            下載 YouTube 影片
          </div>
          <form
            className="pointer-events-auto relative z-10 flex flex-col gap-2 sm:flex-row sm:items-center"
            onSubmit={(e) => {
              e.preventDefault()
              if (!adding && newUrl.trim()) void handleAdd()
            }}
          >
            <label htmlFor="home-youtube-url" className="sr-only">
              YouTube 網址
            </label>
            <input
              id="home-youtube-url"
              name="youtube_url"
              type="text"
              inputMode="url"
              autoComplete="off"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              onPointerDown={(e) => {
                ;(e.currentTarget as HTMLInputElement).focus()
              }}
              placeholder="貼上 YouTube 網址（可含 https:// 或僅影片連結）"
              className="pointer-events-auto w-full min-w-0 flex-1 rounded-xl border border-zinc-300 bg-white px-4 py-3 text-base outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-300/50 dark:border-zinc-600 dark:bg-zinc-950 dark:focus:ring-zinc-700/70"
            />
            <button
              type="button"
              onClick={() => void handlePasteFromClipboard()}
              className="inline-flex shrink-0 items-center justify-center rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              貼上
            </button>
            <button
              type="submit"
              disabled={adding || !newUrl.trim()}
              className="inline-flex shrink-0 items-center justify-center rounded-xl bg-zinc-900 px-6 py-3 text-sm font-bold text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              {adding ? '匯入中…' : '匯入'}
            </button>
          </form>

          {error && (
            <p className="mt-2 text-left text-sm text-red-600 dark:text-red-400">
              {error}
            </p>
          )}

          <div className="mt-4 rounded-xl border border-zinc-200 bg-white px-4 py-3 text-left text-sm text-zinc-700 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200">
            <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full border border-zinc-300 text-xs font-bold text-zinc-700 dark:border-zinc-600 dark:text-zinc-200">
              Tip
            </span>
            使用時請詳閱 README.md 的啟動說明！
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
          <div className="text-left">
            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
              已下載的影片
            </h3>
            <p className="mt-1 text-sm text-zinc-500">
              目前篩選：<span className="font-medium text-zinc-700 dark:text-zinc-300">{filterLabel}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={() => void refresh()}
            className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            重新整理
          </button>
        </div>
        {loading ? (
          <p className="text-sm text-zinc-500">載入中…</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-zinc-500">
            {uncategorized || filterFolderId != null
              ? '此檢視下尚無影片。'
              : '尚無影片，請先匯入 YouTube 網址。'}
          </p>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((v) => (
              <li
                key={v.id}
                className="flex flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-700 dark:bg-zinc-900"
              >
                <div className="aspect-video w-full bg-zinc-100 dark:bg-zinc-800">
                  {v.thumbnail_url ? (
                    <img
                      src={v.thumbnail_url}
                      alt=""
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs text-zinc-400">
                      無縮圖
                    </div>
                  )}
                </div>

                <div className="flex min-h-0 flex-1 flex-col gap-2 p-4">
                  <div className="min-w-0">
                    <p className="line-clamp-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                      {v.title || v.youtube_id}
                    </p>
                    <p className="mt-0.5 line-clamp-1 text-xs text-zinc-500">{v.channel}</p>
                    <p className="mt-1 text-xs text-zinc-500">
                      長度 {formatDuration(v.duration)} · 字幕 {v.segment_count} 段
                    </p>
                  </div>

                  <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                    資料夾
                    <select
                      value={v.folder_id ?? ''}
                      disabled={movingId === v.id}
                      onChange={(e) => {
                        const raw = e.target.value
                        const fid = raw === '' ? null : Number(raw)
                        void handleMoveVideo(v.id, fid)
                      }}
                      className="mt-1 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950"
                    >
                      <option value="">未分類</option>
                      {folders.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.name}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="grid grid-cols-3 gap-2 border-t border-zinc-100 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900">
                  <Link
                    to={`/practice?libraryId=${v.id}`}
                    className="inline-flex items-center justify-center rounded-xl bg-zinc-900 px-3 py-2 text-xs font-semibold text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
                  >
                    練習
                  </Link>
                  <button
                    type="button"
                    disabled={downloadingId === v.id}
                    onClick={() => void handleDownload(v.id, v.title)}
                    className="rounded-xl border border-zinc-300 bg-white px-3 py-2 text-xs font-semibold text-zinc-800 hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:bg-zinc-800"
                  >
                    {downloadingId === v.id ? '下載中' : '下載'}
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDelete(v.id, v.title)}
                    className="rounded-xl border border-zinc-300 bg-white px-3 py-2 text-xs font-semibold text-zinc-800 hover:bg-zinc-100 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:bg-zinc-800"
                  >
                    刪除
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="text-center text-sm text-zinc-500">
        <Link to="/practice" className="font-medium text-zinc-700 hover:underline dark:text-zinc-300">
          直接開啟練習頁（本機網址與 SRT，不經影片庫）
        </Link>
      </p>
    </main>
  )
}
