import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react'
import ReactPlayer from 'react-player/lazy'
import type { OnProgressProps } from 'react-player/base'
import type { PlayMode, VideoSegmentTimes } from '../types'

const PlayerImpl = (
  (ReactPlayer as unknown as { default?: unknown }).default ?? ReactPlayer
) as typeof ReactPlayer

export type VideoPlayerHandle = {
  /**
   * 跳轉至指定秒數（課本 seekToSegment）；`autoplay` 決定跳轉後是否播放。
   */
  seekToSegment: (startTime: number, autoplay?: boolean) => void
}

type VideoPlayerProps = {
  /** YouTube 或本機檔之播放網址（課本 videoUrl）。 */
  videoUrl: string | null
  /** 目前分段時間區間（課本 currentSegment）。 */
  currentSegment: VideoSegmentTimes | null
  playMode: PlayMode
  playbackRate: number
  showSegmentNav: boolean
  canPrevCue: boolean
  canNextCue: boolean
  onPrevCue: () => void
  onNextCue: () => void
}

/**
 * 以 react-player 播放本機或線上影片，並實作句末循環、鍵盤左右切句與播放狀態（課本階段三）。
 */
export const VideoPlayer = forwardRef<VideoPlayerHandle, VideoPlayerProps>(
  function VideoPlayer(
    {
      videoUrl,
      currentSegment,
      playMode,
      playbackRate,
      showSegmentNav,
      canPrevCue,
      canNextCue,
      onPrevCue,
      onNextCue,
    },
    ref,
  ) {
    const playerRef = useRef<ReactPlayer | null>(null)
    const [playing, setPlaying] = useState(false)
    const endTriggeredRef = useRef(false)
    const loopTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const segmentRef = useRef<VideoSegmentTimes | null>(null)
    const playModeRef = useRef(playMode)

    useEffect(() => {
      segmentRef.current = currentSegment
    }, [currentSegment])

    useEffect(() => {
      playModeRef.current = playMode
    }, [playMode])

    useEffect(() => {
      endTriggeredRef.current = false
      if (loopTimeoutRef.current) {
        clearTimeout(loopTimeoutRef.current)
        loopTimeoutRef.current = null
      }
    }, [currentSegment?.startTime, currentSegment?.endTime])

    const seekToSegment = useCallback((startTime: number, autoplay = true) => {
      playerRef.current?.seekTo(startTime, 'seconds')
      setPlaying(autoplay)
      endTriggeredRef.current = false
    }, [])

    useImperativeHandle(ref, () => ({ seekToSegment }), [seekToSegment])

    const handleProgress = useCallback((state: OnProgressProps) => {
      const seg = segmentRef.current
      if (!seg) return
      const { startTime, endTime } = seg
      const dur = Math.max(0, endTime - startTime)
      // 句長極短時不可再用固定 0.08s，否則門檻會落在句首之前
      const endPad = Math.min(0.08, Math.max(0.02, dur * 0.25))

      if (state.playedSeconds < endTime - endPad) {
        endTriggeredRef.current = false
        return
      }
      if (endTriggeredRef.current) return
      endTriggeredRef.current = true

      if (loopTimeoutRef.current) {
        clearTimeout(loopTimeoutRef.current)
        loopTimeoutRef.current = null
      }

      if (playModeRef.current === 'loop') {
        setPlaying(false)
        loopTimeoutRef.current = setTimeout(() => {
          loopTimeoutRef.current = null
          if (playModeRef.current !== 'loop') return
          playerRef.current?.seekTo(startTime, 'seconds')
          setPlaying(true)
          endTriggeredRef.current = false
        }, 2000)
      } else {
        setPlaying(false)
      }
    }, [])

    useEffect(
      () => () => {
        if (loopTimeoutRef.current) clearTimeout(loopTimeoutRef.current)
      },
      [],
    )

    useEffect(() => {
      const onKeyDown = (e: KeyboardEvent) => {
        const t = e.target
        if (t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement) {
          return
        }
        if (e.key === 'ArrowLeft') {
          if (!canPrevCue) return
          e.preventDefault()
          onPrevCue()
        }
        if (e.key === 'ArrowRight') {
          if (!canNextCue) return
          e.preventDefault()
          onNextCue()
        }
        if (e.key === ' ') {
          e.preventDefault()
          setPlaying((p) => !p)
        }
      }
      window.addEventListener('keydown', onKeyDown)
      return () => window.removeEventListener('keydown', onKeyDown)
    }, [canPrevCue, canNextCue, onPrevCue, onNextCue])

    return (
      <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
        <h2 className="text-left text-sm font-semibold text-zinc-500 dark:text-zinc-400">
          影片播放器
        </h2>
        <div className="relative mt-3 aspect-video w-full overflow-hidden rounded-xl bg-black">
          {videoUrl ? (
            <>
              <div className="absolute inset-0">
                <PlayerImpl
                  ref={playerRef}
                  url={videoUrl}
                  playing={playing}
                  playbackRate={playbackRate}
                  controls
                  width="100%"
                  height="100%"
                  progressInterval={100}
                  onPlay={() => setPlaying(true)}
                  onPause={() => setPlaying(false)}
                  onProgress={handleProgress}
                  config={{
                    youtube: {
                      playerVars: { modestbranding: 1, rel: 0, playsinline: 1 },
                    },
                  }}
                />
              </div>
              {showSegmentNav && (
                <>
                  <button
                    type="button"
                    className="absolute left-2 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-violet-600 text-lg font-bold text-white shadow-md transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-35 dark:bg-violet-500 dark:hover:bg-violet-400"
                    aria-label="上一句字幕"
                    disabled={!canPrevCue}
                    onClick={onPrevCue}
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-violet-600 text-lg font-bold text-white shadow-md transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-35 dark:bg-violet-500 dark:hover:bg-violet-400"
                    aria-label="下一句字幕"
                    disabled={!canNextCue}
                    onClick={onNextCue}
                  >
                    ›
                  </button>
                </>
              )}
            </>
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-zinc-400">
              請載入 YouTube 網址或本機影片檔
            </div>
          )}
        </div>
        <p className="mt-2 text-left text-xs text-zinc-500 dark:text-zinc-400">
          快捷鍵：空白鍵 播放／暫停；← 上一句、→ 下一句（聚焦輸入框時不攔截）。
        </p>
      </section>
    )
  },
)
