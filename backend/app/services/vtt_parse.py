"""
將 WebVTT 字幕解析成與 SRT 相同的 segments 結構。
"""

from __future__ import annotations

import re

from app.services.srt_ingest import letter_template_from_en

_TS = re.compile(
    r"(?P<s_h>\d{2}):(?P<s_m>\d{2}):(?P<s_s>\d{2})\.(?P<s_ms>\d{3})\s*-->\s*"
    r"(?P<e_h>\d{2}):(?P<e_m>\d{2}):(?P<e_s>\d{2})\.(?P<e_ms>\d{3})"
)


def _to_sec(h: str, m: str, s: str, ms: str) -> float:
    """時間字串轉秒數。"""
    return int(h) * 3600 + int(m) * 60 + int(s) + int(ms) / 1000.0


def segments_from_vtt(content: str) -> list[dict]:
    """
    解析 WebVTT 內容並轉成 segments 列表。

    Args:
        content: VTT 原始文字內容。
    """
    lines = content.replace("\r\n", "\n").replace("\r", "\n").split("\n")
    rows: list[dict] = []
    i = 0
    idx = 0
    while i < len(lines):
        line = lines[i].strip()
        m = _TS.search(line)
        if not m:
            i += 1
            continue

        start = _to_sec(m.group("s_h"), m.group("s_m"), m.group("s_s"), m.group("s_ms"))
        end = _to_sec(m.group("e_h"), m.group("e_m"), m.group("e_s"), m.group("e_ms"))
        i += 1
        text_lines: list[str] = []
        while i < len(lines) and lines[i].strip():
            t = lines[i].strip()
            # 忽略 metadata 或 cue setting 內容
            if not t.startswith("NOTE"):
                text_lines.append(t)
            i += 1
        text = re.sub(r"<[^>]+>", "", " ".join(text_lines)).strip()
        if text:
            idx += 1
            rows.append(
                {
                    "index": idx,
                    "start_time": start,
                    "end_time": end,
                    "text_en": text,
                    "text_zh": "",
                    "letter_template": letter_template_from_en(text),
                }
            )
    return rows
