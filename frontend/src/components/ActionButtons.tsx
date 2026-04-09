type ActionButtonsProps = {
  translationLoading: boolean
  translationVisible: boolean
  explanationLoading: boolean
  onHint: () => void
  onCheckAnswer: () => void
  onToggleTranslation: () => void
  onAiExplain: () => void
}

/**
 * 提示／檢查答案／顯示翻譯（課本 ActionButtons）。
 */
export function ActionButtons({
  translationLoading,
  translationVisible,
  explanationLoading,
  onHint,
  onCheckAnswer,
  onToggleTranslation,
  onAiExplain,
}: ActionButtonsProps) {
  const baseBtn =
    'flex items-center justify-between gap-2 rounded-xl border px-4 py-3 text-left text-sm font-semibold shadow-sm transition disabled:cursor-not-allowed disabled:opacity-60'

  const neutralBtn =
    `${baseBtn} border-zinc-300 bg-white text-zinc-800 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:bg-zinc-800`

  return (
    <aside className="flex w-full shrink-0 flex-col justify-start gap-3 border-zinc-200 pt-2 lg:w-56 lg:border-l lg:pl-6 lg:pt-0 dark:border-zinc-700">
      <button
        type="button"
        onClick={onHint}
        className={neutralBtn}
      >
        給我提示
      </button>
      <button
        type="button"
        onClick={onCheckAnswer}
        className={neutralBtn}
      >
        檢查答案
      </button>
      <button
        type="button"
        onClick={onToggleTranslation}
        disabled={translationLoading}
        className={neutralBtn}
      >
        {translationVisible ? '隱藏翻譯' : '顯示翻譯'}
      </button>
      <button
        type="button"
        onClick={onAiExplain}
        disabled={explanationLoading}
        className={neutralBtn}
      >
        AI 解說
      </button>
    </aside>
  )
}
