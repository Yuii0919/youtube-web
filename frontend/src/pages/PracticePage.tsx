import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ActionButtons } from '../components/ActionButtons'
import { FillBlanksInput, type FillBlanksInputHandle } from '../components/FillBlanksInput'
import { PlaybackControls } from '../components/PlaybackControls'
import { SegmentList } from '../components/SegmentList'
import { VideoManagement } from '../components/VideoManagement'
import { VideoPlayer, type VideoPlayerHandle } from '../components/VideoPlayer'
import {
  getListenProgressKey,
  loadListenProgress,
  saveListenProgress,
} from '../lib/progressStorage'
import { translateToZh } from '../lib/translateApi'
import { apiSegmentsToCues, getVideoDetail, postAiExplain } from '../services/api'
import { useVideoStore } from '../store/useVideoStore'
import type { PlayMode } from '../types'

/**
 * 主要聽打練習頁（課本 PracticePage）。
 */
export function PracticePage() {
  const [searchParams] = useSearchParams()
  const hydrateFromLibrary = useVideoStore((s) => s.hydrateFromLibrary)

  const cues = useVideoStore((s) => s.cues)
  const selectedIndex = useVideoStore((s) => s.selectedIndex)
  const setSelectedIndex = useVideoStore((s) => s.setSelectedIndex)
  const libraryVideoId = useVideoStore((s) => s.libraryVideoId)
  const videoId = useVideoStore((s) => s.videoId)
  const pageUrl = useVideoStore((s) => s.pageUrl)
  const localVideoUrl = useVideoStore((s) => s.localVideoUrl)
  const srtFileName = useVideoStore((s) => s.srtFileName)

  const [playMode, setPlayMode] = useState<PlayMode>('loop')
  const [playbackRate, setPlaybackRate] = useState(1)
  const [showAnswer, setShowAnswer] = useState(false)
  const clozeRef = useRef<FillBlanksInputHandle>(null)
  const videoPlayerRef = useRef<VideoPlayerHandle>(null)
  const [translation, setTranslation] = useState<string | null>(null)
  const [translationLoading, setTranslationLoading] = useState(false)
  const [translationError, setTranslationError] = useState<string | null>(null)
  const [translationVisible, setTranslationVisible] = useState(false)

  const [explanation, setExplanation] = useState<string | null>(null)
  const [explanationLoading, setExplanationLoading] = useState(false)
  const [explanationError, setExplanationError] = useState<string | null>(null)
  const [explanationVisible, setExplanationVisible] = useState(false)

  const progressKey = useMemo(
    () =>
      getListenProgressKey({
        libraryVideoId,
        videoId,
        srtFileName,
        cuesLength: cues.length,
      }),
    [libraryVideoId, videoId, srtFileName, cues.length],
  )

  const appliedProgressKeyRef = useRef<string | null>(null)

  useEffect(() => {
    appliedProgressKeyRef.current = null
  }, [progressKey])

  useEffect(() => {
    if (!progressKey || cues.length === 0) return
    if (appliedProgressKeyRef.current === progressKey) return
    appliedProgressKeyRef.current = progressKey

    const p = loadListenProgress(progressKey)
    if (!p || p.selectedIndex < 0 || p.selectedIndex >= cues.length) return

    setSelectedIndex(p.selectedIndex)
    setPlayMode(p.playMode)
    setPlaybackRate(p.playbackRate)

    const seekMs = window.setTimeout(() => {
      const cue = cues[p.selectedIndex]
      if (cue) videoPlayerRef.current?.seekToSegment(cue.startSec, false)
    }, 80)

    return () => window.clearTimeout(seekMs)
  }, [progressKey, cues, setSelectedIndex])

  useEffect(() => {
    if (!progressKey || selectedIndex === null || cues.length === 0) return
    saveListenProgress(progressKey, { selectedIndex, playMode, playbackRate })
  }, [progressKey, selectedIndex, playMode, playbackRate, cues.length])

  useEffect(() => {
    setShowAnswer(false)
    setTranslation(null)
    setTranslationError(null)
    setTranslationVisible(false)
    setExplanation(null)
    setExplanationError(null)
    setExplanationVisible(false)
  }, [srtFileName])

  useEffect(() => {
    const idStr = searchParams.get('libraryId')
    if (!idStr) return
    const libraryId = Number(idStr)
    if (!Number.isInteger(libraryId) || libraryId <= 0) return

    let cancelled = false
    void getVideoDetail(libraryId)
      .then((d) => {
        if (cancelled) return
        hydrateFromLibrary({
          libraryVideoId: d.id,
          pageUrl: `https://www.youtube.com/watch?v=${d.youtube_id}`,
          youtubeId: d.youtube_id,
          title: d.title,
          author_name: d.channel,
          thumbnail_url: d.thumbnail_url,
          cues: apiSegmentsToCues(d.segments),
        })
      })
      .catch(() => {
        if (cancelled) return
        /* 載入失敗時保留現有狀態；可由使用者改用手動載入 */
      })

    return () => {
      cancelled = true
    }
  }, [searchParams, hydrateFromLibrary])

  const videoUrl =
    localVideoUrl ??
    pageUrl ??
    (videoId ? `https://www.youtube.com/watch?v=${videoId}` : null)

  const seekToCue = useCallback(
    (index: number, autoplay: boolean) => {
      const cue = cues[index]
      if (!cue) return
      setSelectedIndex(index)
      setShowAnswer(false)
      setTranslation(null)
      setTranslationError(null)
      setTranslationVisible(false)
      setExplanation(null)
      setExplanationError(null)
      setExplanationVisible(false)
      videoPlayerRef.current?.seekToSegment(cue.startSec, autoplay)
    },
    [cues, setSelectedIndex],
  )

  const handleTranslate = useCallback(async (): Promise<boolean> => {
    const cue =
      selectedIndex !== null && cues[selectedIndex] ? cues[selectedIndex] : null
    if (!cue) return false
    setTranslationError(null)
    setTranslationLoading(true)
    try {
      const zh = await translateToZh(cue.text)
      setTranslation(zh)
      return true
    } catch (e) {
      setTranslationError(
        e instanceof Error ? e.message : '翻譯失敗，請確認後端已啟動。',
      )
      setTranslation(null)
      return false
    } finally {
      setTranslationLoading(false)
    }
  }, [cues, selectedIndex])

  const toggleTranslationPanel = useCallback(() => {
    if (translationVisible) {
      setTranslationVisible(false)
      return
    }
    void handleTranslate().then((ok) => {
      if (ok) setTranslationVisible(true)
    })
  }, [translationVisible, handleTranslate])

  const explainStorageKey = useCallback((sentenceEn: string) => {
    return `ai_explain:${sentenceEn.trim()}`
  }, [])

  const handleAiExplain = useCallback(async () => {
    const cue =
      selectedIndex !== null && cues[selectedIndex] ? cues[selectedIndex] : null
    if (!cue) return

    setExplanationVisible(true)
    setExplanationError(null)

    const key = explainStorageKey(cue.text)
    try {
      const hit = sessionStorage.getItem(key)
      if (hit) {
        setExplanation(hit)
        setExplanationLoading(false)
        return
      }
    } catch {
      /* 略過快取讀取錯誤 */
    }

    setExplanationLoading(true)
    setExplanation(null)
    try {
      const fullZh =
        translationVisible && translation?.trim() ? translation.trim() : undefined
      const { explanation: text } = await postAiExplain({
        sentence_en: cue.text,
        full_sentence_zh: fullZh,
      })
      setExplanation(text)
      try {
        sessionStorage.setItem(key, text)
      } catch {
        /* 略過寫入 */
      }
    } catch (e) {
      setExplanationError(
        e instanceof Error ? e.message : 'AI 解說失敗，請確認後端與設定頁的 API。',
      )
      setExplanation(null)
    } finally {
      setExplanationLoading(false)
    }
  }, [
    cues,
    selectedIndex,
    translationVisible,
    translation,
    explainStorageKey,
  ])

  const goAdjacentCue = useCallback(
    (delta: -1 | 1) => {
      if (selectedIndex === null || cues.length === 0) return
      const next = selectedIndex + delta
      if (next < 0 || next >= cues.length) return
      seekToCue(next, true)
    },
    [selectedIndex, cues.length, seekToCue],
  )

  const currentCue =
    selectedIndex !== null && cues[selectedIndex] ? cues[selectedIndex] : null

  const currentSegment = useMemo(() => {
    if (
      selectedIndex === null ||
      selectedIndex < 0 ||
      selectedIndex >= cues.length
    ) {
      return null
    }
    const c = cues[selectedIndex]
    return { startTime: c.startSec, endTime: c.endSec }
  }, [selectedIndex, cues])

  const canPrevCue =
    selectedIndex !== null && cues.length > 0 && selectedIndex > 0
  const canNextCue =
    selectedIndex !== null && cues.length > 0 && selectedIndex < cues.length - 1

  return (
    <>
      <main className="mx-auto max-w-6xl space-y-5 px-4 py-6">
        <VideoManagement />

        <section className="rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
          <h2 className="mb-3 text-left text-sm font-semibold text-zinc-700 dark:text-zinc-200">④ 影片播放與句子選擇</h2>
          {videoUrl && cues.length === 0 && (
            <p className="mb-3 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-left text-sm text-sky-900 dark:border-sky-900/60 dark:bg-sky-950/30 dark:text-sky-100">
              影片已載入。下一步請在上方「③ 載入字幕（SRT）」選擇字幕檔，分段列表才會出現內容。
            </p>
          )}
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_min(18rem,32%)] lg:items-stretch">
            <VideoPlayer
              ref={videoPlayerRef}
              videoUrl={videoUrl}
              currentSegment={currentSegment}
              playMode={playMode}
              playbackRate={playbackRate}
              showSegmentNav={cues.length > 0}
              canPrevCue={!!canPrevCue}
              canNextCue={!!canNextCue}
              onPrevCue={() => goAdjacentCue(-1)}
              onNextCue={() => goAdjacentCue(1)}
            />

            <div className="flex min-h-0 flex-col gap-4">
              <SegmentList
                cues={cues}
                selectedIndex={selectedIndex}
                onSelect={(idx) => seekToCue(idx, true)}
              />
              <PlaybackControls
                playbackRate={playbackRate}
                playMode={playMode}
                onPlaybackRateChange={setPlaybackRate}
                onPlayModeChange={setPlayMode}
              />
            </div>
          </div>
        </section>

        {currentCue ? (
          <section className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
            <h2 className="mb-4 text-left text-sm font-semibold text-zinc-700 dark:text-zinc-200">⑤ 聽打填空與 AI 解說</h2>
            <div className="flex flex-col gap-8 lg:flex-row lg:items-stretch">
              <div className="min-w-0 flex-1">
                <FillBlanksInput
                  ref={clozeRef}
                  key={`${selectedIndex}-${currentCue.startSec}`}
                  variant="embedded"
                  cueText={currentCue.text}
                  showAnswer={showAnswer}
                  translation={translation}
                  translationLoading={translationLoading}
                  translationError={translationError}
                  translationVisible={translationVisible}
                  explanation={explanation}
                  explanationLoading={explanationLoading}
                  explanationError={explanationError}
                  explanationVisible={explanationVisible}
                />
              </div>

              <ActionButtons
                translationLoading={translationLoading}
                translationVisible={translationVisible}
                explanationLoading={explanationLoading}
                onHint={() => clozeRef.current?.applyHint()}
                onCheckAnswer={() => setShowAnswer(true)}
                onToggleTranslation={() => toggleTranslationPanel()}
                onAiExplain={() => void handleAiExplain()}
              />
            </div>
          </section>
        ) : (
          <p className="rounded-2xl border border-dashed border-zinc-300 bg-white/80 px-4 py-8 text-center text-sm text-zinc-500 dark:border-zinc-600 dark:bg-zinc-900/50">
            載入 SRT 後點選一分段即可於下方填空練習區開始聽打。
          </p>
        )}
      </main>
    </>
  )
}
