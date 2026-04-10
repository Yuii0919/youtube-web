"""
FastAPI 依賴注入。
"""

from __future__ import annotations

from collections.abc import Generator

from sqlalchemy.orm import Session

from app.database import SessionLocal


def get_db() -> Generator[Session, None, None]:
    """提供資料庫 Session，請求結束後關閉。"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
