import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  getAiSettings,
  getOllamaModels,
  postAiTestConnection,
  putAiSettings,
  type AiProvider,
  type AiSettingsDto,
} from '../services/api'

const OLLAMA_DOC = 'https://docs.ollama.com/api'

/**
 * 返回箭頭（與側欄相同風格的細線圖示）。
 */
function IconChevronLeft({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M15 18l-6-6 6-6" />
    </svg>
  )
}

function IconSave({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" />
      <path d="M17 21v-8H7v8M7 3v5h8" />
    </svg>
  )
}

function IconFlask({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M9 3h6M10 9l-4 8.5a2 2 0 001.8 2.9h8.4a2 2 0 001.8-2.9L14 9M8 3v2a2 2 0 002 2h4a2 2 0 002-2V3" />
    </svg>
  )
}

const INPUT_CLASS =
  'mt-1.5 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 shadow-sm outline-none placeholder:text-zinc-400 focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200/80 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-zinc-500 dark:focus:ring-zinc-700/80'

const LABEL_CLASS = 'text-sm font-medium text-zinc-700 dark:text-zinc-300'

const PROVIDER_CARDS: {
  id: AiProvider
  title: string
  subtitle: string
}[] = [
  { id: 'openai', title: 'OpenAI GPT', subtitle: '需付費，品質最佳' },
  { id: 'gemini', title: 'Google Gemini', subtitle: '有免費額度' },
  { id: 'ollama', title: 'Ollama 本地', subtitle: '完全免費' },
]

/**
 * AI 解說與金鑰設定頁（金鑰僅存後端本機資料庫）。
 */
export function SettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saveMsg, setSaveMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [testMsg, setTestMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const [provider, setProvider] = useState<AiProvider>('openai')
  const [openaiKey, setOpenaiKey] = useState('')
  const [openaiBase, setOpenaiBase] = useState('')
  const [openaiModel, setOpenaiModel] = useState('gpt-4o-mini')
  const [geminiKey, setGeminiKey] = useState('')
  const [geminiModel, setGeminiModel] = useState('gemini-2.0-flash-exp')
  const [ollamaBase, setOllamaBase] = useState('http://127.0.0.1:11434')
  const [ollamaModel, setOllamaModel] = useState('')

  const [ollamaOptions, setOllamaOptions] = useState<string[]>([])
  const [ollamaListLoading, setOllamaListLoading] = useState(false)
  const [ollamaListErr, setOllamaListErr] = useState<string | null>(null)

  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [hasStoredOpenaiKey, setHasStoredOpenaiKey] = useState(false)
  const [hasStoredGeminiKey, setHasStoredGeminiKey] = useState(false)

  const applyDto = useCallback((d: AiSettingsDto) => {
    setProvider(d.provider as AiProvider)
    setOpenaiBase(d.openai_base_url)
    setOpenaiModel(d.openai_model)
    setGeminiModel(d.gemini_model)
    setOllamaBase(d.ollama_base_url)
    setOllamaModel(d.ollama_model)
    setHasStoredOpenaiKey(d.has_openai_key)
    setHasStoredGeminiKey(d.has_gemini_key)
    setOpenaiKey('')
    setGeminiKey('')
  }, [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setErr(null)
    void getAiSettings()
      .then((d) => {
        if (!cancelled) applyDto(d)
      })
      .catch((e) => {
        if (cancelled) return
        const raw = e instanceof Error ? e.message : '無法載入設定'
        // 避免直接顯示英文「Not Found」，改成可操作的提示
        const msg =
          /not\s*found/i.test(raw)
            ? '找不到後端 API（請先啟動後端，並用 `npm run dev` 啟動前端以使用 /api 代理）。'
            : raw
        setErr(msg)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [applyDto])

  const loadOllamaModels = useCallback(async () => {
    if (provider !== 'ollama') return
    setOllamaListLoading(true)
    setOllamaListErr(null)
    try {
      const { models } = await getOllamaModels(ollamaBase)
      setOllamaOptions(models)
    } catch (e) {
      setOllamaOptions([])
      setOllamaListErr(e instanceof Error ? e.message : '無法取得模型列表')
    } finally {
      setOllamaListLoading(false)
    }
  }, [provider, ollamaBase])

  useEffect(() => {
    if (provider !== 'ollama') return
    const t = window.setTimeout(() => void loadOllamaModels(), 350)
    return () => window.clearTimeout(t)
  }, [provider, ollamaBase, loadOllamaModels])

  const buildPutBody = useCallback((): Parameters<typeof putAiSettings>[0] => {
    const body: Parameters<typeof putAiSettings>[0] = {
      provider,
      openai_base_url: openaiBase.trim() || undefined,
      openai_model: openaiModel.trim() || undefined,
      gemini_model: geminiModel.trim() || undefined,
      ollama_base_url: ollamaBase.trim() || undefined,
      ollama_model: optionalTrim(ollamaModel),
    }
    if (openaiKey.trim()) body.openai_api_key = openaiKey.trim()
    if (geminiKey.trim()) body.gemini_api_key = geminiKey.trim()
    return body
  }, [
    provider,
    openaiBase,
    openaiModel,
    geminiModel,
    ollamaBase,
    ollamaModel,
    openaiKey,
    geminiKey,
  ])

  const buildTestBody = useCallback(() => buildPutBody(), [buildPutBody])

  const handleSave = useCallback(() => {
    setSaveMsg(null)
    setErr(null)
    setTestMsg(null)
    setSaving(true)
    void putAiSettings(buildPutBody())
      .then((d) => {
        applyDto(d)
        setSaveMsg('已儲存設定。')
        setOpenaiKey('')
        setGeminiKey('')
      })
      .catch((e) => {
        const raw = e instanceof Error ? e.message : '儲存失敗'
        setErr(/not\s*found/i.test(raw) ? '找不到後端 API（請確認後端已啟動）。' : raw)
      })
      .finally(() => setSaving(false))
  }, [buildPutBody, applyDto])

  const handleTest = useCallback(() => {
    setTestMsg(null)
    setTesting(true)
    void postAiTestConnection(buildTestBody())
      .then((r) => {
        setTestMsg({ ok: r.ok, text: r.message })
      })
      .catch((e) => {
        const raw = e instanceof Error ? e.message : '測試失敗'
        const m = /not\s*found/i.test(raw) ? '找不到後端 API（請確認後端已啟動）。' : raw
        setTestMsg({ ok: false, text: m })
      })
      .finally(() => setTesting(false))
  }, [buildTestBody])

  const mergedOllamaModels = useMemo(() => {
    const list = [...ollamaOptions]
    const m = ollamaModel.trim()
    if (m && !list.includes(m)) list.unshift(m)
    return list
  }, [ollamaOptions, ollamaModel])

  if (loading) {
    return (
      <main className="min-h-[50vh] bg-[#f4f4f5] px-4 py-10 dark:bg-zinc-950">
        <p className="mx-auto max-w-lg text-center text-sm text-zinc-500">載入設定中…</p>
      </main>
    )
  }

  return (
    <main className="min-h-0 bg-[#f4f4f5] px-4 py-8 dark:bg-zinc-950">
      <div className="mx-auto max-w-lg rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-900 sm:p-8">
        <header className="mb-8">
          <Link
            to="/practice"
            className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-zinc-500 transition hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
          >
            <IconChevronLeft className="opacity-80" />
            返回
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">AI 設定</h1>
          <p className="mt-2 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
            配置您的 AI 服務以使用句子解說功能
          </p>
        </header>

        {saveMsg && (
          <p className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100">
            {saveMsg}
          </p>
        )}
        {testMsg && (
          <p
            className={`mb-4 rounded-xl border px-3 py-2 text-sm ${
              testMsg.ok
                ? 'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100'
                : 'border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200'
            }`}
          >
            {testMsg.text}
          </p>
        )}
        {err && (
          <p className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
            {err}
          </p>
        )}

        <section className="mb-8">
          <h2 className="mb-3 text-sm font-semibold text-zinc-800 dark:text-zinc-200">選擇 AI 服務</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {PROVIDER_CARDS.map((c) => {
              const active = provider === c.id
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    setProvider(c.id)
                    setTestMsg(null)
                  }}
                  className={[
                    'rounded-xl border px-3 py-3 text-left transition',
                    active
                      ? 'border-zinc-800 bg-zinc-800 text-white shadow-md dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900'
                      : 'border-zinc-200 bg-zinc-50/80 hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800/50 dark:hover:border-zinc-500',
                  ].join(' ')}
                >
                  <div className="text-sm font-semibold">{c.title}</div>
                  <div
                    className={`mt-1 text-xs leading-snug ${active ? 'text-zinc-300 dark:text-zinc-600' : 'text-zinc-500 dark:text-zinc-400'}`}
                  >
                    {c.subtitle}
                  </div>
                </button>
              )
            })}
          </div>
        </section>

        <div className="space-y-6">
          {provider === 'openai' && (
            <section className="space-y-4">
              <p className="text-xs text-zinc-500">
                API Key 僅存本機{' '}
                <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">listen.db</code>，不會進前端打包。
              </p>
              <label className="block">
                <span className={LABEL_CLASS}>API Key</span>
                <input
                  type="password"
                  autoComplete="off"
                  className={INPUT_CLASS}
                  value={openaiKey}
                  onChange={(e) => setOpenaiKey(e.target.value)}
                  placeholder={
                    hasStoredOpenaiKey ? '留空則沿用已儲存金鑰' : 'sk-…'
                  }
                />
              </label>
              <label className="block">
                <span className={LABEL_CLASS}>API 基礎網址（選填）</span>
                <input
                  type="url"
                  className={INPUT_CLASS}
                  value={openaiBase}
                  onChange={(e) => setOpenaiBase(e.target.value)}
                  placeholder="https://api.openai.com/v1"
                />
              </label>
              <label className="block">
                <span className={LABEL_CLASS}>模型</span>
                <input
                  className={INPUT_CLASS}
                  value={openaiModel}
                  onChange={(e) => setOpenaiModel(e.target.value)}
                  placeholder="gpt-4o-mini"
                />
              </label>
            </section>
          )}

          {provider === 'gemini' && (
            <section className="space-y-4">
              <p className="text-xs text-zinc-500">
                金鑰請向{' '}
                <a
                  className="font-medium text-violet-600 underline dark:text-violet-400"
                  href="https://ai.google.dev/gemini-api/docs/quickstart"
                  target="_blank"
                  rel="noreferrer"
                >
                  Google AI Studio
                </a>{' '}
                取得；僅存本機資料庫。
              </p>
              <label className="block">
                <span className={LABEL_CLASS}>API Key</span>
                <input
                  type="password"
                  autoComplete="off"
                  className={INPUT_CLASS}
                  value={geminiKey}
                  onChange={(e) => setGeminiKey(e.target.value)}
                  placeholder={
                    hasStoredGeminiKey ? '留空則沿用已儲存金鑰' : '貼上 AI Studio 金鑰'
                  }
                />
              </label>
              <label className="block">
                <span className={LABEL_CLASS}>模型</span>
                <input
                  className={INPUT_CLASS}
                  value={geminiModel}
                  onChange={(e) => setGeminiModel(e.target.value)}
                  placeholder="gemini-2.0-flash"
                />
              </label>
            </section>
          )}

          {provider === 'ollama' && (
            <section className="space-y-4">
              <label className="block">
                <span className={LABEL_CLASS}>Ollama 服務地址</span>
                <input
                  type="url"
                  className={INPUT_CLASS}
                  value={ollamaBase}
                  onChange={(e) => setOllamaBase(e.target.value)}
                  placeholder="http://localhost:11434"
                />
              </label>

              <label className="block">
                <span className={LABEL_CLASS}>模型選擇</span>
                <div className="mt-1.5 flex flex-col gap-2 sm:flex-row sm:items-center">
                  {mergedOllamaModels.length > 0 ? (
                    <select
                      className={`${INPUT_CLASS} mt-0 flex-1 cursor-pointer sm:min-w-0`}
                      value={ollamaModel}
                      onChange={(e) => setOllamaModel(e.target.value)}
                      disabled={ollamaListLoading}
                    >
                      <option value="">
                        {ollamaListLoading ? '載入模型中…' : '選擇已安裝模型'}
                      </option>
                      {mergedOllamaModels.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      className={`${INPUT_CLASS} mt-0 flex-1`}
                      value={ollamaModel}
                      onChange={(e) => setOllamaModel(e.target.value)}
                      placeholder={
                        ollamaListLoading ? '載入中…' : '例如 llama3.2、qwen2.5'
                      }
                      disabled={ollamaListLoading}
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => void loadOllamaModels()}
                    className="shrink-0 rounded-xl border border-zinc-200 px-3 py-2 text-xs font-medium text-zinc-600 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  >
                    重新整理
                  </button>
                </div>
                {ollamaListErr && (
                  <p className="text-xs text-amber-700 dark:text-amber-400">{ollamaListErr}</p>
                )}
              </label>

              <p className="text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
                請確保 Ollama 已安裝並運行。前往{' '}
                <a className="font-medium text-zinc-700 underline dark:text-zinc-300" href={OLLAMA_DOC} target="_blank" rel="noreferrer">
                  Ollama 官網
                </a>{' '}
                了解更多。
              </p>
            </section>
          )}
        </div>

        <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:gap-3">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-zinc-900 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            <IconSave />
            {saving ? '儲存中…' : '儲存設定'}
          </button>
          <button
            type="button"
            onClick={handleTest}
            disabled={testing}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-zinc-100 px-4 py-3 text-sm font-semibold text-zinc-800 shadow-sm transition hover:bg-zinc-200/80 disabled:opacity-60 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
          >
            <IconFlask />
            {testing ? '測試中…' : '測試連線'}
          </button>
        </div>
      </div>
    </main>
  )
}

function optionalTrim(s: string): string | undefined {
  const t = s.trim()
  return t ? t : undefined
}
