"""
FastAPI 應用程式進入點。
"""

from fastapi import FastAPI

app = FastAPI()


@app.get("/health")
def health() -> dict:
    """健康檢查；回傳服務狀態。"""
    return {"status": "ok"}
