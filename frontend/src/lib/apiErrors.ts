const GATEWAY_HINT =
  '無法連上後端 API。若為本機開發，請在專案目錄啟動 backend（預設監聽 http://127.0.0.1:8000），並保持 `npm run dev` 的 Vite 代理指向該位址。若仍出現 502，代表代理有轉發但上游未回應或已崩潰，請查看執行後端的終端機日誌。'

function rawMessage(err: unknown, fallback: string): string {
  if (typeof err === 'string') return err
  if (err instanceof Error) return err.message
  return fallback
}

/**
 * 將 fetch／API 拋出的錯誤轉成使用者可讀的繁中文說明（連線、502、閘道等）。
 */
export function toFriendlyApiError(err: unknown, fallback: string): string {
  const raw = rawMessage(err, fallback).trim()
  if (!raw) return fallback
  const lower = raw.toLowerCase()

  const looksLikeHttp5xx = /^http\s*5\d{2}\b/i.test(raw)

  if (
    looksLikeHttp5xx ||
    lower.includes('bad gateway') ||
    lower.includes('gateway timeout') ||
    lower.includes('502') ||
    lower.includes('503') ||
    lower.includes('504') ||
    lower.includes('folders 502') ||
    lower.includes('videos 502') ||
    lower.includes('failed to fetch') ||
    lower.includes('networkerror') ||
    lower.includes('econnrefused') ||
    lower.includes('load failed')
  ) {
    return GATEWAY_HINT
  }
  return raw || fallback
}
