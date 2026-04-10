"""
AI 解說設定與代理呼叫。
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.deps import get_db
from app.models import AiSetting
from app.schemas import (
    AiExplainOut,
    AiSettingsDto,
    PostAiExplainBody,
    PutAiSettingsBody,
    TestConnectionResult,
)
from app.services import ai_svc

router = APIRouter(prefix="/ai", tags=["ai"])


def _get_settings_row(db: Session) -> AiSetting:
    row = db.get(AiSetting, 1)
    if row is None:
        row = AiSetting(id=1)
        db.add(row)
        db.commit()
        db.refresh(row)
    return row


@router.get("/settings", response_model=AiSettingsDto)
def get_settings(db: Session = Depends(get_db)) -> AiSettingsDto:
    """讀取 AI 設定（金鑰已遮罩）。"""
    row = _get_settings_row(db)
    return ai_svc.settings_to_dto(row)


@router.put("/settings", response_model=AiSettingsDto)
def put_settings(body: PutAiSettingsBody, db: Session = Depends(get_db)) -> AiSettingsDto:
    """更新 AI 設定。"""
    row = _get_settings_row(db)
    ai_svc.apply_put_settings(db, row, body)
    db.commit()
    db.refresh(row)
    return ai_svc.settings_to_dto(row)


@router.get("/ollama/models")
async def ollama_models(
    base_url: str | None = None,
    db: Session = Depends(get_db),
) -> dict:
    """列出 Ollama 模型。"""
    row = _get_settings_row(db)
    url = (base_url or row.ollama_base_url or "http://127.0.0.1:11434").strip()
    try:
        names = await ai_svc.list_ollama_models(url)
        return {"models": names}
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e) or "無法取得模型列表") from e


@router.post("/test-connection", response_model=TestConnectionResult)
async def test_connection(
    body: PutAiSettingsBody,
    db: Session = Depends(get_db),
) -> TestConnectionResult:
    """測試連線。"""
    row = _get_settings_row(db)
    return await ai_svc.test_connection(db, row, body)


@router.post("/explain", response_model=AiExplainOut)
async def explain(
    body: PostAiExplainBody,
    db: Session = Depends(get_db),
) -> AiExplainOut:
    """產生繁中解說。"""
    row = _get_settings_row(db)
    try:
        text = await ai_svc.explain_sentence(
            db,
            row,
            body.sentence_en,
            body.full_sentence_zh,
        )
        return AiExplainOut(explanation=text)
    except RuntimeError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e) or "解說請求失敗") from e
