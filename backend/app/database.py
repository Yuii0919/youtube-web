"""
SQLAlchemy 引擎、Session 與 Base。
"""

from __future__ import annotations

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.config import DATABASE_URL, ensure_directories


class Base(DeclarativeBase):
    """ORM 宣告式基底類別。"""


ensure_directories()
engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False},
    echo=False,
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def init_db() -> None:
    """建立資料表（若尚未存在），並初始化 AI 設定單例列。"""
    from app import models  # noqa: F401 — 註冊模型
    from app.models import AiSetting

    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        if db.get(AiSetting, 1) is None:
            db.add(AiSetting(id=1))
            db.commit()
