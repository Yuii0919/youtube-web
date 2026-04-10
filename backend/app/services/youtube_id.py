"""
自 URL 或純 ID 解析 YouTube video id。
"""

from __future__ import annotations

import re
from urllib.parse import parse_qs, urlparse

_ID_RE = re.compile(r"^[a-zA-Z0-9_-]{11}$")


def extract_youtube_video_id(raw: str) -> str | None:
    """
    從完整網址、短網址或 11 字元 id 取得 video id；失敗則回傳 None。
    """
    s = raw.strip()
    if not s:
        return None
    if _ID_RE.fullmatch(s):
        return s

    if s.startswith("//"):
        s = "https:" + s
    elif not re.match(r"^[a-zA-Z][a-zA-Z0-9+.-]*://", s):
        s = "https://" + s

    try:
        u = urlparse(s)
    except ValueError:
        return None

    host = (u.netloc or "").lower()
    path = u.path or ""

    if "youtu.be" in host:
        part = path.strip("/").split("/")[0] if path else ""
        return part if part and _ID_RE.fullmatch(part) else None

    if "youtube.com" in host or "youtube-nocookie.com" in host:
        if path.startswith("/watch"):
            q = parse_qs(u.query)
            v = q.get("v", [None])[0]
            return v if v and _ID_RE.fullmatch(v) else None
        if path.startswith("/shorts/") or path.startswith("/embed/") or path.startswith("/live/"):
            part = path.strip("/").split("/")[1] if len(path.strip("/").split("/")) > 1 else ""
            return part if part and _ID_RE.fullmatch(part) else None

    return None


def canonical_watch_url(video_id: str) -> str:
    """標準 watch 網址。"""
    return f"https://www.youtube.com/watch?v={video_id}"
