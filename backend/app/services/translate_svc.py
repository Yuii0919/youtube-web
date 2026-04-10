"""
後端翻譯（Google 免費管道，經 deep-translator）。
"""

from __future__ import annotations

from deep_translator import GoogleTranslator


def translate_en_to_zh(text: str) -> str:
    """
    將英文句段翻成繁體中文；失敗時拋出例外。
    """
    t = text.strip()
    if not t:
        return ""
    tr = GoogleTranslator(source="en", target="zh-TW")
    return tr.translate(t)
