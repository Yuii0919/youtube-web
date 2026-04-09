import { postTranslate } from '../services/api'

const cache = new Map<string, string>()

/**
 * 呼叫後端翻譯代理，並以原文為鍵做記憶體快取。
 */
export async function translateToZh(text: string): Promise<string> {
  const key = text.trim()
  if (!key) return ''
  const hit = cache.get(key)
  if (hit !== undefined) return hit

  const { translated } = await postTranslate(key)
  cache.set(key, translated)
  return translated
}

export function clearTranslationCache(): void {
  cache.clear()
}
