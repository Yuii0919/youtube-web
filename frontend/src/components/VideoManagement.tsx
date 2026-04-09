import { useEffect, useRef } from 'react'
import { useVideoStore } from '../store/useVideoStore'
import {
  extractYoutubeVideoId,
  fetchYoutubeOEmbed,
} from '../lib/youtube'
import { parseSrt } from '../lib/srt'
import { apiSegmentsToCues, postVideoSrt } from '../services/api'

/**
 * 影片與字幕載入區（課本 VideoManagement）：YouTube 網址、本機影片、SRT。
 */
export function VideoManagement() {
  const {
    urlInput,
    setUrlInput,
    setYoutubeLoaded,
    setSrtLoaded,
    setLocalVideoUrl,
    setCuesFromServer,
    oembedError,
    oembed,
    pageUrl,
    videoId,
    srtFileName,
    cues,
    libraryVideoId,
  } = useVideoStore()

  const localBlobRef = useRef<string | null>(null)

  const revokeLocalBlob = () => {
    if (localBlobRef.current) {
      URL.revokeObjectURL(localBlobRef.current)
      localBlobRef.current = null
    }
    setLocalVideoUrl(null)
  }

  useEffect(
    () => () => {
      if (localBlobRef.current) {
        URL.revokeObjectURL(localBlobRef.current)
      }
    },
    [],
  )

  const handleLoadYoutube = async () => {
    const id = extractYoutubeVideoId(urlInput)
    if (!id) {
      setYoutubeLoaded({
        pageUrl: null,
        videoId: null,
        oembed: null,
        oembedError: '無法解析 YouTube 網址或影片 ID。',
      })
      return
    }
    revokeLocalBlob()
    const canonical = `https://www.youtube.com/watch?v=${id}`
    const meta = await fetchYoutubeOEmbed(canonical)
    setYoutubeLoaded({
      pageUrl: canonical,
      videoId: id,
      oembed: meta,
      oembedError: meta ? null : '無法取得影片資訊（oEmbed）。影片仍可能可播放。',
    })
  }

  const handleLocalVideoFile = (file: File | null) => {
    revokeLocalBlob()
    if (!file) return
    const url = URL.createObjectURL(file)
    localBlobRef.current = url
    setLocalVideoUrl(url)
  }

  const handleSrtFile = async (file: File | null) => {
    if (!file) return
    if (libraryVideoId != null) {
      try {
        const detail = await postVideoSrt(libraryVideoId, file)
        setCuesFromServer(
          apiSegmentsToCues(detail.segments),
          `伺服器：${file.name}（${detail.segments.length} 段）`,
        )
      } catch (e) {
        const msg = e instanceof Error ? e.message : '上傳失敗'
        window.alert(`SRT 上傳至影片庫失敗：${msg}`)
      }
      return
    }
    const text = await file.text()
    const parsed = parseSrt(text)
    setSrtLoaded({ fileName: file.name, cues: parsed })
  }

  return (
    <>
      <section className="rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
        <h2 className="mb-3 text-left text-sm font-semibold text-zinc-700 dark:text-zinc-200">① 載入 YouTube 影片</h2>
        <div className="flex flex-col gap-3 md:flex-row md:items-end">
          <label className="flex-1 text-left text-sm font-medium text-zinc-700 dark:text-zinc-300">
            YouTube 網址
            <input
              type="url"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=…"
              className="mt-1 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-base outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-300/50 dark:border-zinc-600 dark:bg-zinc-950 dark:focus:ring-zinc-700/70"
            />
          </label>
          <button
            type="button"
            onClick={() => void handleLoadYoutube()}
            className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            載入影片
          </button>
        </div>
        {oembedError && (
          <p className="mt-2 text-sm text-amber-700 dark:text-amber-400">{oembedError}</p>
        )}
        {oembed && pageUrl && (
          <div className="mt-4 flex flex-col gap-3 border-t border-zinc-100 pt-4 text-left dark:border-zinc-800 sm:flex-row sm:items-start">
            {oembed.thumbnail_url ? (
              <img
                src={oembed.thumbnail_url}
                alt=""
                className="h-24 w-auto rounded-md object-cover"
              />
            ) : null}
            <div>
              <p className="font-medium text-zinc-900 dark:text-zinc-100">{oembed.title}</p>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">{oembed.author_name}</p>
              <p className="mt-1 text-xs text-zinc-500">
                影片 ID：
                <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">{videoId}</code>
              </p>
            </div>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
        <h2 className="mb-3 text-left text-sm font-semibold text-zinc-700 dark:text-zinc-200">② 載入本機影片（選填）</h2>
        <label className="text-left text-sm font-medium text-zinc-700 dark:text-zinc-300">
          本機影片檔（優先於 YouTube）
          <input
            type="file"
            accept="video/*"
            onChange={(e) => handleLocalVideoFile(e.target.files?.[0] ?? null)}
            className="mt-2 block w-full text-sm text-zinc-600 file:mr-3 file:rounded-lg file:border-0 file:bg-zinc-200 file:px-3 file:py-2 file:text-sm file:font-medium file:text-zinc-800 hover:file:bg-zinc-300 dark:text-zinc-400 dark:file:bg-zinc-700 dark:file:text-zinc-100"
          />
        </label>
        <p className="mt-1 text-left text-xs text-zinc-500 dark:text-zinc-400">
          選擇本機檔後會以 react-player 播放；若要改回線上影片請重新按「載入影片」。
        </p>
      </section>

      <section className="rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
        <h2 className="mb-3 text-left text-sm font-semibold text-zinc-700 dark:text-zinc-200">③ 載入字幕（SRT）</h2>
        {libraryVideoId != null && (
          <p className="mb-2 rounded-lg bg-violet-50 px-3 py-2 text-left text-xs text-violet-800 dark:bg-violet-950/50 dark:text-violet-200">
            目前連結影片庫 ID：<span className="font-mono">{libraryVideoId}</span>
            ；上傳 SRT 將寫入伺服器。
          </p>
        )}
        <label className="text-left text-sm font-medium text-zinc-700 dark:text-zinc-300">
          英文字幕（SRT，本機檔案）
          <input
            type="file"
            accept=".srt,text/plain"
            onChange={(e) => void handleSrtFile(e.target.files?.[0] ?? null)}
            className="mt-2 block w-full text-sm text-zinc-600 file:mr-3 file:rounded-lg file:border-0 file:bg-zinc-200 file:px-3 file:py-2 file:text-sm file:font-medium file:text-zinc-800 hover:file:bg-zinc-300 dark:text-zinc-400 dark:file:bg-zinc-700 dark:file:text-zinc-100"
          />
        </label>
        {srtFileName && (
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            已載入：<span className="font-mono">{srtFileName}</span>（{cues.length} 段）
          </p>
        )}
      </section>
    </>
  )
}
