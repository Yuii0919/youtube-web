"""
執行時設定：資料目錄、資料庫路徑、下載目錄。
"""

from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv

BACKEND_ROOT = Path(__file__).resolve().parent.parent
load_dotenv(BACKEND_ROOT / ".env")

DATA_DIR = Path(os.getenv("LISTEN_DATA_DIR", str(BACKEND_ROOT / "data")))
DOWNLOADS_DIR = Path(os.getenv("LISTEN_DOWNLOADS_DIR", str(BACKEND_ROOT / "downloads")))

DB_PATH = DATA_DIR / "listen.db"
DATABASE_URL = f"sqlite:///{DB_PATH.resolve().as_posix()}"


def ensure_directories() -> None:
    """建立資料與下載目錄（若不存在）。"""
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    DOWNLOADS_DIR.mkdir(parents=True, exist_ok=True)
