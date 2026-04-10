"""
FastAPI 應用程式進入點。
"""

from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class TranslateRequest(BaseModel):
    """翻譯請求本文。"""

    text: str = Field(min_length=1, description="要翻譯的文字")


class TranslateResponse(BaseModel):
    """翻譯結果。"""

    result: str


_FAKE_MAP: dict[str, str] = {
    "Hello": "你好",
    "World": "世界",
}


def _fake_translate(text: str) -> str:
    """假翻譯：Hello / World 對照，其餘原樣回傳。"""
    return _FAKE_MAP.get(text, text)


@app.get("/health")
def health() -> dict:
    """健康檢查；回傳服務狀態。"""
    return {"status": "ok"}


@app.post("/translate", response_model=TranslateResponse)
def translate(body: TranslateRequest) -> TranslateResponse:
    """假翻譯 API（未串接真實 AI）。"""
    return TranslateResponse(result=_fake_translate(body.text))
