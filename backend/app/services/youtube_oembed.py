"""
YouTube oEmbed（標題、頻道、縮圖）。
"""

from __future__ import annotations

from urllib.parse import quote

import httpx


def fetch_oembed_sync(watch_url: str, timeout: float = 15.0) -> dict:
    """
    同步取得 oEmbed JSON；失敗時拋出 httpx.HTTPError 或 ValueError。
    """
    api = "https://www.youtube.com/oembed?format=json&url=" + quote(watch_url, safe="")
    with httpx.Client(timeout=timeout) as client:
        r = client.get(api)
        r.raise_for_status()
        return r.json()
