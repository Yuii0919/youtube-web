"""
翻譯代理（對齊前端 POST /translate，body: { q }）。
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.schemas import TranslateIn, TranslateOut
from app.services.translate_svc import translate_en_to_zh

router = APIRouter(tags=["translate"])


@router.post("/translate", response_model=TranslateOut)
def translate(body: TranslateIn) -> TranslateOut:
    """英文句段翻成繁中。"""
    try:
        return TranslateOut(translated=translate_en_to_zh(body.q))
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e) or "翻譯失敗") from e
