"""
FastAPI 應用程式進入點。
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    """根路徑：確認 API 已啟動。"""
    return {"msg": "API is running"}


class TranslateRequest(BaseModel):
    """翻譯請求。"""

    text: str


@app.post("/translate")
def translate(req: TranslateRequest):
    """假翻譯：Hello / World 對照，其餘回傳原文。"""
    if req.text == "Hello":
        return {"result": "你好"}
    elif req.text == "World":
        return {"result": "世界"}
    else:
        return {"result": req.text}


@app.get("/health")
def health():
    """健康檢查。"""
    return {"status": "ok"}
