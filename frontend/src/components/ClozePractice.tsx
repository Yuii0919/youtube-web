import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react'
import { buildClozeChars, countLetters, type ClozeChar } from '../lib/cloze'

export type ClozePracticeHandle = {
  /** 填入第一個空白字母並將焦點移至下一格。 */
  applyHint: () => void
}

type ClozePracticeProps = {
  cueText: string
  showAnswer: boolean
  translation: string | null
  translationLoading: boolean
  translationError: string | null
  /** false 時不顯示譯文區塊（仍保留已載入的譯文供再次顯示） */
  translationVisible?: boolean
  /** AI 解說（顯示翻譯區塊下方） */
  explanation?: string | null
  explanationLoading?: boolean
  explanationError?: string | null
  explanationVisible?: boolean
  /**
   * embedded：由父層提供外層卡片時使用，不渲染標題與外框。
   * standalone：維持獨立區塊樣式（預設）。
   */
  variant?: 'embedded' | 'standalone'
}

const LETTER_INPUT_CLASS =
  'h-10 w-8 shrink-0 border-0 border-b-2 border-zinc-500 bg-transparent text-center text-lg font-mono uppercase outline-none focus:border-violet-500 focus:ring-0 dark:border-zinc-400'

const OTHER_CLASS = 'inline-flex min-h-10 items-end justify-center font-mono text-lg text-zinc-700 dark:text-zinc-300'

/**
 * 依字幕句顯示字母挖空聽打、提示、參考答案列與翻譯區。
 */
export const ClozePractice = forwardRef<ClozePracticeHandle, ClozePracticeProps>(
  function ClozePractice(
    {
      cueText,
      showAnswer,
      translation,
      translationLoading,
      translationError,
      translationVisible = true,
      explanation = null,
      explanationLoading = false,
      explanationError = null,
      explanationVisible = false,
      variant = 'standalone',
    },
    ref,
  ) {
    const chars = useMemo(() => buildClozeChars(cueText), [cueText])
    const letterCount = useMemo(() => countLetters(chars), [chars])
    const [answers, setAnswers] = useState(() =>
      Array.from({ length: letterCount }, () => ''),
    )

    const inputsRef = useRef<(HTMLInputElement | null)[]>([])

    const letters = useMemo(() => {
      const list: ClozeChar[] = []
      for (const c of chars) {
        if (c.kind === 'letter') list.push(c)
      }
      return list
    }, [chars])

    /** 每個字元索引對應的「字母槽」編號；非字母為 -1。 */
    const charLetterSlot = useMemo(() => {
      const slots: number[] = []
      let li = -1
      for (let i = 0; i < chars.length; i++) {
        const c = chars[i]
        if (c.kind === 'letter') {
          li += 1
          slots[i] = li
        } else {
          slots[i] = -1
        }
      }
      return slots
    }, [chars])

    const focusLetter = useCallback((index: number) => {
      const el = inputsRef.current[index]
      el?.focus()
      el?.select()
    }, [])

    const applyHintInternal = useCallback(() => {
      setAnswers((prev) => {
        const emptyIdx = prev.findIndex((a) => !a)
        if (emptyIdx < 0) return prev
        const letterMeta = letters[emptyIdx]
        if (!letterMeta || letterMeta.kind !== 'letter') return prev
        const copy = [...prev]
        copy[emptyIdx] = letterMeta.char
        queueMicrotask(() => {
          const n = emptyIdx + 1
          if (n < letterCount) focusLetter(n)
        })
        return copy
      })
    }, [letters, letterCount, focusLetter])

    useImperativeHandle(
      ref,
      () => ({
        applyHint: () => {
          applyHintInternal()
        },
      }),
      [applyHintInternal],
    )

    const handleLetterChange = useCallback(
      (letterIndex: number, raw: string) => {
        const last = raw.slice(-1)
        const ch = /[A-Za-z]/.test(last) ? last : ''
        setAnswers((prev) => {
          const next = [...prev]
          next[letterIndex] = ch
          return next
        })
        if (ch && letterIndex < letterCount - 1) {
          queueMicrotask(() => focusLetter(letterIndex + 1))
        }
      },
      [letterCount, focusLetter],
    )

    const handleKeyDown = useCallback(
      (letterIndex: number, e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Backspace' && e.currentTarget.value === '' && letterIndex > 0) {
          e.preventDefault()
          focusLetter(letterIndex - 1)
        }
        if (e.key === 'Enter') {
          e.preventDefault()
          if (letterIndex < letterCount - 1) focusLetter(letterIndex + 1)
        }
      },
      [letterCount, focusLetter],
    )

    const inner = (
      <>
        <div
          className="mb-2 flex min-h-[4.5rem] flex-wrap items-end gap-x-1 gap-y-2"
          role="group"
          aria-label="英文字母填空"
        >
          {chars.map((c, i) => {
            if (c.kind === 'other') {
              const display = c.char === ' ' ? '\u00a0' : c.char
              return (
                <span key={`o-${i}`} className={OTHER_CLASS} aria-hidden={c.char === ' '}>
                  {display}
                </span>
              )
            }
            const idx = charLetterSlot[i]
            return (
              <input
                key={`l-${i}`}
                ref={(el) => {
                  inputsRef.current[idx] = el
                }}
                type="text"
                inputMode="text"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                maxLength={1}
                aria-label={`第 ${idx + 1} 個字母`}
                className={LETTER_INPUT_CLASS}
                value={answers[idx] ?? ''}
                placeholder="_"
                onChange={(e) => handleLetterChange(idx, e.target.value)}
                onKeyDown={(e) => handleKeyDown(idx, e)}
              />
            )
          })}
        </div>

        {showAnswer && (
          <div
            className="mb-3 flex flex-wrap items-end gap-x-1 gap-y-2 border-t border-dashed border-zinc-300 pt-3 dark:border-zinc-600"
            aria-label="參考答案"
          >
            {chars.map((c, i) => {
              if (c.kind === 'other') {
                const display = c.char === ' ' ? '\u00a0' : c.char
                return (
                  <span key={`a-o-${i}`} className={OTHER_CLASS}>
                    {display}
                  </span>
                )
              }
              return (
                <span
                  key={`a-l-${i}`}
                  className="flex h-10 w-8 shrink-0 items-end justify-center font-mono text-lg text-emerald-700 dark:text-emerald-400"
                >
                  {c.char}
                </span>
              )
            })}
          </div>
        )}

        {translationError && (
          <p className="mb-2 text-sm text-red-600 dark:text-red-400">{translationError}</p>
        )}
        {translationLoading && (
          <p className="mb-2 text-sm text-zinc-500">翻譯載入中…</p>
        )}
        {translationVisible && translation && !translationLoading && (
          <div className="mt-3 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 dark:border-zinc-600 dark:bg-zinc-800/40">
            <p className="text-xs font-semibold tracking-wide text-zinc-600 dark:text-zinc-300">中文翻譯</p>
            <p className="mt-1 text-base leading-relaxed text-zinc-800 dark:text-zinc-200">
              {translation}
            </p>
          </div>
        )}

        {explanationVisible && explanationError && (
          <p className="mt-3 text-sm text-red-600 dark:text-red-400">{explanationError}</p>
        )}
        {explanationVisible && explanationLoading && (
          <p className="mt-3 text-sm text-zinc-500">AI 解說載入中…</p>
        )}
        {explanationVisible && explanation && !explanationLoading && !explanationError && (
          <div className="mt-3 rounded-xl border border-zinc-200 bg-white px-3 py-2 dark:border-zinc-600 dark:bg-zinc-950">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold tracking-wide text-zinc-700 dark:text-zinc-200">
                AI 解說
              </p>
              <span className="rounded-full bg-zinc-900 px-2 py-0.5 text-[0.65rem] font-bold text-white dark:bg-zinc-100 dark:text-zinc-900">
                重點
              </span>
            </div>
            <div className="mt-2 space-y-2 text-sm leading-relaxed text-zinc-800 dark:text-zinc-200">
              {explanation
                .split(/\n{2,}/g)
                .map((blk) => blk.trim())
                .filter(Boolean)
                .slice(0, 12)
                .map((blk, i) => (
                  <p key={i} className="whitespace-pre-wrap">
                    {blk}
                  </p>
                ))}
            </div>
          </div>
        )}
      </>
    )

    if (variant === 'embedded') {
      return <div className="min-w-0 text-left">{inner}</div>
    }

    return (
      <section className="rounded-xl border border-zinc-200 bg-white p-4 text-left shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
        <h2 className="mb-3 text-sm font-semibold text-zinc-500 dark:text-zinc-400">
          聽打練習
        </h2>
        {inner}
      </section>
    )
  },
)
