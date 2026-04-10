"""
AI 解說：設定遮罩、連線測試、LLM 呼叫。
"""

from __future__ import annotations

from datetime import datetime, timezone

import httpx
from sqlalchemy.orm import Session

from app.models import AiSetting
from app.schemas import AiSettingsDto, PutAiSettingsBody, TestConnectionResult


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def mask_key(key: str | None) -> tuple[str, bool]:
    """回傳 (遮罩字串, 是否已設定金鑰)。"""
    if not key or not key.strip():
        return "", False
    k = key.strip()
    if len(k) <= 4:
        return "****", True
    return f"****{k[-4:]}", True


def settings_to_dto(row: AiSetting) -> AiSettingsDto:
    """ORM 列轉前端 DTO。"""
    om, ho = mask_key(row.openai_api_key)
    gm, hg = mask_key(row.gemini_api_key)
    return AiSettingsDto(
        provider=row.provider or "openai",
        openai_base_url=row.openai_base_url or "https://api.openai.com/v1",
        openai_model=row.openai_model or "gpt-4o-mini",
        openai_key_masked=om,
        has_openai_key=ho,
        gemini_model=row.gemini_model or "gemini-1.5-flash",
        gemini_key_masked=gm,
        has_gemini_key=hg,
        ollama_base_url=row.ollama_base_url or "http://127.0.0.1:11434",
        ollama_model=row.ollama_model or "llama3.2",
        updated_at=row.updated_at,
    )


def apply_put_settings(db: Session, row: AiSetting, body: PutAiSettingsBody) -> None:
    """合併更新設定列。"""
    if body.provider is not None:
        row.provider = body.provider
    if body.openai_base_url is not None:
        row.openai_base_url = body.openai_base_url.strip() or row.openai_base_url
    if body.openai_model is not None:
        row.openai_model = body.openai_model.strip() or row.openai_model
    if body.openai_api_key is not None and body.openai_api_key.strip():
        row.openai_api_key = body.openai_api_key.strip()
    if body.gemini_model is not None:
        row.gemini_model = body.gemini_model.strip() or row.gemini_model
    if body.gemini_api_key is not None and body.gemini_api_key.strip():
        row.gemini_api_key = body.gemini_api_key.strip()
    if body.ollama_base_url is not None:
        row.ollama_base_url = body.ollama_base_url.strip() or row.ollama_base_url
    if body.ollama_model is not None:
        row.ollama_model = body.ollama_model.strip() or row.ollama_model
    row.updated_at = _utcnow()


async def list_ollama_models(base_url: str) -> list[str]:
    """GET /api/tags。"""
    url = base_url.rstrip("/") + "/api/tags"
    async with httpx.AsyncClient(timeout=20.0) as client:
        r = await client.get(url)
        r.raise_for_status()
        data = r.json()
    models = data.get("models") or []
    names: list[str] = []
    for m in models:
        if isinstance(m, dict) and isinstance(m.get("name"), str):
            names.append(m["name"])
    return names


async def test_connection(db: Session, row: AiSetting, body: PutAiSettingsBody) -> TestConnectionResult:
    """依 provider 做簡單連線測試。"""
    prov = (body.provider or row.provider or "openai").lower()
    if prov == "ollama":
        base = (body.ollama_base_url or row.ollama_base_url or "").rstrip("/")
        try:
            await list_ollama_models(base or "http://127.0.0.1:11434")
            return TestConnectionResult(ok=True, message="Ollama 可連線。")
        except Exception as e:
            return TestConnectionResult(ok=False, message=str(e) or "Ollama 連線失敗。")

    if prov == "openai":
        base = (body.openai_base_url or row.openai_base_url or "https://api.openai.com/v1").rstrip("/")
        key = (body.openai_api_key or row.openai_api_key or "").strip()
        if not key:
            return TestConnectionResult(ok=False, message="未設定 OpenAI API Key。")
        model = body.openai_model or row.openai_model or "gpt-4o-mini"
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                r = await client.post(
                    f"{base}/chat/completions",
                    headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
                    json={"model": model, "messages": [{"role": "user", "content": "ping"}], "max_tokens": 5},
                )
            if r.status_code >= 400:
                return TestConnectionResult(ok=False, message=r.text[:500] or f"HTTP {r.status_code}")
            return TestConnectionResult(ok=True, message="OpenAI 相容 API 可連線。")
        except Exception as e:
            return TestConnectionResult(ok=False, message=str(e) or "連線失敗。")

    if prov == "gemini":
        key = (body.gemini_api_key or row.gemini_api_key or "").strip()
        if not key:
            return TestConnectionResult(ok=False, message="未設定 Gemini API Key。")
        model = body.gemini_model or row.gemini_model or "gemini-1.5-flash"
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={key}"
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                r = await client.post(url, json={"contents": [{"parts": [{"text": "ping"}]}]})
            if r.status_code >= 400:
                return TestConnectionResult(ok=False, message=r.text[:500] or f"HTTP {r.status_code}")
            return TestConnectionResult(ok=True, message="Gemini API 可連線。")
        except Exception as e:
            return TestConnectionResult(ok=False, message=str(e) or "連線失敗。")

    return TestConnectionResult(ok=False, message=f"未知 provider：{prov}")


def _build_explain_prompt(sentence_en: str, full_zh: str | None) -> str:
    zh = (full_zh or "").strip()
    if zh:
        return (
            "請用繁體中文簡短解說以下英文句在語意、用法或片語上的重點（約 2～5 句），"
            f"並可參考整句中文翻譯：「{zh}」。\n\n英文：{sentence_en}"
        )
    return (
        "請用繁體中文簡短解說以下英文句在語意、用法或片語上的重點（約 2～5 句）。\n\n"
        f"英文：{sentence_en}"
    )


async def explain_sentence(db: Session, row: AiSetting, sentence_en: str, full_zh: str | None) -> str:
    """呼叫已設定的 LLM 產生解說文字。"""
    prov = (row.provider or "openai").lower()
    prompt = _build_explain_prompt(sentence_en, full_zh)

    if prov == "ollama":
        base = (row.ollama_base_url or "http://127.0.0.1:11434").rstrip("/")
        model = row.ollama_model or "llama3.2"
        async with httpx.AsyncClient(timeout=120.0) as client:
            r = await client.post(
                f"{base}/api/chat",
                json={
                    "model": model,
                    "messages": [{"role": "user", "content": prompt}],
                    "stream": False,
                },
            )
            r.raise_for_status()
            data = r.json()
        msg = data.get("message") or {}
        content = msg.get("content") if isinstance(msg, dict) else None
        if isinstance(content, str) and content.strip():
            return content.strip()
        raise RuntimeError("Ollama 回應無內容。")

    if prov == "gemini":
        key = (row.gemini_api_key or "").strip()
        if not key:
            raise RuntimeError("未設定 Gemini API Key。")
        model = row.gemini_model or "gemini-1.5-flash"
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={key}"
        async with httpx.AsyncClient(timeout=120.0) as client:
            r = await client.post(url, json={"contents": [{"parts": [{"text": prompt}]}]})
            r.raise_for_status()
            data = r.json()
        cands = data.get("candidates") or []
        if cands and isinstance(cands[0], dict):
            parts = ((cands[0].get("content") or {}).get("parts")) or []
            if parts and isinstance(parts[0], dict) and isinstance(parts[0].get("text"), str):
                return parts[0]["text"].strip()
        raise RuntimeError("Gemini 回應無內容。")

    # 預設 OpenAI 相容
    base = (row.openai_base_url or "https://api.openai.com/v1").rstrip("/")
    key = (row.openai_api_key or "").strip()
    if not key:
        raise RuntimeError("未設定 OpenAI API Key。")
    model = row.openai_model or "gpt-4o-mini"
    async with httpx.AsyncClient(timeout=120.0) as client:
        r = await client.post(
            f"{base}/chat/completions",
            headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
            json={
                "model": model,
                "messages": [{"role": "user", "content": prompt}],
                "temperature": 0.4,
            },
        )
        r.raise_for_status()
        data = r.json()
    choices = data.get("choices") or []
    if choices and isinstance(choices[0], dict):
        msg = choices[0].get("message") or {}
        if isinstance(msg, dict) and isinstance(msg.get("content"), str):
            return msg["content"].strip()
    raise RuntimeError("OpenAI 相容 API 回應無內容。")
