import { BrowserRouter, Link, Navigate, Route, Routes } from 'react-router-dom'
import { HistorySidebar } from './components/HistorySidebar'
import { HomePage } from './pages/HomePage'
import { PracticePage } from './pages/PracticePage'
import { SettingsPage } from './pages/SettingsPage'

/**
 * 應用程式路由與共用頁首。
 */
function App() {
  return (
    <BrowserRouter>
      <div className="flex min-h-screen flex-1 flex-col bg-[#f5f6f8] text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
        <header className="border-b border-zinc-200/80 bg-white/95 px-4 py-3 backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/90">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-lg font-semibold tracking-tight md:text-xl">
                YouTube 聽打練習
              </h1>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                匯入影片、上傳字幕、逐句聽打與 AI 解說
              </p>
            </div>
            <nav className="flex shrink-0 gap-2 text-sm font-medium">
              <Link
                to="/"
                className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
              >
                首頁
              </Link>
              <Link
                to="/practice"
                className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
              >
                聽打練習
              </Link>
              <Link
                to="/settings"
                className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
              >
                設定
              </Link>
            </nav>
          </div>
        </header>

        <div className="flex min-h-0 flex-1 flex-col md:flex-row">
          <HistorySidebar />
          <div className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/practice" element={<PracticePage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="*" element={<Navigate to="/practice" replace />} />
            </Routes>
          </div>
        </div>
      </div>
    </BrowserRouter>
  )
}

export default App

<h1>測試成功123</h1>