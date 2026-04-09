/**
 * 聽打用：單一字元槽位（僅英文字母需使用者輸入）。
 */
export type ClozeChar =
  | { kind: 'letter'; char: string; lower: string }
  | { kind: 'other'; char: string }

/**
 * 將字幕句拆成逐字元槽位；標點與空白不挖空。
 */
export function buildClozeChars(text: string): ClozeChar[] {
  const chars: ClozeChar[] = []
  for (const ch of text) {
    if (/[A-Za-z]/.test(ch)) {
      chars.push({
        kind: 'letter',
        char: ch,
        lower: ch.toLowerCase(),
      })
    } else {
      chars.push({ kind: 'other', char: ch })
    }
  }
  return chars
}

/**
 * 取得需填寫的字母數量。
 */
export function countLetters(chars: ClozeChar[]): number {
  return chars.filter((c) => c.kind === 'letter').length
}
