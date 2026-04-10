import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  deleteFolder,
  getFolders,
  getVideos,
  patchFolder,
  postFolder,
  type VideoFolderItem,
  type VideoListItem,
} from '../services/api'
import { toFriendlyApiError } from '../lib/apiErrors'
import { notifyLibraryUpdated } from '../lib/libraryEvents'

const STORAGE_EXPANDED = 'listen-sidebar-expanded'

/** 側欄收合／展開：細線左箭頭 */
function IconChevronLeft({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="16"
      height="16"
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

/** 側欄收合／展開：細線右箭頭 */
function IconChevronRight({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M9 18l6-6-6-6" />
    </svg>
  )
}

/** 資料夾列摺疊：右向雙角，展開時旋轉向下 */
function IconDisclosure({ open, className }: { open: boolean; className?: string }) {
  return (
    <svg
      className={`transition-transform duration-200 ${open ? 'rotate-90' : ''} ${className ?? ''}`.trim()}
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M9 18l6-6-6-6" />
    </svg>
  )
}

/**
 * 可收合的歷史側邊欄：資料夾與影片清單，與首頁 URL 篩選同步。
 */
export function HistorySidebar() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const [expanded, setExpanded] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_EXPANDED) !== '0'
    } catch {
      return true
    }
  })
  const [mobileOpen, setMobileOpen] = useState(false)
  const [folderRowsOpen, setFolderRowsOpen] = useState<Record<number, boolean>>({})
  const [folders, setFolders] = useState<VideoFolderItem[]>([])
  const [videos, setVideos] = useState<VideoListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [tick, setTick] = useState(0)
  const [newFolderOpen, setNewFolderOpen] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [newFolderSaving, setNewFolderSaving] = useState(false)
  const [newFolderError, setNewFolderError] = useState<string | null>(null)
  const newFolderInputRef = useRef<HTMLInputElement>(null)

  const persistExpanded = useCallback((next: boolean) => {
    setExpanded(next)
    try {
      localStorage.setItem(STORAGE_EXPANDED, next ? '1' : '0')
    } catch {
      /* ignore */
    }
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [f, v] = await Promise.all([getFolders(), getVideos()])
      setFolders(f)
      setVideos(v)
      setFolderRowsOpen((prev) => {
        const next = { ...prev }
        for (const row of f) {
          if (next[row.id] === undefined) next[row.id] = true
        }
        return next
      })
    } catch {
      setFolders([])
      setVideos([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load, tick])

  useEffect(() => {
    const onLib = () => setTick((t) => t + 1)
    window.addEventListener('listen-library-updated', onLib)
    return () => window.removeEventListener('listen-library-updated', onLib)
  }, [])

  useEffect(() => {
    if (!newFolderOpen) return
    setNewFolderError(null)
    const id = requestAnimationFrame(() => {
      newFolderInputRef.current?.focus()
    })
    return () => cancelAnimationFrame(id)
  }, [newFolderOpen])

  const uncategorizedParam = searchParams.get('uncategorized') === '1'
  const folderIdRaw = searchParams.get('folderId')
  const activeFolderId =
    folderIdRaw && /^\d+$/.test(folderIdRaw) ? Number(folderIdRaw) : null
  const allActive = !uncategorizedParam && activeFolderId === null

  const videosByFolder = (fid: number) =>
    videos.filter((v) => v.folder_id === fid)
  const uncategorizedVideos = videos.filter((v) => v.folder_id === null)

  const goAll = () => {
    navigate({ pathname: '/', search: '' })
    setMobileOpen(false)
  }
  const goUncategorized = () => {
    navigate({ pathname: '/', search: '?uncategorized=1' })
    setMobileOpen(false)
  }
  const goFolder = (id: number) => {
    navigate({ pathname: '/', search: `?folderId=${id}` })
    setMobileOpen(false)
  }

  const toggleFolderRow = (id: number) => {
    setFolderRowsOpen((p) => ({ ...p, [id]: !p[id] }))
  }

  const openNewFolderForm = () => {
    setNewFolderName('')
    setNewFolderError(null)
    setNewFolderOpen(true)
  }

  const cancelNewFolder = () => {
    setNewFolderOpen(false)
    setNewFolderName('')
    setNewFolderError(null)
  }

  /**
   * 以側欄內嵌表單新增資料夾（避免依賴 window.prompt，在內嵌瀏覽器／自動化環境常無法使用）。
   */
  const submitNewFolder = async () => {
    const name = newFolderName.trim()
    if (!name) {
      setNewFolderError('請輸入資料夾名稱')
      return
    }
    setNewFolderSaving(true)
    setNewFolderError(null)
    try {
      await postFolder(name)
      notifyLibraryUpdated()
      cancelNewFolder()
    } catch (e) {
      setNewFolderError(toFriendlyApiError(e, '新增失敗'))
    } finally {
      setNewFolderSaving(false)
    }
  }

  const handleRenameFolder = async (id: number, current: string) => {
    const name = window.prompt('重新命名', current)
    if (!name?.trim()) return
    try {
      await patchFolder(id, name)
      notifyLibraryUpdated()
    } catch (e) {
      window.alert(e instanceof Error ? e.message : '更新失敗')
    }
  }

  const handleDeleteFolder = async (id: number, name: string) => {
    if (!window.confirm(`刪除資料夾「${name}」？旗下影片將改為未分類。`)) return
    try {
      await deleteFolder(id)
      notifyLibraryUpdated()
      if (activeFolderId === id) goAll()
    } catch (e) {
      window.alert(e instanceof Error ? e.message : '刪除失敗')
    }
  }

  const inner = (
    <div className="pointer-events-auto flex h-full min-h-0 flex-col bg-white/95 dark:bg-zinc-900">
      <div className="flex shrink-0 items-center justify-between gap-1 border-b border-zinc-100 px-2 py-2 dark:border-zinc-700">
        {expanded && (
          <span className="truncate pl-1 text-xs font-semibold text-zinc-600 dark:text-zinc-300">
            影片紀錄
          </span>
        )}
        <button
          type="button"
          aria-expanded={expanded}
          onClick={() => persistExpanded(!expanded)}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
          title={expanded ? '收合側欄' : '展開側欄'}
        >
          {expanded ? <IconChevronLeft /> : <IconChevronRight />}
        </button>
      </div>

      {expanded ? (
        <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
          {loading ? (
            <p className="px-1 text-left text-xs text-zinc-500">載入中…</p>
          ) : (
            <nav className="flex flex-col gap-1 text-left text-sm">
            <button
              type="button"
              onClick={goAll}
              className={`rounded-lg px-2 py-1.5 text-left font-medium ${
                allActive
                  ? 'bg-violet-100 text-violet-900 dark:bg-violet-950/60 dark:text-violet-100'
                  : 'text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800'
              }`}
            >
              全部影片
            </button>
            <button
              type="button"
              onClick={goUncategorized}
              className={`rounded-lg px-2 py-1.5 text-left ${
                uncategorizedParam
                  ? 'bg-violet-100 text-violet-900 dark:bg-violet-950/60 dark:text-violet-100'
                  : 'text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800'
              }`}
            >
              未分類
              <span className="ml-1 text-xs text-zinc-500">({uncategorizedVideos.length})</span>
            </button>

            {folders.map((f) => {
              const list = videosByFolder(f.id)
              const open = folderRowsOpen[f.id] !== false
              const folderHighlighted = activeFolderId === f.id
              return (
                <div key={f.id} className="rounded-lg border border-zinc-100 dark:border-zinc-800">
                  <div className="flex items-center gap-0.5">
                    <button
                      type="button"
                      onClick={() => toggleFolderRow(f.id)}
                      className="flex h-8 w-7 shrink-0 items-center justify-center rounded text-zinc-400 hover:bg-zinc-50 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
                      aria-label={open ? '摺疊' : '展開'}
                    >
                      <IconDisclosure open={open} />
                    </button>
                    <button
                      type="button"
                      onClick={() => goFolder(f.id)}
                      className={`min-w-0 flex-1 truncate rounded-lg px-1 py-1.5 text-left ${
                        folderHighlighted
                          ? 'bg-violet-100 font-medium text-violet-900 dark:bg-violet-950/60 dark:text-violet-100'
                          : 'text-zinc-800 hover:bg-zinc-50 dark:text-zinc-100 dark:hover:bg-zinc-800'
                      }`}
                    >
                      {f.name}
                      <span className="ml-1 text-xs font-normal text-zinc-500">({list.length})</span>
                    </button>
                    <button
                      type="button"
                      className="shrink-0 rounded px-1 py-1 text-xs text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                      title="重新命名"
                      onClick={() => void handleRenameFolder(f.id, f.name)}
                    >
                      ✎
                    </button>
                    <button
                      type="button"
                      className="shrink-0 rounded px-1 py-1 text-xs text-zinc-400 hover:text-red-600"
                      title="刪除資料夾"
                      onClick={() => void handleDeleteFolder(f.id, f.name)}
                    >
                      ×
                    </button>
                  </div>
                  {open && (
                    <ul className="max-h-40 overflow-y-auto border-t border-zinc-50 dark:border-zinc-800">
                      {list.length === 0 ? (
                        <li className="px-3 py-1.5 text-xs text-zinc-400">（尚無影片）</li>
                      ) : (
                        list.map((v) => (
                          <li key={v.id}>
                            <Link
                              to={`/practice?libraryId=${v.id}`}
                              className="block truncate px-3 py-1.5 text-xs text-zinc-600 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800/80"
                              onClick={() => setMobileOpen(false)}
                            >
                              {v.title || v.youtube_id}
                            </Link>
                          </li>
                        ))
                      )}
                    </ul>
                  )}
                </div>
              )
            })}
            </nav>
          )}
        </div>
      ) : null}

      {expanded && (
        <div className="shrink-0 border-t border-zinc-200 p-2 dark:border-zinc-700">
          {newFolderOpen ? (
            <form
              className="flex flex-col gap-2"
              onSubmit={(e) => {
                e.preventDefault()
                void submitNewFolder()
              }}
            >
              <label htmlFor="sidebar-new-folder-name" className="sr-only">
                新資料夾名稱
              </label>
              <input
                ref={newFolderInputRef}
                id="sidebar-new-folder-name"
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') cancelNewFolder()
                }}
                placeholder="資料夾名稱"
                disabled={newFolderSaving}
                autoComplete="off"
                className="w-full rounded-lg border border-zinc-300 bg-white px-2 py-1.5 text-xs text-zinc-900 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-400 disabled:opacity-60 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:ring-violet-600"
              />
              {newFolderError ? (
                <p className="break-words text-left text-xs leading-snug text-red-600 dark:text-red-400">
                  {newFolderError}
                </p>
              ) : null}
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={newFolderSaving}
                  className="flex-1 rounded-lg bg-violet-600 px-2 py-1.5 text-xs font-semibold text-white hover:bg-violet-700 disabled:opacity-50 dark:bg-violet-500 dark:hover:bg-violet-400"
                >
                  {newFolderSaving ? '建立中…' : '建立'}
                </button>
                <button
                  type="button"
                  disabled={newFolderSaving}
                  onClick={cancelNewFolder}
                  className="rounded-lg border border-zinc-300 bg-white px-2 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:bg-zinc-800"
                >
                  取消
                </button>
              </div>
            </form>
          ) : (
            <button
              type="button"
              onClick={openNewFolderForm}
              className="w-full rounded-lg border border-dashed border-violet-300 bg-violet-50/50 px-2 py-2 text-xs font-medium text-violet-800 hover:bg-violet-100 dark:border-violet-800 dark:bg-violet-950/30 dark:text-violet-200 dark:hover:bg-violet-950/50"
            >
              ＋ 新增資料夾
            </button>
          )}
        </div>
      )}
    </div>
  )

  return (
    <div className="pointer-events-none relative w-0 shrink-0 overflow-visible bg-white dark:bg-zinc-900 md:flex md:h-full md:w-auto md:shrink-0 md:flex-col">
      <button
        type="button"
        className="pointer-events-auto fixed bottom-4 left-4 z-40 flex h-11 w-11 items-center justify-center rounded-full bg-violet-600 text-white shadow-lg md:hidden"
        onClick={() => setMobileOpen(true)}
        aria-label="開啟影片紀錄"
      >
        ☰
      </button>
      {mobileOpen && (
        <button
          type="button"
          className="pointer-events-auto fixed inset-0 z-30 bg-black/40 md:hidden"
          aria-label="關閉選單"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <aside
        className={[
          'pointer-events-auto z-40 shrink-0 flex-col border-r border-zinc-200/80 bg-white transition-[width] dark:border-zinc-800 dark:bg-zinc-900',
          expanded ? 'md:w-64 lg:w-72' : 'md:w-11',
          mobileOpen
            ? 'fixed inset-y-0 left-0 flex w-[min(18rem,90vw)] max-w-[90vw] shadow-xl md:relative md:inset-auto md:z-auto md:flex md:max-w-none md:shadow-none'
            : 'hidden md:flex',
        ].join(' ')}
      >
        {inner}
      </aside>
    </div>
  )
}
