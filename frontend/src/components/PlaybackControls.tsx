import type { PlayMode } from '../types'

const PLAYBACK_RATES = [0.5, 0.75, 1, 1.25, 1.5, 2] as const

type PlaybackControlsProps = {
  playbackRate: number
  playMode: PlayMode
  onPlaybackRateChange: (rate: number) => void
  onPlayModeChange: (mode: PlayMode) => void
}

/**
 * 播放速度與單句模式（課本 PlaybackControls）。
 */
export function PlaybackControls({
  playbackRate,
  playMode,
  onPlaybackRateChange,
  onPlayModeChange,
}: PlaybackControlsProps) {
  return (
    <section className="shrink-0 rounded-2xl border border-zinc-200/80 bg-zinc-50/50 p-4 dark:border-zinc-700 dark:bg-zinc-800/40">
      <h2 className="mb-3 text-left text-sm font-semibold text-zinc-500 dark:text-zinc-400">
        播放控制
      </h2>
      <div className="space-y-3 text-left">
        <div>
          <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
            播放速度控制
          </label>
          <select
            value={playbackRate}
            onChange={(e) => onPlaybackRateChange(Number(e.target.value))}
            className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950"
          >
            {PLAYBACK_RATES.map((r) => (
              <option key={r} value={r}>
                {r}×
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => onPlayModeChange('loop')}
            className={`rounded-lg px-3 py-2 text-sm font-medium ${
              playMode === 'loop'
                ? 'bg-violet-600 text-white shadow-sm'
                : 'border border-zinc-200 bg-zinc-50 text-zinc-800 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100'
            }`}
          >
            循環（單句重播）
          </button>
          <button
            type="button"
            onClick={() => onPlayModeChange('once')}
            className={`rounded-lg px-3 py-2 text-sm font-medium ${
              playMode === 'once'
                ? 'bg-violet-600 text-white shadow-sm'
                : 'border border-zinc-200 bg-zinc-50 text-zinc-800 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100'
            }`}
          >
            單次撥放
          </button>
        </div>
      </div>
    </section>
  )
}
