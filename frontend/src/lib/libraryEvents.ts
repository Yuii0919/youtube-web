/**
 * 影片庫（列表／側邊欄）更新時廣播，供多元件重新載入。
 */
export function notifyLibraryUpdated(): void {
  window.dispatchEvent(new Event('listen-library-updated'))
}
