"""
健康檢查與根路徑。
"""

from __future__ import annotations

from fastapi import APIRouter

from app.schemas import HealthOut

router = APIRouter(tags=["meta"])


@router.get("/health", response_model=HealthOut)
def health() -> HealthOut:
    """服務存活檢查。"""
    return HealthOut(status="ok")


@router.get("/")
def root() -> dict:
    """根路徑。"""
    return {"msg": "API is running"}
