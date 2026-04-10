"""
以 yt-dlp 下載自動字幕或影片檔。
"""

from __future__ import annotations

import tempfile
from pathlib import Path

import yt_dlp

from app.config import DOWNLOADS_DIR
from app.services.srt_ingest import pysrt_from_string, segments_from_pysrt
from app.services.vtt_parse import segments_from_vtt


def _langs_from_info(info: dict | None) -> list[str]:
    """從 yt-dlp info 摘出可用字幕語言代碼。"""
    if not isinstance(info, dict):
        return []
    langs: set[str] = set()
    subs = info.get("subtitles")
    if isinstance(subs, dict):
        langs.update(str(k) for k in subs.keys())
    autos = info.get("automatic_captions")
    if isinstance(autos, dict):
        langs.update(str(k) for k in autos.keys())
    return sorted(langs)


def _pick_segments_from_temp(tmp_path: Path, vid: str | None) -> list[dict]:
    """從暫存目錄挑可解析字幕檔，優先 SRT，次選 VTT。"""
    key = vid or "video"
    candidates = list(tmp_path.glob(f"{key}*.srt")) + list(tmp_path.glob("*.srt"))
    if candidates:
        srt_path = max(candidates, key=lambda p: p.stat().st_mtime)
        content = srt_path.read_text(encoding="utf-8", errors="replace")
        subs = pysrt_from_string(content)
        return segments_from_pysrt(subs)

    vtt_candidates = list(tmp_path.glob(f"{key}*.vtt")) + list(tmp_path.glob("*.vtt"))
    if vtt_candidates:
        vtt_path = max(vtt_candidates, key=lambda p: p.stat().st_mtime)
        vtt_content = vtt_path.read_text(encoding="utf-8", errors="replace")
        rows = segments_from_vtt(vtt_content)
        if rows:
            return rows
    return []


def download_auto_subs_srt(youtube_url: str, timeout: int = 120) -> list[dict]:
    """
    下載 YouTube 自動英文字幕並轉成 segments 字典列表；失敗拋出 RuntimeError。
    """
    with tempfile.TemporaryDirectory() as tmp:
        tmp_path = Path(tmp)
        outtmpl = str(tmp_path / "%(id)s")
        base_opts: dict = {
            "quiet": True,
            "no_warnings": True,
            "skip_download": True,
            "writesubtitles": True,
            "writeautomaticsub": True,
            "subtitlesformat": "srt",
            "outtmpl": outtmpl,
            "socket_timeout": timeout,
        }
        info: dict | None = None
        vid: str | None = None

        # 先嘗試英文字幕（優先符合前端聽打場景）
        opts_en = {**base_opts, "subtitleslangs": ["en", "en-US", "en-GB", "en-orig", "en.*"]}
        with yt_dlp.YoutubeDL(opts_en) as ydl:
            info = ydl.extract_info(youtube_url, download=True)
            if isinstance(info, dict):
                vid = str(info.get("id") or "")
        rows = _pick_segments_from_temp(tmp_path, vid)
        if rows:
            return rows

        # 再嘗試「所有可用字幕」避免影片沒有英文字幕時直接失敗
        opts_all = {**base_opts, "allsubtitles": True, "subtitleslangs": ["all"]}
        with yt_dlp.YoutubeDL(opts_all) as ydl:
            info = ydl.extract_info(youtube_url, download=True)
            if isinstance(info, dict):
                vid = str(info.get("id") or vid or "")
        rows = _pick_segments_from_temp(tmp_path, vid)
        if rows:
            return rows

        langs = _langs_from_info(info)
        hint = f"可用語言：{', '.join(langs)}" if langs else "未回報可用語言"
        raise RuntimeError(f"未取得可解析字幕（{hint}）。")


def download_video_file(youtube_url: str, video_db_id: int, timeout: int = 600) -> tuple[str, str]:
    """
    下載影片至 DOWNLOADS_DIR，回傳 (絕對路徑, 說明訊息)。
    """
    DOWNLOADS_DIR.mkdir(parents=True, exist_ok=True)
    outtmpl = str(DOWNLOADS_DIR / f"{video_db_id}.%(ext)s")
    opts: dict = {
        "quiet": True,
        "no_warnings": True,
        "outtmpl": outtmpl,
        "format": "bv*+ba/b",
        "merge_output_format": "mp4",
        "socket_timeout": timeout,
    }
    with yt_dlp.YoutubeDL(opts) as ydl:
        ydl.download([youtube_url])

    # 找剛產生的檔案
    for ext in ("mp4", "webm", "mkv"):
        p = DOWNLOADS_DIR / f"{video_db_id}.{ext}"
        if p.is_file():
            return str(p.resolve()), "下載完成。"

    raise RuntimeError("下載完成但未找到輸出檔案。")
