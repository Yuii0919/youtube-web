"""
以 yt-dlp 下載自動字幕或影片檔。
"""

from __future__ import annotations

import tempfile
from pathlib import Path

import yt_dlp

from app.config import DOWNLOADS_DIR
from app.services.srt_ingest import pysrt_from_string, segments_from_pysrt


def download_auto_subs_srt(youtube_url: str, timeout: int = 120) -> list[dict]:
    """
    下載 YouTube 自動英文字幕並轉成 segments 字典列表；失敗拋出 RuntimeError。
    """
    with tempfile.TemporaryDirectory() as tmp:
        tmp_path = Path(tmp)
        outtmpl = str(tmp_path / "%(id)s")
        opts: dict = {
            "quiet": True,
            "no_warnings": True,
            "skip_download": True,
            "writesubtitles": True,
            "writeautomaticsub": True,
            "subtitleslangs": ["en"],
            "subtitlesformat": "srt",
            "outtmpl": outtmpl,
            "socket_timeout": timeout,
        }
        with yt_dlp.YoutubeDL(opts) as ydl:
            info = ydl.extract_info(youtube_url, download=True)
            vid = info.get("id") or "video"

        # 可能檔名：xxx.en.srt、xxx-en.srt、xxx.srt
        candidates = list(tmp_path.glob(f"{vid}*.srt")) + list(tmp_path.glob("*.srt"))
        if not candidates:
            raise RuntimeError("未取得字幕檔（此影片可能無英文自動字幕）。")

        srt_path = max(candidates, key=lambda p: p.stat().st_mtime)
        content = srt_path.read_text(encoding="utf-8", errors="replace")
        subs = pysrt_from_string(content)
        return segments_from_pysrt(subs)


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
