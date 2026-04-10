"""
SRT 解析為分段資料。
"""

from __future__ import annotations

import re

import pysrt


def letter_template_from_en(text_en: str) -> str:
    """將英文字母替成底線，供前端聽打範本。"""
    return re.sub(r"[A-Za-z]", "_", text_en)


def pysrt_from_string(content: str) -> pysrt.SubRipFile:
    """由 UTF-8 字串建立 SubRipFile。"""
    return pysrt.from_string(content)


def segments_from_pysrt(subs: pysrt.SubRipFile) -> list[dict]:
    """
    轉成寫入 DB 用的 dict 列表：index, start_time, end_time, text_en, text_zh, letter_template。
    """
    out: list[dict] = []
    for i, sub in enumerate(subs):
        text = sub.text.replace("\r\n", "\n").replace("\r", "\n")
        lines = [ln.strip() for ln in text.split("\n") if ln.strip()]
        text_en = " ".join(lines) if lines else ""
        out.append(
            {
                "index": i,
                "start_time": sub.start.ordinal / 1000.0,
                "end_time": sub.end.ordinal / 1000.0,
                "text_en": text_en,
                "text_zh": "",
                "letter_template": letter_template_from_en(text_en),
            }
        )
    return out
