"""
FastAPI 應用程式進入點：掛載路由與 CORS。
"""

from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import init_db
from app.routers import ai, folders, health, translate, videos


@asynccontextmanager
async def lifespan(app: FastAPI):
    """啟動時建立資料表與預設列。"""
    init_db()
    yield


app = FastAPI(
    title="YouTube 聽打練習 API",
    description="影片庫、字幕、翻譯與 AI 解說後端",
    lifespan=lifespan,
)


@app.get("/folders")
def get_folders() -> list:
    """Render 連線測試用：固定回傳空陣列。"""
    return []


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(translate.router)
app.include_router(folders.router)
app.include_router(videos.router)
app.include_router(ai.router)
