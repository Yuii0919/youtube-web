import { formatTimecode } from '../lib/youtube'
import type { SrtCue } from '../lib/srt'

type SegmentListProps = {
  cues: SrtCue[]
  selectedIndex: number | null
  onSelect: (index: number) => void
}

/**
 * 字幕分段列表（課本 SegmentList）。
 */
export function SegmentList({ cues, selectedIndex, onSelect }: SegmentListProps) {
  return (
    <section className="flex min-h-0 max-h-[min(52vh,420px)] flex-1 flex-col rounded-2xl border border-zinc-200/80 bg-zinc-50/50 p-4 dark:border-zinc-700 dark:bg-zinc-800/40">
      <h2 className="mb-2 shrink-0 text-left text-sm font-semibold text-zinc-500 dark:text-zinc-400">
        字幕分段列表
      </h2>
      <div className="min-h-0 flex-1 overflow-y-auto rounded-xl border border-zinc-100 dark:border-zinc-800">
        {cues.length === 0 ? (
          <p className="p-4 text-left text-sm text-zinc-500">請選擇 SRT 檔案以載入分段。</p>
        ) : (
          <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {cues.map((cue, idx) => (
              <li key={`seg-${idx}-${cue.startSec.toFixed(3)}`}>
                <button
                  type="button"
                  onClick={() => onSelect(idx)}
                  className={`flex w-full gap-2 px-3 py-2 text-left text-sm transition hover:bg-zinc-50 dark:hover:bg-zinc-800/80 ${
                    selectedIndex === idx ? 'bg-violet-50 dark:bg-violet-950/40' : ''
                  }`}
                >
                  <span className="shrink-0 font-mono text-[0.7rem] leading-tight text-zinc-500 sm:text-xs">
                    <span className="whitespace-nowrap">
                      {formatTimecode(cue.startSec)}–{formatTimecode(cue.endSec)}
                    </span>
                  </span>
                  <span className="min-w-0 text-zinc-800 dark:text-zinc-200">{cue.text}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
