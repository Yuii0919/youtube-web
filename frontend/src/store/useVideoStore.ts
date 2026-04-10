import { create } from 'zustand'
import type { SrtCue } from '../lib/srt'
import type { YoutubeOEmbed } from '../lib/youtube'

/**
 * 影片與字幕相關全域狀態（課本 useVideoStore，Zustand）。
 */
type VideoState = {
  urlInput: string
  pageUrl: string | null
  videoId: string | null
  /** 本機影片 blob: / file: URL，若設定則優先於 YouTube。 */
  localVideoUrl: string | null
  /** 資料庫影片主鍵；有值時上傳 SRT 會同步至後端。 */
  libraryVideoId: number | null
  oembed: YoutubeOEmbed | null
  oembedError: string | null
  cues: SrtCue[]
  srtFileName: string | null
  selectedIndex: number | null

  setUrlInput: (v: string) => void
  setLocalVideoUrl: (url: string | null) => void
  setYoutubeLoaded: (payload: {
    pageUrl: string | null
    videoId: string | null
    oembed: YoutubeOEmbed | null
    oembedError: string | null
  }) => void
  setSrtLoaded: (payload: { fileName: string; cues: SrtCue[] }) => void
  setSelectedIndex: (idx: number | null) => void
  /** 自影片庫載入練習狀態。 */
  hydrateFromLibrary: (payload: {
    libraryVideoId: number
    pageUrl: string
    youtubeId: string
    title: string
    author_name: string
    thumbnail_url: string
    cues: SrtCue[]
  }) => void
  /** 自後端刷新目前字幕（例如上傳 SRT、自動抓字後）；可一併綁定影片庫 ID。 */
  setCuesFromServer: (cues: SrtCue[], srtFileName: string, libraryVideoId?: number) => void
}

export const useVideoStore = create<VideoState>((set) => ({
  urlInput: '',
  pageUrl: null,
  videoId: null,
  localVideoUrl: null,
  libraryVideoId: null,
  oembed: null,
  oembedError: null,
  cues: [],
  srtFileName: null,
  selectedIndex: null,

  setUrlInput: (v) => set({ urlInput: v }),

  setLocalVideoUrl: (localVideoUrl) => set({ localVideoUrl, libraryVideoId: null }),

  setYoutubeLoaded: ({ pageUrl, videoId, oembed, oembedError }) =>
    set({
      pageUrl,
      videoId,
      oembed,
      oembedError,
      libraryVideoId: null,
    }),

  setSrtLoaded: ({ fileName, cues }) =>
    set({
      srtFileName: fileName,
      cues,
      selectedIndex: cues.length ? 0 : null,
      libraryVideoId: null,
    }),

  setSelectedIndex: (selectedIndex) => set({ selectedIndex }),

  hydrateFromLibrary: ({
    libraryVideoId,
    pageUrl,
    youtubeId,
    title,
    author_name,
    thumbnail_url,
    cues,
  }) =>
    set({
      libraryVideoId,
      urlInput: pageUrl,
      pageUrl,
      videoId: youtubeId,
      localVideoUrl: null,
      oembed: { title, author_name, thumbnail_url },
      oembedError: null,
      cues,
      srtFileName: `資料庫字幕（${cues.length} 段）`,
      selectedIndex: cues.length ? 0 : null,
    }),

  setCuesFromServer: (cues, srtFileName, libraryVideoId) =>
    set({
      cues,
      srtFileName,
      selectedIndex: cues.length ? 0 : null,
      ...(libraryVideoId !== undefined ? { libraryVideoId } : {}),
    }),
}))
